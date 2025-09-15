from typing import Dict, Any
from ..db.qdrant import get_qdrant, COLLECTION
from ..ai.embedder import SimpleEmbedder
from qdrant_client.http import models as qmodels
import logging

_embedder = SimpleEmbedder(128)


def upsert_threat_pattern(pattern_id: str, features: Dict[str, Any], payload: dict):
    try:
        client = get_qdrant()
        vector = _embedder.embed(features)
        client.upsert(
            collection_name=COLLECTION,
            points=[qmodels.PointStruct(id=pattern_id, vector=vector, payload=payload)],
        )
    except Exception as e:
        logging.getLogger(__name__).warning(f"Qdrant upsert failed: {e}")


def search_similar(features: Dict[str, Any], limit: int = 3):
    try:
        client = get_qdrant()
        vector = _embedder.embed(features)
        return client.search(collection_name=COLLECTION, query_vector=vector, limit=limit)
    except Exception as e:
        logging.getLogger(__name__).warning(f"Qdrant search failed: {e}")
        return []
