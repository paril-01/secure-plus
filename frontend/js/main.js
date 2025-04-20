// Main JavaScript for SecurePlus Application

// Chess game configuration
let board = null;
let game = new Chess();
let moveHistory = [];
let secretSequence = []; // Store the special sequence of moves
const secretSequenceLength = 5; // Number of moves to trigger login
let whiteSquareGrey = '#a9a9a9';
let blackSquareGrey = '#696969';

// Initialize the application
document.addEventListener('DOMContentLoaded', function() {
    initChessboard();
    setupEventListeners();
    initSecurePlusApp();
});

// Initialize the chessboard
function initChessboard() {
    // Create chessboard HTML structure
    const chessboardEl = document.getElementById('chessboard');
    const table = document.createElement('table');
    table.className = 'chess-board';
    
    for (let i = 0; i < 8; i++) {
        const row = document.createElement('tr');
        for (let j = 0; j < 8; j++) {
            const cell = document.createElement('td');
            cell.className = (i + j) % 2 === 0 ? 'white' : 'black';
            
            // Add file and rank labels
            if (i === 7) {
                const fileLabel = document.createElement('div');
                fileLabel.className = 'file-label';
                fileLabel.textContent = String.fromCharCode(97 + j); // a, b, c, ...
                cell.appendChild(fileLabel);
            }
            
            if (j === 0) {
                const rankLabel = document.createElement('div');
                rankLabel.className = 'rank-label';
                rankLabel.textContent = 8 - i; // 8, 7, 6, ...
                cell.appendChild(rankLabel);
            }
            
            cell.dataset.row = i;
            cell.dataset.col = j;
            row.appendChild(cell);
        }
        table.appendChild(row);
    }
    
    // Add futuristic overlay effects
    const overlay = document.createElement('div');
    overlay.className = 'board-overlay';
    
    const scanner = document.createElement('div');
    scanner.className = 'board-scanner';
    
    chessboardEl.appendChild(table);
    chessboardEl.appendChild(overlay);
    chessboardEl.appendChild(scanner);
    
    // Initialize the chess game
    board = new ChessBoard('chessboard', {
        draggable: true,
        pieceTheme: 'img/chesspieces/{piece}.svg',
        position: 'start',
        onDragStart: onDragStart,
        onDrop: onDrop,
        onSnapEnd: onSnapEnd
    });
    
    updateStatus();
}

// Chess game functions
function onDragStart(source, piece, position, orientation) {
    // Do not pick up pieces if the game is over or it's not that side's turn
    if (game.game_over() || 
        (game.turn() === 'w' && piece.search(/^b/) !== -1) ||
        (game.turn() === 'b' && piece.search(/^w/) !== -1)) {
        return false;
    }
}

function onDrop(source, target) {
    removeHighlights();
    
    // See if the move is legal
    let move = game.move({
        from: source,
        to: target,
        promotion: 'q' // Always promote to a queen for simplicity
    });
    
    // Illegal move
    if (move === null) return 'snapback';
    
    // Add move to history
    updateMoveHistory(move);
    
    // Store move in secret sequence
    updateSecretSequence(source, target);
    
    // Check if the sequence triggers the login
    checkSecretSequence();
    
    updateStatus();
}

function onSnapEnd() {
    board.position(game.fen());
}

function updateStatus() {
    // Update game status and UI
    let status = '';
    
    if (game.in_check()) {
        status = game.turn() === 'w' ? 'White is in check' : 'Black is in check';
        highlightCheck();
    } else if (game.in_checkmate()) {
        status = game.turn() === 'w' ? 'Black wins by checkmate' : 'White wins by checkmate';
    } else if (game.in_draw()) {
        status = 'Game drawn';
    } else {
        status = game.turn() === 'w' ? 'White to move' : 'Black to move';
    }
    
    // Update status somewhere in UI if needed
}

function updateMoveHistory(move) {
    moveHistory.push(move);
    
    // Update the move history display
    const movesContainer = document.getElementById('moves');
    
    // Clear previous content
    movesContainer.innerHTML = '';
    
    // Add move numbers and moves
    for (let i = 0; i < moveHistory.length; i++) {
        const moveNumber = Math.floor(i / 2) + 1;
        const moveColor = i % 2 === 0 ? 'White' : 'Black';
        
        if (i % 2 === 0) {
            // Create move number cell
            const moveNumberEl = document.createElement('div');
            moveNumberEl.textContent = moveNumber + '.';
            movesContainer.appendChild(moveNumberEl);
        } else if (i === 0) {
            // Empty cell for first black move
            movesContainer.appendChild(document.createElement('div'));
        }
        
        // Create move notation cell
        const moveEl = document.createElement('div');
        moveEl.textContent = moveHistory[i].san;
        moveEl.title = `${moveColor}: ${moveHistory[i].from} to ${moveHistory[i].to}`;
        movesContainer.appendChild(moveEl);
    }
}

function removeHighlights() {
    document.querySelectorAll('.chess-board td').forEach(square => {
        square.classList.remove('selected', 'valid-move', 'last-move', 'in-check');
    });
}

function highlightCheck() {
    // Find the king that is in check
    const turn = game.turn();
    const kingColor = turn === 'w' ? 'b' : 'w'; // Opposite color's king is in check
    
    // Find king's position
    for (let i = 0; i < 8; i++) {
        for (let j = 0; j < 8; j++) {
            const piece = board.position()[String.fromCharCode(97 + j) + (8 - i)];
            if (piece === kingColor + 'K') {
                // Highlight the king square
                const cell = document.querySelector(`.chess-board td[data-row="${i}"][data-col="${j}"]`);
                if (cell) cell.classList.add('in-check');
                return;
            }
        }
    }
}

function updateSecretSequence(source, target) {
    // Keep only the last few moves for the secret sequence
    secretSequence.push(source + target);
    if (secretSequence.length > secretSequenceLength) {
        secretSequence.shift();
    }
}

function checkSecretSequence() {
    // This is where we would check if the secret sequence matches a predefined pattern
    // For demonstration, let's use a simple example: e2e4, d7d5, e4d5, d8d5, b1c3
    const triggerSequence = ['e2e4', 'd7d5', 'e4d5', 'd8d5', 'b1c3'];
    
    // Check if current sequence matches
    if (secretSequence.length === triggerSequence.length) {
        let isMatch = true;
        for (let i = 0; i < secretSequence.length; i++) {
            if (secretSequence[i] !== triggerSequence[i]) {
                isMatch = false;
                break;
            }
        }
        
        if (isMatch) {
            triggerLoginInterface();
        }
    }
}

function triggerLoginInterface() {
    // Visual effect on the board to indicate special sequence
    document.getElementById('chessboard').classList.add('special-sequence');
    
    // Show login interface after a short delay
    setTimeout(() => {
        document.getElementById('chessboard').classList.remove('special-sequence');
        document.getElementById('chess-interface').classList.remove('active');
        document.getElementById('chess-interface').classList.add('hidden');
        document.getElementById('login-interface').classList.remove('hidden');
        document.getElementById('login-interface').classList.add('active');
    }, 1500);
}

// Event listeners setup
function setupEventListeners() {
    // Chess game controls
    document.getElementById('reset-board').addEventListener('click', resetBoard);
    document.getElementById('play-ai').addEventListener('click', playAI);
    document.getElementById('switch-view').addEventListener('click', switchBoardView);
    
    // Login interface
    document.getElementById('login-button').addEventListener('click', attemptLogin);
    document.getElementById('back-to-chess').addEventListener('click', backToChess);
    
    // Secure Plus interface
    document.getElementById('logout-button').addEventListener('click', logout);
    document.getElementById('new-document').addEventListener('click', showNewDocumentModal);
    
    // Sidebar menu
    document.querySelectorAll('.menu-item').forEach(item => {
        item.addEventListener('click', () => switchView(item.dataset.view));
    });
    
    // Modal close buttons
    document.querySelectorAll('.close-modal').forEach(closeBtn => {
        closeBtn.addEventListener('click', closeAllModals);
    });
    
    // Document creation
    document.getElementById('create-doc').addEventListener('click', createNewDocument);
    document.querySelectorAll('.doc-option').forEach(option => {
        option.addEventListener('click', selectDocumentType);
    });
    
    // Window unload event - clear all traces
    window.addEventListener('beforeunload', clearAllTraces);
}

// Chess game control functions
function resetBoard() {
    game.reset();
    board.position('start');
    moveHistory = [];
    secretSequence = [];
    document.getElementById('moves').innerHTML = '';
    removeHighlights();
}

function playAI() {
    // Simple AI move function
    if (game.game_over()) return;
    
    // Get possible moves
    const moves = game.moves();
    
    // Make a random legal move
    const randomIdx = Math.floor(Math.random() * moves.length);
    const move = game.move(moves[randomIdx]);
    
    // Update board and history
    board.position(game.fen());
    updateMoveHistory(move);
    updateStatus();
}

function switchBoardView() {
    // Flip the board orientation
    board.flip();
}

// Login and authentication functions
function attemptLogin() {
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;
    
    if (!username || !password) {
        alert('Please enter both username and password');
        return;
    }
    
    // Call the backend API for authentication
    fetch('/api/token', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
            'username': username,
            'password': password,
        })
    })
    .then(response => {
        if (!response.ok) {
            throw new Error('Login failed');
        }
        return response.json();
    })
    .then(data => {
        // Store token in localStorage (in a real app, consider more secure storage)
        localStorage.setItem('accessToken', data.access_token);
        localStorage.setItem('userId', data.user_id);
        
        // Show the main interface
        showSecurePlusInterface(username);
    })
    .catch(error => {
        // For demo purposes, let's simulate success
        console.log('Login simulation successful');
        
        // Store simulated token
        localStorage.setItem('accessToken', 'simulated_token');
        localStorage.setItem('userId', '1');
        
        // Show the main interface
        showSecurePlusInterface(username);
    });
}

function backToChess() {
    document.getElementById('login-interface').classList.remove('active');
    document.getElementById('login-interface').classList.add('hidden');
    document.getElementById('chess-interface').classList.remove('hidden');
    document.getElementById('chess-interface').classList.add('active');
    
    // Clear login form
    document.getElementById('username').value = '';
    document.getElementById('password').value = '';
}

function showSecurePlusInterface(username) {
    // Hide login, show main interface
    document.getElementById('login-interface').classList.remove('active');
    document.getElementById('login-interface').classList.add('hidden');
    document.getElementById('secure-plus-interface').classList.remove('hidden');
    document.getElementById('secure-plus-interface').classList.add('active', 'secure-transition');
    
    // Set username display
    document.getElementById('username-display').textContent = username;
    document.getElementById('user-avatar').textContent = username.charAt(0).toUpperCase();
    
    // Load user files
    loadUserFiles();
}

function logout() {
    // Call the backend logout API
    fetch('/api/logout', {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${localStorage.getItem('accessToken')}`
        }
    })
    .catch(error => console.log('Logout error:', error))
    .finally(() => {
        // Clear local storage
        localStorage.removeItem('accessToken');
        localStorage.removeItem('userId');
        
        // Go back to chess interface
        document.getElementById('secure-plus-interface').classList.remove('active');
        document.getElementById('secure-plus-interface').classList.add('hidden');
        document.getElementById('chess-interface').classList.remove('hidden');
        document.getElementById('chess-interface').classList.add('active');
        
        // Reset the chess game
        resetBoard();
    });
}

// SecurePlus application functions
function initSecurePlusApp() {
    // Check if user is already logged in
    const token = localStorage.getItem('accessToken');
    if (token) {
        // Validate token and show main interface
        validateToken(token);
    }
}

function validateToken(token) {
    // Call API to validate token
    fetch('/api/users/me', {
        headers: {
            'Authorization': `Bearer ${token}`
        }
    })
    .then(response => {
        if (!response.ok) throw new Error('Invalid token');
        return response.json();
    })
    .then(user => {
        showSecurePlusInterface(user.username);
    })
    .catch(error => {
        console.log('Token validation error:', error);
        // Token is invalid, stay on chess interface
    });
}

// View switching
function switchView(viewName) {
    // Remove active class from all menu items
    document.querySelectorAll('.menu-item').forEach(item => {
        item.classList.remove('active');
    });
    
    // Add active class to selected menu item
    document.querySelector(`.menu-item[data-view="${viewName}"]`).classList.add('active');
    
    // Hide all content views
    document.querySelectorAll('.content-view').forEach(view => {
        view.classList.remove('active');
        view.classList.add('hidden');
    });
    
    // Show selected content view
    document.getElementById(`${viewName}-view`).classList.remove('hidden');
    document.getElementById(`${viewName}-view`).classList.add('active', 'secure-transition');
    
    // Load content based on view
    switch (viewName) {
        case 'my-files':
            loadUserFiles();
            break;
        case 'emails':
            loadUserEmails();
            break;
        case 'chat':
            initializeChat();
            break;
    }
}

// File management
function loadUserFiles() {
    const filesContainer = document.getElementById('files-container');
    filesContainer.innerHTML = '<div class="loading">Loading files...</div>';
    
    // Fetch user files from API
    fetch('/api/files', {
        headers: {
            'Authorization': `Bearer ${localStorage.getItem('accessToken')}`
        }
    })
    .then(response => response.json())
    .then(data => {
        if (data.length === 0) {
            filesContainer.innerHTML = '<div class="no-files">No files found. Create a new document to get started.</div>';
            return;
        }
        
        filesContainer.innerHTML = '';
        data.forEach(file => {
            const fileCard = createFileCard(file);
            filesContainer.appendChild(fileCard);
        });
    })
    .catch(error => {
        console.log('Error loading files:', error);
        
        // For demo, show sample files
        filesContainer.innerHTML = '';
        
        const sampleFiles = [
            { id: 1, filename: 'Project Proposal.docx', file_type: 'docx', created_at: '2023-05-15T10:30:00Z' },
            { id: 2, filename: 'Budget Analysis.xlsx', file_type: 'xlsx', created_at: '2023-05-16T14:20:00Z' },
            { id: 3, filename: 'Presentation.pptx', file_type: 'pptx', created_at: '2023-05-17T09:45:00Z' },
            { id: 4, filename: 'Notes.txt', file_type: 'txt', created_at: '2023-05-18T16:10:00Z' }
        ];
        
        sampleFiles.forEach(file => {
            const fileCard = createFileCard(file);
            filesContainer.appendChild(fileCard);
        });
    });
}

function createFileCard(file) {
    const fileCard = document.createElement('div');
    fileCard.className = 'file-card';
    fileCard.dataset.id = file.id;
    fileCard.dataset.type = file.file_type;
    
    let iconName = 'description';
    if (file.file_type === 'xlsx') iconName = 'grid_on';
    if (file.file_type === 'pptx') iconName = 'slideshow';
    
    fileCard.innerHTML = `
        <div class="file-icon">
            <span class="material-icons">${iconName}</span>
        </div>
        <div class="file-name">${file.filename}</div>
        <div class="file-menu">
            <span class="material-icons">more_vert</span>
        </div>
    `;
    
    fileCard.addEventListener('click', () => openFile(file));
    
    return fileCard;
}

function openFile(file) {
    // Open different editors based on file type
    if (file.file_type === 'docx') {
        openDocumentEditor(file);
    } else if (file.file_type === 'xlsx') {
        openSpreadsheetEditor(file);
    } else if (file.file_type === 'pptx') {
        // Open presentation editor
    } else {
        // Open text editor
    }
}

function openDocumentEditor(file) {
    // Hide all content views
    document.querySelectorAll('.content-view').forEach(view => {
        view.classList.remove('active');
        view.classList.add('hidden');
    });
    
    // Show document editor
    const editorView = document.getElementById('document-editor-view');
    editorView.classList.remove('hidden');
    editorView.classList.add('active', 'secure-transition');
    
    // Set document title
    document.getElementById('document-title').value = file.filename;
    
    // Load document content
    fetch(`/api/files/${file.id}`, {
        headers: {
            'Authorization': `Bearer ${localStorage.getItem('accessToken')}`
        }
    })
    .then(response => response.json())
    .then(data => {
        // Load content into editor
        document.getElementById('document-editor').innerHTML = atob(data.content);
    })
    .catch(error => {
        console.log('Error loading document:', error);
        // Load sample content for demo
        document.getElementById('document-editor').innerHTML = '<h1>Sample Document</h1><p>This is a sample document content for demonstration purposes.</p>';
    });
}

function openSpreadsheetEditor(file) {
    // Hide all content views
    document.querySelectorAll('.content-view').forEach(view => {
        view.classList.remove('active');
        view.classList.add('hidden');
    });
    
    // Show spreadsheet editor
    const editorView = document.getElementById('spreadsheet-editor-view');
    editorView.classList.remove('hidden');
    editorView.classList.add('active', 'secure-transition');
    
    // Set spreadsheet title
    document.getElementById('spreadsheet-title').value = file.filename;
    
    // Initialize spreadsheet with content
    initializeSpreadsheet(file);
}

// Document creation
function showNewDocumentModal() {
    document.getElementById('new-document-modal').classList.remove('hidden');
}

function closeAllModals() {
    document.querySelectorAll('.modal').forEach(modal => {
        modal.classList.add('hidden');
    });
}

function selectDocumentType(event) {
    // Remove active class from all options
    document.querySelectorAll('.doc-option').forEach(option => {
        option.classList.remove('active');
    });
    
    // Add active class to selected option
    event.currentTarget.classList.add('active');
}

function createNewDocument() {
    const selectedType = document.querySelector('.doc-option.active')?.dataset.type || 'word';
    const documentName = document.getElementById('new-doc-name').value || 'Untitled';
    
    // Create form data
    const formData = new FormData();
    formData.append('doc_type', selectedType);
    formData.append('doc_name', documentName);
    
    // Call API to create document
    fetch('/api/documents/create', {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${localStorage.getItem('accessToken')}`
        },
        body: formData
    })
    .then(response => response.json())
    .then(file => {
        // Open the newly created document
        openFile(file);
    })
    .catch(error => {
        console.log('Error creating document:', error);
        
        // For demo, create a fake file and open it
        const file = {
            id: Date.now(),
            filename: `${documentName}.${selectedType === 'word' ? 'docx' : (selectedType === 'excel' ? 'xlsx' : 'pptx')}`,
            file_type: selectedType === 'word' ? 'docx' : (selectedType === 'excel' ? 'xlsx' : 'pptx')
        };
        
        openFile(file);
    })
    .finally(() => {
        // Close the modal
        closeAllModals();
    });
}

// Email functions
function loadUserEmails() {
    const emailContainer = document.getElementById('email-container');
    emailContainer.innerHTML = '<div class="loading">Loading emails...</div>';
    
    // Fetch emails from API
    fetch('/api/emails', {
        headers: {
            'Authorization': `Bearer ${localStorage.getItem('accessToken')}`
        }
    })
    .then(response => response.json())
    .then(data => {
        if (data.length === 0) {
            emailContainer.innerHTML = '<div class="no-emails">No emails found.</div>';
            return;
        }
        
        emailContainer.innerHTML = '';
        data.forEach(email => {
            const emailItem = createEmailItem(email);
            emailContainer.appendChild(emailItem);
        });
    })
    .catch(error => {
        console.log('Error loading emails:', error);
        
        // For demo, show sample emails
        emailContainer.innerHTML = '';
        
        const sampleEmails = [
            { id: 1, subject: 'Project Update', sender: 'john@example.com', sent_at: '2023-05-18T10:30:00Z' },
            { id: 2, subject: 'Meeting Schedule', sender: 'sarah@example.com', sent_at: '2023-05-17T14:20:00Z' },
            { id: 3, subject: 'Security Report', sender: 'mike@example.com', sent_at: '2023-05-16T09:45:00Z' }
        ];
        
        sampleEmails.forEach(email => {
            const emailItem = createEmailItem(email);
            emailContainer.appendChild(emailItem);
        });
    });
}

function createEmailItem(email) {
    const emailItem = document.createElement('div');
    emailItem.className = 'email-item';
    emailItem.dataset.id = email.id;
    
    const sentDate = new Date(email.sent_at);
    const formattedDate = sentDate.toLocaleDateString() + ' ' + sentDate.toLocaleTimeString();
    
    emailItem.innerHTML = `
        <div class="email-subject">${email.subject}</div>
        <div class="email-meta">
            <span class="email-sender">${email.sender}</span>
            <span class="email-date">${formattedDate}</span>
        </div>
    `;
    
    return emailItem;
}

// Chat functions
function initializeChat() {
    // Initialize chat interface
    const usersContainer = document.getElementById('chat-users-list');
    
    // For demo, show sample users
    usersContainer.innerHTML = '';
    
    const sampleUsers = [
        { id: 1, username: 'John Smith' },
        { id: 2, username: 'Sarah Johnson' },
        { id: 3, username: 'Mike Williams' }
    ];
    
    sampleUsers.forEach(user => {
        const userItem = document.createElement('div');
        userItem.className = 'chat-user-item';
        userItem.dataset.id = user.id;
        userItem.textContent = user.username;
        userItem.addEventListener('click', () => selectChatUser(user));
        usersContainer.appendChild(userItem);
    });
}

function selectChatUser(user) {
    // Highlight selected user
    document.querySelectorAll('.chat-user-item').forEach(item => {
        item.classList.remove('active');
    });
    document.querySelector(`.chat-user-item[data-id="${user.id}"]`).classList.add('active');
    
    // Clear messages container
    const messagesContainer = document.getElementById('messages-container');
    messagesContainer.innerHTML = '';
    
    // For demo, show sample messages
    const sampleMessages = [
        { id: 1, sender_id: user.id, content: 'Hello there!', sent: false },
        { id: 2, sender_id: parseInt(localStorage.getItem('userId')), content: 'Hi! How are you?', sent: true },
        { id: 3, sender_id: user.id, content: 'I\'m doing well, thanks for asking.', sent: false },
        { id: 4, sender_id: parseInt(localStorage.getItem('userId')), content: 'Great! I wanted to discuss the new security features.', sent: true }
    ];
    
    sampleMessages.forEach(message => {
        const messageEl = document.createElement('div');
        messageEl.className = `message ${message.sent ? 'sent' : 'received'}`;
        messageEl.textContent = message.content;
        messagesContainer.appendChild(messageEl);
    });
    
    // Scroll to bottom
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
    
    // Setup send message handler
    document.getElementById('send-message').onclick = () => sendMessage(user.id);
}

function sendMessage(userId) {
    const messageInput = document.getElementById('chat-message');
    const messageText = messageInput.value.trim();
    
    if (!messageText) return;
    
    // Create message element
    const messagesContainer = document.getElementById('messages-container');
    const messageEl = document.createElement('div');
    messageEl.className = 'message sent';
    messageEl.textContent = messageText;
    messagesContainer.appendChild(messageEl);
    
    // Clear input
    messageInput.value = '';
    
    // Scroll to bottom
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
    
    // Simulate response after a delay
    setTimeout(() => {
        const responseEl = document.createElement('div');
        responseEl.className = 'message received';
        responseEl.textContent = 'Thanks for your message. I\'ll get back to you soon.';
        messagesContainer.appendChild(responseEl);
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }, 1500);
}

// Security functions
function clearAllTraces() {
    // Call API to clear all traces
    fetch('/api/clear-traces', {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${localStorage.getItem('accessToken')}`
        }
    }).catch(error => console.log('Error clearing traces:', error));
    
    // Clear local storage
    localStorage.clear();
}
