from flask import Flask, request, jsonify, send_from_directory, session
from flask_cors import CORS
from flask_jwt_extended import JWTManager, create_access_token, jwt_required, get_jwt_identity
from flask_socketio import SocketIO, emit, join_room, leave_room
import os
import datetime
import uuid
import json
from backend.models import SessionLocal, User, File, Email, TempStorage, BackupStorage, UserSession, ChessMove

# Initialize Flask app
app = Flask(__name__)
app.config['SECRET_KEY'] = os.environ.get("SECRET_KEY", "your_secret_key_here")
CORS(app)
socketio = SocketIO(app, cors_allowed_origins="*")

# JWT Configuration
app.config["JWT_SECRET_KEY"] = os.environ.get("SECRET_KEY", "your_secret_key_here")
app.config["JWT_ACCESS_TOKEN_EXPIRES"] = datetime.timedelta(minutes=30)
jwt = JWTManager(app)

# Serve frontend
@app.route('/')
def index():
    return send_from_directory('frontend', 'index.html')

# Serve static files
@app.route('/<path:path>')
def serve_static(path):
    if os.path.exists(os.path.join('frontend', path)):
        return send_from_directory('frontend', path)
    return jsonify({"detail": "Not found"}), 404

# Database session middleware
@app.before_request
def create_db_session():
    request.db = SessionLocal()

@app.teardown_request
def close_db_session(exception=None):
    if hasattr(request, 'db'):
        request.db.close()

# Authentication
@app.route('/token', methods=['POST'])
def login_for_access_token():
    data = request.form
    username = data.get('username')
    password = data.get('password')
    
    # Simple authentication (replace with proper hashing in production)
    user = request.db.query(User).filter(User.username == username).first()
    if not user or user.hashed_password != password:
        return jsonify({"detail": "Incorrect username or password"}), 401
    
    # Update last login
    user.last_login = datetime.datetime.utcnow()
    request.db.commit()
    
    # Create access token
    access_token = create_access_token(identity=username)
    
    # Create session
    session_id = str(uuid.uuid4())
    new_session = UserSession(
        user_id=user.id,
        session_id=session_id,
        expires_at=datetime.datetime.utcnow() + app.config["JWT_ACCESS_TOKEN_EXPIRES"]
    )
    request.db.add(new_session)
    request.db.commit()
    
    return jsonify({
        "access_token": access_token, 
        "token_type": "bearer", 
        "user_id": user.id
    })

# Current user helper
def get_current_user():
    username = get_jwt_identity()
    user = request.db.query(User).filter(User.username == username).first()
    if not user:
        return None
    return user

# Protected endpoint example
@app.route('/files', methods=['GET'])
@jwt_required()
def list_files():
    current_user = get_current_user()
    if not current_user:
        return jsonify({"detail": "User not found"}), 404
        
    files = request.db.query(DBFile).filter(DBFile.owner_id == current_user.id).all()
    
    # Convert to JSON-serializable format
    result = []
    for file in files:
        result.append({
            "id": file.id,
            "filename": file.filename,
            "file_type": file.file_type,
            "created_at": file.created_at.isoformat(),
            "updated_at": file.updated_at.isoformat()
        })
    
    return jsonify(result)

# API Welcome message
@app.route('/api')
def api_root():
    return jsonify({"message": "Welcome to SecurePlus - The secure Google Drive alternative"})

# Chess game functionality
active_games = {}
chess_auth_sequences = {
    # Define sequences that will trigger authentication
    # Format: "starting_position": ["e2-e4", "e7-e5", "g1-f3", "b8-c6"]
    "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1": ["e2-e4", "e7-e5", "g1-f3", "b8-c6", "f1-c4", "g8-f6"]
}

@app.route('/api/chess/new', methods=['POST'])
@jwt_required(optional=True)
def create_new_game():
    game_id = str(uuid.uuid4())
    active_games[game_id] = {
        'board': "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1",
        'moves': [],
        'chat': [],
        'players': {
            'white': None,
            'black': None
        },
        'current_turn': 'white',
        'status': 'waiting'
    }
    
    # If user is logged in, assign them as white player
    username = get_jwt_identity()
    if username:
        user = request.db.query(User).filter(User.username == username).first()
        if user:
            active_games[game_id]['players']['white'] = {
                'id': user.id,
                'username': username
            }
            active_games[game_id]['status'] = 'active'
    
    return jsonify({
        'game_id': game_id,
        'status': active_games[game_id]['status'],
        'board': active_games[game_id]['board']
    })

@app.route('/api/chess/join/<game_id>', methods=['POST'])
@jwt_required(optional=True)
def join_game(game_id):
    if game_id not in active_games:
        return jsonify({'error': 'Game not found'}), 404
    
    # If user is logged in, assign them as black player if spot is available
    username = get_jwt_identity()
    game = active_games[game_id]
    
    if username:
        user = request.db.query(User).filter(User.username == username).first()
        if user:
            # If white player slot is empty
            if game['players']['white'] is None:
                game['players']['white'] = {
                    'id': user.id,
                    'username': username
                }
            # If black player slot is empty and the user is not already white
            elif game['players']['black'] is None and (game['players']['white'] is None or 
                                                      game['players']['white']['id'] != user.id):
                game['players']['black'] = {
                    'id': user.id,
                    'username': username
                }
            
            # Update game status if both players are present
            if game['players']['white'] and game['players']['black']:
                game['status'] = 'active'
    
    return jsonify({
        'game_id': game_id,
        'status': game['status'],
        'board': game['board'],
        'players': game['players'],
        'current_turn': game['current_turn']
    })

@app.route('/api/chess/move', methods=['POST'])
@jwt_required(optional=True)
def make_move():
    data = request.json
    game_id = data.get('game_id')
    move = data.get('move')  # e.g., "e2-e4"
    
    if not game_id or not move or game_id not in active_games:
        return jsonify({'error': 'Invalid request'}), 400
    
    game = active_games[game_id]
    game['moves'].append(move)
    
    # In a real implementation, validate the move and update the board state
    # For this example, we'll just assume the move is valid
    # Update whose turn it is
    game['current_turn'] = 'black' if game['current_turn'] == 'white' else 'white'
    
    # Check for authentication sequence
    current_position = game['board']
    if current_position in chess_auth_sequences:
        if len(game['moves']) >= len(chess_auth_sequences[current_position]):
            sequence_match = True
            for i, auth_move in enumerate(chess_auth_sequences[current_position]):
                if i >= len(game['moves']) or game['moves'][i] != auth_move:
                    sequence_match = False
                    break
            
            if sequence_match:
                return jsonify({
                    'trigger_auth': True,
                    'message': 'Authentication sequence detected'
                })
    
    # Save move to database if user is authenticated
    username = get_jwt_identity()
    if username:
        user = request.db.query(User).filter(User.username == username).first()
        if user:
            new_move = ChessMove(
                user_id=user.id,
                move_notation=move,
                game_id=game_id,
                timestamp=datetime.datetime.utcnow()
            )
            request.db.add(new_move)
            request.db.commit()
    
    return jsonify({
        'success': True,
        'board': game['board'],
        'current_turn': game['current_turn'],
        'moves': game['moves']
    })

@app.route('/api/chess/reset/<game_id>', methods=['POST'])
def reset_game(game_id):
    if game_id not in active_games:
        return jsonify({'error': 'Game not found'}), 404
    
    active_games[game_id]['board'] = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1"
    active_games[game_id]['moves'] = []
    active_games[game_id]['current_turn'] = 'white'
    
    return jsonify({
        'success': True,
        'board': active_games[game_id]['board'],
        'moves': []
    })

# WebSocket for chat and real-time game updates
@socketio.on('connect')
def handle_connect():
    print('Client connected')

@socketio.on('disconnect')
def handle_disconnect():
    print('Client disconnected')

@socketio.on('join_game')
def handle_join_game(data):
    game_id = data.get('game_id')
    if game_id:
        join_room(game_id)
        emit('status', {'msg': 'User joined the game'}, room=game_id)

@socketio.on('leave_game')
def handle_leave_game(data):
    game_id = data.get('game_id')
    if game_id:
        leave_room(game_id)
        emit('status', {'msg': 'User left the game'}, room=game_id)

@socketio.on('chat_message')
def handle_chat_message(data):
    game_id = data.get('game_id')
    username = data.get('username', 'Anonymous')
    message = data.get('message')
    
    if game_id and message and game_id in active_games:
        chat_entry = {
            'username': username,
            'message': message,
            'timestamp': datetime.datetime.utcnow().isoformat()
        }
        active_games[game_id]['chat'].append(chat_entry)
        emit('chat_message', chat_entry, room=game_id)

@socketio.on('game_move')
def handle_game_move(data):
    game_id = data.get('game_id')
    move = data.get('move')
    username = data.get('username', 'Anonymous')
    
    if game_id and move and game_id in active_games:
        # Process the move (simplistic approach for demonstration)
        game = active_games[game_id]
        game['moves'].append(move)
        game['current_turn'] = 'black' if game['current_turn'] == 'white' else 'white'
        
        # Notify all clients in the room about the move
        emit('game_update', {
            'move': move,
            'username': username,
            'current_turn': game['current_turn'],
            'board': game['board']  # In a real implementation, update this with the new board state
        }, room=game_id)

if __name__ == '__main__':
    socketio.run(app, debug=True, port=8000)
