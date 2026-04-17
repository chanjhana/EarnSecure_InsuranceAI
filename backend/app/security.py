"""JWT token helpers for auth issuance and verification."""

from __future__ import annotations

import hashlib
import hmac
import os
from datetime import datetime, timedelta, timezone
from typing import Any

import jwt
from passlib.context import CryptContext

JWT_ALGORITHM = "HS256"
JWT_ACCESS_TTL_MINUTES = int(os.getenv("JWT_ACCESS_TTL_MINUTES", "1440"))
JWT_SECRET = os.getenv("JWT_SECRET", "earnsecure-dev-secret-change-me-32b")


def create_access_token(rider_id: str, phone: str, role: str = "rider") -> str:
    now = datetime.now(timezone.utc)
    expires_at = now + timedelta(minutes=JWT_ACCESS_TTL_MINUTES)
    payload: dict[str, Any] = {
        "sub": rider_id,
        "phone": phone,
        "role": role,
        "iat": int(now.timestamp()),
        "exp": int(expires_at.timestamp()),
        "type": "access",
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)


def decode_access_token(token: str) -> dict[str, Any]:
    payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
    if payload.get("type") != "access":
        raise jwt.InvalidTokenError("invalid token type")
    return payload


pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def hash_password(password: str) -> str:
    # Ensure password is within bcrypt's 72-byte limit
    password_bytes = password.encode('utf-8')
    truncated_bytes = password_bytes[:72]
    return pwd_context.hash(truncated_bytes)


def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)


def verify_admin_password(plain_password: str) -> bool:
    bcrypt_hash = (os.getenv("ADMIN_PASSWORD_HASH") or "").strip()
    if bcrypt_hash:
        try:
            return verify_password(plain_password, bcrypt_hash)
        except ValueError:
            return False

    sha256_hash = (os.getenv("ADMIN_SECRET_HASH") or "").strip()
    if not sha256_hash:
        return False

    incoming = hashlib.sha256(plain_password.encode("utf-8")).hexdigest()
    return hmac.compare_digest(incoming, sha256_hash)