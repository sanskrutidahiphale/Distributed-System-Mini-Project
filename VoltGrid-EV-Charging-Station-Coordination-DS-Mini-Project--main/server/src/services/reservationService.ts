import { getDatabase } from '../db/database.js';
import { getNodeNetwork } from './nodeNetwork.js';
import { Reservation, Connector, Station } from '../types.js';

export interface CreateReservationParams {
  stationId: string;
  connectorId: string;
  driverId: string;
  driverName: string;
  startTime: string;
  endTime: string;
}

export interface OverlapConflict {
  conflictingReservationId: string;
  driverName: string;
  startTime: string;
  endTime: string;
}

export class ReservationService {
  private io: any = null;

  public setSocketServer(io: any) {
    this.io = io;
  }

  public getReservations(): Reservation[] {
    const db = getDatabase();
    const rows = db.prepare(`
      SELECT 
        r.*,
        s.name as station_name,
        c.connector_number,
        c.type as connector_type,
        c.power_kw
      FROM reservations r
      JOIN stations s ON r.station_id = s.id
      JOIN connectors c ON r.connector_id = c.id
      ORDER BY r.created_at DESC
    `).all() as unknown as Reservation[];

    return rows;
  }

  public checkAvailability(
    connectorId: string,
    startTime: string,
    endTime: string,
    excludeReservationId?: string
  ): { available: boolean; conflict?: OverlapConflict } {
    const db = getDatabase();

    // Query active reservations for this connector
    let query = `
      SELECT id, driver_name, start_time, end_time
      FROM reservations
      WHERE connector_id = ?
        AND status = 'ACTIVE'
        AND (? < end_time AND ? > start_time)
    `;
    const params: (string | number)[] = [connectorId, startTime, endTime];

    if (excludeReservationId) {
      query += ' AND id != ?';
      params.push(excludeReservationId);
    }

    const conflictRow = db.prepare(query).get(...params) as {
      id: string;
      driver_name: string;
      start_time: string;
      end_time: string;
    } | undefined;

    if (conflictRow) {
      return {
        available: false,
        conflict: {
          conflictingReservationId: conflictRow.id,
          driverName: conflictRow.driver_name,
          startTime: conflictRow.start_time,
          endTime: conflictRow.end_time
        }
      };
    }

    return { available: true };
  }

  public createReservation(params: CreateReservationParams): {
    success: boolean;
    reservation?: Reservation;
    error?: string;
    conflict?: OverlapConflict;
  } {
    const { stationId, connectorId, driverId, driverName, startTime, endTime } = params;

    // 1. Time Interval Validations
    const startEpoch = new Date(startTime).getTime();
    const endEpoch = new Date(endTime).getTime();

    if (isNaN(startEpoch) || isNaN(endEpoch)) {
      return { success: false, error: 'Invalid ISO timestamp for start or end time.' };
    }

    if (startEpoch >= endEpoch) {
      return { success: false, error: 'Reservation start time must be strictly before end time.' };
    }

    const durationMinutes = (endEpoch - startEpoch) / (1000 * 60);
    if (durationMinutes < 10) {
      return { success: false, error: 'Minimum charging duration is 10 minutes.' };
    }
    if (durationMinutes > 24 * 60) {
      return { success: false, error: 'Maximum reservation duration is 24 hours.' };
    }

    const db = getDatabase();
    const network = getNodeNetwork();

    // 2. Check Node Liveness
    const nodeState = network.getNode(stationId);
    if (!nodeState || nodeState.status === 'OFFLINE') {
      return {
        success: false,
        error: `Distributed station node '${stationId}' is currently OFFLINE or unreachable. The coordinator rejected consensus commit.`
      };
    }

    // 3. Atomic Database Transaction with Immediate Lock
    db.exec('BEGIN IMMEDIATE;');

    try {
      // Verify station exists in DB
      const station = db.prepare('SELECT id, name, status FROM stations WHERE id = ?').get(stationId) as Station | undefined;
      if (!station) {
        db.exec('ROLLBACK;');
        return { success: false, error: `Station ${stationId} does not exist.` };
      }
      if (station.status === 'OFFLINE') {
        db.exec('ROLLBACK;');
        return { success: false, error: `Station ${station.name} is marked OFFLINE in system registry.` };
      }

      // Verify connector exists and is operational
      const connector = db.prepare('SELECT id, connector_number, status FROM connectors WHERE id = ? AND station_id = ?').get(
        connectorId,
        stationId
      ) as Connector | undefined;

      if (!connector) {
        db.exec('ROLLBACK;');
        return { success: false, error: `Connector ${connectorId} not found at station ${stationId}.` };
      }

      if (connector.status === 'MAINTENANCE' || connector.status === 'OFFLINE') {
        db.exec('ROLLBACK;');
        return { success: false, error: `Connector ${connector.connector_number} is currently under maintenance or offline.` };
      }

      // Check overlapping reservations with exact interval arithmetic:
      // (new_start < existing_end) AND (new_end > existing_start)
      const conflict = db.prepare(`
        SELECT id, driver_name, start_time, end_time
        FROM reservations
        WHERE connector_id = ?
          AND status = 'ACTIVE'
          AND (? < end_time AND ? > start_time)
      `).get(connectorId, startTime, endTime) as {
        id: string;
        driver_name: string;
        start_time: string;
        end_time: string;
      } | undefined;

      if (conflict) {
        db.exec('ROLLBACK;');
        network.logEvent(
          stationId,
          'RESERVATION_CONFLICT_REJECTED',
          `Concurrent conflict detected on ${connector.connector_number}: request [${startTime} - ${endTime}] overlapped with booking ${conflict.id}`
        );
        return {
          success: false,
          error: `Time interval conflicts with an existing confirmed reservation by ${conflict.driver_name}.`,
          conflict: {
            conflictingReservationId: conflict.id,
            driverName: conflict.driver_name,
            startTime: conflict.start_time,
            endTime: conflict.end_time
          }
        };
      }

      // No conflict detected: Commit new reservation
      const reservationId = `res-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
      const createdAt = new Date().toISOString();

      db.prepare(`
        INSERT INTO reservations (id, station_id, connector_id, driver_id, driver_name, start_time, end_time, status, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(reservationId, stationId, connectorId, driverId, driverName, startTime, endTime, 'ACTIVE', createdAt);

      // Check if reservation is active right now
      const nowEpoch = Date.now();
      if (nowEpoch >= startEpoch && nowEpoch <= endEpoch) {
        db.prepare('UPDATE connectors SET status = ? WHERE id = ?').run('RESERVED', connectorId);
      }

      db.exec('COMMIT;');

      // Advance Lamport Clock and record distributed log
      network.incrementLamportClock(
        stationId,
        `Atomic reservation ${reservationId} committed on ${connector.connector_number}`
      );

      const createdReservation: Reservation = {
        id: reservationId,
        station_id: stationId,
        connector_id: connectorId,
        driver_id: driverId,
        driver_name: driverName,
        start_time: startTime,
        end_time: endTime,
        status: 'ACTIVE',
        created_at: createdAt,
        station_name: station.name,
        connector_number: connector.connector_number
      };

      if (this.io) {
        this.io.emit('reservation_created', createdReservation);
      }

      return {
        success: true,
        reservation: createdReservation
      };
    } catch (err: any) {
      try {
        db.exec('ROLLBACK;');
      } catch (rbErr) {}
      console.error('Reservation transaction error:', err);
      return { success: false, error: err.message || 'Database transaction failed during atomic reservation.' };
    }
  }

  public cancelReservation(reservationId: string): { success: boolean; error?: string } {
    const db = getDatabase();
    const network = getNodeNetwork();

    db.exec('BEGIN IMMEDIATE;');

    try {
      const reservation = db.prepare('SELECT * FROM reservations WHERE id = ?').get(reservationId) as Reservation | undefined;
      if (!reservation) {
        db.exec('ROLLBACK;');
        return { success: false, error: 'Reservation not found.' };
      }

      if (reservation.status === 'CANCELLED') {
        db.exec('ROLLBACK;');
        return { success: false, error: 'Reservation is already cancelled.' };
      }

      db.prepare("UPDATE reservations SET status = 'CANCELLED' WHERE id = ?").run(reservationId);

      // Re-evaluate connector status
      const activeRightNow = db.prepare(`
        SELECT COUNT(*) as count FROM reservations
        WHERE connector_id = ? AND status = 'ACTIVE' AND (? >= start_time AND ? <= end_time)
      `).get(reservation.connector_id, new Date().toISOString(), new Date().toISOString()) as { count: number };

      if (activeRightNow.count === 0) {
        db.prepare("UPDATE connectors SET status = 'AVAILABLE' WHERE id = ? AND status = 'RESERVED'").run(
          reservation.connector_id
        );
      }

      db.exec('COMMIT;');

      network.incrementLamportClock(
        reservation.station_id,
        `Reservation ${reservationId} cancelled; slot freed`
      );

      if (this.io) {
        this.io.emit('reservation_cancelled', { id: reservationId, connectorId: reservation.connector_id });
      }

      return { success: true };
    } catch (err: any) {
      try {
        db.exec('ROLLBACK;');
      } catch (rbErr) {}
      return { success: false, error: err.message || 'Failed to cancel reservation.' };
    }
  }
}

let reservationServiceInstance: ReservationService | null = null;

export function getReservationService(): ReservationService {
  if (!reservationServiceInstance) {
    reservationServiceInstance = new ReservationService();
  }
  return reservationServiceInstance;
}
