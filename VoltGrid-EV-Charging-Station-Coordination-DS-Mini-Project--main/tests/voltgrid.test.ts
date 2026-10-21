import test from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { getDatabase, resetDatabase } from '../server/src/db/database.js';
import { getReservationService } from '../server/src/services/reservationService.js';
import { getNodeNetwork } from '../server/src/services/nodeNetwork.js';
import { handleRpcCall } from '../server/src/services/rpcService.js';

test('VoltGrid Distributed Systems Test Suite', async (t) => {
  // Reset clean state before tests
  resetDatabase();
  const db = getDatabase();
  const network = getNodeNetwork();
  const reservationService = getReservationService();

  await t.test('1. Database Initialization & Seeding', () => {
    const stations = db.prepare('SELECT * FROM stations').all() as any[];
    assert.equal(stations.length, 3, 'Should seed exactly 3 station nodes (Alpha, Beta, Gamma)');

    const connectors = db.prepare('SELECT * FROM connectors').all() as any[];
    assert.equal(connectors.length, 12, 'Should seed 12 total connectors (4 per station)');

    const activeReservations = db.prepare("SELECT * FROM reservations WHERE status = 'ACTIVE'").all() as any[];
    assert.ok(activeReservations.length >= 1, 'Should have initial active reservation');
  });

  await t.test('2. Successful Valid Reservation', () => {
    const baseTime = Date.now() + 2 * 60 * 60 * 1000; // 2 hours from now
    const startTime = new Date(baseTime).toISOString();
    const endTime = new Date(baseTime + 45 * 60 * 1000).toISOString(); // 45 min slot

    const result = reservationService.createReservation({
      stationId: 'station-alpha',
      connectorId: 'alpha-c1',
      driverId: 'driver-test-01',
      driverName: 'Vikram Patel',
      startTime,
      endTime
    });

    assert.equal(result.success, true, 'Reservation should succeed');
    assert.ok(result.reservation?.id, 'Reservation ID should be generated');
    assert.equal(result.reservation?.driver_name, 'Vikram Patel');
  });

  await t.test('3. Overlapping Reservation Rejection on Same Connector', () => {
    const baseTime = Date.now() + 2 * 60 * 60 * 1000;
    // Overlapping slot: starts 15 mins after previous booking starts
    const overlapStart = new Date(baseTime + 15 * 60 * 1000).toISOString();
    const overlapEnd = new Date(baseTime + 60 * 60 * 1000).toISOString();

    const conflictResult = reservationService.createReservation({
      stationId: 'station-alpha',
      connectorId: 'alpha-c1',
      driverId: 'driver-test-02',
      driverName: 'Neha Rao',
      startTime: overlapStart,
      endTime: overlapEnd
    });

    assert.equal(conflictResult.success, false, 'Conflicting reservation must be rejected');
    assert.ok(conflictResult.conflict, 'Conflict metadata must be provided');
    assert.equal(conflictResult.conflict?.driverName, 'Vikram Patel', 'Should identify conflicting driver');
  });

  await t.test('4. Valid Reservation on Different Connector During Same Time', () => {
    const baseTime = Date.now() + 2 * 60 * 60 * 1000;
    const startTime = new Date(baseTime).toISOString();
    const endTime = new Date(baseTime + 45 * 60 * 1000).toISOString();

    // Booking connector alpha-c3 at the exact same time as alpha-c1
    const result = reservationService.createReservation({
      stationId: 'station-alpha',
      connectorId: 'alpha-c3',
      driverId: 'driver-test-03',
      driverName: 'Sameer Verma',
      startTime,
      endTime
    });

    assert.equal(result.success, true, 'Different connector should be independently bookable without conflict');
  });

  await t.test('5. Invalid Reservation Interval Validation', () => {
    const now = Date.now() + 60 * 60 * 1000;
    // End time before start time
    const invalidResult = reservationService.createReservation({
      stationId: 'station-alpha',
      connectorId: 'alpha-c4',
      driverId: 'driver-test-04',
      driverName: 'Invalid Tester',
      startTime: new Date(now + 30 * 60 * 1000).toISOString(),
      endTime: new Date(now).toISOString()
    });

    assert.equal(invalidResult.success, false, 'Inverted time interval must fail');
    assert.match(invalidResult.error || '', /start time must be strictly before end time/);

    // Duration too short (< 10 mins)
    const tooShortResult = reservationService.createReservation({
      stationId: 'station-alpha',
      connectorId: 'alpha-c4',
      driverId: 'driver-test-04',
      driverName: 'Invalid Tester',
      startTime: new Date(now).toISOString(),
      endTime: new Date(now + 5 * 60 * 1000).toISOString()
    });

    assert.equal(tooShortResult.success, false, 'Duration under 10 minutes must fail');
    assert.match(tooShortResult.error || '', /Minimum charging duration is 10 minutes/);
  });

  await t.test('6. Reservation Cancellation and Slot Release', () => {
    const baseTime = Date.now() + 4 * 60 * 60 * 1000;
    const startTime = new Date(baseTime).toISOString();
    const endTime = new Date(baseTime + 30 * 60 * 1000).toISOString();

    const booking = reservationService.createReservation({
      stationId: 'station-beta',
      connectorId: 'beta-c2',
      driverId: 'driver-cancel-01',
      driverName: 'Rohan Mehra',
      startTime,
      endTime
    });

    assert.equal(booking.success, true);
    const reservationId = booking.reservation!.id;

    // Cancel reservation
    const cancelResult = reservationService.cancelReservation(reservationId);
    assert.equal(cancelResult.success, true, 'Cancellation should succeed');

    const record = db.prepare('SELECT status FROM reservations WHERE id = ?').get(reservationId) as any;
    assert.equal(record.status, 'CANCELLED', 'Reservation status in DB must be CANCELLED');

    // Slot should now be re-bookable for the same time
    const rebook = reservationService.createReservation({
      stationId: 'station-beta',
      connectorId: 'beta-c2',
      driverId: 'driver-rebook-02',
      driverName: 'Priya Sen',
      startTime,
      endTime
    });

    assert.equal(rebook.success, true, 'Cancelled slot must be bookable again');
  });

  await t.test('7. Lamport Logical Clock Updates (Rule 1 & Rule 2)', () => {
    const alpha = network.getNode('station-alpha')!;
    const clockBefore = alpha.lamportClock;

    // Rule 1: Local event increments clock
    const clockAfterEvent = network.incrementLamportClock('station-alpha', 'Local Sensor Calibration');
    assert.equal(clockAfterEvent, clockBefore + 1, 'Lamport clock must increment on local event');

    // Rule 2: Message receipt: L_j = max(L_j, L_msg) + 1
    const remoteClock = clockAfterEvent + 10;
    const clockAfterReceive = network.updateLamportOnReceive('station-alpha', 'station-gamma', remoteClock);
    assert.equal(clockAfterReceive, remoteClock + 1, 'Lamport clock on receive must be max(local, remote) + 1');
  });

  await t.test('8. Vector Clocks Merging & Concurrency Detection', () => {
    // Test causality: Event A happened before Event B (A -> B)
    const vA = { 'station-alpha': 1, 'station-beta': 0, 'station-gamma': 0 };
    const vB = { 'station-alpha': 2, 'station-beta': 1, 'station-gamma': 0 };
    const checkCausal = network.compareVectorClocks(vA, vB);
    assert.equal(checkCausal.relation, 'A_CAUSES_B', 'vA should causally precede vB');

    // Test concurrency: Neither precedes the other (A || B)
    const v1 = { 'station-alpha': 2, 'station-beta': 0, 'station-gamma': 1 };
    const v2 = { 'station-alpha': 1, 'station-beta': 2, 'station-gamma': 0 };
    const checkConcurrent = network.compareVectorClocks(v1, v2);
    assert.equal(checkConcurrent.relation, 'CONCURRENT', 'Independent events across nodes should be CONCURRENT');
  });

  await t.test('9. Election Algorithms: Bully Algorithm Execution', () => {
    // Station Alpha (Priority 1) initiates Bully election
    const election = network.runBullyElection('station-alpha', 'Test initiation');
    assert.ok(election.steps.length > 0, 'Election should have step-by-step trace');

    // Station Gamma has highest priority (3), so if online it must win
    const gamma = network.getNode('station-gamma')!;
    if (gamma.status === 'ONLINE') {
      assert.equal(election.winner, 'station-gamma', 'Gamma (priority 3) should win Bully election');
    }
  });

  await t.test('10. Election Algorithms: Ring Election Execution', () => {
    // Station Alpha initiates Ring election
    const ringElection = network.runRingElection('station-alpha');
    assert.ok(ringElection.steps.length > 0, 'Ring election should circulate token');
    assert.ok(ringElection.winner, 'Ring election must elect highest online node');
  });

  await t.test('11. Node Failure & Recovery Behavior', () => {
    const nodeToFail = 'station-alpha';
    const failSuccess = network.failNode(nodeToFail);
    assert.equal(failSuccess, true);

    const node = network.getNode(nodeToFail);
    assert.equal(node?.status, 'OFFLINE', 'Node status must be OFFLINE');

    // Attempting reservation on offline node must be rejected
    const now = Date.now() + 5 * 60 * 60 * 1000;
    const resOnOffline = reservationService.createReservation({
      stationId: nodeToFail,
      connectorId: 'alpha-c4',
      driverId: 'driver-offline-fail',
      driverName: 'Offline Test',
      startTime: new Date(now).toISOString(),
      endTime: new Date(now + 30 * 60 * 1000).toISOString()
    });

    assert.equal(resOnOffline.success, false, 'Reservation on offline station node must be rejected');
    assert.match(resOnOffline.error || '', /OFFLINE or unreachable/);

    // Recover node
    const recoverSuccess = network.recoverNode(nodeToFail);
    assert.equal(recoverSuccess, true);
    assert.equal(network.getNode(nodeToFail)?.status, 'ONLINE', 'Node must recover to ONLINE');
  });

  await t.test('12. JSON-RPC 2.0 Method Handling & Error Codes', () => {
    // Valid RPC ping call
    const pingResponse = handleRpcCall({
      jsonrpc: '2.0',
      method: 'station.ping',
      params: { nodeId: 'station-beta' },
      id: 42
    });

    assert.equal(pingResponse.id, 42);
    assert.equal(pingResponse.jsonrpc, '2.0');
    assert.equal(pingResponse.result?.pong, true);

    // Method not found error (-32601)
    const invalidMethod = handleRpcCall({
      jsonrpc: '2.0',
      method: 'unknown.action',
      id: 99
    });

    assert.equal(invalidMethod.error?.code, -32601, 'Method not found must return code -32601');

    // Invalid JSON-RPC version (-32600)
    const invalidVersion = handleRpcCall({
      jsonrpc: '1.0' as any,
      method: 'station.ping',
      id: 100
    });

    assert.equal(invalidVersion.error?.code, -32600, 'Invalid JSON-RPC must return code -32600');
  });

  await t.test('13. Distributed Mutual Exclusion: Ricart-Agrawala Simulation', () => {
    const mutex = network.simulateRicartAgrawala('station-beta', 'Connector-BETA-01');
    assert.equal(mutex.entered, true, 'Requester should successfully enter Critical Section');
    assert.ok(mutex.steps.length >= 4, 'Must demonstrate REQUEST, REPLY, ENTER_CS, and EXIT_CS');
    const requestStep = mutex.steps.find(s => s.type === 'REQUEST');
    const replyStep = mutex.steps.find(s => s.type === 'REPLY');
    const enterStep = mutex.steps.find(s => s.type === 'ENTER_CS');
    const exitStep = mutex.steps.find(s => s.type === 'EXIT_CS');

    assert.ok(requestStep && replyStep && enterStep && exitStep, 'All 4 Ricart-Agrawala phases must be present');
  });
});
