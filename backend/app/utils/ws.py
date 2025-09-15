import asyncio
import json
from typing import Set
from websockets.exceptions import ConnectionClosedOK
from starlette.websockets import WebSocket

class WebSocketManager:
    def __init__(self):
        self.active: Set[WebSocket] = set()
        self._lock = asyncio.Lock()

    async def connect(self, ws: WebSocket):
        await ws.accept()
        async with self._lock:
            self.active.add(ws)

    async def disconnect(self, ws: WebSocket):
        async with self._lock:
            if ws in self.active:
                self.active.remove(ws)

    async def broadcast(self, event: str, data: dict):
        message = json.dumps({"event": event, "data": data}, default=str)
        to_remove = []
        for ws in list(self.active):
            try:
                await ws.send_text(message)
            except ConnectionClosedOK:
                to_remove.append(ws)
            except Exception:
                to_remove.append(ws)
        for ws in to_remove:
            await self.disconnect(ws)