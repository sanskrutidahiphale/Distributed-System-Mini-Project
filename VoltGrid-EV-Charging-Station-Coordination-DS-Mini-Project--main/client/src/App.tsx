import React, { useState, useEffect } from 'react';
import { io, Socket } from 'socket.io-client';
import { Sidebar } from './components/Sidebar.js';
import { Topbar } from './components/Topbar.js';
import { DashboardPage } from './pages/DashboardPage.js';
import { StationsPage } from './pages/StationsPage.js';
import { ReservationsPage } from './pages/ReservationsPage.js';
import { NetworkMonitorPage } from './pages/NetworkMonitorPage.js';
import { LabPage } from './pages/LabPage.js';
import { SyllabusCoveragePage } from './pages/SyllabusCoveragePage.js';
import { SystemMetrics, Station, NodeState, Reservation, DistributedLog } from './types.js';

export function App() {
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    const saved = localStorage.getItem('voltgrid-theme');
    return (saved as 'light' | 'dark') || 'light';
  });

  const [activeTab, setActiveTab] = useState<string>('dashboard');
  const [metrics, setMetrics] = useState<SystemMetrics | null>(null);
  const [stations, setStations] = useState<Station[]>([]);
  const [nodes, setNodes] = useState<NodeState[]>([]);
  const [currentCoordinator, setCurrentCoordinator] = useState<string>('station-beta');
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [logs, setLogs] = useState<DistributedLog[]>([]);

  // Pre-selected for direct booking jumps
  const [preselectedStationId, setPreselectedStationId] = useState<string | undefined>();
  const [preselectedConnectorId, setPreselectedConnectorId] = useState<string | undefined>();

  // Apply theme attribute to documentElement
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('voltgrid-theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => (prev === 'light' ? 'dark' : 'light'));
  };

  // Fetch initial data
  const fetchAllData = async () => {
    try {
      const [metricsRes, stationsRes, nodesRes, reservationsRes, logsRes] = await Promise.all([
        fetch('/api/metrics').then(r => r.json()),
        fetch('/api/stations').then(r => r.json()),
        fetch('/api/nodes').then(r => r.json()),
        fetch('/api/reservations').then(r => r.json()),
        fetch('/api/logs?limit=30').then(r => r.json())
      ]);

      setMetrics(metricsRes);
      setStations(stationsRes);
      if (nodesRes.nodes) {
        setNodes(nodesRes.nodes);
        setCurrentCoordinator(nodesRes.currentCoordinator);
      }
      setReservations(reservationsRes);
      setLogs(logsRes);
    } catch (err) {
      console.error('Error fetching VoltGrid telemetry:', err);
    }
  };

  useEffect(() => {
    fetchAllData();

    // Setup Socket.IO real-time channel
    const socket: Socket = io({ path: '/socket.io' });

    socket.on('connect', () => {
      console.log('Connected to VoltGrid Distributed WebSocket gateway');
    });

    socket.on('network_update', (data) => {
      if (data.nodes) setNodes(data.nodes);
      if (data.currentCoordinator) setCurrentCoordinator(data.currentCoordinator);
    });

    socket.on('heartbeat_tick', (data) => {
      if (data.nodes) setNodes(data.nodes);
      if (data.currentCoordinator) setCurrentCoordinator(data.currentCoordinator);
    });

    socket.on('reservation_created', (newRes: Reservation) => {
      setReservations(prev => [newRes, ...prev]);
      fetchAllData();
    });

    socket.on('reservation_cancelled', () => {
      fetchAllData();
    });

    socket.on('log_event', (newLog: DistributedLog) => {
      setLogs(prev => [newLog, ...prev.slice(0, 49)]);
    });

    socket.on('election_completed', (result) => {
      if (result.winner) setCurrentCoordinator(result.winner);
      fetchAllData();
    });

    // Refresh every 5s for steady telemetry
    const interval = setInterval(fetchAllData, 5000);

    return () => {
      socket.disconnect();
      clearInterval(interval);
    };
  }, []);

  const handleFailNode = async (nodeId: string) => {
    try {
      await fetch(`/api/nodes/${nodeId}/fail`, { method: 'POST' });
      fetchAllData();
    } catch (err) {
      console.error(err);
    }
  };

  const handleRecoverNode = async (nodeId: string) => {
    try {
      await fetch(`/api/nodes/${nodeId}/recover`, { method: 'POST' });
      fetchAllData();
    } catch (err) {
      console.error(err);
    }
  };

  const handleTriggerElection = async (algorithm: 'BULLY' | 'RING', initiatorId: string = 'station-alpha') => {
    try {
      const res = await fetch('/api/nodes/election', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ algorithm, initiatorId })
      });
      const data = await res.json();
      fetchAllData();
      return data;
    } catch (err) {
      console.error(err);
    }
  };

  const handleReset = async () => {
    if (window.confirm('Reset database and distributed simulator to initial state?')) {
      try {
        await fetch('/api/reset', { method: 'POST' });
        fetchAllData();
      } catch (err) {
        console.error(err);
      }
    }
  };

  const handleSelectConnectorForBooking = (stationId: string, connectorId: string) => {
    setPreselectedStationId(stationId);
    setPreselectedConnectorId(connectorId);
    setActiveTab('reservations');
  };

  return (
    <div className="app-container">
      {/* Persistent Left Sidebar */}
      <Sidebar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        nodes={nodes}
        currentCoordinator={currentCoordinator}
      />

      {/* Main Content Viewport */}
      <div className="main-wrapper">
        <Topbar
          activeTab={activeTab}
          currentCoordinator={currentCoordinator}
          nodes={nodes}
          theme={theme}
          toggleTheme={toggleTheme}
          onReset={handleReset}
        />

        <main className="content-viewport">
          {activeTab === 'dashboard' && (
            <DashboardPage
              metrics={metrics}
              stations={stations}
              nodes={nodes}
              logs={logs}
              onNavigate={setActiveTab}
              onTriggerElection={handleTriggerElection}
            />
          )}

          {activeTab === 'stations' && (
            <StationsPage
              stations={stations}
              nodes={nodes}
              currentCoordinator={currentCoordinator}
              onSelectConnectorForBooking={handleSelectConnectorForBooking}
            />
          )}

          {activeTab === 'reservations' && (
            <ReservationsPage
              stations={stations}
              reservations={reservations}
              preselectedStationId={preselectedStationId}
              preselectedConnectorId={preselectedConnectorId}
              onRefreshReservations={fetchAllData}
            />
          )}

          {activeTab === 'network' && (
            <NetworkMonitorPage
              nodes={nodes}
              currentCoordinator={currentCoordinator}
              onFailNode={handleFailNode}
              onRecoverNode={handleRecoverNode}
              onTriggerElection={handleTriggerElection}
            />
          )}

          {activeTab === 'lab' && (
            <LabPage
              nodes={nodes}
              currentCoordinator={currentCoordinator}
            />
          )}

          {activeTab === 'syllabus' && (
            <SyllabusCoveragePage
              onNavigate={setActiveTab}
            />
          )}
        </main>
      </div>
    </div>
  );
}

export default App;
