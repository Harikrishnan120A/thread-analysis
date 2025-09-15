# PowerShell setup for backend
python -m venv .venv
. .venv/Scripts/Activate.ps1
pip install -U pip
pip install fastapi "uvicorn[standard]" pydantic pymongo qdrant-client google-generativeai langgraph websockets python-dotenv httpx numpy scikit-learn networkx