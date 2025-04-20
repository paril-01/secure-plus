from fastapi import FastAPI, Depends, HTTPException, status, Form, File as FastAPIFile, UploadFile, WebSocket, WebSocketDisconnect  # File for uploads
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel
from typing import Dict, Optional, List, Any
import jwt
import datetime
import os
import base64
import uuid
import shutil
from cryptography.hazmat.primitives.ciphers import Cipher, algorithms, modes
from cryptography.hazmat.backends import default_backend
from cryptography.hazmat.primitives.asymmetric import rsa, padding
from cryptography.hazmat.primitives import serialization, hashes
from sqlalchemy.orm import Session
import pyotp
import json
from .models import (
    SessionLocal, engine, Base,
    User, File as DBFile, Email, ChatMessage,  # File is the SQLAlchemy model
    TempStorage, BackupStorage, UserSession, ChessMove
)

# Ensure database tables exist
Base.metadata.create_all(bind=engine)

app = FastAPI(title="SecurePlus API", description="Secure Google Drive Alternative with RAM-based operations")

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, restrict this to specific domains
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Secret key for JWT
SECRET_KEY = os.environ.get("SECRET_KEY", "your_secret_key_here")
ALGORITHM = "HS256"

from fastapi.responses import FileResponse

@app.get("/")
def read_index():
    return FileResponse(os.path.join("frontend", "index.html"))
ACCESS_TOKEN_EXPIRE_MINUTES = 30

# Define OAuth2 scheme
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="token")

# Create uploads directory if not exists
os.makedirs("uploads", exist_ok=True)
os.makedirs("temp_storage", exist_ok=True)
os.makedirs("backups", exist_ok=True)

# Pydantic models for request/response
class Token(BaseModel):
    access_token: str
    token_type: str
    user_id: int

class TokenData(BaseModel):
    username: Optional[str] = None

class UserBase(BaseModel):
    username: str
    
class UserCreate(UserBase):
    password: str
    
class UserResponse(UserBase):
    id: int
    role: str
    disabled: bool
    
    class Config:
        orm_mode = True

class FileBase(BaseModel):
    filename: str
    file_type: str
    
class FileResponse(FileBase):
    id: int
    created_at: datetime.datetime
    updated_at: datetime.datetime
    
    class Config:
        orm_mode = True

class EmailBase(BaseModel):
    subject: str
    recipient: str
    content: str
    
class EmailResponse(EmailBase):
    id: int
    sender: str
    sent_at: datetime.datetime
    
    class Config:
        orm_mode = True

class ChessMoveBase(BaseModel):
    move_sequence: str
    
class ChessMoveResponse(ChessMoveBase):
    id: int
    
    class Config:
        orm_mode = True

# Database dependency
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# Helper functions for password hashing (replace with a proper hashing lib in production)
def verify_password(plain_password, hashed_password):
    # In a real app, use passlib or bcrypt
    return plain_password == hashed_password  

def get_password_hash(password):
    # In a real app, use passlib or bcrypt
    return password  

# Helper functions for authentication
def get_user(db, username: str):
    return db.query(User).filter(User.username == username).first()

def authenticate_user(db, username: str, password: str):
    user = get_user(db, username)
    if not user:
        return False
    if not verify_password(password, user.hashed_password):
        return False
    return user

# Token creation
def create_access_token(data: dict, expires_delta: Optional[datetime.timedelta] = None):
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.datetime.utcnow() + expires_delta
    else:
        expire = datetime.datetime.utcnow() + datetime.timedelta(minutes=15)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

# User dependency
async def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        username: str = payload.get("sub")
        if username is None:
            raise credentials_exception
        token_data = TokenData(username=username)
    except jwt.PyJWTError:
        raise credentials_exception
    user = get_user(db, username=token_data.username)
    if user is None:
        raise credentials_exception
    return user

async def get_current_active_user(current_user: User = Depends(get_current_user)):
    if current_user.disabled:
        raise HTTPException(status_code=400, detail="Inactive user")
    return current_user

# Encryption functions
def generate_key():
    return os.urandom(32)  # 256 bits

def generate_iv():
    return os.urandom(16)  # 128 bits

def encrypt_data(data: bytes, key: bytes = None, iv: bytes = None) -> Dict[str, bytes]:
    if key is None:
        key = generate_key()
    if iv is None:
        iv = generate_iv()
    
    cipher = Cipher(algorithms.AES(key), modes.CFB(iv), backend=default_backend())
    encryptor = cipher.encryptor()
    encrypted_data = encryptor.update(data) + encryptor.finalize()
    
    return {
        "encrypted_data": encrypted_data,
        "key": key,
        "iv": iv
    }

def decrypt_data(encrypted_data: bytes, key: bytes, iv: bytes) -> bytes:
    cipher = Cipher(algorithms.AES(key), modes.CFB(iv), backend=default_backend())
    decryptor = cipher.decryptor()
    decrypted_data = decryptor.update(encrypted_data) + decryptor.finalize()
    return decrypted_data

# Endpoints

@app.get("/")
async def read_root():
    return {"message": "Welcome to SecurePlus - The secure Google Drive alternative"}

# User registration and authentication
@app.post("/register", response_model=UserResponse)
async def register_user(user_data: UserCreate, db: Session = Depends(get_db)):
    db_user = get_user(db, username=user_data.username)
    if db_user:
        raise HTTPException(status_code=400, detail="Username already registered")
    
    hashed_password = get_password_hash(user_data.password)
    new_user = User(
        username=user_data.username,
        hashed_password=hashed_password,
        role="user"
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    return new_user

@app.post("/token", response_model=Token)
async def login_for_access_token(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    user = authenticate_user(db, form_data.username, form_data.password)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    # Update last login
    user.last_login = datetime.datetime.utcnow()
    db.commit()
    
    access_token_expires = datetime.timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": user.username}, expires_delta=access_token_expires
    )
    
    # Create a new session
    session_id = str(uuid.uuid4())
    new_session = UserSession(
        user_id=user.id,
        session_id=session_id,
        expires_at=datetime.datetime.utcnow() + access_token_expires
    )
    db.add(new_session)
    db.commit()
    
    return {"access_token": access_token, "token_type": "bearer", "user_id": user.id}

@app.get("/users/me", response_model=UserResponse)
async def read_users_me(current_user: User = Depends(get_current_active_user)):
    return current_user

# Chess-based authentication
@app.post("/chess/register-sequence", response_model=ChessMoveResponse)
async def register_chess_sequence(
    move_data: ChessMoveBase,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    # Check if user already has a move sequence
    existing_move = db.query(ChessMove).filter(ChessMove.user_id == current_user.id).first()
    if existing_move:
        existing_move.move_sequence = move_data.move_sequence
        db.commit()
        db.refresh(existing_move)
        return existing_move
    
    # Create new move sequence
    new_move = ChessMove(
        move_sequence=move_data.move_sequence,
        user_id=current_user.id
    )
    db.add(new_move)
    db.commit()
    db.refresh(new_move)
    return new_move

@app.post("/chess/verify-sequence")
async def verify_chess_sequence(move_data: ChessMoveBase, db: Session = Depends(get_db)):
    # Find a user with this chess sequence
    chess_move = db.query(ChessMove).filter(ChessMove.move_sequence == move_data.move_sequence).first()
    if not chess_move:
        raise HTTPException(status_code=400, detail="Invalid chess sequence")
    
    # Return username for login form
    user = db.query(User).filter(User.id == chess_move.user_id).first()
    return {"username": user.username}

# File management endpoints
@app.post("/files/upload", response_model=FileResponse)
async def upload_file(
    file: UploadFile = FastAPIFile(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    # Read file content
    file_content = await file.read()
    
    # Get file extension
    filename = file.filename
    file_type = filename.split('.')[-1] if '.' in filename else ''
    
    # Encrypt the file content
    encryption_result = encrypt_data(file_content)
    
    # Create a new file record
    new_file = File(
        filename=filename,
        file_type=file_type,
        content=encryption_result["encrypted_data"],
        owner_id=current_user.id
    )
    db.add(new_file)
    db.commit()
    db.refresh(new_file)
    
    # Store encryption keys securely (in a real system, this would be more secure)
    # In RAM-only mode, we store this in a temporary session
    session_id = str(uuid.uuid4())
    temp_storage = TempStorage(
        user_id=current_user.id,
        file_id=new_file.id,
        temp_content=json.dumps({
            "key": base64.b64encode(encryption_result["key"]).decode(),
            "iv": base64.b64encode(encryption_result["iv"]).decode()
        }).encode(),
        session_id=session_id
    )
    db.add(temp_storage)
    db.commit()
    
    # Create a backup
    backup = BackupStorage(
        user_id=current_user.id,
        file_id=new_file.id,
        backup_content=encryption_result["encrypted_data"]
    )
    db.add(backup)
    db.commit()
    
    return new_file

@app.get("/files", response_model=List[FileResponse])
async def list_files(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    files = db.query(File).filter(File.owner_id == current_user.id).all()
    return files

@app.get("/files/{file_id}")
async def get_file(
    file_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    # Get the file
    file = db.query(File).filter(File.id == file_id, File.owner_id == current_user.id).first()
    if not file:
        raise HTTPException(status_code=404, detail="File not found")
    
    # Get the encryption keys from temp storage
    temp_storage = db.query(TempStorage).filter(
        TempStorage.file_id == file_id,
        TempStorage.user_id == current_user.id
    ).first()
    
    if not temp_storage:
        raise HTTPException(status_code=404, detail="File keys not found in temporary storage")
    
    # Decrypt the keys
    keys_data = json.loads(temp_storage.temp_content.decode())
    key = base64.b64decode(keys_data["key"])
    iv = base64.b64decode(keys_data["iv"])
    
    # Decrypt the file
    decrypted_content = decrypt_data(file.content, key, iv)
    
    # Update last accessed
    temp_storage.last_accessed = datetime.datetime.utcnow()
    db.commit()
    
    return {
        "filename": file.filename,
        "content": base64.b64encode(decrypted_content).decode(),
        "file_type": file.file_type
    }

@app.put("/files/{file_id}", response_model=FileResponse)
async def update_file(
    file_id: int,
    file_content: bytes = FastAPIFile(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    # Get the file
    file = db.query(File).filter(File.id == file_id, File.owner_id == current_user.id).first()
    if not file:
        raise HTTPException(status_code=404, detail="File not found")
    
    # Encrypt the new content
    encryption_result = encrypt_data(file_content)
    
    # Update the file
    file.content = encryption_result["encrypted_data"]
    file.updated_at = datetime.datetime.utcnow()
    db.commit()
    db.refresh(file)
    
    # Update temp storage with new keys
    temp_storage = db.query(TempStorage).filter(
        TempStorage.file_id == file_id,
        TempStorage.user_id == current_user.id
    ).first()
    
    if temp_storage:
        temp_storage.temp_content = json.dumps({
            "key": base64.b64encode(encryption_result["key"]).decode(),
            "iv": base64.b64encode(encryption_result["iv"]).decode()
        }).encode()
        temp_storage.last_accessed = datetime.datetime.utcnow()
        db.commit()
    else:
        # Create new temp storage if not exists
        session_id = str(uuid.uuid4())
        new_temp = TempStorage(
            user_id=current_user.id,
            file_id=file.id,
            temp_content=json.dumps({
                "key": base64.b64encode(encryption_result["key"]).decode(),
                "iv": base64.b64encode(encryption_result["iv"]).decode()
            }).encode(),
            session_id=session_id
        )
        db.add(new_temp)
        db.commit()
    
    # Update backup
    backup = db.query(BackupStorage).filter(
        BackupStorage.file_id == file_id,
        BackupStorage.user_id == current_user.id
    ).first()
    
    if backup:
        backup.backup_content = encryption_result["encrypted_data"]
        backup.backup_at = datetime.datetime.utcnow()
        db.commit()
    else:
        new_backup = BackupStorage(
            user_id=current_user.id,
            file_id=file.id,
            backup_content=encryption_result["encrypted_data"]
        )
        db.add(new_backup)
        db.commit()
    
    return file

@app.delete("/files/{file_id}")
async def delete_file(
    file_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    # Get the file
    file = db.query(File).filter(File.id == file_id, File.owner_id == current_user.id).first()
    if not file:
        raise HTTPException(status_code=404, detail="File not found")
    
    # Delete temp storage
    temp_storage = db.query(TempStorage).filter(
        TempStorage.file_id == file_id,
        TempStorage.user_id == current_user.id
    ).delete()
    
    # Delete backup
    backup = db.query(BackupStorage).filter(
        BackupStorage.file_id == file_id,
        BackupStorage.user_id == current_user.id
    ).delete()
    
    # Delete the file
    db.delete(file)
    db.commit()
    
    return {"message": "File deleted successfully"}

# Session management
@app.post("/logout")
async def logout(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    # Deactivate all user sessions
    db.query(UserSession).filter(
        UserSession.user_id == current_user.id,
        UserSession.is_active == True
    ).update({UserSession.is_active: False})
    db.commit()
    
    # Clear all temp storage
    db.query(TempStorage).filter(TempStorage.user_id == current_user.id).delete()
    db.commit()
    
    return {"message": "Logged out successfully"}

# Document editing endpoints (simulating Word, Excel, etc.)
@app.post("/documents/create", response_model=FileResponse)
async def create_document(
    doc_type: str = Form(...),
    doc_name: str = Form(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    # Create empty document based on type
    if doc_type == "word":
        content = b"<document><body></body></document>"  # Simple XML for demo
        file_type = "docx"
    elif doc_type == "excel":
        content = b"<spreadsheet><sheet></sheet></spreadsheet>"  # Simple XML for demo
        file_type = "xlsx"
    elif doc_type == "presentation":
        content = b"<presentation><slide></slide></presentation>"  # Simple XML for demo
        file_type = "pptx"
    else:
        content = b""
        file_type = "txt"
    
    # Encrypt the content
    encryption_result = encrypt_data(content)
    
    # Create a new file record
    filename = f"{doc_name}.{file_type}"
    new_file = File(
        filename=filename,
        file_type=file_type,
        content=encryption_result["encrypted_data"],
        owner_id=current_user.id
    )
    db.add(new_file)
    db.commit()
    db.refresh(new_file)
    
    # Store encryption keys in temp storage
    session_id = str(uuid.uuid4())
    temp_storage = TempStorage(
        user_id=current_user.id,
        file_id=new_file.id,
        temp_content=json.dumps({
            "key": base64.b64encode(encryption_result["key"]).decode(),
            "iv": base64.b64encode(encryption_result["iv"]).decode()
        }).encode(),
        session_id=session_id
    )
    db.add(temp_storage)
    db.commit()
    
    # Create backup
    backup = BackupStorage(
        user_id=current_user.id,
        file_id=new_file.id,
        backup_content=encryption_result["encrypted_data"]
    )
    db.add(backup)
    db.commit()
    
    return new_file

# Internal email system
@app.post("/emails/send", response_model=EmailResponse)
async def send_email(
    email_data: EmailBase,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    # Encrypt email content
    encryption_result = encrypt_data(email_data.content.encode())
    
    # Create new email
    new_email = Email(
        subject=email_data.subject,
        content=encryption_result["encrypted_data"],
        user_id=current_user.id,
        sender=current_user.username,
        recipient=email_data.recipient
    )
    db.add(new_email)
    db.commit()
    db.refresh(new_email)
    
    # Store key in temp storage
    session_id = str(uuid.uuid4())
    temp_storage = TempStorage(
        user_id=current_user.id,
        temp_content=json.dumps({
            "key": base64.b64encode(encryption_result["key"]).decode(),
            "iv": base64.b64encode(encryption_result["iv"]).decode(),
            "type": "email",
            "email_id": new_email.id
        }).encode(),
        session_id=session_id
    )
    db.add(temp_storage)
    db.commit()
    
    return new_email

@app.get("/emails", response_model=List[EmailResponse])
async def list_emails(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    # Get emails where user is sender or recipient
    emails = db.query(Email).filter(
        (Email.user_id == current_user.id) | (Email.recipient == current_user.username)
    ).all()
    
    # For simplicity, we're returning encrypted emails without decryption
    # In a real app, you'd decrypt them before returning
    return emails

# Clear all local traces when app is closed
@app.post("/clear-traces")
async def clear_traces(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    # Mark all sessions as inactive
    db.query(UserSession).filter(
        UserSession.user_id == current_user.id,
        UserSession.is_active == True
    ).update({UserSession.is_active: False})
    
    # Remove all temp storage
    db.query(TempStorage).filter(TempStorage.user_id == current_user.id).delete()
    
    db.commit()
    
    return {"message": "All local traces cleared successfully"}

# WebSocket for real-time editing 
active_connections: Dict[int, List[WebSocket]] = {}

@app.websocket("/ws/document/{file_id}")
async def websocket_document_endpoint(
    websocket: WebSocket,
    file_id: int,
    user_id: int
):
    await websocket.accept()
    
    # Add connection to active connections
    if user_id not in active_connections:
        active_connections[user_id] = []
    active_connections[user_id].append(websocket)
    
    try:
        while True:
            # Receive document changes
            data = await websocket.receive_text()
            
            # Broadcast to all connected clients for this user
            for connection in active_connections.get(user_id, []):
                if connection != websocket:
                    await connection.send_text(data)
    except WebSocketDisconnect:
        # Remove connection when disconnected
        if user_id in active_connections:
            active_connections[user_id].remove(websocket)
            if not active_connections[user_id]:
                del active_connections[user_id]

# Serve static files (frontend)
app.mount("/static", StaticFiles(directory="frontend"), name="static")

# Run the application with uvicorn
if __name__ == "__main__":
    import uvicorn
    uvicorn.run("backend.main:app", host="0.0.0.0", port=8000, reload=True)
