import express, { Request, Response } from 'express';
import http from 'node:http';
import { Server as SocketIOServer } from 'socket.io';
import cors from 'cors';
import { getDatabase, resetDatabase } from './db/database.js';
import { getNodeNetwork } from './services/nodeNetwork.js';
import { getReservationService } from './services/reservationService.js';
import { handleRpcCall } from './services/rpcService.js';
import { RpcRequest, Station, Connector } from './types.js';

const app = express();
const server = http.createServer(app);

const io = new SocketIOServer(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

app.use(cors());
app.use(express.json());

// Initialize SQLite and Network
const db = getDatabase();
const network = getNodeNetwork();
const reservationService = getReservationService();

network.setSocketServer(io);
reservationService.setSocketServer(io);
network.startHeartbeatMonitoring(3000);

// --- REST API ENDPOINTS ---

// 1. Stations & Connectors
app.get('/api/stations', (req: Request, res: Response) => {
  try {
    const stations = db.prepare('SELECT * FROM stations').all() as unknown as Station[];
    const connectors = db.prepare('SELECT * FROM connectors').all() as unknown as Connector[];

    const result = stations.map(s => {
      const stationConnectors = connectors.filter(c => c.station_id === s.id);
      const node = network.getNode(s.id);
      return {
        ...s,
        status: node ? node.status : s.status,
        is_coordinator: s.id === network.getCoordinatorId() ? 1 : 0,
        connectors: stationConnectors
      };
    });

    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/stations/:id', (req: Request, res: Response) => {
  try {
    const station = db.prepare('SELECT * FROM stations WHERE id = ?').get(req.params.id) as Station | undefined;
    if (!station) {
      return res.status(404).json({ error: 'Station not found' });
    }
    const connectors = db.prepare('SELECT * FROM connectors WHERE station_id = ?').all(req.params.id) as unknown as Connector[];
    const node = network.getNode(station.id);

    res.json({
      ...station,
      status: node ? node.status : station.status,
      is_coordinator: station.id === network.getCoordinatorId() ? 1 : 0,
      connectors
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/connectors', (req: Request, res: Response) => {
  try {
    const connectors = db.prepare(`
      SELECT c.*, s.name as station_name, s.status as station_status
      FROM connectors c
      JOIN stations s ON c.station_id = s.id
    `).all();
    res.json(connectors);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 2. Reservations
app.get('/api/reservations', (req: Request, res: Response) => {
  try {
    const reservations = reservationService.getReservations();
    res.json(reservations);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/reservations/check', (req: Request, res: Response) => {
  try {
    const { connectorId, startTime, endTime } = req.body;
    if (!connectorId || !startTime || !endTime) {
      return res.status(400).json({ error: 'connectorId, startTime, and endTime are required' });
    }
    const result = reservationService.checkAvailability(connectorId, startTime, endTime);
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/reservations', (req: Request, res: Response) => {
  try {
    const { stationId, connectorId, driverId, driverName, startTime, endTime } = req.body;
    if (!stationId || !connectorId || !driverName || !startTime || !endTime) {
      return res.status(400).json({ error: 'stationId, connectorId, driverName, startTime, and endTime are required.' });
    }

    const result = reservationService.createReservation({
      stationId,
      connectorId,
      driverId: driverId || `driver-${Math.floor(100 + Math.random() * 900)}`,
      driverName,
      startTime,
      endTime
    });

    if (!result.success) {
      if (result.conflict) {
        return res.status(409).json(result);
      }
      return res.status(400).json(result);
    }

    res.status(201).json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/reservations/:id/cancel', (req: Request, res: Response) => {
  try {
    const result = reservationService.cancelReservation(req.params.id);
    if (!result.success) {
      return res.status(400).json(result);
    }
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 3. Distributed Network & Node Operations
app.get('/api/nodes', (req: Request, res: Response) => {
  try {
    res.json({
      nodes: network.getAllNodes(),
      currentCoordinator: network.getCoordinatorId()
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/nodes/:id/fail', (req: Request, res: Response) => {
  try {
    const success = network.failNode(req.params.id);
    if (!success) {
      return res.status(404).json({ error: `Node ${req.params.id} not found` });
    }
    res.json({ success: true, message: `Node ${req.params.id} set to OFFLINE` });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/nodes/:id/recover', (req: Request, res: Response) => {
  try {
    const success = network.recoverNode(req.params.id);
    if (!success) {
      return res.status(404).json({ error: `Node ${req.params.id} not found` });
    }
    res.json({ success: true, message: `Node ${req.params.id} recovered to ONLINE` });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/nodes/election', (req: Request, res: Response) => {
  try {
    const { algorithm = 'BULLY', initiatorId = 'station-alpha' } = req.body;
    if (algorithm === 'RING') {
      const result = network.runRingElection(initiatorId);
      res.json(result);
    } else {
      const result = network.runBullyElection(initiatorId, 'Manual operator election trigger');
      res.json(result);
    }
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/nodes/mutex', (req: Request, res: Response) => {
  try {
    const { requesterId = 'station-alpha', resource = 'Connector-ALPHA-02' } = req.body;
    const result = network.simulateRicartAgrawala(requesterId, resource);
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/nodes/snapshot', (req: Request, res: Response) => {
  try {
    const { initiatorId = 'station-beta' } = req.body;
    const result = network.captureGlobalSnapshot(initiatorId);
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/nodes/clocks/event', (req: Request, res: Response) => {
  try {
    const { nodeId, eventName = 'Manual Local Operation' } = req.body;
    if (!nodeId) return res.status(400).json({ error: 'nodeId is required' });
    const clock = network.incrementLamportClock(nodeId, eventName);
    res.json({ success: true, nodeId, lamportClock: clock, node: network.getNode(nodeId) });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/nodes/clocks/compare', (req: Request, res: Response) => {
  try {
    const { vectorA, vectorB } = req.body;
    if (!vectorA || !vectorB) {
      return res.status(400).json({ error: 'vectorA and vectorB are required' });
    }
    const result = network.compareVectorClocks(vectorA, vectorB);
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 4. Metrics & Logs
app.get('/api/metrics', (req: Request, res: Response) => {
  try {
    const stations = db.prepare('SELECT * FROM stations').all() as unknown as Station[];
    const connectors = db.prepare('SELECT * FROM connectors').all() as unknown as Connector[];
    const activeReservations = db.prepare("SELECT COUNT(*) as count FROM reservations WHERE status = 'ACTIVE'").get() as { count: number };
    
    const nodes = network.getAllNodes();
    const offlineNodes = nodes.filter(n => n.status === 'OFFLINE').length;
    const availableConnectors = connectors.filter(c => c.status === 'AVAILABLE').length;
    const occupiedConnectors = connectors.filter(c => c.status === 'CHARGING' || c.status === 'RESERVED').length;
    const totalPowerKw = stations.reduce((acc, s) => acc + s.total_power_kw, 0);

    res.json({
      totalStations: stations.length,
      onlineStations: stations.length - offlineNodes,
      offlineStations: offlineNodes,
      totalConnectors: connectors.length,
      availableConnectors,
      occupiedConnectors,
      activeReservations: activeReservations.count,
      totalPowerKw,
      currentCoordinator: network.getCoordinatorId(),
      serverTimestamp: Date.now()
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/logs', (req: Request, res: Response) => {
  try {
    const limit = Number(req.query.limit) || 50;
    const logs = db.prepare('SELECT * FROM activity_logs ORDER BY id DESC LIMIT ?').all(limit);
    res.json(logs);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 5. JSON-RPC 2.0 Endpoint
app.post('/api/rpc', (req: Request, res: Response) => {
  const rpcReq = req.body as RpcRequest;
  const rpcRes = handleRpcCall(rpcReq);
  res.json(rpcRes);
});

// 6. Stream-oriented Communication: Server-Sent Events (SSE)
app.get('/api/stream/telemetry', (req: Request, res: Response) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  // Send telemetry stream tick every 1000ms
  const interval = setInterval(() => {
    const telemetryPacket = {
      timestamp: Date.now(),
      gridFrequencyHz: +(50.0 + (Math.random() * 0.1 - 0.05)).toFixed(3),
      sensors: [
        {
          stationId: 'station-alpha',
          connectorId: 'alpha-c2',
          activePowerKw: +(44.2 + Math.random() * 2.5).toFixed(1),
          voltageV: +(398 + Math.random() * 4).toFixed(1),
          currentA: +(110 + Math.random() * 6).toFixed(1),
          batterySocPercent: +(62 + (Date.now() / 30000) % 20).toFixed(1),
          connectorTempC: +(34.5 + Math.random() * 1.2).toFixed(1)
        },
        {
          stationId: 'station-beta',
          connectorId: 'beta-c1',
          activePowerKw: 0,
          voltageV: 400.1,
          currentA: 0,
          batterySocPercent: 0,
          connectorTempC: +(26.2 + Math.random() * 0.4).toFixed(1)
        },
        {
          stationId: 'station-gamma',
          connectorId: 'gamma-c1',
          activePowerKw: +(148.5 + Math.random() * 3.0).toFixed(1),
          voltageV: +(780 + Math.random() * 5).toFixed(1),
          currentA: +(190 + Math.random() * 4).toFixed(1),
          batterySocPercent: +(45 + (Date.now() / 25000) % 35).toFixed(1),
          connectorTempC: +(38.1 + Math.random() * 1.5).toFixed(1)
        }
      ]
    };

    res.write(`data: ${JSON.stringify(telemetryPacket)}\n\n`);
  }, 1000);

  req.on('close', () => {
    clearInterval(interval);
  });
});

// 7. Reset System State
app.post('/api/reset', (req: Request, res: Response) => {
  try {
    resetDatabase();
    res.json({ success: true, message: 'Database and simulator state reset to initial seed values' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Socket.IO Connection Handler
io.on('connection', (socket) => {
  // Send immediate state to newly connected client
  socket.emit('network_update', {
    nodes: network.getAllNodes(),
    currentCoordinator: network.getCoordinatorId(),
    timestamp: Date.now()
  });

  socket.on('disconnect', () => {});
});

const PORT = process.env.PORT || 5001;
server.listen(PORT, () => {
  console.log(`VoltGrid Coordination Server running at http://localhost:${PORT}`);
});
