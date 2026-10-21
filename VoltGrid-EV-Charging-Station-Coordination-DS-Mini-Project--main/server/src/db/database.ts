import { DatabaseSync } from 'node:sqlite';
import path from 'node:path';
import fs from 'node:fs';
import { Station, Connector, Reservation, DistributedLog } from '../types.js';

let dbInstance: DatabaseSync | null = null;

export function getDatabase(dbPath?: string): DatabaseSync {
  if (dbInstance && !dbPath) {
    return dbInstance;
  }

  const resolvedPath = dbPath || path.resolve(process.cwd(), 'voltgrid.sqlite');
  const dbDir = path.dirname(resolvedPath);
  if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
  }

  const db = new DatabaseSync(resolvedPath);
  dbInstance = db;

  initSchema(db);
  seedInitialData(db);

  return db;
}

export function initSchema(db: DatabaseSync): void {
  // Enable foreign keys and WAL mode for better concurrency
  db.exec('PRAGMA foreign_keys = ON;');

  db.exec(`
    CREATE TABLE IF NOT EXISTS stations (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      location TEXT NOT NULL,
      latitude REAL NOT NULL,
      longitude REAL NOT NULL,
      status TEXT NOT NULL,
      total_power_kw REAL NOT NULL,
      last_heartbeat INTEGER NOT NULL,
      is_coordinator INTEGER DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS connectors (
      id TEXT PRIMARY KEY,
      station_id TEXT NOT NULL,
      connector_number TEXT NOT NULL,
      type TEXT NOT NULL,
      power_kw REAL NOT NULL,
      status TEXT NOT NULL,
      FOREIGN KEY (station_id) REFERENCES stations(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS reservations (
      id TEXT PRIMARY KEY,
      station_id TEXT NOT NULL,
      connector_id TEXT NOT NULL,
      driver_id TEXT NOT NULL,
      driver_name TEXT NOT NULL,
      start_time TEXT NOT NULL,
      end_time TEXT NOT NULL,
      status TEXT NOT NULL,
      created_at TEXT NOT NULL,
      FOREIGN KEY (station_id) REFERENCES stations(id) ON DELETE CASCADE,
      FOREIGN KEY (connector_id) REFERENCES connectors(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS activity_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      timestamp TEXT NOT NULL,
      node_id TEXT NOT NULL,
      event_type TEXT NOT NULL,
      details TEXT NOT NULL,
      lamport_clock INTEGER NOT NULL,
      vector_clock TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_reservations_connector_time 
      ON reservations(connector_id, status, start_time, end_time);

    CREATE INDEX IF NOT EXISTS idx_connectors_station 
      ON connectors(station_id);

    CREATE INDEX IF NOT EXISTS idx_activity_logs_timestamp 
      ON activity_logs(timestamp);
  `);
}

export function seedInitialData(db: DatabaseSync, force: boolean = false): void {
  const stationCount = (db.prepare('SELECT COUNT(*) as count FROM stations').get() as { count: number }).count;
  
  if (stationCount > 0 && !force) {
    return;
  }

  if (force) {
    db.exec('DELETE FROM reservations;');
    db.exec('DELETE FROM connectors;');
    db.exec('DELETE FROM stations;');
    db.exec('DELETE FROM activity_logs;');
  }

  const now = Date.now();

  const insertStation = db.prepare(`
    INSERT INTO stations (id, name, location, latitude, longitude, status, total_power_kw, last_heartbeat, is_coordinator)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const insertConnector = db.prepare(`
    INSERT INTO connectors (id, station_id, connector_number, type, power_kw, status)
    VALUES (?, ?, ?, ?, ?, ?)
  `);

  const insertReservation = db.prepare(`
    INSERT INTO reservations (id, station_id, connector_id, driver_id, driver_name, start_time, end_time, status, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const insertLog = db.prepare(`
    INSERT INTO activity_logs (timestamp, node_id, event_type, details, lamport_clock, vector_clock)
    VALUES (?, ?, ?, ?, ?, ?)
  `);

  // Station Alpha: Central Hub
  insertStation.run('station-alpha', 'VoltGrid Central Hub', 'Downtown Metro Sector 4', 28.6139, 77.2090, 'ONLINE', 244, now, 0);
  insertConnector.run('alpha-c1', 'station-alpha', 'ALPHA-01', 'CCS2', 150, 'AVAILABLE');
  insertConnector.run('alpha-c2', 'station-alpha', 'ALPHA-02', 'CCS2', 50, 'CHARGING');
  insertConnector.run('alpha-c3', 'station-alpha', 'ALPHA-03', 'Type 2', 22, 'AVAILABLE');
  insertConnector.run('alpha-c4', 'station-alpha', 'ALPHA-04', 'Type 2', 22, 'AVAILABLE');

  // Station Beta: Tech Corridor (Current Coordinator)
  insertStation.run('station-beta', 'VoltGrid Tech Corridor', 'Cyber City Phase 2', 28.4900, 77.0800, 'ONLINE', 244, now, 1);
  insertConnector.run('beta-c1', 'station-beta', 'BETA-01', 'CCS2', 150, 'AVAILABLE');
  insertConnector.run('beta-c2', 'station-beta', 'BETA-02', 'CHAdeMO', 50, 'AVAILABLE');
  insertConnector.run('beta-c3', 'station-beta', 'BETA-03', 'Type 2', 22, 'AVAILABLE');
  insertConnector.run('beta-c4', 'station-beta', 'BETA-04', 'Type 2', 22, 'AVAILABLE');

  // Station Gamma: Westside Expressway
  insertStation.run('station-gamma', 'VoltGrid West Expressway', 'Interchange 9 Ring Road', 28.5355, 77.3910, 'ONLINE', 572, now, 0);
  insertConnector.run('gamma-c1', 'station-gamma', 'GAMMA-01', 'CCS2', 350, 'AVAILABLE');
  insertConnector.run('gamma-c2', 'station-gamma', 'GAMMA-02', 'CCS2', 150, 'AVAILABLE');
  insertConnector.run('gamma-c3', 'station-gamma', 'GAMMA-03', 'CHAdeMO', 50, 'AVAILABLE');
  insertConnector.run('gamma-c4', 'station-gamma', 'GAMMA-04', 'Type 2', 22, 'AVAILABLE');

  // Seed sample initial active reservation for alpha-c2
  const isoNow = new Date(now - 15 * 60 * 1000).toISOString();
  const isoLater = new Date(now + 45 * 60 * 1000).toISOString();
  insertReservation.run(
    'res-init-01',
    'station-alpha',
    'alpha-c2',
    'driver-901',
    'Aarav Sharma (Nexon EV)',
    isoNow,
    isoLater,
    'ACTIVE',
    new Date(now - 20 * 60 * 1000).toISOString()
  );

  // Initial event logs
  insertLog.run(
    new Date(now - 10000).toISOString(),
    'station-beta',
    'COORDINATOR_ELECTED',
    'Station Beta assumed leadership role following startup consensus',
    1,
    JSON.stringify({ 'station-alpha': 0, 'station-beta': 1, 'station-gamma': 0 })
  );

  insertLog.run(
    new Date(now - 5000).toISOString(),
    'station-alpha',
    'SESSION_STARTED',
    'Active charge session commenced on connector ALPHA-02 for driver-901',
    2,
    JSON.stringify({ 'station-alpha': 1, 'station-beta': 1, 'station-gamma': 0 })
  );
}

export function resetDatabase(): void {
  const db = getDatabase();
  seedInitialData(db, true);
}
