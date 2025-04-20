# Secure Plus

## 🔒 Next-Gen Secure File Storage & Authentication Platform

Secure Plus is a robust, modern web application for secure file storage, user management, and multi-factor authentication. Built with a modular backend (Python/Flask, SQLAlchemy) and a dynamic frontend, Secure Plus is designed for both security and usability.

---

## 🚀 Features
- **User Registration & Login** with hashed passwords
- **Role-Based Access Control** (Admin/User)
- **Multi-Factor Authentication (MFA)** for enhanced security
- **Secure File Upload, Download & Management**
- **Email Notifications** for account activity
- **Modern, Responsive Frontend**
- **SQLite Database** (easy to swap for PostgreSQL)
- **Session Management & Audit Logging**

---

## 🛠️ Tech Stack
- **Backend:** Python, Flask, SQLAlchemy
- **Frontend:** HTML, CSS, JavaScript
- **Database:** SQLite (default), easy upgrade to PostgreSQL
- **Authentication:** MFA, hashed passwords

---

## 📦 Project Structure
```
secure-plus/
├── backend/         # Flask API, models, authentication
├── frontend/        # HTML, JS, CSS for UI
├── database/        # SQLite DB files
├── .idea/           # Project settings (for IDE)
├── .venv/           # Python virtual environment
├── __pycache__/     # Python cache
├── requirements.txt # Python dependencies
├── requirements_flask.txt # Flask dependencies
├── server.py        # App entry point
```

---

## ⚡ Getting Started
1. **Clone the repo:**
   ```bash
   git clone https://github.com/paril-01/secure-plus.git
   cd secure-plus
   ```
2. **Set up the Python environment:**
   ```bash
   python -m venv .venv
   source .venv/bin/activate  # On Windows: .venv\Scripts\activate
   pip install -r requirements.txt
   ```
3. **Run the server:**
   ```bash
   python server.py
   ```
4. **Access the app:**
   Open your browser and go to `http://localhost:5000`

---

## 🤝 Contributing
Pull requests are welcome! For major changes, please open an issue first to discuss what you would like to change.

---

## 🛡️ License
This project is licensed under the MIT License.

---

## 👤 Author
**Paril Rupani**  
[GitHub: paril-01](https://github.com/paril-01)

---

> **Secure Plus** — Where your files are safe, and your authentication is smarter!
