import { NodeState, StationStatus, DistributedLog } from '../types.js';
import { getDatabase } from '../db/database.js';

export interface ElectionStep {
  step: number;
  from: string;
  to: string;
  type: 'ELECTION' | 'OK' | 'COORDINATOR' | 'RING_PASS';
  message: string;
  timestamp: number;
}

export interface MutexStep {
  step: number;
  from: string;
  to: string;
  type: 'REQUEST' | 'REPLY' | 'ENTER_CS' | 'EXIT_CS';
  message: string;
  timestamp: number;
  lamportClock: number;
}

export class NodeNetworkManager {
  private nodes: Map<string, NodeState> = new Map();
  private currentCoordinatorId: string = 'station-beta';
  private heartbeatInterval: NodeJS.Timeout | null = null;
  private io: any = null;

  constructor() {
    this.initializeNodes();
  }

  private initializeNodes() {
    this.nodes.set('station-alpha', {
      id: 'station-alpha',
      name: 'VoltGrid Central Hub',
      priority: 1,
      status: 'ONLINE',
      lastHeartbeat: Date.now(),
      heartbeatMissCount: 0,
      lamportClock: 2,
      vectorClock: { 'station-alpha': 2, 'station-beta': 1, 'station-gamma': 0 },
      isCoordinator: false,
      port: 5011,
      latencyMs: 12
    });

    this.nodes.set('station-beta', {
      id: 'station-beta',
      name: 'VoltGrid Tech Corridor',
      priority: 2,
      status: 'ONLINE',
      lastHeartbeat: Date.now(),
      heartbeatMissCount: 0,
      lamportClock: 3,
      vectorClock: { 'station-alpha': 1, 'station-beta': 3, 'station-gamma': 0 },
      isCoordinator: true,
      port: 5012,
      latencyMs: 18
    });

    this.nodes.set('station-gamma', {
      id: 'station-gamma',
      name: 'VoltGrid West Expressway',
      priority: 3,
      status: 'ONLINE',
      lastHeartbeat: Date.now(),
      heartbeatMissCount: 0,
      lamportClock: 1,
      vectorClock: { 'station-alpha': 0, 'station-beta': 0, 'station-gamma': 1 },
      isCoordinator: false,
      port: 5013,
      latencyMs: 25
    });
  }

  public setSocketServer(io: any) {
    this.io = io;
  }

  public startHeartbeatMonitoring(intervalMs: number = 3000) {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
    }

    this.heartbeatInterval = setInterval(() => {
      this.tickHeartbeats();
    }, intervalMs);
  }

  public stopHeartbeatMonitoring() {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }

  private tickHeartbeats() {
    const now = Date.now();
    let hasChanges = false;

    for (const [id, node] of this.nodes.entries()) {
      if (node.status === 'ONLINE') {
        // Random slight jitter in latency for realism
        node.latencyMs = Math.max(5, Math.min(60, node.latencyMs + (Math.floor(Math.random() * 5) - 2)));
        node.lastHeartbeat = now;
        node.heartbeatMissCount = 0;
      } else if (node.status === 'OFFLINE') {
        node.heartbeatMissCount += 1;
      }
    }

    // Check if current coordinator is offline and needs election
    const currentCoord = this.nodes.get(this.currentCoordinatorId);
    if (currentCoord && currentCoord.status === 'OFFLINE') {
      const highestOnline = this.getHighestOnlineNode();
      if (highestOnline && highestOnline.id !== this.currentCoordinatorId) {
        // Automatically initiate failover election
        this.runBullyElection(highestOnline.id, 'Automatic coordinator failover detection');
        hasChanges = true;
      }
    }

    if (this.io) {
      this.io.emit('heartbeat_tick', {
        timestamp: now,
        nodes: this.getAllNodes(),
        currentCoordinator: this.currentCoordinatorId
      });
    }
  }

  public getAllNodes(): NodeState[] {
    return Array.from(this.nodes.values());
  }

  public getNode(id: string): NodeState | undefined {
    return this.nodes.get(id);
  }

  public getCoordinatorId(): string {
    return this.currentCoordinatorId;
  }

  public failNode(nodeId: string): boolean {
    const node = this.nodes.get(nodeId);
    if (!node) return false;

    node.status = 'OFFLINE';
    node.isCoordinator = false;

    // Update database station status
    const db = getDatabase();
    db.prepare('UPDATE stations SET status = ?, is_coordinator = 0 WHERE id = ?').run('OFFLINE', nodeId);

    this.logEvent(nodeId, 'NODE_FAILED', `Node ${node.name} simulated offline disconnection`);

    if (this.currentCoordinatorId === nodeId) {
      // Coordinator failed! Find available node to trigger election
      const highestOnline = this.getHighestOnlineNode();
      if (highestOnline) {
        setTimeout(() => {
          this.runBullyElection(highestOnline.id, `Coordinator ${nodeId} failed; automated Bully election triggered`);
        }, 1000);
      }
    }

    this.broadcastNetworkState();
    return true;
  }

  public recoverNode(nodeId: string): boolean {
    const node = this.nodes.get(nodeId);
    if (!node) return false;

    node.status = 'ONLINE';
    node.lastHeartbeat = Date.now();
    node.heartbeatMissCount = 0;
    node.lamportClock += 1;

    // Increment vector clock
    if (node.vectorClock[nodeId] !== undefined) {
      node.vectorClock[nodeId] += 1;
    }

    // Update database
    const db = getDatabase();
    db.prepare('UPDATE stations SET status = ?, last_heartbeat = ? WHERE id = ?').run('ONLINE', Date.now(), nodeId);

    this.logEvent(nodeId, 'NODE_RECOVERED', `Node ${node.name} re-established network connection and synced state`);

    // In Bully algorithm, if higher priority node recovers, it challenges the coordinator
    const currentCoord = this.nodes.get(this.currentCoordinatorId);
    if (currentCoord && node.priority > currentCoord.priority) {
      setTimeout(() => {
        this.runBullyElection(nodeId, `Higher priority node ${node.name} recovered; claiming leadership`);
      }, 800);
    }

    this.broadcastNetworkState();
    return true;
  }

  private getHighestOnlineNode(): NodeState | null {
    let highest: NodeState | null = null;
    for (const node of this.nodes.values()) {
      if (node.status === 'ONLINE') {
        if (!highest || node.priority > highest.priority) {
          highest = node;
        }
      }
    }
    return highest;
  }

  // --- Lamport Logical Clock Operations ---
  public incrementLamportClock(nodeId: string, eventName: string): number {
    const node = this.nodes.get(nodeId);
    if (!node) return 0;

    node.lamportClock += 1;
    if (node.vectorClock[nodeId] !== undefined) {
      node.vectorClock[nodeId] += 1;
    }

    this.logEvent(nodeId, 'LOCAL_EVENT', `${eventName} (Lamport Clock updated to ${node.lamportClock})`);
    this.broadcastNetworkState();
    return node.lamportClock;
  }

  public updateLamportOnReceive(receiverId: string, senderId: string, senderClock: number): number {
    const receiver = this.nodes.get(receiverId);
    if (!receiver) return 0;

    // Lamport Rule: L_j = max(L_j, L_msg) + 1
    receiver.lamportClock = Math.max(receiver.lamportClock, senderClock) + 1;

    // Vector clock merge
    const sender = this.nodes.get(senderId);
    if (sender) {
      for (const [k, val] of Object.entries(sender.vectorClock)) {
        receiver.vectorClock[k] = Math.max(receiver.vectorClock[k] || 0, val);
      }
    }
    if (receiver.vectorClock[receiverId] !== undefined) {
      receiver.vectorClock[receiverId] += 1;
    }

    this.logEvent(
      receiverId,
      'MESSAGE_RECEIVED',
      `Received message from ${senderId} (remote clock: ${senderClock}, new local clock: ${receiver.lamportClock})`
    );

    this.broadcastNetworkState();
    return receiver.lamportClock;
  }

  // --- Vector Clocks Causality Comparator ---
  public compareVectorClocks(
    vA: Record<string, number>,
    vB: Record<string, number>
  ): { relation: 'A_CAUSES_B' | 'B_CAUSES_A' | 'CONCURRENT' | 'EQUAL'; explanation: string } {
    const keys = Array.from(new Set([...Object.keys(vA), ...Object.keys(vB)]));
    let aLessOrEqual = true;
    let bLessOrEqual = true;
    let identical = true;

    for (const k of keys) {
      const valA = vA[k] || 0;
      const valB = vB[k] || 0;
      if (valA !== valB) identical = false;
      if (valA > valB) aLessOrEqual = false;
      if (valB > valA) bLessOrEqual = false;
    }

    if (identical) {
      return { relation: 'EQUAL', explanation: 'Both events have identical vector timestamps.' };
    }
    if (aLessOrEqual) {
      return { relation: 'A_CAUSES_B', explanation: 'Event A causally preceded Event B (A → B) because every element of V_A ≤ V_B and V_A ≠ V_B.' };
    }
    if (bLessOrEqual) {
      return { relation: 'B_CAUSES_A', explanation: 'Event B causally preceded Event A (B → A) because every element of V_B ≤ V_A and V_B ≠ V_A.' };
    }
    return { relation: 'CONCURRENT', explanation: 'Events A and B are concurrent (A ∥ B); neither causally preceded the other across distributed nodes.' };
  }

  // --- Bully Algorithm Implementation ---
  public runBullyElection(initiatorId: string, reason: string = 'Operator manual trigger'): { steps: ElectionStep[]; winner: string } {
    const steps: ElectionStep[] = [];
    const initiator = this.nodes.get(initiatorId);
    if (!initiator) throw new Error(`Initiator node ${initiatorId} not found`);

    let stepCount = 1;
    steps.push({
      step: stepCount++,
      from: initiatorId,
      to: 'BROADCAST',
      type: 'ELECTION',
      message: `${initiator.name} (Priority ${initiator.priority}) detected coordinator failure (${reason}) and broadcasted ELECTION to higher priority nodes.`,
      timestamp: Date.now()
    });

    const higherNodes = Array.from(this.nodes.values()).filter(n => n.priority > initiator.priority);
    let higherResponded = false;
    let winnerNode = initiator;

    for (const higher of higherNodes) {
      steps.push({
        step: stepCount++,
        from: initiatorId,
        to: higher.id,
        type: 'ELECTION',
        message: `Sent ELECTION message to higher node ${higher.name} (Priority ${higher.priority})`,
        timestamp: Date.now()
      });

      if (higher.status === 'ONLINE') {
        higherResponded = true;
        steps.push({
          step: stepCount++,
          from: higher.id,
          to: initiatorId,
          type: 'OK',
          message: `${higher.name} replied with OK (acknowledgement), taking over election from ${initiator.name}.`,
          timestamp: Date.now()
        });
        if (!winnerNode || higher.priority > winnerNode.priority) {
          winnerNode = higher;
        }
      } else {
        steps.push({
          step: stepCount++,
          from: higher.id,
          to: initiatorId,
          type: 'ELECTION',
          message: `Node ${higher.name} is OFFLINE; no response received within timeout.`,
          timestamp: Date.now()
        });
      }
    }

    if (higherResponded && winnerNode.id !== initiatorId) {
      // Winner announces COORDINATOR to all active nodes
      steps.push({
        step: stepCount++,
        from: winnerNode.id,
        to: 'ALL_NODES',
        type: 'COORDINATOR',
        message: `${winnerNode.name} won election by having the highest online priority (${winnerNode.priority}). Broadcasting COORDINATOR announcement.`,
        timestamp: Date.now()
      });
    } else {
      // Initiator is the highest active node
      steps.push({
        step: stepCount++,
        from: initiatorId,
        to: 'ALL_NODES',
        type: 'COORDINATOR',
        message: `No higher priority node answered. ${initiator.name} declares itself as COORDINATOR to all active nodes.`,
        timestamp: Date.now()
      });
      winnerNode = initiator;
    }

    // Apply election result
    this.currentCoordinatorId = winnerNode.id;
    for (const [id, node] of this.nodes.entries()) {
      node.isCoordinator = (id === winnerNode.id);
    }

    const db = getDatabase();
    db.prepare('UPDATE stations SET is_coordinator = 0').run();
    db.prepare('UPDATE stations SET is_coordinator = 1 WHERE id = ?').run(winnerNode.id);

    this.logEvent(winnerNode.id, 'ELECTION_WON_BULLY', `Bully election concluded: ${winnerNode.name} elected coordinator`);
    this.broadcastNetworkState();

    if (this.io) {
      this.io.emit('election_completed', {
        algorithm: 'BULLY',
        winner: winnerNode.id,
        steps
      });
    }

    return { steps, winner: winnerNode.id };
  }

  // --- Ring Election Algorithm Implementation ---
  public runRingElection(initiatorId: string): { steps: ElectionStep[]; winner: string } {
    const steps: ElectionStep[] = [];
    const orderedNodes = Array.from(this.nodes.values()).sort((a, b) => a.priority - b.priority);
    const initiator = this.nodes.get(initiatorId);
    if (!initiator) throw new Error(`Initiator ${initiatorId} not found`);

    let stepCount = 1;
    const activeCandidates: string[] = [initiatorId];

    steps.push({
      step: stepCount++,
      from: initiatorId,
      to: 'LOGICAL_RING',
      type: 'ELECTION',
      message: `${initiator.name} initialized Ring Election with candidate list [${initiatorId}].`,
      timestamp: Date.now()
    });

    const initIdx = orderedNodes.findIndex(n => n.id === initiatorId);
    const count = orderedNodes.length;

    for (let i = 1; i <= count; i++) {
      const fromNode = orderedNodes[(initIdx + i - 1) % count];
      const toNode = orderedNodes[(initIdx + i) % count];

      if (toNode.status === 'ONLINE') {
        if (!activeCandidates.includes(toNode.id)) {
          activeCandidates.push(toNode.id);
        }
        steps.push({
          step: stepCount++,
          from: fromNode.id,
          to: toNode.id,
          type: 'RING_PASS',
          message: `Token passed from ${fromNode.name} to ${toNode.name}. Active candidates: [${activeCandidates.join(', ')}]`,
          timestamp: Date.now()
        });
      } else {
        steps.push({
          step: stepCount++,
          from: fromNode.id,
          to: toNode.id,
          type: 'RING_PASS',
          message: `Node ${toNode.name} is OFFLINE. Ring skipped forward to next active peer.`,
          timestamp: Date.now()
        });
      }
    }

    // Determine candidate with highest priority
    let winnerNode = initiator;
    for (const candId of activeCandidates) {
      const candidate = this.nodes.get(candId);
      if (candidate && candidate.status === 'ONLINE' && candidate.priority > winnerNode.priority) {
        winnerNode = candidate;
      }
    }

    steps.push({
      step: stepCount++,
      from: initiatorId,
      to: 'LOGICAL_RING',
      type: 'COORDINATOR',
      message: `Ring election completed full circle. Highest priority node in candidate set is ${winnerNode.name} (Priority ${winnerNode.priority}).`,
      timestamp: Date.now()
    });

    this.currentCoordinatorId = winnerNode.id;
    for (const [id, node] of this.nodes.entries()) {
      node.isCoordinator = (id === winnerNode.id);
    }

    const db = getDatabase();
    db.prepare('UPDATE stations SET is_coordinator = 0').run();
    db.prepare('UPDATE stations SET is_coordinator = 1 WHERE id = ?').run(winnerNode.id);

    this.logEvent(winnerNode.id, 'ELECTION_WON_RING', `Ring election concluded: ${winnerNode.name} elected coordinator`);
    this.broadcastNetworkState();

    if (this.io) {
      this.io.emit('election_completed', {
        algorithm: 'RING',
        winner: winnerNode.id,
        steps
      });
    }

    return { steps, winner: winnerNode.id };
  }

  // --- Ricart-Agrawala Distributed Mutual Exclusion Simulation ---
  public simulateRicartAgrawala(requesterId: string, resourceName: string = 'Connector-ALPHA-02'): { steps: MutexStep[]; entered: boolean } {
    const steps: MutexStep[] = [];
    const requester = this.nodes.get(requesterId);
    if (!requester) throw new Error(`Requester ${requesterId} not found`);
    if (requester.status !== 'ONLINE') throw new Error(`Node ${requesterId} is offline`);

    requester.lamportClock += 1;
    const requestClock = requester.lamportClock;
    let stepCount = 1;

    steps.push({
      step: stepCount++,
      from: requesterId,
      to: 'MULTICAST',
      type: 'REQUEST',
      message: `${requester.name} created timestamped REQUEST(clock=${requestClock}, node=${requesterId}) to acquire exclusive lock on ${resourceName}`,
      timestamp: Date.now(),
      lamportClock: requestClock
    });

    const otherNodes = Array.from(this.nodes.values()).filter(n => n.id !== requesterId && n.status === 'ONLINE');
    let allReplied = true;

    for (const peer of otherNodes) {
      peer.lamportClock = Math.max(peer.lamportClock, requestClock) + 1;
      steps.push({
        step: stepCount++,
        from: peer.id,
        to: requesterId,
        type: 'REPLY',
        message: `${peer.name} verified it has no conflicting CS claim and issued grant REPLY to ${requester.name}`,
        timestamp: Date.now(),
        lamportClock: peer.lamportClock
      });
    }

    requester.lamportClock += 1;
    steps.push({
      step: stepCount++,
      from: requesterId,
      to: requesterId,
      type: 'ENTER_CS',
      message: `${requester.name} received N-1=${otherNodes.length} REPLY tokens. Entering Critical Section for ${resourceName}`,
      timestamp: Date.now(),
      lamportClock: requester.lamportClock
    });

    requester.lamportClock += 1;
    steps.push({
      step: stepCount++,
      from: requesterId,
      to: 'RELEASE',
      type: 'EXIT_CS',
      message: `${requester.name} executed safe write, left Critical Section, and flushed any deferred replies.`,
      timestamp: Date.now(),
      lamportClock: requester.lamportClock
    });

    this.logEvent(requesterId, 'MUTEX_RICART_AGRAWALA', `Mutual exclusion acquired and released safely on ${resourceName}`);
    this.broadcastNetworkState();

    return { steps, entered: true };
  }

  // --- Chandy-Lamport Global Snapshot Simulation ---
  public captureGlobalSnapshot(initiatorId: string) {
    const initiator = this.nodes.get(initiatorId);
    if (!initiator) throw new Error(`Initiator ${initiatorId} not found`);

    initiator.lamportClock += 1;
    const snapshotTimestamp = Date.now();
    const nodeSnapshots = Array.from(this.nodes.values()).map(n => ({
      nodeId: n.id,
      name: n.name,
      status: n.status,
      lamportClock: n.lamportClock,
      vectorClock: { ...n.vectorClock },
      isCoordinator: n.isCoordinator
    }));

    // In-flight messages capture
    const inFlightMessages = [
      { from: 'station-alpha', to: 'station-beta', channel: 'C_alpha_beta', message: 'HEARTBEAT_ACK', status: 'IN_TRANSIT' },
      { from: 'station-gamma', to: 'station-beta', channel: 'C_gamma_beta', message: 'TELEMETRY_SAMPLE', status: 'DELIVERED' }
    ];

    const snapshotResult = {
      snapshotId: `snap-${snapshotTimestamp}`,
      initiator: initiatorId,
      timestamp: snapshotTimestamp,
      nodeSnapshots,
      inFlightMessages,
      consistencyExplanation: 'Cut is strongly consistent: no recorded message was received without its send event having been recorded.'
    };

    this.logEvent(initiatorId, 'SNAPSHOT_CAPTURED', `Chandy-Lamport global cut snap-${snapshotTimestamp} recorded across 3 nodes`);
    this.broadcastNetworkState();

    return snapshotResult;
  }

  public logEvent(nodeId: string, eventType: string, details: string) {
    try {
      const db = getDatabase();
      const node = this.nodes.get(nodeId);
      const clock = node ? node.lamportClock : 1;
      const vClock = node ? JSON.stringify(node.vectorClock) : JSON.stringify({});

      db.prepare(`
        INSERT INTO activity_logs (timestamp, node_id, event_type, details, lamport_clock, vector_clock)
        VALUES (?, ?, ?, ?, ?, ?)
      `).run(new Date().toISOString(), nodeId, eventType, details, clock, vClock);

      if (this.io) {
        this.io.emit('log_event', {
          timestamp: new Date().toISOString(),
          node_id: nodeId,
          event_type: eventType,
          details,
          lamport_clock: clock,
          vector_clock: vClock
        });
      }
    } catch (err) {
      console.error('Error logging distributed event:', err);
    }
  }

  private broadcastNetworkState() {
    if (this.io) {
      this.io.emit('network_update', {
        nodes: this.getAllNodes(),
        currentCoordinator: this.currentCoordinatorId,
        timestamp: Date.now()
      });
    }
  }
}

let nodeNetworkInstance: NodeNetworkManager | null = null;

export function getNodeNetwork(): NodeNetworkManager {
  if (!nodeNetworkInstance) {
    nodeNetworkInstance = new NodeNetworkManager();
  }
  return nodeNetworkInstance;
}
