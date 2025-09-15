#!/usr/bin/env bash
set -euo pipefail
python -m venv .venv
source .venv/Scripts/activate 2>/dev/null || source .venv/bin/activate
pip install -U pip
pip install fastapi uvicorn[standard] pydantic pymongo qdrant-client google-generativeai langgraph websockets python-dotenv httpx numpy scikit-learn networkx