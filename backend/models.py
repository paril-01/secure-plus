from sqlalchemy import Column, Integer, String, ForeignKey, LargeBinary, Boolean, DateTime, Text
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import relationship, sessionmaker
from sqlalchemy import create_engine
import datetime
import os

Base = declarative_base()

# Database connection - Using SQLite instead of PostgreSQL
# Create a directory for the database if it doesn't exist
os.makedirs("database", exist_ok=True)
DATABASE_URL = "sqlite:///database/secureplus.db"
engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, index=True)
    hashed_password = Column(String)
    role = Column(String, default="user")
    disabled = Column(Boolean, default=False)
    mfa_secret = Column(String, nullable=True)
    last_login = Column(DateTime, default=datetime.datetime.utcnow)
    
    files = relationship("File", back_populates="owner")
    emails = relationship("Email", back_populates="user")
    
class File(Base):
    __tablename__ = "files"
    
    id = Column(Integer, primary_key=True, index=True)
    filename = Column(String)
    file_type = Column(String)  # docx, xlsx, etc.
    content = Column(LargeBinary)  # Encrypted content
    owner_id = Column(Integer, ForeignKey("users.id"))
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)
    
    owner = relationship("User", back_populates="files")
    
class Email(Base):
    __tablename__ = "emails"
    
    id = Column(Integer, primary_key=True, index=True)
    subject = Column(String)
    content = Column(LargeBinary)  # Encrypted content
    user_id = Column(Integer, ForeignKey("users.id"))
    sender = Column(String)
    recipient = Column(String)
    sent_at = Column(DateTime, default=datetime.datetime.utcnow)
    
    user = relationship("User", back_populates="emails")

class ChatMessage(Base):
    __tablename__ = "chat_messages"
    
    id = Column(Integer, primary_key=True, index=True)
    sender_id = Column(Integer, ForeignKey("users.id"))
    recipient_id = Column(Integer, ForeignKey("users.id"))
    content = Column(LargeBinary)  # Encrypted content
    sent_at = Column(DateTime, default=datetime.datetime.utcnow)
    read = Column(Boolean, default=False)
    
class TempStorage(Base):
    __tablename__ = "temp_storage"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    file_id = Column(Integer, ForeignKey("files.id"))
    temp_content = Column(LargeBinary)  # Encrypted content in memory
    last_accessed = Column(DateTime, default=datetime.datetime.utcnow)
    session_id = Column(String, unique=True)
    
class BackupStorage(Base):
    __tablename__ = "backup_storage"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    file_id = Column(Integer, ForeignKey("files.id"))
    backup_content = Column(LargeBinary)  # Encrypted backup content
    backup_at = Column(DateTime, default=datetime.datetime.utcnow)
    
class UserSession(Base):
    __tablename__ = "user_sessions"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    session_id = Column(String, unique=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    expires_at = Column(DateTime)
    is_active = Column(Boolean, default=True)
    
class ChessMove(Base):
    __tablename__ = "chess_moves"
    
    id = Column(Integer, primary_key=True, index=True)
    move_sequence = Column(Text)  # Store the sequence of moves that triggers login
    user_id = Column(Integer, ForeignKey("users.id"))
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

# Create all tables
Base.metadata.create_all(bind=engine)
