import React from 'react';
import { 
  LayoutDashboard, 
  Zap, 
  CalendarCheck, 
  Network, 
  FlaskConical, 
  BookOpen, 
  Radio, 
  Server
} from 'lucide-react';
import { NodeState } from '../types.js';

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  nodes: NodeState[];
  currentCoordinator: string;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  setActiveTab,
  nodes,
  currentCoordinator
}) => {
  const navItems = [
    { id: 'dashboard', label: 'Operations Dashboard', icon: LayoutDashboard },
    { id: 'stations', label: 'Charging Stations', icon: Zap },
    { id: 'reservations', label: 'Reservations & Safety', icon: CalendarCheck },
    { id: 'network', label: 'Distributed Network', icon: Network },
    { id: 'lab', label: 'Distributed Systems Lab', icon: FlaskConical },
    { id: 'syllabus', label: 'FA-1 / FA-2 Syllabus', icon: BookOpen }
  ];

  return (
    <aside className="sidebar">
      <div className="sidebar-header">
        <div className="brand-icon">
          <Zap size={20} strokeWidth={2.5} />
        </div>
        <div className="brand-text">
          <h1>VoltGrid</h1>
          <span>Distributed EV Mesh</span>
        </div>
      </div>

      <nav className="sidebar-nav">
        <div className="nav-section-title">Operations & Control</div>
        {navItems.slice(0, 4).map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              className={`nav-item ${isActive ? 'active' : ''}`}
              onClick={() => setActiveTab(item.id)}
            >
              <Icon size={18} />
              <span>{item.label}</span>
            </button>
          );
        })}

        <div className="nav-section-title" style={{ marginTop: '12px' }}>Academic Evaluation</div>
        {navItems.slice(4).map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              className={`nav-item ${isActive ? 'active' : ''}`}
              onClick={() => setActiveTab(item.id)}
            >
              <Icon size={18} />
              <span>{item.label}</span>
            </button>
          );
        })}
      </nav>

      <div className="sidebar-footer">
        <div className="node-status-widget">
          <div className="node-status-header">
            <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <Radio size={12} /> Cluster Nodes
            </span>
            <span>Coord: {currentCoordinator ? currentCoordinator.replace('station-', '') : 'None'}</span>
          </div>
          <div className="node-pill-list">
            {nodes.map((n) => {
              const isOnline = n.status === 'ONLINE';
              const isLeader = n.id === currentCoordinator;
              return (
                <div
                  key={n.id}
                  className={`node-pill ${isOnline ? 'online' : 'offline'}`}
                  title={`${n.name} (${n.status}) ${isLeader ? '• Coordinator' : ''}`}
                >
                  {n.id.replace('station-', '').substring(0, 3).toUpperCase()}
                  {isLeader ? '★' : ''}
                </div>
              );
            })}
          </div>
        </div>
        <div style={{ fontSize: '0.7rem', color: 'var(--text-subtle)', textAlign: 'center' }}>
          Distributed Systems FA-1 & FA-2
        </div>
      </div>
    </aside>
  );
};
