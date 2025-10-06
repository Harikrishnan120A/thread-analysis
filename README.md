# CyberGuard - Distributed Security Platform

A real-time cybersecurity monitoring and analytics platform with AI-powered threat detection.

## 🚀 Tech Stack

- **Backend**: FastAPI (Python), LangGraph, MongoDB, Qdrant, Gemini (optional)
- **Frontend**: Next.js 15.5 (TypeScript), Tailwind CSS
- **Infrastructure**: Docker, Docker Compose
- **Databases**: MongoDB (document store), Qdrant (vector DB), Redis (cache)

## ⚡ Quick Start with Docker (Recommended)

### Prerequisites
- Docker & Docker Compose installed
- Git

### 🐳 Run Everything with Docker

```bash
# Navigate to the cyberguard-platform directory
cd cyberguard-platform

# Start all services (backend, frontend, databases)
docker compose --profile dev up -d

# Check status
docker compose --profile dev ps

# View logs
docker compose --profile dev logs -f
```

**Access the application:**
- **Frontend Dashboard**: http://localhost:3000
- **Backend API**: http://localhost:8010
- **API Documentation**: http://localhost:8010/docs

### 🛑 Stop Services

```bash
docker compose --profile dev down
```

## 🔧 Manual Setup (Development)

### 1. Start Data Services

```bash
docker compose -f infra/docker-compose.yml up -d
```

### 2. Backend Setup

```powershell
cd backend
..\scripts\setup_backend.ps1
. .venv\Scripts\Activate.ps1
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

### 3. Frontend Setup

```powershell
cd frontend
npm install
$env:NEXT_PUBLIC_BACKEND_API_URL = "http://localhost:8000"
$env:NEXT_PUBLIC_BACKEND_WS_URL = "ws://localhost:8000/ws"
npm run dev
```

## 📊 Features

### Security Operations Center
- Real-time node monitoring with live metrics
- Interactive network topology visualization
- CPU usage, memory, and network activity tracking
- System uptime and health monitoring

### Threat Detection & Management
- AI-powered behavioral anomaly detection
- Heuristic threshold-based detection (CPU/MEM/Network)
- Vector-based threat matching via Qdrant
- LLM classification with Gemini (optional)
- LangGraph agent orchestration for analyze/decide stages

### Security Alerts
- Real-time security event notifications
- Hash-chained audit logging in MongoDB
- Severity-based threat classification (Low, Medium, High, Critical)
- Attack simulation capabilities

### Attack Scenarios
- DDoS simulation
- Data exfiltration detection
- Service degradation monitoring
- Node quarantine/release controls

## 🗄️ Database Services

| Service | Port | Purpose |
|---------|------|---------|
| MongoDB | 27017 | Document database for events & audit logs |
| Qdrant | 6333 | Vector database for threat matching |
| Redis | 6379 | Cache for real-time data |

## 📁 Project Structure

```
thread-analysis/
├── cyberguard-platform/          # Main application
│   ├── backend/                  # FastAPI backend
│   │   ├── ai_engine.py         # AI/ML threat detection
│   │   ├── langgraph_workflows.py # LangGraph orchestration
│   │   ├── main.py              # FastAPI app
│   │   └── node_simulator.py    # Network node simulation
│   ├── frontend/                 # Next.js frontend
│   │   └── src/
│   │       ├── app/             # Next.js app router
│   │       └── components/      # React components
│   └── docker-compose.yml       # Docker orchestration
├── backend/                      # Alternative backend
└── infra/                       # Infrastructure configs
```

## 🔐 Environment Configuration

Optional: Set your Gemini API key for enhanced AI capabilities

```bash
# In cyberguard-platform/docker.env
GEMINI_API_KEY=your_api_key_here
```

## 🎯 Usage

1. **Dashboard**: View real-time security metrics and network topology
2. **Simulate Attacks**: Click "Simulate Attack" to test threat detection
3. **Monitor Alerts**: Check the Security Alerts panel for detected threats
4. **Analyze Threats**: Navigate to Threats page for detailed analysis
5. **View Analytics**: Check system performance and threat statistics

## 🐛 Troubleshooting

### Port Conflicts
If you encounter port conflicts, stop existing services:
```bash
docker ps
docker stop <container_id>
```

### Frontend Not Loading Styles
If styles are missing, clear Next.js cache:
```bash
docker exec cyberguard-platform-frontend-1 rm -rf .next
docker compose --profile dev restart frontend
```

### Hard Refresh Browser
Press `Ctrl + Shift + R` (Windows/Linux) or `Cmd + Shift + R` (Mac)

## 📝 Development Notes

- Frontend runs on port 3000 in development mode with hot reload
- Backend runs on port 8010 (mapped from internal 8000) with auto-reload
- All services are networked together via Docker Compose
- Volume mounts enable live code updates without rebuilding

## 🤝 Contributing

This project is part of the thread-analysis repository. All changes are tracked on the master branch.

## 📄 License

[Add your license here]

