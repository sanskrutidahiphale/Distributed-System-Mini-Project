import React, { useState, useEffect } from 'react';
import { 
  FlaskConical, 
  Terminal, 
  Radio, 
  Clock, 
  Cpu, 
  Layers, 
  Crown, 
  Lock, 
  Activity, 
  Play, 
  Check, 
  ArrowRight,
  ShieldCheck,
  Send,
  Zap,
  Info
} from 'lucide-react';
import { NodeState, TelemetryPacket } from '../types.js';

interface LabPageProps {
  nodes: NodeState[];
  currentCoordinator: string;
}

export const LabPage: React.FC<LabPageProps> = ({ nodes, currentCoordinator }) => {
  const [activeTab, setActiveTab] = useState<string>('rpc');

  // --- TAB 1: JSON-RPC 2.0 State ---
  const [rpcMethod, setRpcMethod] = useState<string>('station.ping');
  const [rpcParams, setRpcParams] = useState<string>('{\n  "nodeId": "station-alpha"\n}');
  const [rpcResponse, setRpcResponse] = useState<any>(null);
  const [rpcLatency, setRpcLatency] = useState<number | null>(null);
  const [rpcLoading, setRpcLoading] = useState<boolean>(false);

  const handleSelectRpcPreset = (method: string) => {
    setRpcMethod(method);
    switch (method) {
      case 'station.ping':
        setRpcParams('{\n  "nodeId": "station-alpha"\n}');
        break;
      case 'station.getStatus':
        setRpcParams('{\n  "nodeId": "station-beta"\n}');
        break;
      case 'station.getConnectors':
        setRpcParams('{\n  "stationId": "station-gamma"\n}');
        break;
      case 'coordinator.checkAvailability':
        setRpcParams('{\n  "connectorId": "alpha-c1",\n  "startTime": "' + new Date(Date.now() + 3600000).toISOString() + '",\n  "endTime": "' + new Date(Date.now() + 7200000).toISOString() + '"\n}');
        break;
      case 'coordinator.requestLock':
        setRpcParams('{\n  "requesterId": "station-alpha",\n  "resource": "ALPHA-02"\n}');
        break;
      case 'system.getGlobalSnapshot':
        setRpcParams('{\n  "initiatorId": "station-beta"\n}');
        break;
      default:
        setRpcParams('{}');
    }
  };

  const handleExecuteRpc = async () => {
    try {
      setRpcLoading(true);
      let parsedParams = {};
      try {
        parsedParams = JSON.parse(rpcParams);
      } catch (e) {
        alert('Invalid JSON in parameters field');
        setRpcLoading(false);
        return;
      }

      const reqBody = {
        jsonrpc: '2.0',
        method: rpcMethod,
        params: parsedParams,
        id: Math.floor(Math.random() * 1000)
      };

      const start = performance.now();
      const res = await fetch('/api/rpc', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(reqBody)
      });
      const data = await res.json();
      const end = performance.now();

      setRpcLatency(Math.round(end - start));
      setRpcResponse(data);
    } catch (err: any) {
      setRpcResponse({ error: err.message });
    } finally {
      setRpcLoading(false);
    }
  };

  // --- TAB 2: SSE Telemetry Stream State ---
  const [streamData, setStreamData] = useState<TelemetryPacket | null>(null);
  const [isStreaming, setIsStreaming] = useState<boolean>(true);
  const [packetCount, setPacketCount] = useState<number>(0);

  useEffect(() => {
    if (!isStreaming) return;

    const eventSource = new EventSource('/api/stream/telemetry');
    eventSource.onmessage = (event) => {
      try {
        const parsed = JSON.parse(event.data);
        setStreamData(parsed);
        setPacketCount(c => c + 1);
      } catch (e) {}
    };

    eventSource.onerror = () => {
      eventSource.close();
    };

    return () => {
      eventSource.close();
    };
  }, [isStreaming]);

  // --- TAB 3: Lamport Logical Clocks State ---
  const [lamportNodes, setLamportNodes] = useState<Record<string, number>>({
    'station-alpha': 2,
    'station-beta': 3,
    'station-gamma': 1
  });
  const [lamportTrace, setLamportTrace] = useState<any[]>([]);

  const handleLamportLocalEvent = async (nodeId: string) => {
    try {
      const res = await fetch('/api/nodes/clocks/event', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nodeId, eventName: 'Sensor Calibration Event' })
      });
      const data = await res.json();
      if (data.success) {
        setLamportNodes(prev => ({ ...prev, [nodeId]: data.lamportClock }));
        setLamportTrace(prev => [
          {
            type: 'LOCAL',
            nodeId,
            oldClock: data.lamportClock - 1,
            newClock: data.lamportClock,
            detail: `Rule 1 applied: Local event on ${nodeId} incremented clock: L = ${data.lamportClock}`,
            time: new Date().toLocaleTimeString()
          },
          ...prev.slice(0, 10)
        ]);
      }
    } catch (e) {}
  };

  const handleLamportSendMessage = (senderId: string, receiverId: string) => {
    // Sender increments clock (Rule 1)
    const senderClock = (lamportNodes[senderId] || 1) + 1;
    // Receiver applies Rule 2: max(receiverClock, senderClock) + 1
    const receiverOldClock = lamportNodes[receiverId] || 1;
    const receiverNewClock = Math.max(receiverOldClock, senderClock) + 1;

    setLamportNodes(prev => ({
      ...prev,
      [senderId]: senderClock,
      [receiverId]: receiverNewClock
    }));

    setLamportTrace(prev => [
      {
        type: 'SEND_RECEIVE',
        senderId,
        receiverId,
        senderClock,
        receiverNewClock,
        detail: `Rule 2 applied: ${senderId} sent message (timestamp=${senderClock}). ${receiverId} updated: max(${receiverOldClock}, ${senderClock}) + 1 = ${receiverNewClock}`,
        time: new Date().toLocaleTimeString()
      },
      ...prev.slice(0, 10)
    ]);
  };

  // --- TAB 4: Vector Clocks & Causality Checker ---
  const [vA, setVA] = useState<Record<string, number>>({ 'station-alpha': 2, 'station-beta': 1, 'station-gamma': 0 });
  const [vB, setVB] = useState<Record<string, number>>({ 'station-alpha': 1, 'station-beta': 2, 'station-gamma': 0 });
  const [causalityResult, setCausalityResult] = useState<any>(null);

  const handleCompareVectorClocks = async () => {
    try {
      const res = await fetch('/api/nodes/clocks/compare', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ vectorA: vA, vectorB: vB })
      });
      const data = await res.json();
      setCausalityResult(data);
    } catch (e) {}
  };

  // --- TAB 5: Ricart-Agrawala Mutual Exclusion State ---
  const [mutexTrace, setMutexTrace] = useState<any[]>([]);
  const [mutexRunning, setMutexRunning] = useState<boolean>(false);

  const handleRunRicartAgrawala = async (requesterId: string) => {
    try {
      setMutexRunning(true);
      const res = await fetch('/api/nodes/mutex', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ requesterId, resource: 'Connector-ALPHA-02' })
      });
      const data = await res.json();
      setMutexTrace(data.steps || []);
    } finally {
      setMutexRunning(false);
    }
  };

  // --- TAB 6: Chandy-Lamport Global Snapshot State ---
  const [snapshotData, setSnapshotData] = useState<any>(null);

  const handleCaptureSnapshot = async () => {
    try {
      const res = await fetch('/api/nodes/snapshot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ initiatorId: 'station-beta' })
      });
      const data = await res.json();
      setSnapshotData(data);
    } catch (e) {}
  };

  return (
    <div>
      <div className="section-header">
        <div>
          <h2 className="section-title">Distributed Systems Laboratory</h2>
          <p className="section-subtitle">
            Interactive, step-by-step testbenches for FA-1 (Communication) and FA-2 (Synchronization & Consensus) algorithms
          </p>
        </div>
      </div>

      {/* Lab Tabs Header */}
      <div className="tabs-header">
        <button className={`tab-btn ${activeTab === 'rpc' ? 'active' : ''}`} onClick={() => setActiveTab('rpc')}>
          <Terminal size={15} /> 1. JSON-RPC 2.0
        </button>
        <button className={`tab-btn ${activeTab === 'stream' ? 'active' : ''}`} onClick={() => setActiveTab('stream')}>
          <Radio size={15} /> 2. Stream Telemetry (SSE)
        </button>
        <button className={`tab-btn ${activeTab === 'lamport' ? 'active' : ''}`} onClick={() => setActiveTab('lamport')}>
          <Clock size={15} /> 3. Lamport Clocks
        </button>
        <button className={`tab-btn ${activeTab === 'vector' ? 'active' : ''}`} onClick={() => setActiveTab('vector')}>
          <Cpu size={15} /> 4. Vector Clocks & Causality
        </button>
        <button className={`tab-btn ${activeTab === 'mutex' ? 'active' : ''}`} onClick={() => setActiveTab('mutex')}>
          <Lock size={15} /> 5. Ricart-Agrawala Mutex
        </button>
        <button className={`tab-btn ${activeTab === 'snapshot' ? 'active' : ''}`} onClick={() => setActiveTab('snapshot')}>
          <Layers size={15} /> 6. Global Snapshot
        </button>
      </div>

      {/* TAB CONTENT 1: JSON-RPC 2.0 */}
      {activeTab === 'rpc' && (
        <div style={{ display: 'grid', gridTemplateColumns: '400px 1fr', gap: '24px' }}>
          <div className="card">
            <div className="card-title">
              <span>RPC Invocation Console</span>
            </div>

            <div className="form-group">
              <label className="form-label">Pre-configured RPC Methods</label>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {[
                  { m: 'station.ping', desc: 'Heartbeat echo & roundtrip clock' },
                  { m: 'station.getStatus', desc: 'Fetch node telemetry & load' },
                  { m: 'station.getConnectors', desc: 'Hardware connector registry' },
                  { m: 'coordinator.checkAvailability', desc: 'Distributed slot query' },
                  { m: 'coordinator.requestLock', desc: 'Trigger Ricart-Agrawala mutex' },
                  { m: 'system.getGlobalSnapshot', desc: 'Chandy-Lamport state snapshot' }
                ].map(item => (
                  <button
                    key={item.m}
                    className={`btn btn-outline btn-sm ${rpcMethod === item.m ? 'btn-primary' : ''}`}
                    style={{ justifyContent: 'flex-start', textAlign: 'left', padding: '8px 12px' }}
                    onClick={() => handleSelectRpcPreset(item.m)}
                  >
                    <div>
                      <code style={{ fontWeight: 700 }}>{item.m}</code>
                      <div style={{ fontSize: '0.7rem', opacity: 0.8 }}>{item.desc}</div>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            <div className="form-group" style={{ marginTop: '14px' }}>
              <label className="form-label">Parameters JSON (`params`)</label>
              <textarea
                className="form-textarea"
                rows={5}
                style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8rem' }}
                value={rpcParams}
                onChange={(e) => setRpcParams(e.target.value)}
              />
            </div>

            <button
              className="btn btn-primary"
              style={{ width: '100%', marginTop: '10px' }}
              disabled={rpcLoading}
              onClick={handleExecuteRpc}
            >
              <Send size={14} /> Execute Remote Procedure Call
            </button>
          </div>

          <div className="card">
            <div className="card-title">
              <span>JSON-RPC 2.0 Response Inspector</span>
              {rpcLatency !== null && (
                <span className="badge-coordinator">
                  Roundtrip: {rpcLatency} ms
                </span>
              )}
            </div>

            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '12px' }}>
              Adheres strictly to the JSON-RPC 2.0 Specification. Returns <code>result</code> on success or standardized 
              error objects with negative codes (e.g., <code>-32601 Method not found</code>, <code>-32602 Invalid params</code>).
            </p>

            <pre className="code-block" style={{ height: '360px' }}>
              {rpcResponse ? JSON.stringify(rpcResponse, null, 2) : '// Click "Execute Remote Procedure Call" to view the response payload'}
            </pre>
          </div>
        </div>
      )}

      {/* TAB CONTENT 2: SSE Telemetry Stream */}
      {activeTab === 'stream' && (
        <div>
          <div className="card" style={{ marginBottom: '20px' }}>
            <div className="card-title">
              <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Radio size={18} color="var(--primary)" /> Continuous Stream-Oriented Communication (SSE)
              </span>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  Packets Received: <strong>{packetCount}</strong>
                </span>
                <button 
                  className={`btn btn-sm ${isStreaming ? 'btn-danger' : 'btn-success'}`}
                  onClick={() => setIsStreaming(!isStreaming)}
                >
                  {isStreaming ? 'Pause Stream' : 'Resume Stream'}
                </button>
              </div>
            </div>

            <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginBottom: '16px', lineHeight: '1.4' }}>
              <strong>Unit II Concept:</strong> Unlike REST or RPC (which follow strict Request/Response cycles), 
              <strong>Stream-Oriented Communication</strong> establishes a persistent unidirectional channel over HTTP (Server-Sent Events) 
              or WebSockets, continuously pushing high-frequency hardware sensor measurements without per-sample client polling.
            </p>

            {/* Live Sensor Metrics Display */}
            {streamData && (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px' }}>
                {streamData.sensors.map((sensor) => (
                  <div
                    key={sensor.connectorId}
                    style={{
                      border: '1px solid var(--border-color)',
                      borderRadius: 'var(--radius-md)',
                      padding: '16px',
                      backgroundColor: 'var(--bg-card-subtle)'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
                      <span style={{ fontWeight: 800, fontSize: '0.9rem' }}>{sensor.connectorId.toUpperCase()}</span>
                      <span className="badge-coordinator" style={{ padding: '2px 8px', fontSize: '0.7rem' }}>
                        Grid: {streamData.gridFrequencyHz} Hz
                      </span>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '0.8rem' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ color: 'var(--text-muted)' }}>Active Power:</span>
                        <strong style={{ color: sensor.activePowerKw > 0 ? 'var(--primary)' : 'inherit' }}>
                          {sensor.activePowerKw} kW
                        </strong>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ color: 'var(--text-muted)' }}>DC Voltage:</span>
                        <span>{sensor.voltageV} V</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ color: 'var(--text-muted)' }}>Charging Current:</span>
                        <span>{sensor.currentA} A</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ color: 'var(--text-muted)' }}>Battery SoC:</span>
                        <strong style={{ color: sensor.batterySocPercent > 0 ? 'var(--success)' : 'inherit' }}>
                          {sensor.batterySocPercent > 0 ? `${sensor.batterySocPercent}%` : 'Idle'}
                        </strong>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ color: 'var(--text-muted)' }}>Plug Temperature:</span>
                        <span>{sensor.connectorTempC} °C</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB CONTENT 3: Lamport Logical Clocks */}
      {activeTab === 'lamport' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '24px' }}>
          <div>
            <div className="card">
              <div className="card-title">
                <span>Lamport Logical Clocks Simulator</span>
              </div>

              <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginBottom: '16px', lineHeight: '1.4' }}>
                Lamport timestamps impose a partial ordering on events across distributed nodes:
                <br />• <strong>Rule 1 (Local Event):</strong> Before executing an event or sending a message, node i increments: L_i = L_i + 1.
                <br />• <strong>Rule 2 (Message Receipt):</strong> When receiving message with timestamp L_msg, node j updates: L_j = max(L_j, L_msg) + 1.
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '14px', marginBottom: '20px' }}>
                {nodes.map(n => {
                  const currentClock = lamportNodes[n.id] || 1;
                  return (
                    <div
                      key={n.id}
                      style={{
                        border: '1px solid var(--border-color)',
                        borderRadius: 'var(--radius-md)',
                        padding: '16px',
                        backgroundColor: 'var(--bg-card-subtle)',
                        textAlign: 'center',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '10px'
                      }}
                    >
                      <span style={{ fontWeight: 800, fontSize: '0.88rem' }}>{n.name}</span>
                      <div style={{ fontSize: '2.2rem', fontWeight: 800, color: 'var(--primary)' }}>
                        {currentClock}
                      </div>
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                        Clock Value: L({n.id.replace('station-', '')})
                      </div>

                      <button
                        className="btn btn-outline btn-sm"
                        onClick={() => handleLamportLocalEvent(n.id)}
                      >
                        Local Event (+1)
                      </button>
                    </div>
                  );
                })}
              </div>

              {/* Message Passing Controls */}
              <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '16px' }}>
                <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-main)', display: 'block', marginBottom: '8px' }}>
                  Simulate Message Passing (Rule 2 Updates):
                </span>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  <button className="btn btn-outline btn-sm" onClick={() => handleLamportSendMessage('station-alpha', 'station-beta')}>
                    Alpha → Beta
                  </button>
                  <button className="btn btn-outline btn-sm" onClick={() => handleLamportSendMessage('station-beta', 'station-gamma')}>
                    Beta → Gamma
                  </button>
                  <button className="btn btn-outline btn-sm" onClick={() => handleLamportSendMessage('station-gamma', 'station-alpha')}>
                    Gamma → Alpha
                  </button>
                  <button className="btn btn-outline btn-sm" onClick={() => handleLamportSendMessage('station-beta', 'station-alpha')}>
                    Beta → Alpha
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div>
            <div className="card">
              <div className="card-title">
                <span>Clock Mutation Event Trace</span>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxHeight: '420px', overflowY: 'auto' }}>
                {lamportTrace.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '30px', color: 'var(--text-subtle)', fontSize: '0.82rem' }}>
                    Trigger a local event or message pass on the left to observe clock mutations.
                  </div>
                ) : (
                  lamportTrace.map((tr, idx) => (
                    <div
                      key={idx}
                      style={{
                        padding: '10px 12px',
                        borderRadius: 'var(--radius-sm)',
                        backgroundColor: 'var(--bg-card-subtle)',
                        border: '1px solid var(--border-color)',
                        fontSize: '0.78rem'
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700, marginBottom: '4px' }}>
                        <span>{tr.type === 'LOCAL' ? '📍 Local Event' : '✉️ Message Sent & Received'}</span>
                        <span style={{ fontSize: '0.7rem', color: 'var(--text-subtle)' }}>{tr.time}</span>
                      </div>
                      <div style={{ color: 'var(--text-main)', lineHeight: '1.3' }}>{tr.detail}</div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB CONTENT 4: Vector Clocks & Causality */}
      {activeTab === 'vector' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
          <div className="card">
            <div className="card-title">
              <span>Vector Clocks & Causality Comparator</span>
            </div>

            <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginBottom: '16px', lineHeight: '1.4' }}>
              While Lamport clocks guarantee that if $A \to B$ then $L(A) &lt; L(B)$, the converse is not true.
              <strong>Vector Clocks</strong> capture true causal relationships:
              <br />• $V(A) \le V(B) \iff \forall k, V_A[k] \le V_B[k]$.
              <br />• If $V(A) \le V(B)$ and $V(A) \ne V(B)$, then $A$ <strong>causally precedes</strong> $B$ ($A \to B$).
              <br />• If neither $V(A) \le V(B)$ nor $V(B) \le V(A)$, the events are <strong>concurrent</strong> ($A \parallel B$).
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div style={{ padding: '12px', backgroundColor: 'var(--bg-card-subtle)', borderRadius: 'var(--radius-md)' }}>
                <span style={{ fontWeight: 700, fontSize: '0.85rem' }}>Vector A: [Alpha, Beta, Gamma]</span>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px', marginTop: '6px' }}>
                  <input type="number" className="form-input" value={vA['station-alpha']} onChange={e => setVA({ ...vA, 'station-alpha': +e.target.value })} />
                  <input type="number" className="form-input" value={vA['station-beta']} onChange={e => setVA({ ...vA, 'station-beta': +e.target.value })} />
                  <input type="number" className="form-input" value={vA['station-gamma']} onChange={e => setVA({ ...vA, 'station-gamma': +e.target.value })} />
                </div>
              </div>

              <div style={{ padding: '12px', backgroundColor: 'var(--bg-card-subtle)', borderRadius: 'var(--radius-md)' }}>
                <span style={{ fontWeight: 700, fontSize: '0.85rem' }}>Vector B: [Alpha, Beta, Gamma]</span>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px', marginTop: '6px' }}>
                  <input type="number" className="form-input" value={vB['station-alpha']} onChange={e => setVB({ ...vB, 'station-alpha': +e.target.value })} />
                  <input type="number" className="form-input" value={vB['station-beta']} onChange={e => setVB({ ...vB, 'station-beta': +e.target.value })} />
                  <input type="number" className="form-input" value={vB['station-gamma']} onChange={e => setVB({ ...vB, 'station-gamma': +e.target.value })} />
                </div>
              </div>

              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  className="btn btn-outline btn-sm"
                  onClick={() => {
                    setVA({ 'station-alpha': 1, 'station-beta': 0, 'station-gamma': 0 });
                    setVB({ 'station-alpha': 2, 'station-beta': 1, 'station-gamma': 0 });
                  }}
                >
                  Preset: A Causes B (A → B)
                </button>
                <button
                  className="btn btn-outline btn-sm"
                  onClick={() => {
                    setVA({ 'station-alpha': 2, 'station-beta': 0, 'station-gamma': 1 });
                    setVB({ 'station-alpha': 1, 'station-beta': 2, 'station-gamma': 0 });
                  }}
                >
                  Preset: Concurrent (A ∥ B)
                </button>
              </div>

              <button className="btn btn-primary" onClick={handleCompareVectorClocks}>
                Evaluate Vector Causality
              </button>
            </div>
          </div>

          <div className="card">
            <div className="card-title">
              <span>Causality Analysis Result</span>
            </div>

            {causalityResult ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div
                  style={{
                    padding: '16px',
                    borderRadius: 'var(--radius-md)',
                    backgroundColor: 
                      causalityResult.relation === 'CONCURRENT' ? 'var(--warning-light)' : 'var(--primary-light)',
                    color: 
                      causalityResult.relation === 'CONCURRENT' ? 'var(--warning-text)' : 'var(--primary)',
                    fontWeight: 800,
                    fontSize: '1.1rem',
                    textAlign: 'center'
                  }}
                >
                  {causalityResult.relation === 'CONCURRENT' ? 'CONCURRENT EVENTS (A ∥ B)' :
                   causalityResult.relation === 'A_CAUSES_B' ? 'EVENT A HAPPENED-BEFORE B (A → B)' :
                   causalityResult.relation === 'B_CAUSES_A' ? 'EVENT B HAPPENED-BEFORE A (B → A)' : 'EQUAL EVENTS'}
                </div>

                <div style={{ fontSize: '0.85rem', color: 'var(--text-main)', lineHeight: '1.4' }}>
                  {causalityResult.explanation}
                </div>

                <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '12px', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                  <strong>Practical Relevance:</strong> In VoltGrid, concurrent reservations ($R_1 \parallel R_2$) from two drivers 
                  at different station nodes are resolved safely by the centralized coordinator's ACID transaction, ensuring no 
                  overlapping slot conflicts even when clocks are uncoordinated.
                </div>
              </div>
            ) : (
              <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-subtle)', fontSize: '0.85rem' }}>
                Click "Evaluate Vector Causality" to determine the happened-before relationship.
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB CONTENT 5: Ricart-Agrawala Mutual Exclusion */}
      {activeTab === 'mutex' && (
        <div>
          <div className="card" style={{ marginBottom: '20px' }}>
            <div className="card-title">
              <span>Ricart–Agrawala Distributed Mutual Exclusion Algorithm</span>
              <button 
                className="btn btn-primary btn-sm"
                disabled={mutexRunning}
                onClick={() => handleRunRicartAgrawala('station-beta')}
              >
                <Lock size={14} /> Run Mutex Simulation on Beta
              </button>
            </div>

            <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginBottom: '16px', lineHeight: '1.4' }}>
              <strong>Algorithm Overview:</strong> When node $i$ wants to access a shared critical section (e.g. exclusive lock on bay ALPHA-02), 
              it multicasts a timestamped <code>REQUEST(T_i, i)</code> to all $N-1$ active peers. 
              Peers reply immediately if they don't want the CS, or defer their reply if they hold a request with a lower timestamp. 
              Node $i$ enters the Critical Section only upon collecting $N-1$ <code>REPLY</code> messages.
            </p>

            {mutexTrace.length > 0 && (
              <div className="table-container">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Step</th>
                      <th>Sender</th>
                      <th>Receiver</th>
                      <th>Phase</th>
                      <th>Lamport L</th>
                      <th>Protocol Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {mutexTrace.map(st => (
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
                                st.type === 'ENTER_CS' ? 'var(--success-light)' :
                                st.type === 'REQUEST' ? 'var(--warning-light)' : 'var(--primary-light)',
                              color:
                                st.type === 'ENTER_CS' ? 'var(--success-text)' :
                                st.type === 'REQUEST' ? 'var(--warning-text)' : 'var(--primary)'
                            }}
                          >
                            {st.type}
                          </span>
                        </td>
                        <td><strong>{st.lamportClock}</strong></td>
                        <td>{st.message}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB CONTENT 6: Chandy-Lamport Global Snapshot */}
      {activeTab === 'snapshot' && (
        <div style={{ display: 'grid', gridTemplateColumns: '400px 1fr', gap: '24px' }}>
          <div className="card">
            <div className="card-title">
              <span>Chandy-Lamport Snapshot</span>
            </div>

            <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginBottom: '16px', lineHeight: '1.4' }}>
              Captures a <strong>consistent global state</strong> in an asynchronous distributed system without freezing execution:
              <br />1. Initiator saves its local state and sends a <code>MARKER</code> message along all outgoing channels.
              <br />2. On receiving a marker for the first time, a node records its local state and begins recording messages incoming on other channels.
            </p>

            <button className="btn btn-primary" style={{ width: '100%' }} onClick={handleCaptureSnapshot}>
              <Layers size={15} /> Trigger Global Snapshot Cut
            </button>
          </div>

          <div className="card">
            <div className="card-title">
              <span>Recorded Consistent Cut</span>
              {snapshotData && <span className="badge-coordinator">{snapshotData.snapshotId}</span>}
            </div>

            {snapshotData ? (
              <pre className="code-block" style={{ height: '360px' }}>
                {JSON.stringify(snapshotData, null, 2)}
              </pre>
            ) : (
              <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-subtle)', fontSize: '0.85rem' }}>
                Click "Trigger Global Snapshot Cut" to execute the Chandy-Lamport snapshot.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
