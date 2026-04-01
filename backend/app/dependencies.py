"""Shared dependencies and singletons."""
from .storage import InMemoryStore

# Single in-memory store (Demo-only. TODO : replace with a proper database and data access layer.)
_store = InMemoryStore()


def get_store() -> InMemoryStore:
    return _store
