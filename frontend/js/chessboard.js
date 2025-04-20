/**
 * Simple Chess Board Implementation for SecurePlus
 * This provides a minimal implementation of a chess board UI
 */

// ChessBoard constructor
function ChessBoard(elementId, config) {
    // Default configuration
    this.config = {
        draggable: true,
        position: 'start',
        pieceTheme: 'img/chesspieces/{piece}.svg',
        onDragStart: null,
        onDrop: null,
        onSnapEnd: null,
        ...config
    };
    
    this.element = document.getElementById(elementId);
    this.boardEl = this.element.querySelector('.chess-board');
    this.draggedPiece = null;
    this.currentPosition = {};
    
    // Initialize
    this.init();
}

// Initialize the chess board
ChessBoard.prototype.init = function() {
    if (this.config.position === 'start') {
        this.position(FEN_START_POSITION);
    } else {
        this.position(this.config.position);
    }
    
    // Set up event listeners for dragging
    if (this.config.draggable) {
        this.setupDragAndDrop();
    }
};

// Set up drag and drop
ChessBoard.prototype.setupDragAndDrop = function() {
    const self = this;
    const cells = this.boardEl.querySelectorAll('td');
    
    cells.forEach(cell => {
        cell.addEventListener('mousedown', function(e) {
            // Only allow dragging pieces
            if (!e.target.classList.contains('chess-piece')) return;
            
            const piece = e.target;
            const row = parseInt(cell.dataset.row);
            const col = parseInt(cell.dataset.col);
            const square = self.indexToSquare(row, col);
            
            // Check if piece can be moved (via callback)
            if (self.config.onDragStart && self.config.onDragStart(square, piece.dataset.piece, self.currentPosition, self.boardEl.dataset.orientation) === false) {
                return;
            }
            
            // Start dragging
            self.draggedPiece = {
                element: piece,
                square: square,
                row: row,
                col: col
            };
            
            // Create drag visual
            const dragVisual = piece.cloneNode(true);
            dragVisual.classList.add('dragging-piece');
            document.body.appendChild(dragVisual);
            
            // Position and size drag visual
            const pieceRect = piece.getBoundingClientRect();
            dragVisual.style.width = pieceRect.width + 'px';
            dragVisual.style.height = pieceRect.height + 'px';
            dragVisual.style.position = 'absolute';
            dragVisual.style.zIndex = 1000;
            
            // Calculate offset from cursor
            const offsetX = e.clientX - pieceRect.left;
            const offsetY = e.clientY - pieceRect.top;
            
            // Initial position
            self.moveDraggedPiece(e, dragVisual, offsetX, offsetY);
            
            // Hide original piece
            piece.style.opacity = 0.3;
            
            // Move drag visual with mouse
            function mouseMoveHandler(e) {
                self.moveDraggedPiece(e, dragVisual, offsetX, offsetY);
            }
            
            // Drop handler
            function mouseUpHandler(e) {
                document.removeEventListener('mousemove', mouseMoveHandler);
                document.removeEventListener('mouseup', mouseUpHandler);
                
                // Remove drag visual
                document.body.removeChild(dragVisual);
                
                // Show original piece
                piece.style.opacity = 1;
                
                // Find target square
                const targetEl = document.elementFromPoint(e.clientX, e.clientY);
                if (!targetEl) return;
                
                const targetCell = targetEl.closest('td');
                if (!targetCell) return;
                
                const targetRow = parseInt(targetCell.dataset.row);
                const targetCol = parseInt(targetCell.dataset.col);
                const targetSquare = self.indexToSquare(targetRow, targetCol);
                
                // Call onDrop callback
                if (self.config.onDrop) {
                    const result = self.config.onDrop(self.draggedPiece.square, targetSquare);
                    if (result === 'snapback') {
                        // No move was made
                        return;
                    }
                }
                
                // Call onSnapEnd callback
                if (self.config.onSnapEnd) {
                    self.config.onSnapEnd();
                }
                
                self.draggedPiece = null;
            }
            
            document.addEventListener('mousemove', mouseMoveHandler);
            document.addEventListener('mouseup', mouseUpHandler);
        });
    });
};

// Move the dragged piece visual
ChessBoard.prototype.moveDraggedPiece = function(e, dragVisual, offsetX, offsetY) {
    dragVisual.style.left = (e.clientX - offsetX) + 'px';
    dragVisual.style.top = (e.clientY - offsetY) + 'px';
};

// Convert FEN position string to position object
ChessBoard.prototype.fenToObj = function(fen) {
    // FEN string of starting position
    if (fen === 'start') fen = FEN_START_POSITION;
    
    // Position object
    const position = {};
    
    // Split FEN string
    const fenParts = fen.split(' ');
    const fenPosition = fenParts[0];
    
    // Parse position
    let row = 0;
    let col = 0;
    
    for (let i = 0; i < fenPosition.length; i++) {
        const char = fenPosition.charAt(i);
        
        if (char === '/') {
            row++;
            col = 0;
        } else if (char >= '1' && char <= '8') {
            col += parseInt(char);
        } else {
            const square = this.indexToSquare(row, col);
            position[square] = char;
            col++;
        }
    }
    
    return position;
};

// Set or get the board position
ChessBoard.prototype.position = function(position) {
    // If no position is provided, return the current position
    if (!position) return this.currentPosition;
    
    // Convert FEN to position object if needed
    if (typeof position === 'string') {
        position = this.fenToObj(position);
    }
    
    // Store the new position
    this.currentPosition = position;
    
    // Update the board display
    this.updateBoardDisplay();
    
    return this.currentPosition;
};

// Update the board display based on currentPosition
ChessBoard.prototype.updateBoardDisplay = function() {
    // Clear all pieces
    const cells = this.boardEl.querySelectorAll('td');
    cells.forEach(cell => {
        // Remove existing pieces
        const existingPiece = cell.querySelector('.chess-piece');
        if (existingPiece) cell.removeChild(existingPiece);
    });
    
    // Add pieces from the current position
    for (const square in this.currentPosition) {
        const piece = this.currentPosition[square];
        const {row, col} = this.squareToIndex(square);
        
        const cell = this.boardEl.querySelector(`td[data-row="${row}"][data-col="${col}"]`);
        if (!cell) continue;
        
        const pieceEl = document.createElement('div');
        pieceEl.className = 'chess-piece';
        pieceEl.classList.add(piece.charAt(0) === 'w' ? 'white-piece' : 'black-piece');
        pieceEl.dataset.piece = piece;
        
        // Set piece character based on type
        let pieceChar = '';
        switch (piece.charAt(1)) {
            case 'P': pieceChar = '♟'; break;
            case 'R': pieceChar = '♜'; break;
            case 'N': pieceChar = '♞'; break;
            case 'B': pieceChar = '♝'; break;
            case 'Q': pieceChar = '♛'; break;
            case 'K': pieceChar = '♚'; break;
        }
        
        pieceEl.textContent = pieceChar;
        cell.appendChild(pieceEl);
    }
};

// Convert square notation (e.g., 'a1') to row/col indices
ChessBoard.prototype.squareToIndex = function(square) {
    const file = square.charAt(0);
    const rank = square.charAt(1);
    
    const col = file.charCodeAt(0) - 'a'.charCodeAt(0);
    const row = 8 - parseInt(rank);
    
    return {row, col};
};

// Convert row/col indices to square notation
ChessBoard.prototype.indexToSquare = function(row, col) {
    const file = String.fromCharCode('a'.charCodeAt(0) + col);
    const rank = 8 - row;
    
    return file + rank;
};

// Flip the board orientation
ChessBoard.prototype.flip = function() {
    const orientation = this.boardEl.dataset.orientation || 'white';
    this.boardEl.dataset.orientation = orientation === 'white' ? 'black' : 'white';
    
    // Re-render the board
    this.updateBoardDisplay();
};

// Utility: Starting position in FEN notation
const FEN_START_POSITION = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';

// Simplified Chess engine for move validation
function Chess() {
    this.board = new Array(8).fill(null).map(() => new Array(8).fill(null));
    this.reset();
}

// Reset the board to the starting position
Chess.prototype.reset = function() {
    // Initialize empty board
    for (let i = 0; i < 8; i++) {
        for (let j = 0; j < 8; j++) {
            this.board[i][j] = null;
        }
    }
    
    // Set up pawns
    for (let i = 0; i < 8; i++) {
        this.board[1][i] = { type: 'p', color: 'b' }; // Black pawns
        this.board[6][i] = { type: 'p', color: 'w' }; // White pawns
    }
    
    // Set up other pieces
    const backRow = ['r', 'n', 'b', 'q', 'k', 'b', 'n', 'r'];
    for (let i = 0; i < 8; i++) {
        this.board[0][i] = { type: backRow[i], color: 'b' }; // Black pieces
        this.board[7][i] = { type: backRow[i], color: 'w' }; // White pieces
    }
    
    this.turn = 'w';
    this.castling = { w: { kingside: true, queenside: true }, b: { kingside: true, queenside: true } };
    this.enPassant = null;
    this.halfMoves = 0;
    this.fullMoves = 1;
    this.check = false;
    this.checkmate = false;
    this.history = [];
};

// Get the Forsyth-Edwards Notation (FEN) of the current position
Chess.prototype.fen = function() {
    let fen = '';
    
    // Board position
    for (let i = 0; i < 8; i++) {
        let emptyCount = 0;
        
        for (let j = 0; j < 8; j++) {
            const piece = this.board[i][j];
            
            if (piece === null) {
                emptyCount++;
            } else {
                if (emptyCount > 0) {
                    fen += emptyCount;
                    emptyCount = 0;
                }
                
                fen += piece.color === 'w' ? piece.type.toUpperCase() : piece.type;
            }
        }
        
        if (emptyCount > 0) {
            fen += emptyCount;
        }
        
        if (i < 7) fen += '/';
    }
    
    // Active color
    fen += ' ' + this.turn;
    
    // Castling
    let castlingStr = '';
    if (this.castling.w.kingside) castlingStr += 'K';
    if (this.castling.w.queenside) castlingStr += 'Q';
    if (this.castling.b.kingside) castlingStr += 'k';
    if (this.castling.b.queenside) castlingStr += 'q';
    fen += ' ' + (castlingStr || '-');
    
    // En passant
    fen += ' ' + (this.enPassant || '-');
    
    // Half moves
    fen += ' ' + this.halfMoves;
    
    // Full moves
    fen += ' ' + this.fullMoves;
    
    return fen;
};

// Make a move
Chess.prototype.move = function(move) {
    // Parse move
    const fromSquare = move.from;
    const toSquare = move.to;
    const promotion = move.promotion;
    
    // Convert to indices
    const from = this.algebraicToIndices(fromSquare);
    const to = this.algebraicToIndices(toSquare);
    
    // Get the piece
    const piece = this.board[from.row][from.col];
    
    // Check if move is valid
    if (!piece) return null;
    if (piece.color !== this.turn) return null;
    
    // Simple move validation (for demo purposes)
    const moveResult = this.validateMove(from, to, piece, promotion);
    if (!moveResult) return null;
    
    // Update board
    this.updateBoardAfterMove(from, to, piece, moveResult);
    
    // Create move object for history
    const historyMove = {
        from: fromSquare,
        to: toSquare,
        piece: piece.type,
        color: piece.color,
        san: this.generateSAN(from, to, piece)
    };
    
    // Add to history
    this.history.push(historyMove);
    
    return historyMove;
};

// Validate move (simplified for demo)
Chess.prototype.validateMove = function(from, to, piece, promotion) {
    // For demo purposes, we'll just allow any move that's not to the same square
    if (from.row === to.row && from.col === to.col) return null;
    
    return { valid: true };
};

// Update the board after a move
Chess.prototype.updateBoardAfterMove = function(from, to, piece, moveResult) {
    // Move the piece
    this.board[to.row][to.col] = piece;
    this.board[from.row][from.col] = null;
    
    // Switch turns
    this.turn = this.turn === 'w' ? 'b' : 'w';
    
    // Increment move counter
    if (this.turn === 'w') {
        this.fullMoves++;
    }
};

// Generate SAN notation for move (Simplified)
Chess.prototype.generateSAN = function(from, to, piece) {
    let san = '';
    
    // Piece letter
    if (piece.type !== 'p') {
        san += piece.type.toUpperCase();
    }
    
    // Source square
    san += this.indicesToAlgebraic(from);
    
    // Capture
    const targetPiece = this.board[to.row][to.col];
    if (targetPiece) {
        san += 'x';
    }
    
    // Destination square
    san += this.indicesToAlgebraic(to);
    
    return san;
};

// Convert algebraic notation to row/col indices
Chess.prototype.algebraicToIndices = function(square) {
    const file = square.charAt(0);
    const rank = square.charAt(1);
    
    const col = file.charCodeAt(0) - 'a'.charCodeAt(0);
    const row = 8 - parseInt(rank);
    
    return {row, col};
};

// Convert row/col indices to algebraic notation
Chess.prototype.indicesToAlgebraic = function(indices) {
    const file = String.fromCharCode('a'.charCodeAt(0) + indices.col);
    const rank = 8 - indices.row;
    
    return file + rank;
};

// Get all legal moves
Chess.prototype.moves = function() {
    // For demo, just return a few standard opening moves
    return ['e4', 'e5', 'd4', 'd5', 'Nf3', 'Nc6'];
};

// Check if the game is over
Chess.prototype.game_over = function() {
    return this.checkmate || this.halfMoves >= 100;
};

// Check if the king is in check
Chess.prototype.in_check = function() {
    return this.check;
};

// Check if the king is in checkmate
Chess.prototype.in_checkmate = function() {
    return this.checkmate;
};

// Check if the game is a draw
Chess.prototype.in_draw = function() {
    return this.halfMoves >= 100; // 50-move rule
};

// Make the Chess and ChessBoard globally available
window.Chess = Chess;
window.ChessBoard = ChessBoard;
