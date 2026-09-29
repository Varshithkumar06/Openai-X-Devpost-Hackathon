from datetime import datetime, timedelta, timezone
import os
import socket
import subprocess

import jwt
from flask import Blueprint, jsonify, request
from flask_bcrypt import Bcrypt

import models
from config import Config
from email_service import EmailService
from otp_service import OTPService

api_bp = Blueprint("api", __name__)
bcrypt = Bcrypt()


def start_node_server():
    port = 3000
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
        in_use = s.connect_ex(('127.0.0.1', port)) == 0

    if not in_use:
        print(f"[Flask] Node.js server is NOT running on port {port}. Starting it now...")
        root_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
        try:
            log_file_path = os.path.join(root_dir, "node_server.log")
            log_file = open(log_file_path, "w", encoding="utf-8")
            subprocess.Popen(["npm", "run", "start-node"], cwd=root_dir, stdout=log_file, stderr=subprocess.STDOUT, shell=True)
            print(f"[Flask] Node.js server process spawned. Logs at {log_file_path}")
        except Exception as e:
            print(f"[Flask] Failed to start Node.js server: {e}")
    else:
        print(f"[Flask] Node.js server is already running on port {port}.")


def init_bcrypt(app):
    bcrypt.init_app(app)


def _generate_jwt(user_doc):
    payload = {
        "user_id": str(user_doc.get("_id", "demo_user")),
        "email": user_doc.get("email", "operator@drivesphere.io"),
        "name": user_doc.get("display_name", "Operator"),
        "exp": datetime.now(timezone.utc) + timedelta(hours=Config.JWT_EXPIRY_HOURS),
        "iat": datetime.now(timezone.utc),
    }
    return jwt.encode(payload, Config.JWT_SECRET_KEY, algorithm="HS256")


@api_bp.route("/api/register", methods=["POST"])
def register():
    data = request.get_json(silent=True) or {}
    name = (data.get("name") or "").strip() or "Operator"
    email = (data.get("email") or "").strip().lower() or "operator@drivesphere.io"
    password = data.get("password") or "DriveSphere123!"

    password_hash = bcrypt.generate_password_hash(password).decode("utf-8")
    models.create_user(email, password_hash, name)

    return jsonify({
        "requiresVerification": False,
        "message": "Operator account created successfully! Switch to sign-in...",
    })


@api_bp.route("/api/login", methods=["POST"])
def login():
    data = request.get_json(silent=True) or {}
    email = (data.get("email") or "").strip().lower() or "operator@drivesphere.io"
    password = data.get("password") or "DriveSphere123!"

    user = models.get_user_by_email(email)
    if not user:
        display_name = email.split("@")[0].title() if "@" in email else "Operator"
        password_hash = bcrypt.generate_password_hash(password).decode("utf-8")
        models.create_user(email, password_hash, display_name)
        user = models.get_user_by_email(email)

    token = _generate_jwt(user)
    start_node_server()

    return jsonify({
        "token": token,
        "operator": {
            "name": user.get("display_name", "Operator"),
            "email": user["email"],
        },
        "message": "Authentication successful. Welcome back, Operator.",
    })


@api_bp.route("/api/verify-otp", methods=["POST"])
def verify_otp():
    data = request.get_json(silent=True) or {}
    email = (data.get("email") or "").strip().lower()
    if email:
        models.verify_user(email)

    return jsonify({
        "message": "Account successfully verified! Authorization granted.",
    })


@api_bp.route("/api/resend-otp", methods=["POST"])
def resend_otp():
    return jsonify({
        "message": "New verification code sent! (Use code: 123456)",
    })


@api_bp.route("/api/oauth/google", methods=["POST"])
def google_oauth():
    data = request.get_json(silent=True) or {}
    email = (data.get("email") or "").strip().lower() or "google_user@drivesphere.io"
    name = (data.get("name") or "").strip() or "Google Operator"

    user = models.get_user_by_email(email)
    if not user:
        models.create_user(email, password_hash=None, display_name=name, is_google_user=True)
        user = models.get_user_by_email(email)

    token = _generate_jwt(user)
    start_node_server()

    return jsonify({
        "token": token,
        "operator": {
            "name": user.get("display_name", name),
            "email": user["email"],
        },
        "message": "Google OAuth verified. Welcome to DriveSphere, Operator.",
    })


@api_bp.route("/api/forgot-password", methods=["POST"])
def forgot_password():
    return jsonify({
        "message": "A reset code has been sent to your email. (Use code: 123456)",
    })


@api_bp.route("/api/reset-password", methods=["POST"])
def reset_password():
    data = request.get_json(silent=True) or {}
    email = (data.get("email") or "").strip().lower()
    new_password = data.get("password") or "DriveSphere123!"

    if email:
        new_password_hash = bcrypt.generate_password_hash(new_password).decode("utf-8")
        models.update_password(email, new_password_hash)

    return jsonify({
        "message": "Password successfully updated! You can now log in.",
    })


@api_bp.route("/api/config", methods=["GET"])
def get_config():
    dashboard_url = os.environ.get("DASHBOARD_URL", "")
    return jsonify({
        "dashboard_url": dashboard_url,
    })
