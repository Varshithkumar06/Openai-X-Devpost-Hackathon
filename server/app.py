import os
import sys

# Ensure local modules (models, routes, config) are resolvable
server_dir = os.path.dirname(os.path.abspath(__file__))
if server_dir not in sys.path:
    sys.path.insert(0, server_dir)

from flask import Flask, send_from_directory
from flask_cors import CORS

import models
from routes import api_bp, init_bcrypt


def create_app():
    app = Flask(__name__, static_folder=None)
    app.config["SECRET_KEY"] = os.urandom(32).hex()

    CORS(app, resources={r"/api/*": {"origins": "*"}})

    init_bcrypt(app)
    app.register_blueprint(api_bp)

    frontend_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))

    @app.route("/")
    def serve_index():
        return send_from_directory(frontend_dir, "index.html")

    @app.route("/<path:filename>")
    def serve_static(filename):
        filepath = os.path.join(frontend_dir, filename)
        if os.path.isfile(filepath):
            return send_from_directory(frontend_dir, filename)
        return send_from_directory(frontend_dir, "index.html")

    return app


def main():
    print()
    print("==================================================")
    print("     DRIVESPHERE E-HORIZON SERVER")
    print("     Vehicular Intelligence Backend")
    print("==================================================")
    print()

    print("[INIT] User & Auth Store initialized (Zero external DB dependency).")
    models.init_db()

    print("[INIT] OK - JWT authentication enabled.")
    print()
    print("[SERVER] Starting on http://localhost:5000")
    print("[SERVER] Press Ctrl+C to stop.")
    print()

    app = create_app()
    port = int(os.environ.get("PORT", 5000))
    app.run(host="0.0.0.0", port=port, debug=True, use_reloader=False)


if __name__ == "__main__":
    main()
