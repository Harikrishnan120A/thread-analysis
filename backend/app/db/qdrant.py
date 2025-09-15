from qdrant_client import QdrantClient
from qdrant_client.http import models as qmodels
from .config import settings

_client: QdrantClient | None = None

COLLECTION = settings.QDRANT_COLLECTION


def get_qdrant() -> QdrantClient:
    global _client
    if _client is None:
        _client = QdrantClient(url=settings.QDRANT_URL)
        ensure_collection(_client)
    return _client


def ensure_collection(client: QdrantClient):
    try:
        client.get_collection(COLLECTION)
    except Exception:
        client.recreate_collection(
            collection_name=COLLECTION,
            vectors_config=qmodels.VectorParams(size=128, distance=qmodels.Distance.COSINE),
        )