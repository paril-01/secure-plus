# Secure Plus

## 🔒 Secure Plus: Next-Gen File Storage & Authentication Platform

Secure Plus is a comprehensive, modern web application designed to provide secure file storage, robust user authentication, and seamless access management for individuals and organizations. Built with a modular Python/Flask backend and a dynamic JavaScript frontend, Secure Plus empowers users to safely store, manage, and retrieve files while ensuring top-notch security and usability.

---

## 🧠 Project Vision & Detailed Idea

**Secure Plus** aims to solve the growing need for a user-friendly, highly secure platform for file storage and access. The platform is designed to:

- **Protect sensitive files** with strong encryption and access controls
- **Authenticate users** using multi-factor authentication (MFA) and secure password hashing
- **Enable role-based access** for admins and users, supporting both personal and organizational use
- **Audit and log all access** for compliance and transparency
- **Provide a modern, responsive interface** for easy file management from any device

### Key Use Cases
- Secure file storage for individuals, teams, or companies
- Sharing confidential documents with granular access permissions
- Managing user accounts and roles (admin/user)
- Enforcing multi-factor authentication for critical access
- Tracking all file and user activity for auditing

---

## 🚀 Features
- **User Registration & Login** with secure password hashing
- **Role-Based Access Control:** Admin and User roles with different permissions
- **Multi-Factor Authentication (MFA):** Optional for enhanced security
- **Secure File Upload, Download, and Management**
- **Email Notifications** for account activity and file actions
- **Modern, Responsive Frontend** for a seamless user experience
- **SQLite Database** (easy to upgrade to PostgreSQL or other DBs)
- **Session Management & Audit Logging**
- **Easy local development and deployment**

---

## 🛠️ Tech Stack
- **Backend:** Python, Flask, SQLAlchemy
- **Frontend:** HTML, CSS, JavaScript
- **Database:** SQLite (default), easily swappable
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
├── README.md        # Project documentation
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

## ❗ Important Notes for Users & Developers
- **Security:** Never share your MFA secret or password. Use strong, unique passwords for all accounts.
- **Environment Variables:** For production, set environment variables for secret keys and database URIs.
- **Database:** Default is SQLite for easy setup. For production, switch to PostgreSQL or another robust DB.
- **Email Setup:** Configure SMTP settings in the backend for email notifications.
- **Dependencies:** All required Python packages are listed in `requirements.txt` and `requirements_flask.txt`.
- **IDE/Editor Settings:** `.idea/` is included for project consistency, but you may want to adjust settings for your preferred IDE.
- **Virtual Environment:** `.venv/` is included for convenience, but you may recreate it locally.
- **Testing:** Add your tests in a `tests/` directory for future expansion.

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
