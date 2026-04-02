"""Shared dependencies and singletons."""
from __future__ import annotations

import os
from pathlib import Path

from fastapi import Depends, HTTPException
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
import jwt
from dotenv import load_dotenv

from .postgres_store import PostgresBackedStore
from .security import decode_access_token
from .storage import InMemoryStore

_env_file = Path(__file__).resolve().parents[1] / ".env.local"
load_dotenv(_env_file)
_database_url = os.getenv("DATABASE_URL")

# Use PostgreSQL when DATABASE_URL is configured; fallback to in-memory for local resilience.
if _database_url:
    try:
        _store = PostgresBackedStore(_database_url)
        print("Connected to PostgreSQL store")
    except Exception as exc:
        print(f"PostgreSQL init failed, using in-memory store: {exc}")
        _store = InMemoryStore()
else:
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
