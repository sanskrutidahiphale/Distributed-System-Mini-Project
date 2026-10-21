import React from 'react';
import { 
  Zap, 
  BatteryCharging, 
  CheckCircle2, 
  AlertTriangle, 
  Calendar, 
  Crown, 
  Activity, 
  ArrowUpRight,
  ShieldCheck,
  Server,
  Layers
} from 'lucide-react';
import { SystemMetrics, Station, DistributedLog, NodeState } from '../types.js';

interface DashboardPageProps {
  metrics: SystemMetrics | null;
  stations: Station[];
  nodes: NodeState[];
  logs: DistributedLog[];
  onNavigate: (tab: string) => void;
  onTriggerElection: (algorithm: 'BULLY' | 'RING') => void;
}

export const DashboardPage: React.FC<DashboardPageProps> = ({
  metrics,
  stations,
  nodes,
  logs,
  onNavigate,
  onTriggerElection
}) => {
  const coordNode = nodes.find(n => n.id === metrics?.currentCoordinator);

  return (
    <div>
      {/* Top Section Header */}
      <div className="section-header">
        <div>
          <h2 className="section-title">Fleet Operations Overview</h2>
          <p className="section-subtitle">
            Coordinated monitoring across 3 distributed charging station nodes and active consensus coordinator
          </p>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button className="btn btn-outline btn-sm" onClick={() => onTriggerElection('BULLY')}>
            <Crown size={14} /> Run Bully Election
          </button>
          <button className="btn btn-primary btn-sm" onClick={() => onNavigate('reservations')}>
            <Calendar size={14} /> Book Charger
          </button>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="metrics-grid">
        <div className="metric-card">
          <div className="metric-icon-box" style={{ backgroundColor: 'var(--primary-light)', color: 'var(--primary)' }}>
            <Server size={22} />
          </div>
          <div className="metric-info">
            <span className="metric-label">Station Nodes</span>
            <span className="metric-value">
              {metrics ? `${metrics.onlineStations}/${metrics.totalStations}` : '3/3'}
            </span>
            <span className="metric-sub">
              {metrics?.offlineStations ? `${metrics.offlineStations} Node Offline` : 'All nodes healthy'}
            </span>
          </div>
        </div>

        <div className="metric-card">
          <div className="metric-icon-box" style={{ backgroundColor: 'var(--success-light)', color: 'var(--success)' }}>
            <CheckCircle2 size={22} />
          </div>
          <div className="metric-info">
            <span className="metric-label">Available Connectors</span>
            <span className="metric-value">
              {metrics ? metrics.availableConnectors : '10'}
            </span>
            <span className="metric-sub">
              {metrics ? `of ${metrics.totalConnectors} total points` : '12 total'}
            </span>
          </div>
        </div>

        <div className="metric-card">
          <div className="metric-icon-box" style={{ backgroundColor: 'var(--warning-light)', color: 'var(--warning)' }}>
            <BatteryCharging size={22} />
          </div>
          <div className="metric-info">
            <span className="metric-label">Occupied / Charging</span>
            <span className="metric-value">
              {metrics ? metrics.occupiedConnectors : '2'}
            </span>
            <span className="metric-sub">Active session draws</span>
          </div>
        </div>

        <div className="metric-card">
          <div className="metric-icon-box" style={{ backgroundColor: 'var(--info-light)', color: 'var(--info)' }}>
            <Calendar size={22} />
          </div>
          <div className="metric-info">
            <span className="metric-label">Active Bookings</span>
            <span className="metric-value">
              {metrics ? metrics.activeReservations : '1'}
            </span>
            <span className="metric-sub">Conflict-free guaranteed</span>
          </div>
        </div>

        <div className="metric-card">
          <div className="metric-icon-box" style={{ backgroundColor: 'var(--primary-light)', color: 'var(--primary)' }}>
            <Zap size={22} />
          </div>
          <div className="metric-info">
            <span className="metric-label">Total Fleet Power</span>
            <span className="metric-value">
              {metrics ? `${metrics.totalPowerKw} kW` : '1,060 kW'}
            </span>
            <span className="metric-sub">Ultra-fast DC & AC</span>
          </div>
        </div>
      </div>

      {/* Grid: Stations Cards + Activity Stream */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '24px' }}>
        {/* Left Column: Station Overview Cards */}
        <div>
          <div className="card" style={{ marginBottom: '16px' }}>
            <div className="card-title">
              <span>Identifiable Distributed Nodes</span>
              <button 
                className="btn btn-outline btn-sm"
                onClick={() => onNavigate('stations')}
                style={{ fontSize: '0.75rem', padding: '4px 8px' }}
              >
                View Details <ArrowUpRight size={13} />
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {stations.map((station) => {
                const nodeState = nodes.find(n => n.id === station.id);
                const isOnline = station.status === 'ONLINE';
                const isLeader = station.is_coordinator === 1;
                const totalConn = station.connectors?.length || 4;
                const availConn = station.connectors?.filter(c => c.status === 'AVAILABLE').length || 0;

                return (
                  <div
                    key={station.id}
                    style={{
                      border: '1px solid var(--border-color)',
                      borderRadius: 'var(--radius-md)',
                      padding: '14px 16px',
                      backgroundColor: 'var(--bg-card-subtle)',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '10px'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span style={{ fontWeight: 700, fontSize: '0.95rem' }}>{station.name}</span>
                          {isLeader && (
                            <span 
                              style={{ 
                                display: 'inline-flex', 
                                alignItems: 'center', 
                                gap: '3px',
                                fontSize: '0.68rem',
                                fontWeight: 700,
                                padding: '2px 6px',
                                borderRadius: 'var(--radius-full)',
                                backgroundColor: 'var(--primary-light)',
                                color: 'var(--primary)'
                              }}
                            >
                              <Crown size={11} /> COORDINATOR
                            </span>
                          )}
                        </div>
                        <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                          {station.location} • ID: <code>{station.id}</code> (P{nodeState?.priority || 1})
                        </div>
                      </div>

                      <span className={`status-badge ${isOnline ? 'online' : 'offline'}`}>
                        <span className="pulse-dot"></span>
                        {station.status}
                      </span>
                    </div>

                    {/* Connectors Quick Bar */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.75rem' }}>
                      <span style={{ color: 'var(--text-muted)' }}>Connectors:</span>
                      <div style={{ display: 'flex', gap: '6px', flex: 1 }}>
                        {station.connectors?.map((conn) => {
                          let badgeBg = 'var(--success-light)';
                          let badgeColor = 'var(--success-text)';
                          if (conn.status === 'CHARGING') {
                            badgeBg = 'var(--primary-light)';
                            badgeColor = 'var(--primary)';
                          } else if (conn.status === 'RESERVED') {
                            badgeBg = 'var(--warning-light)';
                            badgeColor = 'var(--warning-text)';
                          } else if (conn.status === 'OFFLINE' || conn.status === 'MAINTENANCE') {
                            badgeBg = 'var(--bg-active)';
                            badgeColor = 'var(--text-subtle)';
                          }

                          return (
                            <div
                              key={conn.id}
                              style={{
                                padding: '3px 8px',
                                borderRadius: 'var(--radius-sm)',
                                backgroundColor: badgeBg,
                                color: badgeColor,
                                fontWeight: 700,
                                fontSize: '0.7rem'
                              }}
                              title={`${conn.connector_number} (${conn.type} ${conn.power_kw}kW) - ${conn.status}`}
                            >
                              {conn.connector_number.split('-')[1]}
                            </div>
                          );
                        })}
                      </div>

                      <span style={{ fontWeight: 600, color: 'var(--text-muted)' }}>
                        {availConn}/{totalConn} Free
                      </span>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.74rem', color: 'var(--text-subtle)', borderTop: '1px solid var(--border-color)', paddingTop: '8px' }}>
                      <span>Grid Capacity: <strong>{station.total_power_kw} kW</strong></span>
                      <span>Logical Clock: <strong>{nodeState?.lamportClock || 0}</strong></span>
                      <span>Latency: <strong>{nodeState?.latencyMs || 10} ms</strong></span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Architecture Highlights Card */}
          <div className="card" style={{ padding: '16px 20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
              <ShieldCheck size={18} color="var(--success)" />
              <span style={{ fontWeight: 700, fontSize: '0.9rem' }}>FA-1 & FA-2 Synchronization Guarantees</span>
            </div>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', lineHeight: '1.4' }}>
              VoltGrid guarantees single-seat connector reservation safety via SQLite atomic transactions 
              <code>(BEGIN IMMEDIATE)</code> and interval overlap checks. Distributed nodes communicate heartbeats every 3s; 
              coordinator failover automatically triggers the <strong>Bully</strong> or <strong>Ring</strong> election algorithm.
            </p>
          </div>
        </div>

        {/* Right Column: Real-time Distributed Activity Stream */}
        <div>
          <div className="card" style={{ height: 'calc(100% - 24px)', display: 'flex', flexDirection: 'column' }}>
            <div className="card-title">
              <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Activity size={17} color="var(--primary)" /> Real-Time Distributed Event Stream
              </span>
              <span style={{ fontSize: '0.72rem', color: 'var(--text-subtle)', fontWeight: 600 }}>
                Live Socket.IO
              </span>
            </div>

            <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '10px', maxHeight: '520px' }}>
              {logs.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '30px', color: 'var(--text-subtle)', fontSize: '0.85rem' }}>
                  Awaiting distributed cluster events...
                </div>
              ) : (
                logs.slice(0, 15).map((log) => {
                  let eventBadgeColor = 'var(--primary)';
                  let eventBadgeBg = 'var(--primary-light)';
                  if (log.event_type.includes('CONFLICT') || log.event_type.includes('FAILED')) {
                    eventBadgeColor = 'var(--danger-text)';
                    eventBadgeBg = 'var(--danger-light)';
                  } else if (log.event_type.includes('ELECTED') || log.event_type.includes('WON')) {
                    eventBadgeColor = 'var(--warning-text)';
                    eventBadgeBg = 'var(--warning-light)';
                  } else if (log.event_type.includes('COMMITTED') || log.event_type.includes('RECOVERED')) {
                    eventBadgeColor = 'var(--success-text)';
                    eventBadgeBg = 'var(--success-light)';
                  }

                  let vClockObj: any = {};
                  try {
                    vClockObj = JSON.parse(log.vector_clock || '{}');
                  } catch (e) {}

                  return (
                    <div
                      key={log.id || Math.random()}
                      style={{
                        padding: '10px 12px',
                        borderRadius: 'var(--radius-sm)',
                        backgroundColor: 'var(--bg-card-subtle)',
                        border: '1px solid var(--border-color)',
                        fontSize: '0.78rem',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '5px'
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <span
                            style={{
                              fontSize: '0.68rem',
                              fontWeight: 700,
                              padding: '2px 6px',
                              borderRadius: 'var(--radius-sm)',
                              backgroundColor: eventBadgeBg,
                              color: eventBadgeColor
                            }}
                          >
                            {log.event_type}
                          </span>
                          <span style={{ fontWeight: 600, color: 'var(--text-muted)' }}>
                            {log.node_id.replace('station-', '')}
                          </span>
                        </div>

                        <span style={{ fontSize: '0.7rem', color: 'var(--text-subtle)' }}>
                          {new Date(log.timestamp).toLocaleTimeString()}
                        </span>
                      </div>

                      <div style={{ color: 'var(--text-main)', lineHeight: '1.3' }}>
                        {log.details}
                      </div>

                      <div style={{ display: 'flex', gap: '8px', fontSize: '0.7rem', color: 'var(--text-subtle)', marginTop: '2px' }}>
                        <span>Lamport L: <strong>{log.lamport_clock}</strong></span>
                        <span>Vector V: <strong>[{vClockObj['station-alpha'] || 0}, {vClockObj['station-beta'] || 0}, {vClockObj['station-gamma'] || 0}]</strong></span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
