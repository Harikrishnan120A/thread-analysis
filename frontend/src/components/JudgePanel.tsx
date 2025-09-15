"use client";
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { getApiBase } from '../lib/ws';
import Sparkline from './Sparkline';

type Metrics = {
  uptime: number;
  uptime_percent: number;
  downtime_events: number;
  workflow_exec_ms: { baseline: number; optimized: number; improvement_pct: number };
  error_rate_per_hour: { baseline: number; optimized: number; reduction_pct: number };
  threat_detection: { avg_seconds: number | null; samples: number; claim_target_seconds: number; last_seconds: number | null; history: number[] };
  incidents_active: number;
  thread_aware_resilience: boolean;
  thread_efficiency: number;
  autonomous_success_rate: number;
  health_score: number;
};

export default function JudgePanel() {
  const [data, setData] = useState<Metrics | null>(null);
  const [loading, setLoading] = useState(false);
  const [demoRunning, setDemoRunning] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const api = getApiBase();

  const load = async () => {
    try {
      setLoading(true);
      const r = await fetch(`${api}/api/metrics`);
      if (!r.ok) throw new Error(String(r.status));
      const d = await r.json();
      setData(d as Metrics);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const startDDOS = async () => {
    try {
      setDemoRunning(true);
      await fetch(`${api}/demo/ddos/random`, { method: 'POST' });
      // poll metrics until we observe a detection (samples increases or last_seconds updates)
      const start = Date.now();
      if (timerRef.current) clearInterval(timerRef.current);
      timerRef.current = setInterval(async () => {
        await load();
        const elapsed = (Date.now() - start) / 1000;
        if (elapsed > 75) {
          clearInterval(timerRef.current as NodeJS.Timeout);
          timerRef.current = null;
          setDemoRunning(false);
        }
      }, 3000);
    } catch {
      setDemoRunning(false);
    }
  };

  const resetDemo = async () => {
    await fetch(`${api}/demo/reset`, { method: 'POST' });
    await load();
    setDemoRunning(false);
  };

  const detectionPass = useMemo(() => {
    if (!data) return null;
    if (data.threat_detection.last_seconds == null) return null;
    return data.threat_detection.last_seconds <= data.threat_detection.claim_target_seconds;
  }, [data]);

  const stat = (label: string, value: string, sub?: string) => (
    <div style={{ border: '1px solid #223', background: '#121939', borderRadius: 8, padding: 12 }}>
      <div style={{ fontSize: 12, opacity: 0.7 }}>{label}</div>
      <div style={{ fontSize: 20, fontWeight: 700 }}>{value}</div>
      {sub && <div style={{ fontSize: 12, opacity: 0.6 }}>{sub}</div>}
    </div>
  );

  return (
    <div style={{ border: '1px solid #223', borderRadius: 10, padding: 12, background: '#0f1630', marginBottom: 12 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
        <strong>Judge Panel</strong>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={startDDOS} disabled={demoRunning} style={{ background: '#ffd24d', border: 0, borderRadius: 6, padding: '6px 10px', color: '#000' }}>{demoRunning ? 'Running…' : 'Start DDoS Demo'}</button>
          <button onClick={resetDemo} style={{ background: '#121939', border: '1px solid #334', borderRadius: 6, padding: '6px 10px', color: '#e6eefc' }}>Reset</button>
          <a href={`${api}/api/metrics.csv`} style={{ background: '#121939', border: '1px solid #334', borderRadius: 6, padding: '6px 10px', color: '#e6eefc', textDecoration: 'none' }}>Export CSV</a>
        </div>
      </div>
      {data ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12 }}>
          {stat('Uptime', `${(data.uptime/3600).toFixed(1)}h`, `${data.uptime_percent}%`)}
          {stat('Incidents Active', String(data.incidents_active))}
          {stat('Workflow Exec', `${data.workflow_exec_ms.optimized} ms`, `~${data.workflow_exec_ms.improvement_pct}% faster`)}
          {stat('Error Rate', `${data.error_rate_per_hour.optimized}/h`, `~${data.error_rate_per_hour.reduction_pct}% fewer`)}
          <div style={{ border: '1px solid #223', background: '#121939', borderRadius: 8, padding: 12 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontSize: 12, opacity: 0.7 }}>Threat Detection</div>
                <div style={{ fontSize: 20, fontWeight: 700 }}>{data.threat_detection.last_seconds == null ? '—' : `${Math.round(data.threat_detection.last_seconds)}s`}</div>
                <div style={{ fontSize: 12, opacity: 0.6 }}>Target ≤ {data.threat_detection.claim_target_seconds}s · Samples {data.threat_detection.samples}</div>
              </div>
              <div title={detectionPass === null ? 'No detection yet' : detectionPass ? 'PASS' : 'PENDING/FAIL'} style={{ padding: '6px 10px', borderRadius: 999, background: detectionPass ? '#39d98a' : '#ffd24d', color: '#000', fontWeight: 700 }}>{detectionPass === null ? '—' : detectionPass ? 'PASS' : 'PENDING'}</div>
            </div>
            <div style={{ marginTop: 8 }}>
              <Sparkline values={data.threat_detection.history || []} color="#6aa9ff" />
            </div>
          </div>
        </div>
      ) : (
        <div style={{ opacity: 0.7, fontSize: 12 }}>{loading ? 'Loading metrics…' : 'No metrics yet'}</div>
      )}
    </div>
  );
}

