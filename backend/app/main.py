import asyncio
import uuid
from typing import Dict
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from .utils.config import settings
from .db.mongo import get_db
from .utils.ws import WebSocketManager
from .utils.audit import event_hash
from .models.schemas import Node, SecurityEvent
from .sim.simulator import NodeSimulator
from .services.detector import register_pattern
from .ai.agent import build_graph, SecurityState

app = FastAPI(title="CyberGuard - Distributed Security Platform")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

ws_manager = WebSocketManager()
sim = NodeSimulator(["1", "2", "3", "4", "5"])


@app.on_event("startup")
async def startup():
    try:
        db = get_db()
        db.nodes.create_index("id", unique=True)
        db.events.create_index("id", unique=True)
        db.events.create_index("node_id")
        app.state.db_ready = True
    except Exception:
        # Degrade gracefully if DB is unavailable; retry later in loop
        app.state.db_ready = False
    agent = build_graph()

    async def on_metrics(n: Node):
        # Persist node status
        try:
            if getattr(app.state, 'db_ready', False):
                db.nodes.update_one({"id": n.id}, {"$set": n.dict()}, upsert=True)
        except Exception:
            app.state.db_ready = False
        await ws_manager.broadcast("node_update", n.dict())
        # Run agent pipeline (LangGraph)
        state: SecurityState = {"node": n}
        result = agent.invoke(state)
        label = result.get("label", "benign")
        conf = float(result.get("confidence", 0.0))
        rationale = result.get("rationale", "")
        decision = result.get("decision")
        evt = None
        if decision and getattr(decision, "action", None) == "quarantine" and not n.quarantined:
            sim.quarantine(n.id)
            sim.redistribute_load(n.id)
            evt = SecurityEvent(
                id=str(uuid.uuid4()),
                node_id=n.id,
                type=f"{label}",
                severity="critical",
                message=f"Node {n.id} quarantined due to {label} (conf={conf:.2f})"
            )
            register_pattern(evt.id, n, label)
        elif decision and getattr(decision, "action", None) == "redistribute":
            sim.redistribute_load(n.id)
            evt = SecurityEvent(
                id=str(uuid.uuid4()),
                node_id=n.id,
                type="degradation",
                severity="high",
                message=f"Load redistributed from Node {n.id}"
            )
        else:
            if label != "benign":
                evt = SecurityEvent(
                    id=str(uuid.uuid4()),
                    node_id=n.id,
                    type=label,
                    severity="medium",
                    message=rationale
                )
        if evt:
            try:
                if not getattr(app.state, 'db_ready', False):
                    # attempt to re-init DB lazily
                    _ = get_db().list_collection_names()
                    app.state.db_ready = True
                last = db.events.find_one(sort=[("created_at", -1)])
                evt.prev_hash = last.get("hash") if last else None
                evt.hash = event_hash(evt)
                db.events.insert_one(evt.dict())
            except Exception:
                app.state.db_ready = False
            await ws_manager.broadcast("security_event", evt.dict())

    # kick off simulator
    asyncio.create_task(sim.run(on_metrics))


@app.get("/api/nodes")
def list_nodes():
    db = get_db()
    nodes = list(db.nodes.find({}, {"_id": 0}))
    return {"nodes": nodes}


@app.get("/api/events")
def list_events(limit: int = 50):
    db = get_db()
    cursor = db.events.find({}, {"_id": 0}).sort("created_at", -1).limit(limit)
    return {"events": list(cursor)}


@app.get("/api/topology")
def topology():
    db = get_db()
    nodes = list(db.nodes.find({}, {"_id": 0, "id": 1, "name": 1}))
    # simple ring topology for demo
    edges = []
    for i in range(len(nodes)):
        a = nodes[i]["id"]
        b = nodes[(i + 1) % len(nodes)]["id"] if nodes else None
        if b:
            edges.append({"from": a, "to": b})
    return {"nodes": nodes, "edges": edges}


@app.post("/api/attack/{node_id}/{attack}")
def simulate_attack(node_id: str, attack: str):
    if node_id not in sim.nodes:
        return JSONResponse({"error": "not found"}, status_code=404)
    sim.simulate_attack(node_id, attack)
    return {"ok": True}


@app.post("/api/quarantine/{node_id}")
def quarantine(node_id: str):
    if node_id not in sim.nodes:
        return JSONResponse({"error": "not found"}, status_code=404)
    sim.quarantine(node_id)
    sim.redistribute_load(node_id)
    return {"ok": True}


@app.post("/api/release/{node_id}")
def release(node_id: str):
    if node_id not in sim.nodes:
        return JSONResponse({"error": "not found"}, status_code=404)
    sim.release(node_id)
    return {"ok": True}


@app.websocket(settings.WS_PATH)
async def ws_endpoint(ws: WebSocket):
    await ws_manager.connect(ws)
    try:
        while True:
            await ws.receive_text()  # ping-pong no-op
    except WebSocketDisconnect:
        await ws_manager.disconnect(ws)
