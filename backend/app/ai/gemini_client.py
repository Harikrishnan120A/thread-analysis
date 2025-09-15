import os
import google.generativeai as genai
from typing import Optional
from ..utils.config import settings

class GeminiClient:
    def __init__(self, api_key: Optional[str] = None):
        self.api_key = api_key or settings.GEMINI_API_KEY
        self.enabled = bool(self.api_key)
        if self.enabled:
            genai.configure(api_key=self.api_key)
            self.model = genai.GenerativeModel("gemini-1.5-flash")
        else:
            self.model = None

    def classify(self, text: str) -> dict:
        if not self.enabled or self.model is None:
            # Fallback heuristic classification
            score = 0.0
            lower = text.lower()
            indicators = [
                ("ddos", 0.9),
                ("exfiltration", 0.85),
                ("anomaly", 0.6),
                ("malware", 0.75),
                ("suspicious", 0.55),
            ]
            for token, w in indicators:
                if token in lower:
                    score = max(score, w)
            label = "benign" if score < 0.6 else "threat"
            return {"label": label, "confidence": score, "rationale": "heuristic fallback"}
        prompt = f"Classify this security event text into threat/benign and give confidence (0-1): {text}"
        try:
            resp = self.model.generate_content(prompt)
            out = resp.text.strip()
            label = "threat" if "threat" in out.lower() else "benign"
            # naive confidence parsing
            import re
            m = re.search(r"([01](?:\.\d+)?)", out)
            conf = float(m.group(1)) if m else 0.7
            return {"label": label, "confidence": conf, "rationale": out[:280]}
        except Exception as e:
            return {"label": "benign", "confidence": 0.5, "rationale": f"gemini_error: {e}"}