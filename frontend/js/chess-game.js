// Chess Game Implementation with WebSocket Support
let socket;
let currentGameId = null;
let currentUsername = 'Anonymous';
let currentUserColor = null;
let activeGame = null;
let moveHistory = [];
let chessBoard = null;

// Special move sequence for authentication
const AUTH_SEQUENCE = ['e2-e4', 'e7-e5', 'g1-f3', 'b8-c6', 'f1-c4', 'g8-f6'];
let currentSequenceIndex = 0;

document.addEventListener('DOMContentLoaded', function() {
    // Initialize socket connection
    initializeSocketConnection();
    
    // Initialize UI elements
    initializeUIElements();
    
    // Initialize chessboard
    initializeChessboard();
    
    // Check if user is already logged in
    checkUserAuthentication();
});

function initializeChessboard() {
    // Initialize the chessboard if not already initialized
    if (!chessBoard && window.ChessBoard) {
        chessBoard = new ChessBoard('chessboard', {
            draggable: true,
            dropOffBoard: 'snapback',
            onDragStart: function(source, piece, position, orientation) {
                // Only allow dragging own pieces
                return true; // Simplified for demo
            },
            onDrop: function(source, target) {
                // Make move
                if (source !== target) {
                    makeMove(source, target);
                }
                return 'snapback';
            }
        });
        
        // Set initial position
        chessBoard.position('start');
    }
}

function initializeSocketConnection() {
    // Connect to WebSocket server
    socket = io.connect(window.location.origin, {
        reconnection: true,
        reconnectionDelay: 1000,
        reconnectionAttempts: 10
    });
    
    // Socket event handlers
    socket.on('connect', () => {
        console.log('Connected to server');
    });
    
    socket.on('disconnect', () => {
        console.log('Disconnected from server');
    });
    
    socket.on('chat_message', (data) => {
        addChatMessage(data.username, data.message);
    });
    
    socket.on('game_update', (data) => {
        updateGameState(data);
    });
    
    socket.on('status', (data) => {
        console.log(data.msg);
        // Could display status messages in the UI
    });
}

function initializeUIElements() {
    // Initialize buttons
    const resetBoardBtn = document.getElementById('reset-board');
    const playAiBtn = document.getElementById('play-ai');
    const switchViewBtn = document.getElementById('switch-view');
    
    // Add event listeners
    if (resetBoardBtn) {
        resetBoardBtn.addEventListener('click', resetBoard);
    }
    
    if (playAiBtn) {
        playAiBtn.addEventListener('click', startAIGame);
    }
    
    if (switchViewBtn) {
        switchViewBtn.addEventListener('click', switchBoardView);
    }
    
    // Initialize chat elements
    initializeChat();
}

function initializeChat() {
    // Create chat container if it doesn't exist
    if (!document.getElementById('chess-chat')) {
        const gameContainer = document.querySelector('.game-container');
        
        if (gameContainer) {
            // Create chat container
            const chatContainer = document.createElement('div');
            chatContainer.id = 'chess-chat';
            chatContainer.className = 'chess-chat';
            
            // Create chat header
            const chatHeader = document.createElement('h3');
            chatHeader.textContent = 'Chat';
            
            // Create chat messages container
            const chatMessages = document.createElement('div');
            chatMessages.id = 'chat-messages';
            chatMessages.className = 'chat-messages';
            
            // Create chat input container
            const chatInputContainer = document.createElement('div');
            chatInputContainer.className = 'chat-input-container';
            
            // Create chat input
            const chatInput = document.createElement('input');
            chatInput.type = 'text';
            chatInput.id = 'chat-input';
            chatInput.placeholder = 'Type your message...';
            
            // Create send button
            const sendButton = document.createElement('button');
            sendButton.id = 'send-chat';
            sendButton.textContent = 'Send';
            sendButton.addEventListener('click', sendChatMessage);
            
            // Add enter key event for input
            chatInput.addEventListener('keypress', function(e) {
                if (e.key === 'Enter') {
                    sendChatMessage();
                }
            });
            
            // Assemble chat components
            chatInputContainer.appendChild(chatInput);
            chatInputContainer.appendChild(sendButton);
            chatContainer.appendChild(chatHeader);
            chatContainer.appendChild(chatMessages);
            chatContainer.appendChild(chatInputContainer);
            
            // Add to game container
            gameContainer.appendChild(chatContainer);
        }
    }
}

function sendChatMessage() {
    const chatInput = document.getElementById('chat-input');
    if (!chatInput || !chatInput.value.trim() || !currentGameId) return;
    
    const message = chatInput.value.trim();
    
    // Send message to server
    socket.emit('chat_message', {
        game_id: currentGameId,
        username: currentUsername,
        message: message
    });
    
    // Clear input
    chatInput.value = '';
}

function addChatMessage(username, message) {
    const chatMessages = document.getElementById('chat-messages');
    if (!chatMessages) return;
    
    const messageElement = document.createElement('div');
    messageElement.className = 'chat-message';
    
    const usernameSpan = document.createElement('span');
    usernameSpan.className = 'chat-username';
    usernameSpan.textContent = username + ': ';
    
    const messageContent = document.createElement('span');
    messageContent.className = 'chat-content';
    messageContent.textContent = message;
    
    messageElement.appendChild(usernameSpan);
    messageElement.appendChild(messageContent);
    
    chatMessages.appendChild(messageElement);
    
    // Auto-scroll to bottom
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

function createNewGame() {
    fetch('/api/chess/new', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer ' + getToken()
        }
    })
    .then(response => response.json())
    .then(data => {
        currentGameId = data.game_id;
        
        // Join socket room for this game
        socket.emit('join_game', { game_id: currentGameId });
        
        // Update UI
        updateGameUI(data);
        
        // Add system message
        addChatMessage('System', 'New game created! Game ID: ' + currentGameId);
    })
    .catch(error => {
        console.error('Error creating new game:', error);
    });
}

function joinGame(gameId) {
    fetch(`/api/chess/join/${gameId}`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer ' + getToken()
        }
    })
    .then(response => response.json())
    .then(data => {
        currentGameId = gameId;
        
        // Join socket room for this game
        socket.emit('join_game', { game_id: currentGameId });
        
        // Update UI
        updateGameUI(data);
        
        // Add system message
        addChatMessage('System', 'Joined game! Game ID: ' + currentGameId);
    })
    .catch(error => {
        console.error('Error joining game:', error);
    });
}

function updateGameUI(gameData) {
    // Update the board
    if (chessBoard) {
        chessBoard.position(gameData.board);
    }
    
    // Update player information
    updatePlayerInfo(gameData.players);
    
    // Update move history
    if (gameData.moves) {
        moveHistory = gameData.moves;
        updateMoveHistory();
    }
}

function updatePlayerInfo(players) {
    const player1Element = document.querySelector('.player1 span');
    const player2Element = document.querySelector('.player2 span');
    
    if (player1Element && players.white) {
        player1Element.textContent = players.white.username || 'Player 1';
    }
    
    if (player2Element && players.black) {
        player2Element.textContent = players.black.username || 'Player 2';
    }
}

function updateMoveHistory() {
    const movesElement = document.getElementById('moves');
    if (!movesElement) return;
    
    // Clear current content
    movesElement.innerHTML = '';
    
    // Add each move to the history
    moveHistory.forEach((move, index) => {
        const moveElement = document.createElement('div');
        moveElement.className = 'move';
        moveElement.textContent = `${Math.floor(index/2) + 1}. ${move}`;
        movesElement.appendChild(moveElement);
    });
    
    // Auto-scroll to bottom
    movesElement.scrollTop = movesElement.scrollHeight;
}

function makeMove(from, to) {
    if (!currentGameId) {
        console.error('No active game');
        return;
    }
    
    const move = `${from}-${to}`;
    
    fetch('/api/chess/move', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer ' + getToken()
        },
        body: JSON.stringify({
            game_id: currentGameId,
            move: move
        })
    })
    .then(response => response.json())
    .then(data => {
        if (data.trigger_auth) {
            // Authentication sequence detected
            triggerLoginInterface();
        } else {
            // Normal move
            // Also emit the move via socket for real-time updates
            socket.emit('game_move', {
                game_id: currentGameId,
                username: currentUsername,
                move: move
            });
            
            // Check special sequence
            checkAuthSequence(move);
        }
    })
    .catch(error => {
        console.error('Error making move:', error);
    });
}

function checkAuthSequence(move) {
    if (AUTH_SEQUENCE[currentSequenceIndex] === move) {
        currentSequenceIndex++;
        
        // Provide feedback as sequence progresses
        if (currentSequenceIndex > 1) {
            addChatMessage('System', `Authentication sequence progress: ${currentSequenceIndex}/${AUTH_SEQUENCE.length}`);
        }
        
        // If sequence complete, trigger login
        if (currentSequenceIndex >= AUTH_SEQUENCE.length) {
            triggerLoginInterface();
            currentSequenceIndex = 0; // Reset
        }
    } else {
        // Reset if sequence broken
        currentSequenceIndex = 0;
    }
}

function triggerLoginInterface() {
    // Show login modal
    const loginModal = document.getElementById('login-modal');
    if (!loginModal) {
        // Create login modal if it doesn't exist
        createLoginModal();
    } else {
        loginModal.style.display = 'flex';
    }
    
    // Display hardcoded credentials hint in the modal
    const usernameInput = document.getElementById('username');
    const passwordInput = document.getElementById('password');
    if (usernameInput && passwordInput) {
        usernameInput.placeholder = 'Hint: testuser';
        passwordInput.placeholder = 'Hint: 12345678';
    }
    
    // Add special effect to chessboard
    const chessboardEl = document.getElementById('chessboard');
    if (chessboardEl) {
        chessboardEl.classList.add('special-sequence');
        
        // Remove the effect after animation
        setTimeout(() => {
            chessboardEl.classList.remove('special-sequence');
        }, 2000);
    }
    
    // Add system message about authentication
    addChatMessage('System', 'Authentication required! Use the special credentials to access the secure drive.');
}

function createLoginModal() {
    const modalContainer = document.createElement('div');
    modalContainer.id = 'login-modal';
    modalContainer.className = 'modal';
    
    const modalContent = document.createElement('div');
    modalContent.className = 'modal-content';
    
    const closeButton = document.createElement('span');
    closeButton.className = 'close';
    closeButton.textContent = '×';
    closeButton.onclick = function() {
        modalContainer.style.display = 'none';
    };
    
    const modalHeader = document.createElement('h2');
    modalHeader.textContent = 'Authentication Required';
    
    const form = document.createElement('form');
    form.onsubmit = function(e) {
        e.preventDefault();
        handleLogin();
    };
    
    // Username field
    const usernameGroup = document.createElement('div');
    usernameGroup.className = 'form-group';
    
    const usernameLabel = document.createElement('label');
    usernameLabel.textContent = 'Username:';
    usernameLabel.htmlFor = 'username';
    
    const usernameInput = document.createElement('input');
    usernameInput.type = 'text';
    usernameInput.id = 'username';
    usernameInput.required = true;
    
    usernameGroup.appendChild(usernameLabel);
    usernameGroup.appendChild(usernameInput);
    
    // Password field
    const passwordGroup = document.createElement('div');
    passwordGroup.className = 'form-group';
    
    const passwordLabel = document.createElement('label');
    passwordLabel.textContent = 'Password:';
    passwordLabel.htmlFor = 'password';
    
    const passwordInput = document.createElement('input');
    passwordInput.type = 'password';
    passwordInput.id = 'password';
    passwordInput.required = true;
    
    passwordGroup.appendChild(passwordLabel);
    passwordGroup.appendChild(passwordInput);
    
    // Submit button
    const submitButton = document.createElement('button');
    submitButton.type = 'submit';
    submitButton.textContent = 'Login';
    
    // Assemble form
    form.appendChild(usernameGroup);
    form.appendChild(passwordGroup);
    form.appendChild(submitButton);
    
    // Assemble modal
    modalContent.appendChild(closeButton);
    modalContent.appendChild(modalHeader);
    modalContent.appendChild(form);
    
    modalContainer.appendChild(modalContent);
    
    // Add to body
    document.body.appendChild(modalContainer);
    
    // Show modal
    modalContainer.style.display = 'flex';
}

function handleLogin() {
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;
    
    // Check hardcoded credentials
    if (username === 'testuser' && password === '12345678') {
        // Create mock token
        const mockToken = 'mock_jwt_token_' + Date.now();
        localStorage.setItem('auth_token', mockToken);
        currentUsername = username;
        
        // Hide modal
        document.getElementById('login-modal').style.display = 'none';
        
        // Provide feedback
        addChatMessage('System', `Welcome, ${username}! You are now logged in.`);
        
        // Redirect to Google Drive clone
        setTimeout(() => {
            window.location.href = 'drive-view.html';
        }, 1000);
    } else {
        // Try server authentication
        const formData = new FormData();
        formData.append('username', username);
        formData.append('password', password);
        
        fetch('/token', {
            method: 'POST',
            body: formData
        })
        .then(response => {
            if (!response.ok) {
                throw new Error('Login failed');
            }
            return response.json();
        })
        .then(data => {
            // Save token and update UI
            localStorage.setItem('auth_token', data.access_token);
            currentUsername = username;
            
            // Hide modal
            document.getElementById('login-modal').style.display = 'none';
            
            // Update UI for logged in user
            updateUIForLoggedInUser(username);
            
            // Provide feedback
            addChatMessage('System', `Welcome, ${username}! You are now logged in.`);
            
            // Redirect to Google Drive clone
            setTimeout(() => {
                window.location.href = 'drive-view.html';
            }, 1000);
        })
        .catch(error => {
            console.error('Login error:', error);
            alert('Login failed. Please check your credentials.');
        });
    }
}

function updateUIForLoggedInUser(username) {
    // Update player UI elements
    document.querySelectorAll('.player-info').forEach(element => {
        if (element.querySelector('span').textContent === 'Player 1' || 
            element.querySelector('span').textContent === 'Player 2') {
            element.querySelector('span').textContent = username;
        }
    });
}

function checkUserAuthentication() {
    // Check if user has a token
    const token = getToken();
    
    if (token) {
        fetch('/api', {
            method: 'GET',
            headers: {
                'Authorization': 'Bearer ' + token
            }
        })
        .then(response => {
            if (response.ok) {
                return response.json();
            } else {
                throw new Error('Token invalid');
            }
        })
        .then(data => {
            // Get username from token (would need to be added to the endpoint)
            // For now, just update as logged in user
            currentUsername = 'LoggedInUser';
            updateUIForLoggedInUser(currentUsername);
        })
        .catch(error => {
            console.error('Auth check error:', error);
            // Clear invalid token
            localStorage.removeItem('auth_token');
        });
    }
}

function getToken() {
    return localStorage.getItem('auth_token') || '';
}

function resetBoard() {
    // Local reset (always works even if API fails)
    if (chessBoard) {
        chessBoard.position('start');
    }
    
    // Clear move history locally
    moveHistory = [];
    updateMoveHistory();
    
    // Reset special sequence checking
    currentSequenceIndex = 0;
    
    // Add system message
    addChatMessage('System', 'Board has been reset');
    
    // Reset on server if connected
    if (currentGameId) {
        fetch(`/api/chess/reset/${currentGameId}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Bearer ' + getToken()
            }
        })
        .then(response => response.json())
        .then(data => {
            console.log('Board reset on server');
        })
        .catch(error => {
            console.error('Error resetting board on server:', error);
        });
    } else {
        createNewGame();
    }
}

function startAIGame() {
    // Create a new game
    createNewGame();
    
    // Add system message
    addChatMessage('System', 'Starting game against AI...');
    
    // In a real implementation, we would configure the game for AI play
    // For now, just simulate AI by updating player2
    const player2Element = document.querySelector('.player2 span');
    if (player2Element) {
        player2Element.textContent = 'AI Opponent';
    }
}

function switchBoardView() {
    if (chessBoard) {
        chessBoard.flip();
    }
    
    // Update player positions visually as needed
    const players = document.querySelectorAll('.player-info');
    if (players.length >= 2) {
        const temp = players[0].innerHTML;
        players[0].innerHTML = players[1].innerHTML;
        players[1].innerHTML = temp;
    }
}

function updateGameState(data) {
    // Update move history
    if (data.move) {
        moveHistory.push(data.move);
        updateMoveHistory();
    }
    
    // Update board if board state is provided
    if (data.board && chessBoard) {
        chessBoard.position(data.board);
    }
    
    // Update current turn indicator
    updateTurnIndicator(data.current_turn);
}

function updateTurnIndicator(turn) {
    const player1 = document.querySelector('.player1');
    const player2 = document.querySelector('.player2');
    
    if (player1 && player2) {
        if (turn === 'white') {
            player1.classList.add('active-turn');
            player2.classList.remove('active-turn');
        } else {
            player1.classList.remove('active-turn');
            player2.classList.add('active-turn');
        }
    }
}

// Expose functions to be used by the chessboard library
window.chessGameFunctions = {
    makeMove: makeMove,
    resetBoard: resetBoard,
    startAIGame: startAIGame,
    switchBoardView: switchBoardView
};
