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
    { id: 'analytics', label: 'Analytics', icon: BarChart3 },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  const renderContent = () => {
    switch (currentView) {
      case 'threats':
        return <ThreatsView events={events} aiDecisions={aiDecisions} simulateThreat={simulateThreat} />;
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

      <div className="detail-actions">
        <button className="action-btn primary">Investigate</button>
        <button className="action-btn secondary">Quarantine</button>
        <button className="action-btn danger">Block</button>
      </div>
    </div>
  );
}

