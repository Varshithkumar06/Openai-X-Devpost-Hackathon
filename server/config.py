import os


def _load_env_file():
    possible_paths = [
        os.path.join(os.path.dirname(__file__), "..", ".env"),
        os.path.join(os.path.dirname(__file__), ".env"),
        os.path.join(os.getcwd(), ".env")
    ]
    for env_path in possible_paths:
        env_path = os.path.abspath(env_path)
        if os.path.exists(env_path):
            try:
                with open(env_path, "r", encoding="utf-8") as f:
                    for line in f:
                        line = line.strip()
                        if not line or line.startswith("#") or "=" not in line:
                            continue
                        key, value = line.split("=", 1)
                        key = key.strip()
                        value = value.strip()
                        if (value.startswith('"') and value.endswith('"')) or (value.startswith("'") and value.endswith("'")):
                            value = value[1:-1]
                        if key and key not in os.environ:
                            os.environ[key] = value
                break
            except Exception:
                pass


_load_env_file()


class Config:
    MAIL_SERVER = os.environ.get("MAIL_SERVER", "smtp.gmail.com")
    MAIL_PORT = int(os.environ.get("MAIL_PORT", 587))
    MAIL_USERNAME = os.environ.get("MAIL_USERNAME", "")
    MAIL_PASSWORD = os.environ.get("MAIL_PASSWORD", "")
    MAIL_SENDER_NAME = os.environ.get("MAIL_SENDER_NAME", "DriveSphere")

    JWT_SECRET_KEY = os.environ.get("JWT_SECRET_KEY", "drivesphere_secret_key")
    JWT_EXPIRY_HOURS = int(os.environ.get("JWT_EXPIRY_HOURS", 24))

    OTP_EXPIRY_MINUTES = 5
    OTP_MAX_ATTEMPTS = 5

    MAX_OTP_REQUESTS_PER_HOUR = 5
    MAX_FAILED_LOGINS = 5
    LOCKOUT_DURATION_MINUTES = 15
