from typing import Tuple
from ..models.schemas import Node, ThreatDecision
from ..services.vectors import search_similar, upsert_threat_pattern
from ..ai.gemini_client import GeminiClient

# Simple thresholds for anomaly detection
CPU_HIGH = 0.9
NET_IN_SPIKE = 3000
NET_OUT_SPIKE = 2500


def features_from_node(n: Node) -> dict:
    return {
        "cpu": round(n.cpu, 3),
        "mem": round(n.mem, 3),
        "net_in": round(n.net_in, 1),
        "net_out": round(n.net_out, 1),
        "state": n.state,
        "quarantined": int(n.quarantined),
    }


def analyze_node(n: Node) -> Tuple[str, float, str]:
    # Heuristic anomaly detection
    if n.net_in > NET_IN_SPIKE and n.cpu > 0.8:
        return ("ddos", 0.9, "Net in spike with high CPU")
    if n.net_out > NET_OUT_SPIKE and n.cpu > 0.75:
        return ("exfiltration", 0.85, "High outbound traffic with high CPU")
    if n.cpu > CPU_HIGH and n.mem > 0.85:
        return ("degradation", 0.7, "CPU/MEM saturation")
    return ("benign", 0.4, "Normal range")


def decide_action(label: str, confidence: float) -> ThreatDecision:
    if label in ("ddos", "exfiltration") and confidence >= 0.8:
        return ThreatDecision(action="quarantine", confidence=confidence)
    if label == "degradation" and confidence >= 0.7:
        return ThreatDecision(action="redistribute", confidence=confidence)
    return ThreatDecision(action="monitor", confidence=confidence)


def vector_match(n: Node):
    feats = features_from_node(n)
    matches = search_similar(feats, limit=1)
    if matches:
        top = matches[0]
        score = float(top.score)
        payload = top.payload or {}
        label = payload.get("label", "unknown")
        return label, score
    return None, 0.0


def register_pattern(pattern_id: str, n: Node, label: str):
    feats = features_from_node(n)
    upsert_threat_pattern(pattern_id, feats, {"label": label})


def gemini_classify(n: Node, text: str):
    client = GeminiClient()
    return client.classify(text)