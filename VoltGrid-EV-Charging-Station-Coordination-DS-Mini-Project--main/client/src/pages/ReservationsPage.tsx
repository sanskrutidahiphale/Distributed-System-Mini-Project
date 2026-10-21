import React, { useState, useEffect } from 'react';
import { 
  CalendarCheck, 
  Clock, 
  ShieldAlert, 
  ShieldCheck, 
  AlertCircle, 
  CheckCircle, 
  XCircle, 
  Trash2, 
  Zap, 
  User, 
  Car,
  AlertTriangle,
  RotateCcw
} from 'lucide-react';
import { Station, Connector, Reservation } from '../types.js';

interface ReservationsPageProps {
  stations: Station[];
  reservations: Reservation[];
  preselectedStationId?: string;
  preselectedConnectorId?: string;
  onRefreshReservations: () => void;
}

export const ReservationsPage: React.FC<ReservationsPageProps> = ({
  stations,
  reservations,
  preselectedStationId,
  preselectedConnectorId,
  onRefreshReservations
}) => {
  const [stationId, setStationId] = useState<string>(preselectedStationId || 'station-alpha');
  const [connectorId, setConnectorId] = useState<string>(preselectedConnectorId || 'alpha-c1');
  const [driverName, setDriverName] = useState<string>('Karan Johar (Ioniq 5)');
  
  // Default interval: 30 minutes starting 10 minutes from now
  const now = new Date();
  const defaultStart = new Date(now.getTime() + 10 * 60 * 1000);
  const defaultEnd = new Date(now.getTime() + 50 * 60 * 1000);

  const formatDateTimeLocal = (date: Date) => {
    const pad = (n: number) => (n < 10 ? '0' + n : n);
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
  };

  const [startTime, setStartTime] = useState<string>(formatDateTimeLocal(defaultStart));
  const [endTime, setEndTime] = useState<string>(formatDateTimeLocal(defaultEnd));

  const [checkResult, setCheckResult] = useState<{ available: boolean; conflict?: any; message?: string } | null>(null);
  const [bookingStatus, setBookingStatus] = useState<{ type: 'success' | 'error' | 'conflict'; message: string; data?: any } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [cancelModalId, setCancelModalId] = useState<string | null>(null);

  // Update connector choices when stationId changes
  const activeStation = stations.find(s => s.id === stationId);
  const availableConnectors = activeStation?.connectors || [];

  useEffect(() => {
    if (preselectedStationId) setStationId(preselectedStationId);
    if (preselectedConnectorId) setConnectorId(preselectedConnectorId);
  }, [preselectedStationId, preselectedConnectorId]);

  useEffect(() => {
    if (availableConnectors.length > 0 && !availableConnectors.some(c => c.id === connectorId)) {
      setConnectorId(availableConnectors[0].id);
    }
  }, [stationId, availableConnectors]);

  // Interval shortcut setter
  const applyPresetInterval = (offsetMinutesStart: number, durationMinutes: number) => {
    const s = new Date(Date.now() + offsetMinutesStart * 60 * 1000);
    const e = new Date(s.getTime() + durationMinutes * 60 * 1000);
    setStartTime(formatDateTimeLocal(s));
    setEndTime(formatDateTimeLocal(e));
    setCheckResult(null);
    setBookingStatus(null);
  };

  // Check Availability
  const handleCheckAvailability = async () => {
    try {
      setCheckResult(null);
      setBookingStatus(null);
      const res = await fetch('/api/reservations/check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          connectorId,
          startTime: new Date(startTime).toISOString(),
          endTime: new Date(endTime).toISOString()
        })
      });
      const data = await res.json();
      if (res.ok) {
        if (data.available) {
          setCheckResult({ available: true, message: 'Time interval is completely clear and available for booking!' });
        } else {
          setCheckResult({
            available: false,
            conflict: data.conflict,
            message: `Conflict detected! Overlaps with booking by ${data.conflict?.driverName} (${new Date(data.conflict?.startTime).toLocaleTimeString()} - ${new Date(data.conflict?.endTime).toLocaleTimeString()})`
          });
        }
      } else {
        setCheckResult({ available: false, message: data.error || 'Check failed.' });
      }
    } catch (err: any) {
      setCheckResult({ available: false, message: err.message });
    }
  };

  // Confirm Reservation
  const handleCreateReservation = async () => {
    if (!driverName.trim()) {
      alert('Please enter a driver name and vehicle.');
      return;
    }

    try {
      setIsSubmitting(true);
      setBookingStatus(null);

      const res = await fetch('/api/reservations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          stationId,
          connectorId,
          driverName,
          startTime: new Date(startTime).toISOString(),
          endTime: new Date(endTime).toISOString()
        })
      });

      const data = await res.json();

      if (res.status === 201) {
        setBookingStatus({
          type: 'success',
          message: `Reservation ${data.reservation?.id} successfully confirmed! Atomic commit verified across distributed coordinator.`,
          data: data.reservation
        });
        onRefreshReservations();
      } else if (res.status === 409) {
        setBookingStatus({
          type: 'conflict',
          message: `Booking Rejected: ${data.error}`,
          data: data.conflict
        });
      } else {
        setBookingStatus({
          type: 'error',
          message: data.error || 'Failed to create reservation.'
        });
      }
    } catch (err: any) {
      setBookingStatus({ type: 'error', message: err.message });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Simulate Concurrent Conflict Demo Button
  const handleSimulateConflict = async () => {
    // Find an active reservation to clash with, or use current form
    const targetReservation = reservations.find(r => r.status === 'ACTIVE');
    if (!targetReservation) {
      alert('No active reservation to clash with. First create a valid reservation!');
      return;
    }

    // Set form to conflict with targetReservation
    setStationId(targetReservation.station_id);
    setConnectorId(targetReservation.connector_id);

    // Overlapping window: starts 10 minutes after target reservation start
    const clashStart = new Date(new Date(targetReservation.start_time).getTime() + 10 * 60 * 1000);
    const clashEnd = new Date(new Date(targetReservation.end_time).getTime() + 20 * 60 * 1000);

    setStartTime(formatDateTimeLocal(clashStart));
    setEndTime(formatDateTimeLocal(clashEnd));
    setDriverName('Conflicting Driver (Tata Curvv)');

    try {
      setIsSubmitting(true);
      const res = await fetch('/api/reservations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          stationId: targetReservation.station_id,
          connectorId: targetReservation.connector_id,
          driverName: 'Conflicting Driver (Tata Curvv)',
          startTime: clashStart.toISOString(),
          endTime: clashEnd.toISOString()
        })
      });

      const data = await res.json();
      if (res.status === 409) {
        setBookingStatus({
          type: 'conflict',
          message: `Backend ACID Protection Triggered: ${data.error}`,
          data: data.conflict
        });
      } else {
        setBookingStatus({ type: 'error', message: data.error || 'Unexpected result' });
      }
    } catch (err: any) {
      setBookingStatus({ type: 'error', message: err.message });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Cancel Reservation
  const handleConfirmCancel = async () => {
    if (!cancelModalId) return;

    try {
      const res = await fetch(`/api/reservations/${cancelModalId}/cancel`, {
        method: 'POST'
      });
      const data = await res.json();
      if (res.ok) {
        setCancelModalId(null);
        onRefreshReservations();
      } else {
        alert(data.error || 'Failed to cancel reservation');
      }
    } catch (err: any) {
      alert(err.message);
    }
  };

  return (
    <div>
      <div className="section-header">
        <div>
          <h2 className="section-title">Atomic Reservations & Concurrency Safety</h2>
          <p className="section-subtitle">
            Demonstrating distributed reservation locking, interval overlap validation, and transaction rollbacks
          </p>
        </div>

        <button 
          className="btn btn-danger btn-sm"
          onClick={handleSimulateConflict}
          title="Fires an overlapping reservation to test the 409 Conflict rejection"
        >
          <ShieldAlert size={14} /> Simulate Overlap Conflict
        </button>
      </div>

      {/* Main Grid: Reservation Form + Existing Bookings Table */}
      <div style={{ display: 'grid', gridTemplateColumns: '420px 1fr', gap: '24px' }}>
        {/* Left Column: Booking Form */}
        <div className="card" style={{ height: 'fit-content' }}>
          <div className="card-title">
            <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <CalendarCheck size={18} color="var(--primary)" /> New Connector Reservation
            </span>
          </div>

          <div className="form-group">
            <label className="form-label">Charging Station Node</label>
            <select
              className="form-select"
              value={stationId}
              onChange={(e) => setStationId(e.target.value)}
            >
              {stations.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} ({s.status}) {s.is_coordinator === 1 ? '• Coordinator' : ''}
                </option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">Connector Bay</label>
            <select
              className="form-select"
              value={connectorId}
              onChange={(e) => setConnectorId(e.target.value)}
            >
              {availableConnectors.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.connector_number} — {c.type} ({c.power_kw} kW) [{c.status}]
                </option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">Driver Name & EV Model</label>
            <input
              type="text"
              className="form-input"
              value={driverName}
              onChange={(e) => setDriverName(e.target.value)}
              placeholder="e.g. Rahul Verma (Tata Nexon EV)"
            />
          </div>

          {/* Quick Preset Buttons */}
          <div style={{ marginBottom: '12px' }}>
            <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 600 }}>Quick Intervals:</span>
            <div style={{ display: 'flex', gap: '6px', marginTop: '4px' }}>
              <button type="button" className="btn btn-outline btn-sm" onClick={() => applyPresetInterval(5, 30)}>
                +30m Now
              </button>
              <button type="button" className="btn btn-outline btn-sm" onClick={() => applyPresetInterval(5, 60)}>
                +1h Now
              </button>
              <button type="button" className="btn btn-outline btn-sm" onClick={() => applyPresetInterval(120, 45)}>
                +2h Later
              </button>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
            <div className="form-group">
              <label className="form-label">Start Time</label>
              <input
                type="datetime-local"
                className="form-input"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
              />
            </div>
            <div className="form-group">
              <label className="form-label">End Time</label>
              <input
                type="datetime-local"
                className="form-input"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
              />
            </div>
          </div>

          {/* Action Buttons */}
          <div style={{ display: 'flex', gap: '10px', marginTop: '8px' }}>
            <button
              type="button"
              className="btn btn-outline"
              style={{ flex: 1 }}
              onClick={handleCheckAvailability}
            >
              <Clock size={15} /> Check Availability
            </button>
            <button
              type="button"
              className="btn btn-primary"
              style={{ flex: 1.2 }}
              disabled={isSubmitting}
              onClick={handleCreateReservation}
            >
              <ShieldCheck size={15} /> Confirm Reservation
            </button>
          </div>

          {/* Availability Check Feedback */}
          {checkResult && (
            <div
              style={{
                marginTop: '14px',
                padding: '12px',
                borderRadius: 'var(--radius-md)',
                fontSize: '0.82rem',
                backgroundColor: checkResult.available ? 'var(--success-light)' : 'var(--danger-light)',
                color: checkResult.available ? 'var(--success-text)' : 'var(--danger-text)',
                border: `1px solid ${checkResult.available ? 'var(--success)' : 'var(--danger)'}`,
                display: 'flex',
                alignItems: 'flex-start',
                gap: '8px'
              }}
            >
              {checkResult.available ? <CheckCircle size={16} /> : <AlertCircle size={16} />}
              <div>{checkResult.message}</div>
            </div>
          )}

          {/* Booking Confirmation / Rejection Status Feedback */}
          {bookingStatus && (
            <div
              style={{
                marginTop: '14px',
                padding: '12px',
                borderRadius: 'var(--radius-md)',
                fontSize: '0.82rem',
                backgroundColor: 
                  bookingStatus.type === 'success' ? 'var(--success-light)' : 
                  bookingStatus.type === 'conflict' ? 'var(--warning-light)' : 'var(--danger-light)',
                color: 
                  bookingStatus.type === 'success' ? 'var(--success-text)' : 
                  bookingStatus.type === 'conflict' ? 'var(--warning-text)' : 'var(--danger-text)',
                border: '1px solid currentColor',
                display: 'flex',
                flexDirection: 'column',
                gap: '6px'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 700 }}>
                {bookingStatus.type === 'success' && <CheckCircle size={16} />}
                {bookingStatus.type === 'conflict' && <ShieldAlert size={16} />}
                {bookingStatus.type === 'error' && <XCircle size={16} />}
                <span>
                  {bookingStatus.type === 'success' ? 'Atomic Commit Confirmed' : 
                   bookingStatus.type === 'conflict' ? 'ACID Transaction Conflict Rollback' : 'Submission Error'}
                </span>
              </div>
              <div>{bookingStatus.message}</div>
              {bookingStatus.data && bookingStatus.type === 'conflict' && (
                <div style={{ fontSize: '0.75rem', opacity: 0.9, marginTop: '4px' }}>
                  Overlapping Booking ID: <code>{bookingStatus.data.conflictingReservationId}</code>
                  <br />Booked By: <strong>{bookingStatus.data.driverName}</strong>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right Column: Confirmed Reservations Records */}
        <div className="card">
          <div className="card-title">
            <span>Confirmed Distributed Reservations ({reservations.length})</span>
            <button className="btn btn-outline btn-sm" onClick={onRefreshReservations}>
              <RotateCcw size={13} /> Refresh
            </button>
          </div>

          <div className="table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Reservation ID</th>
                  <th>Driver & Vehicle</th>
                  <th>Station & Bay</th>
                  <th>Time Window</th>
                  <th>Status</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {reservations.length === 0 ? (
                  <tr>
                    <td colSpan={6} style={{ textAlign: 'center', padding: '30px', color: 'var(--text-subtle)' }}>
                      No reservations recorded. Create a reservation on the left to begin.
                    </td>
                  </tr>
                ) : (
                  reservations.map((r) => {
                    const isActive = r.status === 'ACTIVE';
                    const sTime = new Date(r.start_time);
                    const eTime = new Date(r.end_time);

                    return (
                      <tr key={r.id}>
                        <td>
                          <code style={{ fontSize: '0.78rem' }}>{r.id.substring(0, 14)}</code>
                        </td>
                        <td>
                          <strong>{r.driver_name}</strong>
                          <div style={{ fontSize: '0.72rem', color: 'var(--text-subtle)' }}>
                            ID: {r.driver_id}
                          </div>
                        </td>
                        <td>
                          <div>{r.station_name || r.station_id}</div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                            Bay: <strong>{r.connector_number || r.connector_id}</strong> ({r.connector_type || 'CCS2'})
                          </div>
                        </td>
                        <td style={{ fontSize: '0.78rem' }}>
                          <div>{sTime.toLocaleDateString()}</div>
                          <span style={{ fontWeight: 600 }}>
                            {sTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - {eTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </td>
                        <td>
                          <span className={`status-badge ${isActive ? 'active' : 'cancelled'}`}>
                            {r.status}
                          </span>
                        </td>
                        <td>
                          {isActive ? (
                            <button
                              className="btn btn-outline btn-sm"
                              style={{ color: 'var(--danger-text)' }}
                              onClick={() => setCancelModalId(r.id)}
                              title="Cancel this reservation"
                            >
                              <Trash2 size={13} /> Cancel
                            </button>
                          ) : (
                            <span style={{ fontSize: '0.75rem', color: 'var(--text-subtle)' }}>—</span>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Cancellation Confirmation Dialog */}
      {cancelModalId && (
        <div className="modal-overlay" onClick={() => setCancelModalId(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <AlertTriangle size={18} color="var(--danger)" /> Confirm Reservation Cancellation
              </h3>
              <button className="btn btn-outline btn-sm" onClick={() => setCancelModalId(null)}>✕</button>
            </div>

            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '16px' }}>
              Are you sure you want to cancel reservation <code>{cancelModalId}</code>? 
              The distributed coordinator will atomic commit the release and re-open the connector bay for other drivers.
            </p>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button className="btn btn-outline" onClick={() => setCancelModalId(null)}>Keep Booking</button>
              <button className="btn btn-danger" onClick={handleConfirmCancel}>Confirm Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
