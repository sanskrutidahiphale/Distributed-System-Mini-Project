import { RpcRequest, RpcResponse } from '../types.js';
import { getNodeNetwork } from './nodeNetwork.js';
import { getReservationService } from './reservationService.js';
import { getDatabase } from '../db/database.js';

export function handleRpcCall(req: RpcRequest): RpcResponse {
  const { jsonrpc, method, params = {}, id } = req;

  if (jsonrpc !== '2.0') {
    return {
      jsonrpc: '2.0',
      error: { code: -32600, message: 'Invalid Request: jsonrpc must be "2.0"' },
      id: id || null as any
    };
  }

  if (!method || typeof method !== 'string') {
    return {
      jsonrpc: '2.0',
      error: { code: -32600, message: 'Invalid Request: method is missing or invalid' },
      id: id || null as any
    };
  }

  const network = getNodeNetwork();
  const db = getDatabase();

  try {
    switch (method) {
      case 'station.ping': {
        const nodeId = params.nodeId || 'station-alpha';
        const node = network.getNode(nodeId);
        if (!node) {
          return {
            jsonrpc: '2.0',
            error: { code: -32001, message: `Node ${nodeId} not found in cluster` },
            id
          };
        }
        if (node.status === 'OFFLINE') {
          return {
            jsonrpc: '2.0',
            error: { code: -32002, message: `Node ${nodeId} is currently OFFLINE (connection timeout)` },
            id
          };
        }
        const clock = network.incrementLamportClock(nodeId, 'RPC_PING_PROCESSED');
        return {
          jsonrpc: '2.0',
          result: {
            nodeId,
            pong: true,
            serverTimestamp: Date.now(),
            latencyMs: node.latencyMs,
            lamportClock: clock,
            vectorClock: node.vectorClock
          },
          id
        };
      }

      case 'station.getStatus': {
        const nodeId = params.nodeId || 'station-beta';
        const node = network.getNode(nodeId);
        if (!node) {
          return {
            jsonrpc: '2.0',
            error: { code: -32001, message: `Node ${nodeId} not found` },
            id
          };
        }
        const station = db.prepare('SELECT * FROM stations WHERE id = ?').get(nodeId);
        const connectors = db.prepare('SELECT * FROM connectors WHERE station_id = ?').all(nodeId);
        return {
          jsonrpc: '2.0',
          result: {
            node,
            station,
            connectors
          },
          id
        };
      }

      case 'station.getConnectors': {
        const stationId = params.stationId || 'station-alpha';
        const connectors = db.prepare('SELECT * FROM connectors WHERE station_id = ?').all(stationId);
        return {
          jsonrpc: '2.0',
          result: { stationId, connectors },
          id
        };
      }

      case 'coordinator.checkAvailability': {
        const { connectorId, startTime, endTime } = params;
        if (!connectorId || !startTime || !endTime) {
          return {
            jsonrpc: '2.0',
            error: { code: -32602, message: 'Invalid params: connectorId, startTime, and endTime are required' },
            id
          };
        }
        const reservationService = getReservationService();
        const check = reservationService.checkAvailability(connectorId, startTime, endTime);
        return {
          jsonrpc: '2.0',
          result: check,
          id
        };
      }

      case 'coordinator.requestLock': {
        const requesterId = params.requesterId || 'station-alpha';
        const resource = params.resource || 'ALPHA-02';
        const result = network.simulateRicartAgrawala(requesterId, resource);
        return {
          jsonrpc: '2.0',
          result: {
            algorithm: 'Ricart-Agrawala Distributed Mutual Exclusion',
            resource,
            steps: result.steps
          },
          id
        };
      }

      case 'coordinator.triggerElection': {
        const algorithm = params.algorithm || 'BULLY';
        const initiatorId = params.initiatorId || 'station-alpha';
        if (algorithm === 'RING') {
          const result = network.runRingElection(initiatorId);
          return { jsonrpc: '2.0', result, id };
        } else {
          const result = network.runBullyElection(initiatorId, 'RPC Invocation');
          return { jsonrpc: '2.0', result, id };
        }
      }

      case 'system.getGlobalSnapshot': {
        const initiatorId = params.initiatorId || 'station-beta';
        const snapshot = network.captureGlobalSnapshot(initiatorId);
        return {
          jsonrpc: '2.0',
          result: snapshot,
          id
        };
      }

      default:
        return {
          jsonrpc: '2.0',
          error: { code: -32601, message: `Method not found: '${method}'` },
          id
        };
    }
  } catch (err: any) {
    return {
      jsonrpc: '2.0',
      error: { code: -32000, message: err.message || 'Server RPC runtime exception' },
      id
    };
  }
}
