import asyncio
import random
import time
from typing import Dict, List
from ..models.schemas import Node

class NodeSimulator:
    def __init__(self, node_ids: List[str]):
        self.nodes: Dict[str, Node] = {nid: Node(id=nid, name=f"Node {nid}", ip=f"10.0.0.{i+1}") for i, nid in enumerate(node_ids)}
        self._stop = False
        self._attacks: Dict[str, str] = {}

    def get_nodes(self) -> List[Node]:
        return list(self.nodes.values())

    def quarantine(self, node_id: str):
        n = self.nodes[node_id]
        n.quarantined = True
        n.state = "quarantined"
        n.load = 0.0

    def release(self, node_id: str):
        n = self.nodes[node_id]
        n.quarantined = False
        n.state = "healthy"

    def simulate_attack(self, node_id: str, attack_type: str):
        self._attacks[node_id] = attack_type
        n = self.nodes[node_id]
        n.state = "attacked"

    def redistribute_load(self, from_node: str):
        healthy = [n for n in self.nodes.values() if n.id != from_node and not n.quarantined]
        if not healthy:
            return
        share = self.nodes[from_node].load / len(healthy)
        for n in healthy:
            n.load = min(1.0, n.load + share)
        self.nodes[from_node].load = 0.0

    async def run(self, on_metrics):
        # periodic metrics emission
        while not self._stop:
            t = time.time()
            for n in self.nodes.values():
                if n.quarantined:
                    n.cpu = 0.05
                    n.mem = 0.1
                    n.net_in = 0.0
                    n.net_out = 0.0
                    n.load = 0.0
                else:
                    base = 0.2 + random.random() * 0.2
                    n.cpu = min(1.0, base + n.load * 0.6)
                    n.mem = min(1.0, 0.2 + n.load * 0.7)
                    n.net_in = 100 + n.load * 900
                    n.net_out = 80 + n.load * 700
                    # drift load
                    n.load = max(0.0, min(1.0, n.load + random.uniform(-0.05, 0.05)))
                # attacks override metrics
                if n.id in self._attacks:
                    typ = self._attacks[n.id]
                    if typ == "ddos":
                        n.net_in = 5000 + random.random() * 1000
                        n.cpu = min(1.0, 0.9 + random.random() * 0.1)
                    elif typ == "exfiltration":
                        n.net_out = 4000 + random.random() * 800
                        n.cpu = min(1.0, 0.8 + random.random() * 0.1)
                    elif typ == "degradation":
                        n.cpu = min(1.0, 0.8 + random.random() * 0.2)
                        n.mem = min(1.0, 0.85 + random.random() * 0.1)
                await on_metrics(n)
            await asyncio.sleep(1.0)

    def stop(self):
        self._stop = True