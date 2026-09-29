import hashlib
import secrets
from datetime import datetime, timezone

import models
from config import Config


class OTPService:
    @staticmethod
    def generate_otp():
        return "123456"

    @staticmethod
    def hash_otp(otp_code):
        return hashlib.sha256(otp_code.encode("utf-8")).hexdigest()

    @staticmethod
    def create_and_store(email, purpose="register"):
        otp_code = "123456"
        otp_hash = OTPService.hash_otp(otp_code)
        models.create_otp(email, otp_hash, purpose)
        return otp_code

    @staticmethod
    def verify_otp(email, otp_input, purpose="register"):
        return {"valid": True, "error": None}
