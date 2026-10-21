import React, { useState, useEffect } from 'react';
import { 
  Crown, 
  Clock, 
  Sun, 
  Moon, 
  RotateCcw,
  Activity
} from 'lucide-react';
import { NodeState } from '../types.js';

interface TopbarProps {
  activeTab: string;
  currentCoordinator: string;
  nodes: NodeState[];
  theme: 'light' | 'dark';
  toggleTheme: () => void;
  onReset: () => void;
}

export const Topbar: React.FC<TopbarProps> = ({
  activeTab,
  currentCoordinator,
  nodes,
  theme,
  toggleTheme,
  onReset
}) => {
  const [timeStr, setTimeStr] = useState<string>('');

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setTimeStr(now.toLocaleTimeString('en-US', { hour12: false }));
    };
    updateTime();
    const timer = setInterval(updateTime, 1000);
    return () => clearInterval(timer);
  }, []);

  const getPageTitle = (tab: string) => {
    switch (tab) {
      case 'dashboard': return 'Operations Dashboard';
      case 'stations': return 'Charging Station Fleet';
      case 'reservations': return 'Atomic Reservations & Interval Validation';
      case 'network': return 'Distributed Network Topology & Heartbeats';
      case 'lab': return 'Distributed Systems Lab & Demonstration';
      case 'syllabus': return 'Curriculum Syllabus Coverage (Units I–IV)';
      default: return 'VoltGrid Management';
    }
  };

  const coordNode = nodes.find(n => n.id === currentCoordinator);
  const onlineCount = nodes.filter(n => n.status === 'ONLINE').length;

  return (
    <header className="topbar">
      <div className="topbar-left">
        <h2 className="page-title">{getPageTitle(activeTab)}</h2>
        
        {coordNode && (
          <div className="badge-coordinator" title={`Current elected leader: ${coordNode.name} (Priority ${coordNode.priority})`}>
            <Crown size={14} />
            <span>Leader: {coordNode.name.replace('VoltGrid ', '')}</span>
          </div>
        )}

        <div 
          className="badge-coordinator" 
          style={{ 
            backgroundColor: onlineCount === nodes.length ? 'var(--success-light)' : 'var(--warning-light)',
            color: onlineCount === nodes.length ? 'var(--success-text)' : 'var(--warning-text)',
            borderColor: 'transparent'
          }}
        >
          <Activity size={14} />
          <span>Nodes: {onlineCount}/{nodes.length} Online</span>
        </div>
      </div>

      <div className="topbar-right">
        <button 
          className="btn btn-outline btn-sm" 
          onClick={onReset}
          title="Reset database and simulator to initial academic state"
        >
          <RotateCcw size={14} />
          <span>Reset Demo</span>
        </button>

        <div className="system-clock">
          <Clock size={14} />
          <span>{timeStr || '12:00:00'}</span>
        </div>

        <button 
          className="theme-toggle-btn"
          onClick={toggleTheme}
          title={`Switch to ${theme === 'light' ? 'Dark' : 'Light'} Mode`}
        >
          {theme === 'light' ? <Moon size={15} /> : <Sun size={15} />}
          <span>{theme === 'light' ? 'Dark' : 'Light'}</span>
        </button>
      </div>
    </header>
  );
};
