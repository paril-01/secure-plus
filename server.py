"""
SecurePlus - Main Server

This is the main entry point for the SecurePlus application.
Runs the FastAPI backend server and serves the frontend.
"""

import uvicorn
from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
import os
import webbrowser
from pathlib import Path

# Import the actual application
from backend.main import app as backend_app

# Mount static files from frontend
backend_app.mount("/", StaticFiles(directory="frontend", html=True), name="frontend")

# Add CORS middleware
backend_app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, restrict this to specific domains
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Ensure directories exist
os.makedirs("uploads", exist_ok=True)
os.makedirs("temp_storage", exist_ok=True)
os.makedirs("backups", exist_ok=True)

def open_browser():
    """Open a browser tab to the application"""
    webbrowser.open("http://localhost:8000")

if __name__ == "__main__":
    print("Starting SecurePlus server...")
    print("Access the application at http://localhost:8000")
    
    # Open browser after a short delay
    import threading
    threading.Timer(1.5, open_browser).start()
    
    # Start the server
    uvicorn.run("server:backend_app", host="0.0.0.0", port=8000, reload=True)
