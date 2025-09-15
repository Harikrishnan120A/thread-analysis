export function getApiBase() {
  const env = process.env.NEXT_PUBLIC_BACKEND_API_URL || process.env.NEXT_PUBLIC_BACKEND_HTTP_URL;
  return env || `http://localhost:8000`;
}

export function connectWS() {
  const wsEnv = process.env.NEXT_PUBLIC_BACKEND_WS_URL;
  const httpEnv = process.env.NEXT_PUBLIC_BACKEND_API_URL || process.env.NEXT_PUBLIC_BACKEND_HTTP_URL;
  const inferred = httpEnv ? httpEnv.replace(/^http/, 'ws') + '/ws' : undefined;
  const base = wsEnv || inferred || `ws://localhost:8000/ws`;
  const ws = new WebSocket(base);
  // keep-alive ping
  let pingId: any;
  ws.addEventListener('open', () => {
    pingId = setInterval(() => {
      try { ws.send('ping'); } catch {}
    }, 15000);
  });
  ws.addEventListener('close', () => {
    if (pingId) clearInterval(pingId);
  });
  ws.addEventListener('error', () => {
    if (pingId) clearInterval(pingId);
  });
  return ws;
}
