"use client";
import { useEffect, useMemo, useRef } from 'react';

type Node = {
  id: string;
  name: string;
  state: 'healthy' | 'degraded' | 'quarantined' | 'attacked';
};

type Edge = { from: string; to: string };

function colorForState(state: Node['state']) {
  switch (state) {
    case 'quarantined':
      return '#ff5d5d';
    case 'attacked':
      return '#ffb020';
    case 'degraded':
      return '#ffd24d';
    default:
      return '#39d98a';
  }
}

export default function Topology({ nodes, edges }: { nodes: Node[]; edges: Edge[] }) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const networkRef = useRef<any>(null);
  const dsNodesRef = useRef<any>(null);
  const dsEdgesRef = useRef<any>(null);

  const vis = useRef<{ Network?: any; DataSet?: any }>({});

  useEffect(() => {
    let mounted = true;
    const init = async () => {
      const mod = await import('vis-network/standalone');
      vis.current.Network = (mod as any).Network;
      vis.current.DataSet = (mod as any).DataSet;
      if (!mounted || !containerRef.current) return;
      dsNodesRef.current = new (vis.current.DataSet as any)([]);
      const mappedEdges = edges.map((e) => ({ id: `${e.from}->${e.to}`, ...e }));
      dsEdgesRef.current = new (vis.current.DataSet as any)(mappedEdges);
      const data = { nodes: dsNodesRef.current, edges: dsEdgesRef.current };
      const options = {
        autoResize: true,
        physics: { stabilization: true },
        nodes: { color: { background: '#1a2448', border: '#334', highlight: { background: '#2a3b7a', border: '#5a7' } }, font: { color: '#e6eefc' } },
        edges: { color: { color: '#445', highlight: '#6af' } },
        interaction: { hover: true },
      } as any;
      networkRef.current = new (vis.current.Network as any)(containerRef.current, data, options);
      // First fill
      const mapped = nodes.map((n) => ({ id: n.id, label: n.name, color: { background: '#1a2448', border: colorForState(n.state) } }));
      dsNodesRef.current.update(mapped);
    };
    init();
    return () => { mounted = false; if (networkRef.current) { networkRef.current.destroy(); networkRef.current = null; } };
  }, []);

  useEffect(() => {
    if (!dsNodesRef.current) return;
    const mapped = nodes.map((n) => ({ id: n.id, label: n.name, color: { background: '#1a2448', border: colorForState(n.state) } }));
    dsNodesRef.current.update(mapped);
  }, [nodes]);

  useEffect(() => {
    if (!dsEdgesRef.current) return;
    const mapped = edges.map((e) => ({ id: `${e.from}->${e.to}`, ...e }));
    dsEdgesRef.current.clear();
    dsEdgesRef.current.update(mapped);
  }, [edges]);

  return (
    <div className="topology" ref={containerRef} />
  );
}
