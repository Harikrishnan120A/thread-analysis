import hashlib
from typing import Optional
from ..models.schemas import SecurityEvent


def event_hash(event: SecurityEvent) -> str:
    payload = f"{event.id}|{event.node_id}|{event.type}|{event.severity}|{event.message}|{event.created_at.isoformat()}|{event.prev_hash or ''}"
    return hashlib.sha256(payload.encode()).hexdigest()