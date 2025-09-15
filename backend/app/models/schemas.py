from pydantic import BaseModel, Field
from typing import Optional, List, Literal
from datetime import datetime

NodeState = Literal["healthy", "degraded", "quarantined", "attacked"]

class Node(BaseModel):
    id: str
    name: str
    ip: str
    state: NodeState = "healthy"
    cpu: float = 0.0
    mem: float = 0.0
    net_in: float = 0.0
    net_out: float = 0.0
    load: float = 0.0
    quarantined: bool = False

class SecurityEvent(BaseModel):
    id: str
    node_id: str
    type: str
    severity: Literal["low", "medium", "high", "critical"]
    message: str
    created_at: datetime = Field(default_factory=datetime.utcnow)
    prev_hash: Optional[str] = None
    hash: Optional[str] = None

class ThreatDecision(BaseModel):
    action: Literal["monitor", "quarantine", "redistribute", "notify"]
    confidence: float = 0.5
    rationale: Optional[str] = None