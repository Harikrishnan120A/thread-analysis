"use client";
import { useEffect, useMemo, useRef, useState } from 'react';
import { connectWS, getApiBase } from '../lib/ws';
import Topology from '../components/Topology';

import JudgePanel from '../components/JudgePanel';
import Sparkline from '../components/Sparkline';

type Node = {
  id: string;
  name: string;
  ip: string;
  state: 'healthy' | 'degraded' | 'quarantined' | 'attacked';
  cpu: number;
  mem: number;
  net_in: number;
  net_out: number;
  load: number;
  quarantined: boolean;
};

type Event = {
  id: string;
  node_id: string;
  type: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  created_at: string;
};

function statusColor(n: Node) {
  if (n.quarantined || n.state === 'quarantined') return '#ff5d5d';
  if (n.state === 'attacked') return '#ffb020';
  if (n.state === 'degraded') return '#ffd24d';
  return '#39d98a';
}

export default function Page() {
  const [nodes, setNodes] = useState<Record<string, Node>>({});
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionMsg, setActionMsg] = useState<string | null>(null);
  const [wsConnected, setWsConnected] = useState<boolean>(false);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<Record<Node['state'], boolean>>({ healthy: true, degraded: true, quarantined: true, attacked: true });
  const [sortBy, setSortBy] = useState<'name' | 'status'>('name');
  const [eventSearch, setEventSearch] = useState('');
  const [eventSeverity, setEventSeverity] = useState<Record<Event['severity'], boolean>>({ low: true, medium: true, high: true, critical: true });
  const wsRef = useRef<WebSocket | null>(null);
  const [paused, setPaused] = useState(false);
  const pausedRef = useRef(false);
  const [selectedNode, setSelectedNode] = useState<Node | null>(null);
  const [trendCpu, setTrendCpu] = useState<number[]>([]);
  const [trendIn, setTrendIn] = useState<number[]>([]);
  const [trendOut, setTrendOut] = useState<number[]>([]);
  const historyRef = useRef<Record<string, { cpu: number[]; mem: number[]; net: number[] }>>({});

  useEffect(() => { pausedRef.current = paused; }, [paused]);

  useEffect(() => {
    const base = getApiBase();
    const ac = new AbortController();
    const getNodes = fetch(`${base}/api/nodes`, { signal: ac.signal })
      .then(r => (r.ok ? r.json() : Promise.reject(new Error(`Nodes HTTP ${r.status}`))))
      .then(d => {
        if (d.nodes) {
          const map: Record<string, Node> = {};
          d.nodes.forEach((n: Node) => (map[n.id] = n));
          setNodes(map);
        }
      })
      .catch(() => setError('Failed to load nodes'));
    const getEvents = fetch(`${base}/api/events`, { signal: ac.signal })
      .then(r => (r.ok ? r.json() : Promise.reject(new Error(`Events HTTP ${r.status}`))))
      .then(d => setEvents(d.events || []))
      .catch(() => setError('Failed to load events'));
    Promise.allSettled([getNodes, getEvents]).finally(() => setLoading(false));
    return () => ac.abort();
  }, []);

  useEffect(() => {
    const ws = connectWS();
    wsRef.current = ws;
    const onOpen = () => setWsConnected(true);
    const onClose = () => setWsConnected(false);
    ws.addEventListener('open', onOpen);
    ws.addEventListener('close', onClose);
    ws.addEventListener('message', (ev) => {
      try {
        const msg = JSON.parse(ev.data);
        if (msg.event === 'node_update') {
          const n = msg.data as Node;
          if (!pausedRef.current) {
            setNodes(prev => ({ ...prev, [n.id]: n }));
            // history
            const h = historyRef.current[n.id] || { cpu: [], mem: [], net: [] };
            const cpuPct = Math.max(0, Math.min(100, Math.round(n.cpu * 100)));
            const memPct = Math.max(0, Math.min(100, Math.round(n.mem * 100)));
            const net = Math.max(0, n.net_in + n.net_out);
            const push = (arr: number[], v: number) => { const a = arr.concat(v); return a.length > 60 ? a.slice(a.length - 60) : a; };
            historyRef.current[n.id] = { cpu: push(h.cpu, cpuPct), mem: push(h.mem, memPct), net: push(h.net, net) };
          }
        } else if (msg.event === 'security_event') {
          if (!pausedRef.current) setEvents(prev => [msg.data as Event, ...prev].slice(0, 200));
        } else if (msg.event === 'ai_decision') {
          if (!pausedRef.current) {
            const d = msg.data;
            const created = (typeof d.timestamp === 'number' ? new Date(d.timestamp * 1000) : new Date());
            const e: Event = { id: `ai-${Date.now()}`, node_id: d.node_id, type: 'ai_decision', severity: d.severity, message: d.reasoning, created_at: created.toISOString() } as any;
            setEvents(prev => [e, ...prev].slice(0, 200));
          }
        }
      } catch {}
    });
    return () => {
      ws.removeEventListener('open', onOpen);
      ws.removeEventListener('close', onClose);
      ws.close();
    };
  }, []);

  const statusWeight = (s: Node['state']) => ({ quarantined: 0, attacked: 1, degraded: 2, healthy: 3 }[s]);
  const nodeList = useMemo(() => Object.values(nodes), [nodes]);
  const visibleNodes = useMemo(() => {
    const s = search.trim().toLowerCase();
    let list = nodeList.filter(n => statusFilter[n.state] && (!s || n.name.toLowerCase().includes(s) || n.ip.toLowerCase().includes(s)));
    if (sortBy === 'name') list = list.sort((a,b) => a.name.localeCompare(b.name));
    if (sortBy === 'status') list = list.sort((a,b) => statusWeight(a.state) - statusWeight(b.state) || a.name.localeCompare(b.name));
    return list;
  }, [nodeList, search, statusFilter, sortBy]);
  const edges = useMemo(() => {
    if (nodeList.length === 0) return [] as {from:string; to:string}[];
    return nodeList.map((n, i) => ({ from: n.id, to: nodeList[(i+1) % nodeList.length].id }));
  }, [nodeList]);

  const api = getApiBase();
  const trigger = async (path: string) => {
    try {
      const res = await fetch(`${api}${path}`, { method: 'POST' });
      if (!res.ok) throw new Error(String(res.status));
      setActionMsg('Action triggered successfully');
    } catch {
      setActionMsg('Action failed. Check backend.');
    } finally {
      setTimeout(() => setActionMsg(null), 2500);
    }
  };

  // Cluster trends sampler (every 3s)
  const nodesRef = useRef(nodes);
  useEffect(() => { nodesRef.current = nodes; }, [nodes]);
  useEffect(() => {
    const id = setInterval(() => {
      const arr = Object.values(nodesRef.current || {});
      if (arr.length === 0) return;
      const avgCpu = arr.reduce((s, n) => s + n.cpu, 0) / arr.length;
      const inSum = arr.reduce((s, n) => s + n.net_in, 0);
      const outSum = arr.reduce((s, n) => s + n.net_out, 0);
      const push = (xs: number[], v: number, max=60) => { const a = xs.concat(v); return a.length > max ? a.slice(a.length - max) : a; };
      setTrendCpu(x => push(x, Math.round(avgCpu * 100)));
      setTrendIn(x => push(x, Math.round(inSum)));
      setTrendOut(x => push(x, Math.round(outSum)));
    }, 3000);
    return () => clearInterval(id);
  }, []);

  const refresh = async () => {
    const base = getApiBase();
    try {
      setLoading(true);
      const [nres, eres] = await Promise.all([
        fetch(`${base}/api/nodes`).then(r => (r.ok ? r.json() : Promise.reject(r.status))),
        fetch(`${base}/api/events`).then(r => (r.ok ? r.json() : Promise.reject(r.status))),
      ]);
      if (nres?.nodes) {
        const map: Record<string, Node> = {};
        (nres.nodes as Node[]).forEach((n: Node) => (map[n.id] = n));
        setNodes(map);
      }
      setEvents(eres?.events || []);
    } catch (e) {
      setError('Failed to refresh data');
    } finally {
      setLoading(false);
    }
  };

  const visibleEvents = useMemo(() => {
    const s = eventSearch.trim().toLowerCase();
    return events.filter(e => eventSeverity[e.severity] && (!s || e.type.toLowerCase().includes(s) || e.message.toLowerCase().includes(s) || String(e.node_id).includes(s)));
  }, [events, eventSearch, eventSeverity]);

  return (
      <div className="layout">
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
          <div title={wsConnected ? 'WebSocket connected' : 'WebSocket disconnected'} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 10px', borderRadius: 999, border: '1px solid #223', background: '#0f1630' }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: wsConnected ? '#39d98a' : '#ff5d5d' }} />
            <span style={{ fontSize: 12, opacity: 0.8 }}>{wsConnected ? 'Connected' : 'Disconnected'}</span>
          </div>
          <div style={{ flex: 1 }} />
          <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12 }}>
            <input type="checkbox" checked={paused} onChange={() => setPaused(v => !v)} /> Pause live
          </label>
          <button onClick={refresh} style={{ padding: '6px 10px', borderRadius: 6, border: '1px solid #223', background: '#0f1630', color: '#e6eefc' }}>{loading ? 'Refreshing...' : 'Refresh'}</button>
        </div>
        {actionMsg && (
          <div role="status" style={{ marginBottom: 12, padding: 8, borderRadius: 6, background: '#0f1630', border: '1px solid #223' }}>{actionMsg}</div>
        )}
        {error && (
          <div style={{ marginBottom: 12, padding: 8, borderRadius: 6, background: '#2a1a1a', border: '1px solid #552', color: '#ffd7d7' }}>
            {error}
          </div>
        )}
        <section style={{ marginBottom: 16 }}><JudgePanel />
            <KPIs nodes={nodeList} events={events} trendCpu={trendCpu} trendIn={trendIn} trendOut={trendOut} />
          <h2 style={{ margin: '8px 0' }}>Network Topology</h2>
          <Topology nodes={nodeList} edges={edges} />
        </section>

        <section style={{ marginBottom: 16 }}>
          <h2 style={{ margin: '8px 0' }}>Nodes</h2>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, margin: '8px 0 12px' }}>
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search name or IP" style={{ flex: 1, padding: '8px 10px', borderRadius: 6, border: '1px solid #223', background: '#0f1630', color: '#e6eefc' }} />
            <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12 }}>
              <input checked={statusFilter.healthy} onChange={() => setStatusFilter(f => ({ ...f, healthy: !f.healthy }))} type="checkbox" /> Healthy
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12 }}>
              <input checked={statusFilter.degraded} onChange={() => setStatusFilter(f => ({ ...f, degraded: !f.degraded }))} type="checkbox" /> Degraded
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12 }}>
              <input checked={statusFilter.quarantined} onChange={() => setStatusFilter(f => ({ ...f, quarantined: !f.quarantined }))} type="checkbox" /> Quarantined
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12 }}>
              <input checked={statusFilter.attacked} onChange={() => setStatusFilter(f => ({ ...f, attacked: !f.attacked }))} type="checkbox" /> Attacked
            </label>
            <select value={sortBy} onChange={e => setSortBy(e.target.value as any)} style={{ padding: '8px 10px', borderRadius: 6, border: '1px solid #223', background: '#0f1630', color: '#e6eefc' }}>
              <option value="name">Sort: Name</option>
              <option value="status">Sort: Status</option>
            </select>
          </div>
          {loading && nodeList.length === 0 ? (
            <div style={{ opacity: 0.7, fontSize: 14 }}>Loading nodes…</div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12 }}>
              {visibleNodes.map(n => (
                <div key={n.id} onClick={() => setSelectedNode(n)} style={{ border: '1px solid #223', borderRadius: 8, padding: 12, background: '#0f1630', cursor: 'pointer' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <strong>{n.name}</strong>
                    <span style={{ width: 10, height: 10, borderRadius: '50%', background: statusColor(n) }} />
                  </div>
                  <div style={{ fontSize: 12, opacity: 0.8 }}>{n.ip}</div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 4, marginTop: 8, fontSize: 12 }}>
                    <div>CPU: {(n.cpu*100).toFixed(0)}%</div>
                    <div>Mem: {(n.mem*100).toFixed(0)}%</div>
                    <div>In: {n.net_in.toFixed(0)} kbps</div>
                    <div>Out: {n.net_out.toFixed(0)} kbps</div>
                  </div>
                  <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                    <button aria-label={`Quarantine ${n.name}`} onClick={() => trigger(`/api/quarantine/${n.id}`)} style={{ background: '#ff5d5d', border: 0, borderRadius: 4, padding: '6px 8px', color: '#000' }}>Quarantine</button>
                    <button aria-label={`Release ${n.name}`} onClick={() => trigger(`/api/release/${n.id}`)} style={{ background: '#39d98a', border: 0, borderRadius: 4, padding: '6px 8px', color: '#000' }}>Release</button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        <section>
          <h2 style={{ margin: '8px 0' }}>Scenarios</h2>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <button onClick={() => trigger('/api/attack/3/ddos')} style={{ background: '#ffd24d', border: 0, borderRadius: 4, padding: '8px 12px', color: '#000' }}>Simulate DDoS on Node 3</button>
            <button onClick={() => trigger('/api/attack/5/exfiltration')} style={{ background: '#ffd24d', border: 0, borderRadius: 4, padding: '8px 12px', color: '#000' }}>Simulate Exfiltration on Node 5</button>
            <button onClick={() => trigger('/api/attack/2/degradation')} style={{ background: '#ffd24d', border: 0, borderRadius: 4, padding: '8px 12px', color: '#000' }}>Simulate Degradation on Node 2</button>
          </div>
        </section>
      </div>

      <aside>
        <h2 style={{ margin: '8px 0' }}>Security Events</h2>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, margin: '8px 0 12px' }}>
          <input value={eventSearch} onChange={e => setEventSearch(e.target.value)} placeholder="Search type, message, node" style={{ flex: 1, padding: '8px 10px', borderRadius: 6, border: '1px solid #223', background: '#0f1630', color: '#e6eefc' }} />
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
          {(['low','medium','high','critical'] as Event['severity'][]).map(s => (
            <label key={s} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12 }}>
              <input checked={eventSeverity[s]} onChange={() => setEventSeverity(v => ({ ...v, [s]: !v[s] }))} type="checkbox" /> {s}
            </label>
          ))}
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {visibleEvents.map(e => (
            <div key={e.id} style={{ border: '1px solid #223', borderRadius: 8, padding: 12, background: '#121939' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <strong>{e.type}</strong>
                <span style={{ opacity: 0.7 }}>{new Date(e.created_at).toLocaleTimeString()}</span>
              </div>
              <div style={{ fontSize: 12, opacity: 0.85 }}>{e.message}</div>
              <EventMeta nodeId={e.node_id} severity={e.severity} />
            </div>
          ))}
        </div>
      </aside>
    </div>
    {selectedNode && (
      <div onClick={() => setSelectedNode(null)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
        <div onClick={(e) => e.stopPropagation()} style={{ width: 'min(780px, 96vw)', background: '#0f1630', border: '1px solid #223', borderRadius: 10, padding: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <div>
              <div style={{ fontSize: 18, fontWeight: 700 }}>{selectedNode.name}</div>
              <div style={{ fontSize: 12, opacity: 0.8 }}>{selectedNode.ip}</div>
            </div>
            <button onClick={() => setSelectedNode(null)} style={{ background: '#121939', border: '1px solid #334', color: '#e6eefc', padding: '6px 10px', borderRadius: 6 }}>Close</button>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12 }}>
            <div style={{ border: '1px solid #223', borderRadius: 8, padding: 12, background: '#121939' }}>
              <div style={{ fontSize: 12, opacity: 0.7 }}>CPU</div>
              <div style={{ fontSize: 20, fontWeight: 700 }}>{(selectedNode.cpu*100).toFixed(0)}%</div>
              <Sparkline values={(historyRef.current[selectedNode.id]?.cpu)||[]} color="#39d98a" />
            </div>
            <div style={{ border: '1px solid #223', borderRadius: 8, padding: 12, background: '#121939' }}>
              <div style={{ fontSize: 12, opacity: 0.7 }}>Memory</div>
              <div style={{ fontSize: 20, fontWeight: 700 }}>{(selectedNode.mem*100).toFixed(0)}%</div>
              <Sparkline values={(historyRef.current[selectedNode.id]?.mem)||[]} color="#ffd24d" />
            </div>
            <div style={{ border: '1px solid #223', borderRadius: 8, padding: 12, background: '#121939' }}>
              <div style={{ fontSize: 12, opacity: 0.7 }}>Network</div>
              <div style={{ fontSize: 20, fontWeight: 700 }}>{Math.round(selectedNode.net_in + selectedNode.net_out)} kbps</div>
              <Sparkline values={(historyRef.current[selectedNode.id]?.net)||[]} color="#6aa9ff" />
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
            <button onClick={() => trigger(`/api/quarantine/${selectedNode.id}`)} style={{ background: '#ff5d5d', border: 0, borderRadius: 6, padding: '8px 12px', color: '#000' }}>Quarantine</button>
            <button onClick={() => trigger(`/api/release/${selectedNode.id}`)} style={{ background: '#39d98a', border: 0, borderRadius: 6, padding: '8px 12px', color: '#000' }}>Release</button>
            <button onClick={() => trigger(`/api/attack/${selectedNode.id}/ddos`)} style={{ background: '#ffd24d', border: 0, borderRadius: 6, padding: '8px 12px', color: '#000' }}>Simulate DDoS</button>
          </div>
        </div>
      </div>
    )}
  );
}

function EventMeta({ nodeId, severity }: { nodeId: string; severity: Event['severity'] }) {
  const color = severity === 'critical'
    ? '#ff5d5d'
    : severity === 'high'
    ? '#ffb020'
    : severity === 'medium'
    ? '#ffd24d'
    : '#39d98a';
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, opacity: 0.75 }}>
      <span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: '50%', background: color }} />
      <span>Node {nodeId} - {severity}</span>
    </div>
  );
}



