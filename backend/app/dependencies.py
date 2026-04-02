"""Shared dependencies and singletons."""
from __future__ import annotations

from fastapi import Depends, HTTPException
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
import jwt

from .security import decode_access_token
from .storage import InMemoryStore

# Single in-memory store (Demo-only. TODO : replace with a proper database and data access layer.)
_store = InMemoryStore()
_bearer = HTTPBearer(auto_error=False)


def get_store() -> InMemoryStore:
    return _store


def get_token_payload(credentials: HTTPAuthorizationCredentials | None = Depends(_bearer)) -> dict:
    if credentials is None or not credentials.credentials:
        raise HTTPException(status_code=401, detail="missing bearer token")

    try:
        return decode_access_token(credentials.credentials)
    except jwt.InvalidTokenError as exc:
        raise HTTPException(status_code=401, detail="invalid or expired token") from exc


def get_current_rider_id(payload: dict = Depends(get_token_payload)) -> str:
    rider_id = payload.get("sub")
    if not rider_id or not isinstance(rider_id, str):
        raise HTTPException(status_code=401, detail="invalid token subject")
    return rider_id
