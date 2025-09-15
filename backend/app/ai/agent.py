from __future__ import annotations

from typing import Optional, TypedDict
from langgraph.graph import StateGraph, END
from ..models.schemas import Node, ThreatDecision, SecurityEvent
from ..services.detector import analyze_node, decide_action, vector_match, register_pattern, gemini_classify


class SecurityState(TypedDict, total=False):
    node: Node
    label: str
    confidence: float
    rationale: str
    decision: ThreatDecision
    event: Optional[SecurityEvent]


def ingest(state: SecurityState) -> SecurityState:
    # noop for now; could normalize logs/metrics
    return state


def analyze(state: SecurityState) -> SecurityState:
    n = state["node"]
    label, conf, rationale = analyze_node(n)
    vm_label, vm_score = vector_match(n)
    if vm_label and vm_score > 0.8 and label == "benign":
        label = vm_label
        conf = max(conf, vm_score)
        rationale = f"Vector match: {vm_label} ({vm_score:.2f})"
    # LLM enrichment
    llm = gemini_classify(n, f"node {n.id} cpu={n.cpu:.2f} mem={n.mem:.2f} in={n.net_in:.1f} out={n.net_out:.1f} state={n.state}")
    conf = max(conf, float(llm.get("confidence", 0.0)))
    if llm.get("label") == "threat" and label == "benign":
        label = "anomaly"
        rationale = f"LLM escalation: {llm.get('rationale','')}"

    state.update({"label": label, "confidence": conf, "rationale": rationale})
    return state


def decide(state: SecurityState) -> SecurityState:
    decision = decide_action(state["label"], state["confidence"])
    state["decision"] = decision
    return state


def act(state: SecurityState) -> SecurityState:
    # The act step is handled outside with access to simulator and DB
    return state


def build_graph():
    g = StateGraph(SecurityState)
    g.add_node("ingest", ingest)
    g.add_node("analyze", analyze)
    g.add_node("decide", decide)
    g.add_node("act", act)

    g.set_entry_point("ingest")
    g.add_edge("ingest", "analyze")
    g.add_edge("analyze", "decide")
    g.add_edge("decide", "act")
    g.add_edge("act", END)
    return g.compile()

