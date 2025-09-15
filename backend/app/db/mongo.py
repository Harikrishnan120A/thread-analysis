from pymongo import MongoClient
from .config import settings

_client: MongoClient | None = None

def get_mongo() -> MongoClient:
    global _client
    if _client is None:
        _client = MongoClient(settings.MONGODB_URI)
    return _client

def get_db():
    return get_mongo()[settings.MONGODB_DB]