CyberGuard - Distributed Security Platform

Stack:
- Backend: FastAPI (Python), LangGraph, MongoDB, Qdrant, Gemini (optional)
- Frontend: Next.js (TypeScript)

Quick start (dev):
1) Start data services
   - docker compose -f infra/docker-compose.yml up -d
2) Backend
   - cd backend
   - ..\scripts\setup_backend.ps1
   - . .venv\Scripts\Activate.ps1; uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
3) Frontend
   - cd ..\frontend
   - npm install
   - set NEXT_PUBLIC_BACKEND_API_URL=http://localhost:8000
   - set NEXT_PUBLIC_BACKEND_WS_URL=ws://localhost:8000/ws
   - npm run dev

Dashboard
- Node grid with live metrics and status
- Buttons to quarantine/release
- Scenario triggers (DDoS on Node 3, Exfiltration on Node 5, Degradation on Node 2)
- Security events panel (hash-chained audit in MongoDB)

AI & Vectors
- Heuristic anomaly detection (CPU/MEM/Net thresholds)
- Qdrant vector matching via SimpleEmbedder (128-dim hash features)
- Gemini LLM classification (optional; set GEMINI_API_KEY)
- LangGraph agent orchestrates analyze/decide stages

Env
- Copy .env.example to .env and adjust as needed.

