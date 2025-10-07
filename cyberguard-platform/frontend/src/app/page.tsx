"use client";

import * as React from 'react';
import { useRealtime } from '@/hooks/useRealtime';
import NodeGraph from '@/components/NodeGraph';
import AlertToaster from '@/components/AlertToaster';
import { Shield, Menu, X, Activity, AlertTriangle, BarChart3, Settings, Home, Zap } from 'lucide-react';
import MetricsBar from '@/components/MetricsBar';
import D3Topology from '@/components/D3Topology';
import PerformanceCharts from '@/components/PerformanceCharts';
import ScenarioPanel from '@/components/ScenarioPanel';
import DemoSummaryCard from '@/components/DemoSummaryCard';
import { useSettings } from '@/lib/settings';

export default function CyberGuardDashboard() {
  const { settings } = useSettings();
  const { connected, nodes, events, aiDecisions, simulateThreat, highlightNodeId, busy } = useRealtime();
  const [sidebarOpen, setSidebarOpen] = React.useState(false);
  const [currentView, setCurrentView] = React.useState('dashboard');

  const navigationItems = [
    { id: 'dashboard', label: 'Dashboard', icon: Home, active: true },
    { id: 'threats', label: 'Threats', icon: AlertTriangle, count: events.length },
    { id: 'dataset', label: 'Real Dataset', icon: Activity, special: true },
    { id: 'analytics', label: 'Analytics', icon: BarChart3 },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  const renderContent = () => {
    switch (currentView) {
      case 'threats':
        return <ThreatsView events={events} aiDecisions={aiDecisions} simulateThreat={simulateThreat} />;
      case 'dataset':
        return <DatasetView />;
      case 'analytics':
        return <AnalyticsView />;
      case 'settings':
        return <SettingsView />;
      default:
        return <DashboardView 
          connected={connected}
          nodes={nodes}
          events={events}
          aiDecisions={aiDecisions}
          simulateThreat={simulateThreat}
          highlightNodeId={highlightNodeId}
          busy={busy}
        />;
    }
  };

  return (
    <div className="cyber-dashboard">
      {/* Mobile Overlay */}
      {sidebarOpen && (
        <div 
          className="sidebar-overlay"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`cyber-sidebar ${sidebarOpen ? 'open' : ''}`}>
        <div className="sidebar-header">
          <Shield className="sidebar-logo" />
          <div className="sidebar-brand">
            <h2>CyberGuard</h2>
            <span>Security Platform</span>
          </div>
        </div>

        <nav className="sidebar-nav">
          {navigationItems.map((item) => (
            <button
              key={item.id}
              onClick={() => {
                setCurrentView(item.id);
                setSidebarOpen(false);
              }}
              className={`nav-item ${currentView === item.id ? 'active' : ''}`}
            >
              <item.icon className="nav-icon" />
              <span>{item.label}</span>
              {item.count && item.count > 0 && (
                <span className="nav-badge">{item.count}</span>
              )}
            </button>
          ))}
        </nav>

        <div className="sidebar-status">
          <div className={`status-indicator ${connected ? 'online' : 'offline'}`}>
            <Activity className="status-icon" />
            <span>{connected ? 'System Online' : 'System Offline'}</span>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="cyber-main">
        {/* Top Header */}
        <header className="cyber-header">
          <div className="header-left">
            <button 
              className="hamburger-btn"
              onClick={() => setSidebarOpen(!sidebarOpen)}
            >
              {sidebarOpen ? <X /> : <Menu />}
            </button>
            <h1 className="header-title">Security Operations Center</h1>
          </div>

          <div className="header-actions">
            <button
              className="action-btn danger"
              onClick={() => simulateThreat({ severity: 'high', type: 'intrusion' })}
              disabled={!connected}
            >
              <Zap className="btn-icon" />
              Simulate Attack
            </button>
            {busy && (
              <div className="processing-status">
                <div className="spinner" />
                Processing...
              </div>
            )}
          </div>
        </header>

        {/* Content Area */}
        <div className="content-area">
          {renderContent()}
        </div>
      </main>
    </div>
  );
}

// Dashboard View Component
function DashboardView({ connected, nodes, events, aiDecisions, simulateThreat, highlightNodeId, busy }: {
  connected: boolean;
  nodes: any[];
  events: any[];
  aiDecisions: any[];
  simulateThreat: (opts?: { nodeId?: string; type?: string; severity?: 'low' | 'medium' | 'high' | 'critical'; message?: string }) => Promise<void>;
  highlightNodeId: string | null;
  busy: boolean;
}) {
  return (
    <>
      {/* Metrics */}
      <section className="metrics-section">
        <MetricsBar />
      </section>

      {/* Demo Summary */}
      <section className="demo-summary-section" style={{ margin: '20px 0' }}>
        <DemoSummaryCard />
      </section>

      {/* Main Grid */}
      <div className="dashboard-grid">
        {/* Network Panel */}
        <div className="network-panel">
          <div className="panel-header">
            <h3>🌐 Network Topology</h3>
            <span className="node-count">{nodes.length} Nodes</span>
          </div>
          <div className="panel-content">
            <D3Topology nodes={nodes} highlightNodeId={highlightNodeId} />
          </div>
        </div>

        {/* Alerts Panel */}
        <div className="alerts-panel">
          <div className="panel-header">
            <h3>🚨 Security Alerts</h3>
            <span className={`alert-count ${events.length > 0 ? 'has-alerts' : ''}`}>
              {events.length} Active
            </span>
          </div>
          <div className="panel-content">
            <AlertToaster events={events} ai={aiDecisions} />
          </div>
        </div>

        {/* Quick Actions */}
        <div className="actions-panel">
          <div className="panel-header">
            <h3>⚡ Quick Actions</h3>
          </div>
          <div className="panel-content">
            <ScenarioPanel />
          </div>
        </div>
      </div>
    </>
  );
}

// Threats View Component  
function ThreatsView({ events, aiDecisions, simulateThreat }: {
  events: any[];
  aiDecisions: any[];
  simulateThreat: (opts?: { nodeId?: string; type?: string; severity?: 'low' | 'medium' | 'high' | 'critical'; message?: string }) => Promise<void>;
}) {
  const [selectedThreat, setSelectedThreat] = React.useState(null);
  
  return (
    <div className="threats-view">
      <div className="view-header">
        <h2>🚨 Threat Management</h2>
        <p>Monitor and respond to security threats</p>
      </div>

      <div className="threats-grid">
        <div className="threat-list">
          <h3>Active Threats ({events.length})</h3>
          <div className="threat-items">
            {events.map((event) => (
              <div 
                key={event.id}
                className={`threat-item severity-${event.severity}`}
                onClick={() => setSelectedThreat(event)}
              >
                <div className="threat-header">
                  <span className="threat-type">{event.type}</span>
                  <span className="threat-severity">{event.severity}</span>
                </div>
                <p className="threat-message">{event.message}</p>
                <span className="threat-node">Node: {event.node_id}</span>
              </div>
            ))}
            {events.length === 0 && (
              <div className="no-threats">
                <Shield className="no-threats-icon" />
                <p>No active threats detected</p>
                <button 
                  className="simulate-btn"
                  onClick={() => simulateThreat({ severity: 'medium', type: 'test_threat' })}
                >
                  Simulate Test Threat
                </button>
              </div>
            )}
          </div>
        </div>

        <div className="threat-details">
          {selectedThreat ? (
            <ThreatDetails threat={selectedThreat} />
          ) : (
            <div className="select-threat">
              <AlertTriangle className="select-icon" />
              <p>Select a threat to view details</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Analytics View Component
function AnalyticsView() {
  return (
    <div className="analytics-view">
      <div className="view-header">
        <h2>📊 Security Analytics</h2>
        <p>Performance metrics and system insights</p>
      </div>

      <div className="analytics-compact">
        <div className="metrics-summary">
          <DemoSummaryCard />
        </div>
        
        <div className="charts-minimal">
          <div className="chart-section">
            <h4>System Performance</h4>
            <PerformanceCharts />
          </div>
        </div>
      </div>
    </div>
  );
}

// Settings View Component
function SettingsView() {
  return (
    <div className="settings-view">
      <div className="view-header">
        <h2>⚙️ System Settings</h2>
        <p>Configure security parameters and preferences</p>
      </div>

      <div className="settings-grid">
        <div className="setting-group">
          <h3>🔔 Alert Settings</h3>
          <div className="setting-item">
            <label>Sound Notifications</label>
            <input type="checkbox" defaultChecked />
          </div>
          <div className="setting-item">
            <label>Email Alerts</label>
            <input type="checkbox" />
          </div>
          <div className="setting-item">
            <label>Threat Threshold</label>
            <select defaultValue="medium">
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
            </select>
          </div>
        </div>

        <div className="setting-group">
          <h3>🌐 Network Settings</h3>
          <div className="setting-item">
            <label>Auto-Scan Interval</label>
            <input type="number" defaultValue="30" min="10" max="300" />
            <span>seconds</span>
          </div>
          <div className="setting-item">
            <label>Max Connections</label>
            <input type="number" defaultValue="1000" min="100" max="5000" />
          </div>
        </div>

        <div className="setting-group">
          <h3>🎨 Display Settings</h3>
          <div className="setting-item">
            <label>Dark Mode</label>
            <input type="checkbox" defaultChecked />
          </div>
          <div className="setting-item">
            <label>Compact View</label>
            <input type="checkbox" />
          </div>
        </div>
      </div>
    </div>
  );
}

// Threat Details Component
function ThreatDetails({ threat }: { threat: any }) {
  const [investigating, setInvestigating] = React.useState(false);
  const [actionStatus, setActionStatus] = React.useState<string | null>(null);

  const handleInvestigate = async () => {
    setInvestigating(true);
    setActionStatus('Analyzing threat patterns...');
    
    // Simulate investigation process
    await new Promise(resolve => setTimeout(resolve, 1500));
    setActionStatus('✅ Investigation complete - No additional threats found');
    setInvestigating(false);
  };

  const handleQuarantine = async () => {
    setActionStatus('🔒 Quarantining node ' + threat.node_id + '...');
    await new Promise(resolve => setTimeout(resolve, 1000));
    setActionStatus('✅ Node quarantined successfully');
  };

  const handleBlock = async () => {
    setActionStatus('🚫 Blocking threat source...');
    await new Promise(resolve => setTimeout(resolve, 1000));
    setActionStatus('✅ Threat source blocked');
  };

  return (
    <div className="threat-detail-card">
      <div className="detail-header">
        <h4>Threat Analysis</h4>
        <span className={`severity-badge ${threat.severity}`}>
          {threat.severity.toUpperCase()}
        </span>
      </div>
      
      <div className="detail-content">
        <div className="detail-item">
          <strong>Type:</strong> {threat.type}
        </div>
        <div className="detail-item">
          <strong>Node:</strong> {threat.node_id}
        </div>
        <div className="detail-item">
          <strong>Time:</strong> {new Date(threat.timestamp * 1000).toLocaleString()}
        </div>
        <div className="detail-item">
          <strong>Description:</strong> {threat.message}
        </div>
      </div>

      {actionStatus && (
        <div className={`action-status ${actionStatus.includes('✅') ? 'success' : 'processing'}`}>
          {actionStatus}
        </div>
      )}

      <div className="detail-actions">
        <button 
          className="action-btn primary" 
          onClick={handleInvestigate}
          disabled={investigating}
        >
          {investigating ? 'Investigating...' : 'Investigate'}
        </button>
        <button 
          className="action-btn secondary"
          onClick={handleQuarantine}
        >
          Quarantine
        </button>
        <button 
          className="action-btn danger"
          onClick={handleBlock}
        >
          Block
        </button>
      </div>
    </div>
  );
}

// Dataset View Component - REAL KAGGLE DATA
function DatasetView() {
  const [stats, setStats] = React.useState<any>(null);
  const [malicious, setMalicious] = React.useState<any[]>([]);
  const [sample, setSample] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [activeTab, setActiveTab] = React.useState<'overview' | 'malicious' | 'sample'>('overview');

  React.useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        
        // Fetch statistics
        const statsRes = await fetch('/api/dataset/stats');
        if (!statsRes.ok) throw new Error('Failed to fetch stats');
        const statsData = await statsRes.json();
        setStats(statsData);
        
        // Fetch malicious attacks
        const malRes = await fetch('/api/dataset/malicious?limit=10');
        if (!malRes.ok) throw new Error('Failed to fetch malicious data');
        const malData = await malRes.json();
        setMalicious(malData.records || []);
        
        // Fetch sample
        const sampleRes = await fetch('/api/dataset/sample?limit=5');
        if (!sampleRes.ok) throw new Error('Failed to fetch sample');
        const sampleData = await sampleRes.json();
        setSample(sampleData.records || []);
        
        setError(null);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="dataset-view">
        <div className="view-header">
          <h2>📊 Real Kaggle Dataset</h2>
          <p>6 Million Cybersecurity Threat Records</p>
        </div>
        <div style={{ textAlign: 'center', padding: '100px 20px' }}>
          <div className="spinner" style={{ margin: '0 auto 20px' }} />
          <p>Loading real dataset from Kaggle...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="dataset-view">
        <div className="view-header">
          <h2>📊 Real Kaggle Dataset</h2>
        </div>
        <div style={{ textAlign: 'center', padding: '100px 20px', color: '#ff6b6b' }}>
          <AlertTriangle style={{ width: 64, height: 64, margin: '0 auto 20px' }} />
          <p>Error loading dataset: {error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="dataset-view">
      <div className="view-header">
        <h2>📊 Real Kaggle Dataset</h2>
        <p>6 Million Cybersecurity Threat Records - Live from Kaggle</p>
      </div>

      {/* Dataset Status Banner */}
      <div style={{ 
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', 
        padding: '20px', 
        borderRadius: '12px', 
        marginBottom: '20px',
        color: 'white'
      }}>
        <h3 style={{ margin: '0 0 10px 0' }}>✅ Dataset Status: LOADED</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '15px' }}>
          <div>
            <div style={{ fontSize: '12px', opacity: 0.9 }}>Total Records</div>
            <div style={{ fontSize: '24px', fontWeight: 'bold' }}>
              {stats?.total_records?.toLocaleString() || '0'}
            </div>
          </div>
          <div>
            <div style={{ fontSize: '12px', opacity: 0.9 }}>Malicious Attacks</div>
            <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#ff6b6b' }}>
              {stats?.threat_distribution?.malicious?.toLocaleString() || '0'}
            </div>
          </div>
          <div>
            <div style={{ fontSize: '12px', opacity: 0.9 }}>Suspicious Activity</div>
            <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#feca57' }}>
              {stats?.threat_distribution?.suspicious?.toLocaleString() || '0'}
            </div>
          </div>
          <div>
            <div style={{ fontSize: '12px', opacity: 0.9 }}>Benign Traffic</div>
            <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#48dbfb' }}>
              {stats?.threat_distribution?.benign?.toLocaleString() || '0'}
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ 
        display: 'flex', 
        gap: '10px', 
        marginBottom: '20px', 
        borderBottom: '2px solid rgba(255,255,255,0.1)',
        paddingBottom: '10px'
      }}>
        <button
          onClick={() => setActiveTab('overview')}
          style={{
            padding: '10px 20px',
            background: activeTab === 'overview' ? 'rgba(102, 126, 234, 0.3)' : 'transparent',
            border: 'none',
            color: 'white',
            cursor: 'pointer',
            borderRadius: '8px',
            fontWeight: activeTab === 'overview' ? 'bold' : 'normal'
          }}
        >
          📊 Overview
        </button>
        <button
          onClick={() => setActiveTab('malicious')}
          style={{
            padding: '10px 20px',
            background: activeTab === 'malicious' ? 'rgba(255, 107, 107, 0.3)' : 'transparent',
            border: 'none',
            color: 'white',
            cursor: 'pointer',
            borderRadius: '8px',
            fontWeight: activeTab === 'malicious' ? 'bold' : 'normal'
          }}
        >
          🚨 Malicious Attacks
        </button>
        <button
          onClick={() => setActiveTab('sample')}
          style={{
            padding: '10px 20px',
            background: activeTab === 'sample' ? 'rgba(72, 219, 251, 0.3)' : 'transparent',
            border: 'none',
            color: 'white',
            cursor: 'pointer',
            borderRadius: '8px',
            fontWeight: activeTab === 'sample' ? 'bold' : 'normal'
          }}
        >
          📋 Sample Data
        </button>
      </div>

      {/* Tab Content */}
      {activeTab === 'overview' && (
        <div className="dataset-overview">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '20px' }}>
            {/* Protocol Distribution */}
            <div style={{ background: 'rgba(255,255,255,0.05)', padding: '20px', borderRadius: '12px' }}>
              <h3>🌐 Protocol Distribution</h3>
              <div style={{ marginTop: '15px' }}>
                {stats?.protocol_distribution && Object.entries(stats.protocol_distribution).map(([protocol, count]: [string, any]) => (
                  <div key={protocol} style={{ marginBottom: '10px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}>
                      <span>{protocol}</span>
                      <span style={{ fontWeight: 'bold' }}>{count.toLocaleString()}</span>
                    </div>
                    <div style={{ 
                      height: '8px', 
                      background: 'rgba(255,255,255,0.1)', 
                      borderRadius: '4px',
                      overflow: 'hidden'
                    }}>
                      <div style={{ 
                        height: '100%', 
                        width: `${(count / stats.total_records) * 100}%`,
                        background: 'linear-gradient(90deg, #667eea, #764ba2)',
                        borderRadius: '4px'
                      }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Top Attack Paths */}
            <div style={{ background: 'rgba(255,255,255,0.05)', padding: '20px', borderRadius: '12px' }}>
              <h3>🎯 Top Attack Paths</h3>
              <div style={{ marginTop: '15px' }}>
                {stats?.top_paths && Object.entries(stats.top_paths).slice(0, 5).map(([path, count]: [string, any]) => (
                  <div key={path} style={{ 
                    padding: '10px', 
                    background: 'rgba(255,107,107,0.1)', 
                    marginBottom: '8px',
                    borderRadius: '6px',
                    borderLeft: '3px solid #ff6b6b'
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <code style={{ color: '#ff6b6b' }}>{path}</code>
                      <span style={{ fontWeight: 'bold' }}>{count.toLocaleString()}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'malicious' && (
        <div className="malicious-attacks">
          <h3 style={{ marginBottom: '15px' }}>🚨 Recent Malicious Attacks</h3>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ 
              width: '100%', 
              borderCollapse: 'collapse',
              background: 'rgba(255,255,255,0.03)',
              borderRadius: '12px',
              overflow: 'hidden'
            }}>
              <thead>
                <tr style={{ background: 'rgba(255,107,107,0.2)' }}>
                  <th style={{ padding: '12px', textAlign: 'left' }}>Timestamp</th>
                  <th style={{ padding: '12px', textAlign: 'left' }}>Source IP</th>
                  <th style={{ padding: '12px', textAlign: 'left' }}>Dest IP</th>
                  <th style={{ padding: '12px', textAlign: 'left' }}>Protocol</th>
                  <th style={{ padding: '12px', textAlign: 'left' }}>Path</th>
                  <th style={{ padding: '12px', textAlign: 'left' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {malicious.map((record, idx) => (
                  <tr key={idx} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                    <td style={{ padding: '12px' }}>{record.timestamp}</td>
                    <td style={{ padding: '12px' }}><code>{record.source_ip}</code></td>
                    <td style={{ padding: '12px' }}><code>{record.destination_ip}</code></td>
                    <td style={{ padding: '12px' }}>
                      <span style={{ 
                        background: 'rgba(102,126,234,0.3)', 
                        padding: '4px 8px', 
                        borderRadius: '4px' 
                      }}>
                        {record.protocol}
                      </span>
                    </td>
                    <td style={{ padding: '12px' }}><code>{record.request_path}</code></td>
                    <td style={{ padding: '12px' }}>
                      <span style={{ 
                        background: 'rgba(255,107,107,0.3)', 
                        padding: '4px 8px', 
                        borderRadius: '4px',
                        color: '#ff6b6b',
                        fontWeight: 'bold'
                      }}>
                        {record.action}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'sample' && (
        <div className="sample-data">
          <h3 style={{ marginBottom: '15px' }}>📋 Random Sample Records</h3>
          <div style={{ display: 'grid', gap: '15px' }}>
            {sample.map((record, idx) => (
              <div key={idx} style={{ 
                background: 'rgba(255,255,255,0.05)', 
                padding: '15px', 
                borderRadius: '12px',
                borderLeft: `4px solid ${
                  record.label === 'malicious' ? '#ff6b6b' : 
                  record.label === 'suspicious' ? '#feca57' : '#48dbfb'
                }`
              }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '10px' }}>
                  <div>
                    <div style={{ fontSize: '11px', opacity: 0.7 }}>TIMESTAMP</div>
                    <div style={{ fontFamily: 'monospace' }}>{record.timestamp}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: '11px', opacity: 0.7 }}>SOURCE → DEST</div>
                    <div style={{ fontFamily: 'monospace' }}>{record.source_ip} → {record.destination_ip}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: '11px', opacity: 0.7 }}>PROTOCOL</div>
                    <div style={{ fontWeight: 'bold' }}>{record.protocol}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: '11px', opacity: 0.7 }}>LABEL</div>
                    <div>
                      <span style={{ 
                        background: record.label === 'malicious' ? 'rgba(255,107,107,0.3)' : 
                                   record.label === 'suspicious' ? 'rgba(254,202,87,0.3)' : 'rgba(72,219,251,0.3)',
                        padding: '4px 8px', 
                        borderRadius: '4px',
                        textTransform: 'uppercase',
                        fontSize: '11px',
                        fontWeight: 'bold'
                      }}>
                        {record.label}
                      </span>
                    </div>
                  </div>
                </div>
                <div style={{ marginTop: '10px', paddingTop: '10px', borderTop: '1px solid rgba(255,255,255,0.1)' }}>
                  <div style={{ fontSize: '11px', opacity: 0.7, marginBottom: '5px' }}>REQUEST PATH</div>
                  <code style={{ color: '#667eea' }}>{record.request_path}</code>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* API Endpoint Reference */}
      <div style={{ 
        marginTop: '30px', 
        padding: '15px', 
        background: 'rgba(102,126,234,0.1)', 
        borderRadius: '12px',
        borderLeft: '4px solid #667eea'
      }}>
        <h4 style={{ marginTop: 0 }}>📡 API Endpoint</h4>
        <code style={{ color: '#667eea' }}>/api/dataset/stats</code>
      </div>
    </div>
  );
}

