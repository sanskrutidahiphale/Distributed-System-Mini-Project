export type StationStatus = 'ONLINE' | 'OFFLINE' | 'SUSPECT' | 'DEGRADED';
export type ConnectorStatus = 'AVAILABLE' | 'CHARGING' | 'RESERVED' | 'MAINTENANCE' | 'OFFLINE';
export type ConnectorType = 'CCS2' | 'Type 2' | 'CHAdeMO';
export type ReservationStatus = 'ACTIVE' | 'COMPLETED' | 'CANCELLED';

export interface Connector {
  id: string;
  station_id: string;
  connector_number: string;
  type: ConnectorType;
  power_kw: number;
  status: ConnectorStatus;
}

export interface Station {
  id: string;
  name: string;
  location: string;
  latitude: number;
  longitude: number;
  status: StationStatus;
  total_power_kw: number;
  last_heartbeat: number;
  is_coordinator: number;
  connectors?: Connector[];
}

export interface Reservation {
  id: string;
  station_id: string;
  connector_id: string;
  driver_id: string;
  driver_name: string;
  start_time: string;
  end_time: string;
  status: ReservationStatus;
  created_at: string;
  station_name?: string;
  connector_number?: string;
  connector_type?: string;
  power_kw?: number;
}

export interface NodeState {
  id: string;
  name: string;
  priority: number;
  status: StationStatus;
  lastHeartbeat: number;
  heartbeatMissCount: number;
  lamportClock: number;
  vectorClock: Record<string, number>;
  isCoordinator: boolean;
  port?: number;
  latencyMs: number;
}

export interface SystemMetrics {
  totalStations: number;
  onlineStations: number;
  offlineStations: number;
  totalConnectors: number;
  availableConnectors: number;
  occupiedConnectors: number;
  activeReservations: number;
  totalPowerKw: number;
  currentCoordinator: string;
  serverTimestamp: number;
}

export interface DistributedLog {
  id: number;
  timestamp: string;
  node_id: string;
  event_type: string;
  details: string;
  lamport_clock: number;
  vector_clock: string;
}

export interface TelemetryPacket {
  timestamp: number;
  gridFrequencyHz: number;
  sensors: {
    stationId: string;
    connectorId: string;
    activePowerKw: number;
    voltageV: number;
    currentA: number;
    batterySocPercent: number;
    connectorTempC: number;
  }[];
}
