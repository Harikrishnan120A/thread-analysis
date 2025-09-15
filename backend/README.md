Backend (FastAPI)

Run services (MongoDB + Qdrant) locally via Docker:

1) docker compose -f ../infra/docker-compose.yml up -d

Setup and run the backend (Windows PowerShell):

1) cd backend
2) ..\scripts\setup_backend.ps1
3) $env:BACKEND_PORT=8000; $env:WS_PATH="/ws"
4) . .venv\Scripts\Activate.ps1; uvicorn app.main:app --host 0.0.0.0 --port $env:BACKEND_PORT --reload

Environment variables (see ../.env.example):
- MONGODB_URI, MONGODB_DB
- QDRANT_URL, QDRANT_COLLECTION
- GEMINI_API_KEY (optional; falls back to heuristics when empty)
- BACKEND_PORT, WS_PATH

Key modules:
- app/main.py: FastAPI app + WebSocket + startup simulator
- app/sim/simulator.py: 5-node simulator + attacks, quarantine, redistribution
- app/ai/agent.py: LangGraph pipeline (ingest -> analyze -> decide -> act)
- app/services/detector.py: Heuristic anomaly detection + vector search + Gemini
- app/db/*: MongoDB + Qdrant clients
- app/utils/audit.py: Hash-chained audit logs

API endpoints:
- GET /api/nodes: current node states
- GET /api/events: recent security events
- GET /api/topology: simple ring topology
- POST /api/attack/{node_id}/{attack}: ddos | exfiltration | degradation
- POST /api/quarantine/{node_id}
- POST /api/release/{node_id}

Realtime:
- WebSocket at WS_PATH (default /ws) broadcasts node_update and security_event

Demo flows:
- Simulate DDoS on Node 3 -> quarantines and redistributes
- Simulate Exfiltration on Node 5 -> isolation + alert
- Simulate Degradation on Node 2 -> preemptive redistribution

