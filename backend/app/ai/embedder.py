import numpy as np
from typing import Dict, Any

class SimpleEmbedder:
    def __init__(self, dim: int = 128):
        self.dim = dim

    def embed(self, features: Dict[str, Any]) -> list[float]:
        # Deterministic sparse hashing of features to a fixed-size vector
        vec = np.zeros(self.dim, dtype=np.float32)
        for k, v in features.items():
            key = f"{k}:{v}".encode()
            h = (hash(key) % self.dim)
            vec[h] += float(v) if isinstance(v, (int, float)) else 1.0
        # normalize
        norm = np.linalg.norm(vec) or 1.0
        return (vec / norm).tolist()