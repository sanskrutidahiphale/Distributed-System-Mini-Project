import React, { useState } from 'react';
import { 
  Network, 
  Crown, 
  Radio, 
  Power, 
  RotateCcw, 
  ShieldCheck, 
  ArrowRight, 
  Clock, 
  Cpu, 
  Activity, 
  Zap,
  Server
} from 'lucide-react';
import { NodeState } from '../types.js';

interface NetworkMonitorPageProps {
  nodes: NodeState[];
  currentCoordinator: string;
  onFailNode: (nodeId: string) => void;
  onRecoverNode: (nodeId: string) => void;
  onTriggerElection: (algorithm: 'BULLY' | 'RING', initiatorId?: string) => Promise<any>;
}

export const NetworkMonitorPage: React.FC<NetworkMonitorPageProps> = ({
  nodes,
  currentCoordinator,
  onFailNode,
  onRecoverNode,
  onTriggerElection
}) => {
  const [selectedInitiator, setSelectedInitiator] = useState<string>('station-alpha');
  const [electionResult, setElectionResult] = useState<{ algorithm: string; winner: string; steps: any[] } | null>(null);
  const [isElecting, setIsElecting] = useState<boolean>(false);

  const handleRunElection = async (algorithm: 'BULLY' | 'RING') => {
    try {
      setIsElecting(true);
      const res = await onTriggerElection(algorithm, selectedInitiator);
      if (res) {
        setElectionResult({
          algorithm,
          winner: res.winner,
          steps: res.steps || []
        });
      }
    } finally {
      setIsElecting(false);
    }
  };

  const coordNode = nodes.find(n => n.id === currentCoordinator);

  return (
    <div>
      <div className="section-header">
        <div>
          <h2 className="section-title">Distributed Network Monitor & Consensus</h2>
          <p className="section-subtitle">
            Visual topology of identifiable nodes, beacon failure detection, and dynamic coordinator elections
          </p>
        </div>

        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600 }}>Initiator:</span>
          <select 
            className="form-select"
            style={{ width: 'auto', padding: '6px 10px', fontSize: '0.8rem' }}
            value={selectedInitiator}
            onChange={(e) => setSelectedInitiator(e.target.value)}
          >
            {nodes.map(n => (
              <option key={n.id} value={n.id}>
                {n.name} (P{n.priority}) [{n.status}]
              </option>
            ))}
          </select>

          <button 
            className="btn btn-outline btn-sm"
            disabled={isElecting}
            onClick={() => handleRunElection('BULLY')}
          >
            <Crown size={14} /> Run Bully Algorithm
          </button>

          <button 
            className="btn btn-primary btn-sm"
            disabled={isElecting}
            onClick={() => handleRunElection('RING')}
          >
            <RotateCcw size={14} /> Run Ring Algorithm
          </button>
        </div>
      </div>

      {/* Visual Network Topology Canvas */}
      <div className="card" style={{ padding: '24px', marginBottom: '24px' }}>
        <div className="card-title">
          <span>Mesh Topology & Communication Links</span>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-subtle)' }}>
            Beacon Interval: 3000ms • Failure Threshold: 8000ms
          </span>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '20px', marginTop: '10px' }}>
          {nodes.map((node) => {
            const isLeader = node.id === currentCoordinator;
            const isOnline = node.status === 'ONLINE';

            return (
              <div
                key={node.id}
                style={{
                  border: isLeader ? '2px solid var(--primary)' : '1px solid var(--border-color)',
                  borderRadius: 'var(--radius-lg)',
                  padding: '18px',
                  backgroundColor: isLeader ? 'var(--primary-light)' : 'var(--bg-card-subtle)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '12px',
                  position: 'relative',
                  boxShadow: isLeader ? '0 4px 12px rgba(2, 132, 199, 0.15)' : 'none'
                }}
              >
                {/* Node Header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ fontWeight: 800, fontSize: '1rem', color: 'var(--text-main)' }}>
                        {node.name}
                      </span>
                      {isLeader && (
                        <span className="badge-coordinator" style={{ padding: '2px 8px', fontSize: '0.68rem' }}>
                          <Crown size={12} /> LEADER
                        </span>
                      )}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                      Node ID: <code>{node.id}</code> • Priority: <strong>{node.priority}</strong>
                    </div>
                  </div>

                  <span className={`status-badge ${isOnline ? 'online' : 'offline'}`}>
                    <span className="pulse-dot"></span>
                    {node.status}
                  </span>
                </div>

                {/* Node Technical Telemetry */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '0.78rem', backgroundColor: 'var(--bg-card)', padding: '10px 12px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--text-muted)' }}>Simulated Port:</span>
                    <strong>localhost:{node.port}</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--text-muted)' }}>Lamport Clock (L):</span>
                    <strong>{node.lamportClock}</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--text-muted)' }}>Vector Clock (V):</span>
                    <strong style={{ fontFamily: 'var(--font-mono)' }}>
                      [{node.vectorClock['station-alpha'] || 0}, {node.vectorClock['station-beta'] || 0}, {node.vectorClock['station-gamma'] || 0}]
                    </strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--text-muted)' }}>Heartbeat Latency:</span>
                    <span>{node.latencyMs} ms</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--text-muted)' }}>Missed Heartbeats:</span>
                    <span style={{ color: node.heartbeatMissCount > 0 ? 'var(--danger-text)' : 'inherit', fontWeight: node.heartbeatMissCount > 0 ? 700 : 400 }}>
                      {node.heartbeatMissCount}
                    </span>
                  </div>
                </div>

                {/* Operator Failure Simulation Controls */}
                <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
                  {isOnline ? (
                    <button
                      className="btn btn-outline btn-sm"
                      style={{ flex: 1, color: 'var(--danger-text)', borderColor: 'var(--danger-light)' }}
                      onClick={() => onFailNode(node.id)}
                      title="Simulate network partition or process crash for this node"
                    >
                      <Power size={13} /> Disconnect Node
                    </button>
                  ) : (
                    <button
                      className="btn btn-success btn-sm"
                      style={{ flex: 1 }}
                      onClick={() => onRecoverNode(node.id)}
                      title="Simulate node reboot, state recovery, and sync"
                    >
                      <RotateCcw size={13} /> Reconnect Node
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Step-by-Step Election Execution Visualizer */}
      {electionResult && (
        <div className="card">
          <div className="card-title">
            <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Crown size={18} color="var(--primary)" /> 
              {electionResult.algorithm === 'BULLY' ? 'Bully Algorithm Execution Trace' : 'Ring Election Token Flow'}
            </span>
            <span className="badge-coordinator">
              Elected Coordinator: {electionResult.winner}
            </span>
          </div>

          <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginBottom: '14px' }}>
            {electionResult.algorithm === 'BULLY' ? (
              <span>
                <strong>Bully Algorithm Rules:</strong> Any node noticing a dead coordinator multicasts 
                <code>ELECTION</code> to peers with strictly higher priorities. If a higher node is active, it responds with 
                <code>OK</code> and takes over. If no higher node answers, the initiator declares victory with 
                <code>COORDINATOR</code> message.
              </span>
            ) : (
              <span>
                <strong>Ring Election Rules:</strong> Nodes are logically arranged in a circle. The initiator circulates an 
                <code>ELECTION</code> token containing a list of online candidate IDs. Each peer appends its own ID and forwards. 
                When the token completes a full circle, the initiator declares the candidate with the highest priority as the new leader.
              </span>
            )}
          </div>

          <div className="table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th style={{ width: '60px' }}>Step</th>
                  <th style={{ width: '130px' }}>Sender</th>
                  <th style={{ width: '130px' }}>Receiver</th>
                  <th style={{ width: '120px' }}>Message Type</th>
                  <th>Distributed Event Details</th>
                </tr>
              </thead>
              <tbody>
                {electionResult.steps.map((st: any) => (
                  <tr key={st.step}>
                    <td><strong>#{st.step}</strong></td>
                    <td><code>{st.from}</code></td>
                    <td><code>{st.to}</code></td>
                    <td>
                      <span 
                        style={{
                          fontSize: '0.7rem',
                          fontWeight: 700,
                          padding: '2px 6px',
                          borderRadius: 'var(--radius-sm)',
                          backgroundColor: 
                            st.type === 'COORDINATOR' ? 'var(--primary-light)' :
                            st.type === 'OK' ? 'var(--success-light)' : 'var(--warning-light)',
                          color:
                            st.type === 'COORDINATOR' ? 'var(--primary)' :
                            st.type === 'OK' ? 'var(--success-text)' : 'var(--warning-text)'
                        }}
                      >
                        {st.type}
                      </span>
                    </td>
                    <td style={{ lineHeight: '1.4' }}>{st.message}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
