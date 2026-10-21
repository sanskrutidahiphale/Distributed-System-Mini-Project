import React, { useState } from 'react';
import { 
  Search, 
  Filter, 
  Zap, 
  MapPin, 
  Crown, 
  Cpu, 
  Clock, 
  BatteryCharging,
  CheckCircle,
  AlertCircle,
  PlusCircle,
  Info
} from 'lucide-react';
import { Station, Connector, NodeState } from '../types.js';

interface StationsPageProps {
  stations: Station[];
  nodes: NodeState[];
  currentCoordinator: string;
  onSelectConnectorForBooking: (stationId: string, connectorId: string) => void;
}

export const StationsPage: React.FC<StationsPageProps> = ({
  stations,
  nodes,
  currentCoordinator,
  onSelectConnectorForBooking
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedType, setSelectedType] = useState<string>('ALL');
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL');
  const [inspectConnector, setInspectConnector] = useState<Connector | null>(null);

  // Filter stations and connectors
  const filteredStations = stations.filter(s => {
    const matchesSearch = s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          s.location.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          s.id.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesSearch;
  });

  return (
    <div>
      <div className="section-header">
        <div>
          <h2 className="section-title">Charging Station Nodes</h2>
          <p className="section-subtitle">
            Inspect individual station nodes, connector configurations, and real-time charging bay occupancy
          </p>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="card" style={{ padding: '14px 18px', marginBottom: '20px' }}>
        <div style={{ display: 'flex', gap: '14px', alignItems: 'center', flexWrap: 'wrap' }}>
          <div style={{ position: 'relative', flex: 1, minWidth: '220px' }}>
            <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-subtle)' }} />
            <input
              type="text"
              className="form-input"
              placeholder="Search station by name, location, or node ID..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{ paddingLeft: '36px' }}
            />
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Filter size={15} style={{ color: 'var(--text-muted)' }} />
            <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)' }}>Type:</span>
            <select 
              className="form-select" 
              style={{ width: 'auto', padding: '7px 12px', fontSize: '0.82rem' }}
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value)}
            >
              <option value="ALL">All Connectors</option>
              <option value="CCS2">CCS2 (DC Fast)</option>
              <option value="CHAdeMO">CHAdeMO (DC)</option>
              <option value="Type 2">Type 2 (AC)</option>
            </select>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)' }}>Status:</span>
            <select 
              className="form-select" 
              style={{ width: 'auto', padding: '7px 12px', fontSize: '0.82rem' }}
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
            >
              <option value="ALL">All Statuses</option>
              <option value="AVAILABLE">Available</option>
              <option value="CHARGING">Charging</option>
              <option value="RESERVED">Reserved</option>
            </select>
          </div>
        </div>
      </div>

      {/* Station List */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        {filteredStations.map((station) => {
          const node = nodes.find(n => n.id === station.id);
          const isCoordinator = station.id === currentCoordinator;
          const isOnline = station.status === 'ONLINE';

          // Filter station's connectors
          const visibleConnectors = (station.connectors || []).filter(c => {
            const matchesType = selectedType === 'ALL' || c.type === selectedType;
            const matchesStatus = selectedStatus === 'ALL' || c.status === selectedStatus;
            return matchesType && matchesStatus;
          });

          return (
            <div key={station.id} className="card" style={{ padding: '22px' }}>
              {/* Station Header */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px', borderBottom: '1px solid var(--border-color)', paddingBottom: '14px' }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--text-main)' }}>
                      {station.name}
                    </h3>
                    {isCoordinator && (
                      <span className="badge-coordinator">
                        <Crown size={13} /> Active Cluster Coordinator
                      </span>
                    )}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginTop: '6px', fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <MapPin size={14} /> {station.location}
                    </span>
                    <span>•</span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <Cpu size={14} /> Node: <code>{station.id}</code> (Priority: {node?.priority || 1})
                    </span>
                    <span>•</span>
                    <span>Total Power: <strong>{station.total_power_kw} kW</strong></span>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <span className={`status-badge ${isOnline ? 'online' : 'offline'}`}>
                    <span className="pulse-dot"></span>
                    {station.status}
                  </span>
                </div>
              </div>

              {/* Connectors Grid */}
              <div>
                <div style={{ fontSize: '0.8rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)', marginBottom: '12px' }}>
                  Connector Bays ({visibleConnectors.length} visible of {station.connectors?.length || 0})
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '14px' }}>
                  {visibleConnectors.map((connector) => {
                    let badgeClass = 'available';
                    if (connector.status === 'CHARGING') badgeClass = 'charging';
                    if (connector.status === 'RESERVED') badgeClass = 'reserved';
                    if (connector.status === 'OFFLINE' || connector.status === 'MAINTENANCE') badgeClass = 'offline';

                    return (
                      <div
                        key={connector.id}
                        style={{
                          border: '1px solid var(--border-color)',
                          borderRadius: 'var(--radius-md)',
                          padding: '14px',
                          backgroundColor: 'var(--bg-card-subtle)',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '10px'
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{ fontWeight: 800, fontSize: '0.9rem', color: 'var(--text-main)' }}>
                            {connector.connector_number}
                          </span>
                          <span className={`status-badge ${badgeClass}`}>
                            {connector.status}
                          </span>
                        </div>

                        <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                          <div>Protocol: <strong>{connector.type}</strong></div>
                          <div>Max Power: <strong>{connector.power_kw} kW</strong></div>
                        </div>

                        <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
                          <button
                            className="btn btn-outline btn-sm"
                            style={{ flex: 1 }}
                            onClick={() => setInspectConnector(connector)}
                          >
                            <Info size={13} /> Specs
                          </button>
                          
                          <button
                            className="btn btn-primary btn-sm"
                            style={{ flex: 1.4 }}
                            disabled={!isOnline || connector.status === 'MAINTENANCE' || connector.status === 'OFFLINE'}
                            onClick={() => onSelectConnectorForBooking(station.id, connector.id)}
                            title={isOnline ? 'Book a time slot for this connector' : 'Station node is offline'}
                          >
                            <PlusCircle size={13} /> Reserve
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Inspector Modal */}
      {inspectConnector && (
        <div className="modal-overlay" onClick={() => setInspectConnector(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">Connector Hardware Telemetry</h3>
              <button className="btn btn-outline btn-sm" onClick={() => setInspectConnector(null)}>✕</button>
            </div>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', fontSize: '0.85rem' }}>
              <div style={{ padding: '12px', backgroundColor: 'var(--bg-card-subtle)', borderRadius: 'var(--radius-md)' }}>
                <div><strong>Identifier:</strong> {inspectConnector.connector_number} ({inspectConnector.id})</div>
                <div><strong>Station Node:</strong> {inspectConnector.station_id}</div>
                <div><strong>Standard:</strong> {inspectConnector.type} (Combined Charging System / Mennekes)</div>
                <div><strong>Rated DC/AC Output:</strong> {inspectConnector.power_kw} kW Peak</div>
                <div><strong>Current Operational State:</strong> {inspectConnector.status}</div>
              </div>

              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', lineHeight: '1.4' }}>
                This connector represents a simulated physical charging dispenser controlled by the local station node process.
                When a reservation interval becomes active, the station node updates this hardware dispenser state and streams telemetry.
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button className="btn btn-outline" onClick={() => setInspectConnector(null)}>Close</button>
                <button 
                  className="btn btn-primary"
                  onClick={() => {
                    const stId = inspectConnector.station_id;
                    const cId = inspectConnector.id;
                    setInspectConnector(null);
                    onSelectConnectorForBooking(stId, cId);
                  }}
                >
                  Proceed to Reserve
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
