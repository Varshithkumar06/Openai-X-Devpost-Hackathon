from datetime import datetime, timedelta, timezone
import uuid

_users = {}
_otps = []
_rate_events = []


class _InMemoryCollection:
    def __init__(self, storage_dict):
        self.storage = storage_dict

    def find_one(self, query, sort=None):
        if not query:
            return None
        email = query.get("email")
        if email and email in self.storage:
            return self.storage[email]
        return None

    def insert_one(self, doc):
        doc_id = doc.get("_id") or str(uuid.uuid4())
        doc["_id"] = doc_id
        if "email" in doc:
            self.storage[doc["email"]] = doc
        return type("InsertResult", (), {"inserted_id": doc_id})()

    def update_one(self, query, update):
        email = query.get("email")
        if email and email in self.storage:
            set_vals = update.get("$set", {})
            self.storage[email].update(set_vals)

    def delete_one(self, query):
        email = query.get("email")
        if email and email in self.storage:
            del self.storage[email]
        else:
            doc_id = query.get("_id")
            for em, doc in list(self.storage.items()):
                if doc.get("_id") == doc_id:
                    del self.storage[em]
                    break


class _InMemoryDB:
    def __init__(self):
        self.users = _InMemoryCollection(_users)
        self.otps = type("DummyCollection", (), {
            "create_index": lambda *a, **kw: None,
            "find_one": lambda *a, **kw: None,
            "insert_one": lambda *a, **kw: None,
            "update_one": lambda *a, **kw: None,
            "update_many": lambda *a, **kw: None,
        })()
        self.rate_events = type("DummyCollection", (), {
            "create_index": lambda *a, **kw: None,
            "count_documents": lambda *a, **kw: 0,
            "insert_one": lambda *a, **kw: None,
        })()

    def command(self, cmd):
        return {"ok": 1.0}


_db = _InMemoryDB()


def get_db():
    return _db


def init_db():
    print("[DB] Standalone Auth Mode active — no external database required.")


def get_user_by_email(email):
    if not email:
        return None
    return _users.get(email.strip().lower())


def email_exists(email):
    return get_user_by_email(email) is not None


def create_user(email, password_hash, display_name="", is_google_user=False):
    now = datetime.now(timezone.utc)
    clean_email = email.strip().lower()
    user_id = str(uuid.uuid4())
    user_doc = {
        "_id": user_id,
        "email": clean_email,
        "password_hash": password_hash,
        "display_name": display_name or clean_email.split("@")[0].title(),
        "is_verified": True,
        "is_google_user": is_google_user,
        "failed_login_attempts": 0,
        "locked_until": None,
        "created_at": now,
        "updated_at": now,
    }
    _users[clean_email] = user_doc
    return user_id


def verify_user(email):
    user = get_user_by_email(email)
    if user:
        user["is_verified"] = True
        user["updated_at"] = datetime.now(timezone.utc)


def update_password(email, password_hash):
    user = get_user_by_email(email)
    if user:
        user["password_hash"] = password_hash
        user["updated_at"] = datetime.now(timezone.utc)


def increment_failed_attempts(email):
    pass


def reset_failed_attempts(email):
    user = get_user_by_email(email)
    if user:
        user["failed_login_attempts"] = 0
        user["locked_until"] = None


def is_account_locked(email):
    return False


def create_otp(email, otp_hash, purpose="register"):
    now = datetime.now(timezone.utc)
    clean_email = email.strip().lower()
    otp_doc = {
        "_id": str(uuid.uuid4()),
        "email": clean_email,
        "otp_hash": otp_hash,
        "purpose": purpose,
        "attempts": 0,
        "max_attempts": 5,
        "is_used": False,
        "expires_at": now + timedelta(minutes=15),
        "created_at": now,
    }
    _otps.append(otp_doc)
    return otp_doc


def get_active_otp(email, purpose="register"):
    clean_email = (email or "").strip().lower()
    for otp in reversed(_otps):
        if otp["email"] == clean_email and otp["purpose"] == purpose and not otp["is_used"]:
            return otp
    return {
        "_id": str(uuid.uuid4()),
        "email": clean_email,
        "otp_hash": "",
        "purpose": purpose,
        "attempts": 0,
        "max_attempts": 5,
        "is_used": False,
        "expires_at": datetime.now(timezone.utc) + timedelta(minutes=15),
        "created_at": datetime.now(timezone.utc),
    }


def mark_otp_used(otp_id):
    for otp in _otps:
        if otp["_id"] == otp_id:
            otp["is_used"] = True


def increment_otp_attempts(otp_id):
    pass


def count_recent_events(email, event_type, minutes=60):
    return 0


def log_rate_event(email, event_type):
    pass
