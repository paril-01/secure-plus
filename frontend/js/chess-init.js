// Chess Game Initialization and Pieces Display

document.addEventListener('DOMContentLoaded', function() {
    // Wait a moment for dependencies to load
    setTimeout(() => {
        try {
            initializeChessboard();
            initializeGameControls();
            restrictChatAccess();
            console.log('Chess board initialized successfully');
        } catch (error) {
            console.error('Error initializing chessboard:', error);
        }
    }, 100);
});

let board = null;
let game = null; // Chess.js game object
let currentSequence = [];
const AUTH_SEQUENCE = ['e2-e4', 'e7-e5', 'g1-f3', 'b8-c6', 'f1-c4', 'g8-f6'];
let authSuccessful = false;

function initializeChessboard() {
    // Initialize chess game logic
    try {
        // Create new game instance
        game = new Chess();
        
        // Configuration for the chessboard
        const config = {
            draggable: true,
            position: 'start',
            pieceTheme: 'https://chessboardjs.com/img/chesspieces/wikipedia/{piece}.png',
            onDragStart: onDragStart,
            onDrop: onDrop,
            onSnapEnd: onSnapEnd
        };

        // Initialize the board with proper constructor
        board = Chessboard('chessboard', config);
        
        if (!board) {
            console.error('Failed to create chessboard instance');
            return;
        }
        
        // Make sure the board is visible
        $('#chessboard').css({
            'width': '400px',
            'height': '400px',
            'margin': '0 auto',
            'box-shadow': '0 0 15px rgba(0, 200, 255, 0.7)'
        });
        
        // Add system message about board initialization
        addSystemChatMessage('Chess board initialized. Use the special move sequence to authenticate.');
        addSystemChatMessage('Sequence: e2-e4, e7-e5, g1-f3, b8-c6, f1-c4, g8-f6');

        // Handle window resize
        $(window).resize(function() {
            board.resize();
        });
    } catch (err) {
        console.error('Chessboard initialization error:', err);
    }
}

function initializeGameControls() {
    // Reset board button
    document.getElementById('reset-board').addEventListener('click', function() {
        board.position('start');
        game.reset();
        currentSequence = [];
        updateMoveHistory([]);
        addSystemChatMessage('Board has been reset');
    });

    // Play vs AI button
    document.getElementById('play-ai').addEventListener('click', function() {
        board.position('start');
        game.reset();
        currentSequence = [];
        updateMoveHistory([]);
        addSystemChatMessage('Starting game against AI...');
    });

    // Switch view button
    document.getElementById('switch-view').addEventListener('click', function() {
        board.flip();
        addSystemChatMessage('Board view flipped');
    });

    // Add send button for chat
    document.getElementById('send').addEventListener('click', sendChatMessage);
}

function onDragStart(source, piece, position, orientation) {
    // Do not pick up pieces if the game is over
    if (game.game_over()) return false;

    // Only pick up pieces for the current turn (white/black)
    if ((game.turn() === 'w' && piece.search(/^b/) !== -1) ||
        (game.turn() === 'b' && piece.search(/^w/) !== -1)) {
        return false;
    }

    return true;
}

function onDrop(source, target) {
    // See if the move is legal
    const move = game.move({
        from: source,
        to: target,
        promotion: 'q' // Always promote to a queen for simplicity
    });

    // Illegal move
    if (move === null) return 'snapback';

    // Record move in sequence and check for authentication pattern
    const moveNotation = source + '-' + target;
    currentSequence.push(moveNotation);
    
    // Update move history display
    updateMoveDisplay(move, game.history());
    
    // Check if the move sequence matches the authentication sequence
    checkAuthSequence();
    
    // Make a random move for the AI if playing against AI
    setTimeout(makeRandomMove, 250);
}

function onSnapEnd() {
    // Update the board position after the piece snap animation
    board.position(game.fen());
}

function makeRandomMove() {
    // Exit if the game is over
    if (game.game_over()) return;

    // Get possible moves
    const possibleMoves = game.moves();
    
    // Select a random move
    if (possibleMoves.length > 0) {
        const randomIdx = Math.floor(Math.random() * possibleMoves.length);
        const move = game.move(possibleMoves[randomIdx]);
        
        // Update the board
        board.position(game.fen());
        
        // Update move history
        updateMoveDisplay(move, game.history());
    }
}

function updateMoveDisplay(move, history) {
    const movesContainer = document.getElementById('moves');
    if (!movesContainer) return;
    
    movesContainer.innerHTML = '';
    
    for (let i = 0; i < history.length; i++) {
        const moveNumber = Math.floor(i / 2) + 1;
        const moveElem = document.createElement('div');
        moveElem.className = 'move';
        
        if (i % 2 === 0) {
            moveElem.textContent = moveNumber + '. ' + history[i];
        } else {
            moveElem.textContent = history[i];
        }
        
        movesContainer.appendChild(moveElem);
    }
    
    // Auto-scroll to bottom
    movesContainer.scrollTop = movesContainer.scrollHeight;
}

function updateMoveHistory(moves) {
    const movesContainer = document.getElementById('moves');
    if (!movesContainer) return;
    
    movesContainer.innerHTML = '';
    
    for (let i = 0; i < moves.length; i++) {
        const moveElem = document.createElement('div');
        moveElem.className = 'move';
        moveElem.textContent = moves[i];
        movesContainer.appendChild(moveElem);
    }
}

function checkAuthSequence() {
    // Check if the current sequence matches the auth sequence so far
    let matches = true;
    
    for (let i = 0; i < currentSequence.length && i < AUTH_SEQUENCE.length; i++) {
        if (currentSequence[i] !== AUTH_SEQUENCE[i]) {
            matches = false;
            break;
        }
    }
    
    if (matches && currentSequence.length === AUTH_SEQUENCE.length) {
        // Complete match - trigger authentication
        authSuccessful = true;
        addSystemChatMessage('Authentication sequence matched! Login now enabled.');
        
        // Allow chat access
        enableChatAccess();
        
        // Add visual effect to show authentication success
        const chessboard = document.getElementById('chessboard');
        chessboard.classList.add('auth-success');
        setTimeout(() => {
            chessboard.classList.remove('auth-success');
        }, 2000);
    } else if (matches && currentSequence.length > 0) {
        // Partial match - provide feedback
        addSystemChatMessage(`Authentication sequence progress: ${currentSequence.length}/${AUTH_SEQUENCE.length}`);
    }
}

function restrictChatAccess() {
    // Disable chat initially
    const chatInput = document.getElementById('chat-input');
    const sendButton = document.getElementById('send');
    
    if (chatInput) {
        chatInput.disabled = true;
        chatInput.placeholder = 'Complete the chess sequence to enable chat...';
    }
    
    if (sendButton) {
        sendButton.disabled = true;
    }
}

function enableChatAccess() {
    // Enable chat after authentication
    const chatInput = document.getElementById('chat-input');
    const sendButton = document.getElementById('send');
    
    if (chatInput) {
        chatInput.disabled = false;
        chatInput.placeholder = 'Enter username and password...';
        chatInput.focus();
    }
    
    if (sendButton) {
        sendButton.disabled = false;
    }
}

function sendChatMessage() {
    if (!authSuccessful) return;
    
    const chatInput = document.getElementById('chat-input');
    const chatMessages = document.querySelector('.chat-messages');
    
    if (!chatInput || !chatMessages) return;
    
    const message = chatInput.value.trim();
    if (!message) return;
    
    // Check for login credentials
    if (message.includes('testuser') && message.includes('12345678')) {
        // Login successful
        addSystemChatMessage('Login successful! Redirecting to secure drive...');
        
        // Store authentication
        localStorage.setItem('auth_token', 'secure_token_' + Date.now());
        localStorage.setItem('username', 'testuser');
        
        // Redirect after short delay
        setTimeout(() => {
            window.location.href = 'drive-view.html';
        }, 1500);
    } else {
        // Add the user message
        const userMessageElement = document.createElement('div');
        userMessageElement.className = 'chat-message user-message';
        userMessageElement.textContent = message;
        chatMessages.appendChild(userMessageElement);
        
        // Auto-scroll
        chatMessages.scrollTop = chatMessages.scrollHeight;
        
        // Clear input
        chatInput.value = '';
        
        // Check credentials format
        if (message.includes('user') && message.includes('pass')) {
            addSystemChatMessage('Invalid credentials. Hint: Try testuser/12345678');
        } else if (!message.includes(' ')) {
            addSystemChatMessage('Please enter both username and password separated by space');
        }
    }
}

function addSystemChatMessage(message) {
    const chatMessages = document.querySelector('.chat-messages');
    if (!chatMessages) return;
    
    const systemMessageElement = document.createElement('div');
    systemMessageElement.className = 'chat-message system-message';
    
    const prefix = document.createElement('span');
    prefix.className = 'system-prefix';
    prefix.textContent = 'System: ';
    
    const content = document.createElement('span');
    content.className = 'message-content';
    content.textContent = message;
    
    systemMessageElement.appendChild(prefix);
    systemMessageElement.appendChild(content);
    chatMessages.appendChild(systemMessageElement);
    
    // Auto-scroll
    chatMessages.scrollTop = chatMessages.scrollHeight;
}
