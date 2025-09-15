"use client";
import React, { useMemo } from 'react';
import Sparkline from './Sparkline';

type Node = {
  id: string;
  state: 'healthy' | 'degraded' | 'quarantined' | 'attacked';
  cpu: number;
  mem: number;
  net_in: number;
  net_out: number;
};

type Event = {
  id: string;
  created_at: string;
};

export default function KPIs({ nodes, events, trendCpu, trendIn, trendOut }: { nodes: Node[]; events: Event[]; trendCpu?: number[]; trendIn?: number[]; trendOut?: number[] }) {
  const { healthy, quarantined, avgCpu, inKbps, outKbps } = useMemo(() => {
    const total = nodes.length || 1;
    const healthy = nodes.filter(n => n.state === 'healthy').length;
    const quarantined = nodes.filter(n => n.state === 'quarantined').length;
    const avgCpu = nodes.reduce((s, n) => s + n.cpu, 0) / total;
    const inKbps = nodes.reduce((s, n) => s + n.net_in, 0);
    const outKbps = nodes.reduce((s, n) => s + n.net_out, 0);
    return { healthy, quarantined, avgCpu, inKbps, outKbps };
  }, [nodes]);

  const cards = [
    { label: 'System Uptime', value: quarantined === 0 ? '100%' : `${Math.max(0, Math.round(((nodes.length - quarantined) / Math.max(1, nodes.length)) * 100))}%`, sub: 'During active incidents' },
    { label: 'Avg CPU', value: `${Math.round(avgCpu * 100)}%`, sub: 'Cluster average', trend: trendCpu, color: '#39d98a' },
    { label: 'Inbound', value: `${Math.round(inKbps)} kbps`, sub: 'Aggregate', trend: trendIn, color: '#6aa9ff' },
    { label: 'Outbound', value: `${Math.round(outKbps)} kbps`, sub: 'Aggregate', trend: trendOut, color: '#ffd24d' },
    { label: 'Active Events', value: `${events.length}`, sub: 'Recent' },
  ] as any[];

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12, marginBottom: 16 }}>
      {cards.map((c) => (
        <div key={c.label} style={{ border: '1px solid #223', background: '#0f1630', borderRadius: 8, padding: 12 }}>
          <div style={{ fontSize: 12, opacity: 0.7 }}>{c.label}</div>
          <div style={{ fontSize: 24, fontWeight: 700 }}>{c.value}</div>
          <div style={{ fontSize: 12, opacity: 0.6 }}>{c.sub}</div>
          {c.trend && Array.isArray(c.trend) && c.trend.length > 1 && (
            <div style={{ marginTop: 6 }}>
              <Sparkline values={c.trend} color={c.color || '#6af'} />
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
