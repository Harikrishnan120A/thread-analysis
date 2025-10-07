import os
import time
from collections import defaultdict, deque
from typing import Deque, Dict, List, Optional, Tuple

import models

try:
    import google.generativeai as genai  # type: ignore
except Exception:  # pragma: no cover
    genai = None  # type: ignore

# Optional sklearn IsolationForest
try:
    from sklearn.ensemble import IsolationForest  # type: ignore
except Exception:  # pragma: no cover
    IsolationForest = None  # type: ignore

# Import threat dataset loader
try:
    from data_loader import ThreatDatasetLoader  # type: ignore
except Exception:  # pragma: no cover
    ThreatDatasetLoader = None  # type: ignore


class AIEngine:
    """
    Lightweight anomaly detector with optional Gemini enhancement.
    Maintains short histories to detect CPU spikes, memory leaks, and network anomalies.
    """

    def __init__(self) -> None:
        # History per node: deque of (ts, metrics)
        self.history: Dict[str, Deque[Tuple[float, models.NodeMetrics]]] = defaultdict(lambda: deque(maxlen=360))
        self.last_decision_at: Dict[str, float] = defaultdict(lambda: 0.0)

        # Thresholds and parameters
        self.cpu_spike_threshold = float(os.getenv("AI_CPU_SPIKE_THRESHOLD", "85"))
        self.cpu_spike_duration = float(os.getenv("AI_CPU_SPIKE_DURATION_SEC", "30"))
        self.mem_leak_window_sec = float(os.getenv("AI_MEM_LEAK_WINDOW_SEC", "60"))
        self.mem_leak_delta_pct = float(os.getenv("AI_MEM_LEAK_DELTA_PCT", "10"))  # percent increase
        self.net_baseline_window_sec = float(os.getenv("AI_NET_BASELINE_WINDOW_SEC", "60"))
        self.net_spike_factor = float(os.getenv("AI_NET_SPIKE_FACTOR", "3.0"))
        self.monitor_interval_sec = float(os.getenv("AI_MONITOR_INTERVAL_SEC", "5"))
        self.decision_cooldown_sec = float(os.getenv("AI_DECISION_COOLDOWN_SEC", "30"))

        # Optional Gemini config
        self.gemini_model_name = os.getenv("GEMINI_MODEL", "gemini-1.5-flash")
        self.gemini_api_key = os.getenv("GEMINI_API_KEY")
        self.gemini: Optional[object] = None
        if self.gemini_api_key and genai is not None:
            try:
                genai.configure(api_key=self.gemini_api_key)
                self.gemini = genai.GenerativeModel(self.gemini_model_name)
            except Exception:
                self.gemini = None

        # Optional Isolation Forest model per node (traffic feature only for demo)
        self.iforest: Dict[str, object] = {}
        # Very small RL Q-table for action selection
        self.q_table: Dict[Tuple[str, str], float] = defaultdict(float)  # (severity, feature) -> value
        
        # Load threat detection dataset
        self.threat_loader: Optional[object] = None
        self.threat_patterns: List[Dict] = []
        self.attack_signatures: Dict[str, List[Dict]] = {}
        self.anomaly_thresholds: Dict[str, Dict[str, float]] = {}
        self._load_threat_database()

    # ------- threat database loading -------
    def _load_threat_database(self) -> None:
        """Load threat patterns from Kaggle dataset if available"""
        if ThreatDatasetLoader is None:
            print("⚠️  ThreatDatasetLoader not available, using built-in heuristics")
            return
        
        try:
            print("🔄 Loading threat detection dataset...")
            self.threat_loader = ThreatDatasetLoader()
            
            # Try to load existing processed data first
            import json
            from pathlib import Path
            
            cache_dir = os.path.join(os.path.expanduser("~"), ".cyberguard", "datasets", "processed")
            patterns_file = os.path.join(cache_dir, "threat_patterns.json")
            signatures_file = os.path.join(cache_dir, "attack_signatures.json")
            
            if os.path.exists(patterns_file) and os.path.exists(signatures_file):
                with open(patterns_file, 'r') as f:
                    self.threat_patterns = json.load(f)
                with open(signatures_file, 'r') as f:
                    self.attack_signatures = json.load(f)
                print(f"✅ Loaded {len(self.threat_patterns)} threat patterns from cache")
            else:
                # Download and process dataset
                df = self.threat_loader.load_dataset()
                self.threat_patterns = self.threat_loader.extract_threat_patterns(df)
                self.attack_signatures = self.threat_loader.get_attack_signatures(df)
                self.anomaly_thresholds = self.threat_loader.get_anomaly_thresholds(df)
                self.threat_loader.save_processed_data()
                print(f"✅ Loaded and processed {len(self.threat_patterns)} threat patterns")
                
        except Exception as e:
            print(f"⚠️  Could not load threat database: {e}")
            print("    Falling back to built-in heuristics")
            self.threat_loader = None

    def _match_threat_pattern(self, flags: List[str], metrics: models.NodeMetrics) -> Optional[str]:
        """Match current behavior against known threat patterns from dataset"""
        if not self.threat_patterns:
            return None
        
        # Simple pattern matching based on detected flags
        flag_keywords = {
            'cpu_spike': ['ddos', 'dos', 'stress', 'overload'],
            'memory_leak': ['memory', 'leak', 'exhaustion', 'buffer'],
            'net_anomaly': ['ddos', 'exfiltration', 'scan', 'probe', 'flood'],
            'behavioral_anomaly': ['malware', 'trojan', 'anomaly']
        }
        
        matched_attacks = []
        for flag in flags:
            keywords = flag_keywords.get(flag, [])
            for pattern in self.threat_patterns:
                attack_type = pattern.get('attack_type', '').lower()
                if any(kw in attack_type for kw in keywords):
                    matched_attacks.append(attack_type)
        
        if matched_attacks:
            # Return the most common match
            return max(set(matched_attacks), key=matched_attacks.count)
        
        return None

    def record(self, node: models.NodeStatus) -> None:
        self.history[node.id].append((time.time(), node.metrics))

    def _window(self, node_id: str, sec: float) -> List[Tuple[float, models.NodeMetrics]]:
        cutoff = time.time() - sec
        return [item for item in self.history.get(node_id, []) if item[0] >= cutoff]

    # ------- detectors -------
    def _cpu_spike(self, node_id: str) -> bool:
        win = self._window(node_id, self.cpu_spike_duration)
        if len(win) < max(2, int(self.cpu_spike_duration // 2)):
            return False
        over = [m.cpu for (_, m) in win if m.cpu >= self.cpu_spike_threshold]
        return len(over) >= max(2, int(0.8 * len(win)))

    def _memory_leak(self, node_id: str) -> bool:
        win = self._window(node_id, self.mem_leak_window_sec)
        if len(win) < 5:
            return False
        mems = [m.memory for (_, m) in win]
        increases = sum(1 for i in range(1, len(mems)) if mems[i] > mems[i - 1])
        delta = (mems[-1] - mems[0])
        # percent relative to start
        pct = (delta / max(1e-6, mems[0])) * 100.0
        return increases >= int(0.7 * (len(mems) - 1)) and pct >= self.mem_leak_delta_pct

    def _net_anomaly(self, node_id: str) -> bool:
        win = self._window(node_id, self.net_baseline_window_sec)
        if len(win) < 5:
            return False
        traf = [m.network_in + m.network_out for (_, m) in win]
        baseline = sum(traf[:-1]) / max(1, len(traf) - 1)
        current = traf[-1]
        spike = current > max(1.0, baseline * self.net_spike_factor)
        # IsolationForest fallback on traffic sequence (if available)
        if IsolationForest is not None and len(traf) >= 10:
            try:
                xs = [[x] for x in traf[-50:]]
                model = self.iforest.get(node_id)
                if model is None:
                    model = IsolationForest(n_estimators=50, contamination=0.1, random_state=0)
                    model.fit(xs)
                    self.iforest[node_id] = model
                score = model.decision_function([[current]])[0]  # higher = normal
                spike = spike or (score < -0.1)
            except Exception:
                pass
        return spike

    # ------- analysis and decisions -------
    def _classify(self, flags: List[str]) -> str:
        if not flags:
            return "low"
        if {"cpu_spike", "net_anomaly"}.issubset(flags):
            return "critical"
        if "memory_leak" in flags and ("cpu_spike" in flags or "net_anomaly" in flags):
            return "high"
        if "cpu_spike" in flags or "memory_leak" in flags or "net_anomaly" in flags:
            return "medium"
        return "low"

    def _recommend(self, severity: str, flags: List[str]) -> List[str]:
        actions: List[str] = []
        if severity in ("high", "critical"):
            if "net_anomaly" in flags:
                actions.append("throttle_traffic")
            actions.append("quarantine")
            actions.append("deep_scan")
        elif severity == "medium":
            actions.append("deep_scan")
            actions.append("increase_monitoring")
        else:
            actions.append("observe")
        # Simple RL: increase value for actions that address detected flags
        for a in actions:
            for f in flags:
                self.q_table[(severity, f)] += 0.01
        # Sort actions by learned value
        actions.sort(key=lambda a: -sum(self.q_table.get((severity, f), 0.0) for f in flags))
        return actions

    def _gemini_reason(self, node_id: str, flags: List[str], severity: str) -> Optional[str]:
        if not self.gemini:
            # Use threat pattern matching as fallback
            matched_threat = self._match_threat_pattern(flags, self.history[node_id][-1][1] if self.history[node_id] else None)
            if matched_threat:
                return f"Detected pattern matching '{matched_threat}' attack. Flags: {', '.join(flags)}. Severity: {severity.upper()}."
            return None
        try:
            # Enhanced prompt with threat database context
            threat_context = ""
            if self.threat_patterns:
                threat_context = f" Known threat patterns in database: {len(self.threat_patterns)} types."
            
            prompt = (
                "You are a SOC assistant. Given detected anomalies "
                f"{flags} on node {node_id} with severity {severity}.{threat_context} "
                "Explain briefly (one sentence) the most likely cause and next step."
            )
            res = self.gemini.generate_content(prompt)  # type: ignore[attr-defined]
            text = getattr(res, "text", None) or (getattr(res, "candidates", [None])[0].content.parts[0].text if getattr(res, "candidates", None) else None)  # type: ignore[index]
            return text.strip() if isinstance(text, str) else None
        except Exception:
            return None

    def analyze_node(self, node: models.NodeStatus) -> Optional[models.AIAnalysisResult]:
        flags: List[str] = []
        if self._cpu_spike(node.id):
            flags.append("cpu_spike")
        if self._memory_leak(node.id):
            flags.append("memory_leak")
        if self._net_anomaly(node.id):
            flags.append("net_anomaly")
        # Basic LSTM-like: predict next cpu by EMA and flag if surprise is large
        win = self._window(node.id, 30)
        if len(win) >= 5:
            alpha = 0.5
            pred = win[0][1].cpu
            for (_, m) in win[1:]:
                pred = alpha * m.cpu + (1 - alpha) * pred
            if abs(win[-1][1].cpu - pred) > 25.0:
                flags.append("behavioral_anomaly")
        severity = self._classify(flags)
        if severity == "low" and not flags:
            return None
        
        # Match against known threat patterns
        matched_threat = self._match_threat_pattern(flags, node.metrics)
        
        reasoning = self._gemini_reason(node.id, flags, severity) or (
            f"Detected {', '.join(flags)}; classified as {severity.upper()}" +
            (f"; matches '{matched_threat}' pattern" if matched_threat else "")
        )
        # Confidence heuristic
        confidence = min(0.99, 0.6 + 0.1 * len(flags))
        return models.AIAnalysisResult(
            node_id=node.id,
            severity=severity,  # type: ignore[arg-type]
            anomalies=flags,
            actions=self._recommend(severity, flags),
            reasoning=reasoning,
            timestamp=time.time(),
            confidence=confidence,
        )

    def maybe_analyze(self, node: models.NodeStatus) -> Optional[models.AIAnalysisResult]:
        now = time.time()
        if now - self.last_decision_at[node.id] < self.decision_cooldown_sec:
            return None
        res = self.analyze_node(node)
        if res is not None:
            self.last_decision_at[node.id] = now
        return res
