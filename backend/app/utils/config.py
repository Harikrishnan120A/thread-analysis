import os
from dotenv import load_dotenv

load_dotenv()

class Settings:
    MONGODB_URI: str = os.getenv("MONGODB_URI", "mongodb://localhost:27017")
    MONGODB_DB: str = os.getenv("MONGODB_DB", "cyberguard")
    QDRANT_URL: str = os.getenv("QDRANT_URL", "http://localhost:6333")
    QDRANT_COLLECTION: str = os.getenv("QDRANT_COLLECTION", "threat_patterns")
    GEMINI_API_KEY: str | None = os.getenv("GEMINI_API_KEY")
    BACKEND_PORT: int = int(os.getenv("BACKEND_PORT", "8000"))
    WS_PATH: str = os.getenv("WS_PATH", "/ws")

settings = Settings()