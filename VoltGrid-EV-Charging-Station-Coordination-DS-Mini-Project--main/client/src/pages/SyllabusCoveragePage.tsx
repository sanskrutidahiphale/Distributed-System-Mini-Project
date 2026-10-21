import React, { useState } from 'react';
import { 
  BookOpen, 
  CheckCircle, 
  PlayCircle, 
  HelpCircle, 
  Slash, 
  ExternalLink, 
  Filter,
  Layers,
  ChevronDown,
  ChevronUp,
  FileText
} from 'lucide-react';

interface TopicItem {
  id: string;
  unit: 'Unit I' | 'Unit II' | 'Unit III' | 'Unit IV';
  title: string;
  status: 'Implemented' | 'Interactive simulation' | 'Conceptual explanation' | 'Not directly applicable';
  summary: string;
  targetTab?: string;
  details: string;
}

const SYLLABUS_TOPICS: TopicItem[] = [
  // --- UNIT I ---
  {
    id: 'u1-def',
    unit: 'Unit I',
    title: 'Definition, Goals, and Types of Distributed Systems',
    status: 'Implemented',
    summary: 'VoltGrid coordinates autonomous charging stations connected across an IP network to present a single coherent reservation service.',
    targetTab: 'dashboard',
    details: 'Goals achieved: Resource sharing (connectors), Transparency (distribution hidden from driver), Openness (standard JSON-RPC & REST APIs), and Scalability (independent station nodes).'
  },
  {
    id: 'u1-arch',
    unit: 'Unit I',
    title: 'Distributed System Architectures',
    status: 'Implemented',
    summary: 'Structured as a layered hybrid: decentralized edge station nodes with a dynamically elected cluster coordinator and centralized ACID storage.',
    targetTab: 'network',
    details: 'Illustrates multi-tier architecture (Client Tier → Coordinator Service Tier → Node Simulator Tier → SQLite Persistence Tier).'
  },
  {
    id: 'u1-issues',
    unit: 'Unit I',
    title: 'Design Issues: Concurrency, Partial Failures, and Consistency',
    status: 'Implemented',
    summary: 'Concurrency is safely resolved via atomic SQLite transactions; partial node failures are detected via beacon heartbeats and automated elections.',
    targetTab: 'reservations',
    details: 'Demonstrates handling of network partitions, asynchronous message delays, and single-seat connector reservation conflicts.'
  },
  {
    id: 'u1-middleware',
    unit: 'Unit I',
    title: 'Middleware & Communication Abstraction',
    status: 'Implemented',
    summary: 'Express, Socket.IO, and JSON-RPC middleware shield the client application from lower-level socket transport and serialization complexities.',
    targetTab: 'lab',
    details: 'Provides RPC marshaling, event dispatching, and pub/sub abstractions over TCP sockets.'
  },
  {
    id: 'u1-computations',
    unit: 'Unit I',
    title: 'Model of Distributed Computations',
    status: 'Implemented',
    summary: 'Processes execute local events and exchange messages, creating a distributed execution trace tracked by Lamport logical clocks.',
    targetTab: 'lab',
    details: 'Visible in the live distributed activity log where send events, receive events, and internal state mutations update monotonically.'
  },
  {
    id: 'u1-virtual',
    unit: 'Unit I',
    title: 'Virtualization and Containerization',
    status: 'Conceptual explanation',
    summary: 'VoltGrid can be containerized using Docker and Docker Compose to isolate station node processes and the coordinator into dedicated containers.',
    details: 'Includes sample Dockerfile and docker-compose.yml configuration showing container-level hardware virtualization vs bare-metal execution.'
  },
  {
    id: 'u1-multimedia',
    unit: 'Unit I',
    title: 'Distributed Multimedia Systems',
    status: 'Conceptual explanation',
    summary: 'Examines continuous real-time media streaming, QoS latency guarantees, and buffering requirements in contrast to EV telemetry feeds.',
    details: 'EV station telemetry requires low bandwidth and high reliability (loss-intolerant), whereas multimedia systems prioritize high bandwidth, jitter bounds, and loss tolerance.'
  },

  // --- UNIT II ---
  {
    id: 'u2-comm',
    unit: 'Unit II',
    title: 'Communication Fundamentals & Layering',
    status: 'Implemented',
    summary: 'Nodes communicate over HTTP/1.1, WebSockets, and Server-Sent Events with explicit port addressing, timeouts, and error handling.',
    targetTab: 'network',
    details: 'Covers message packetization, transport-level connection maintenance, and socket disconnection detection.'
  },
  {
    id: 'u2-rpc',
    unit: 'Unit II',
    title: 'Remote Procedure Call (RPC)',
    status: 'Implemented',
    summary: 'Compliant JSON-RPC 2.0 endpoint supporting station.ping, station.getStatus, and coordinator.requestLock with spec error codes.',
    targetTab: 'lab',
    details: 'Demonstrates procedure stub marshaling, parameter serialization, synchronous request-response flow, and error object formatting.'
  },
  {
    id: 'u2-msg',
    unit: 'Unit II',
    title: 'Message-Oriented Communication',
    status: 'Implemented',
    summary: 'Asynchronous event dissemination via Socket.IO pub/sub channels for reservations, heartbeats, and cluster elections.',
    targetTab: 'dashboard',
    details: 'Decouples message senders from receivers using topical broadcast and point-to-point queues.'
  },
  {
    id: 'u2-stream',
    unit: 'Unit II',
    title: 'Stream-Oriented Communication',
    status: 'Implemented',
    summary: 'Server-Sent Events (SSE) telemetry pipeline continuously streaming real-time voltage, current, active power, and battery SoC.',
    targetTab: 'lab',
    details: 'Contrasts continuous isochronous data pipelines against traditional discrete Request/Response paradigms.'
  },
  {
    id: 'u2-p2p',
    unit: 'Unit II',
    title: 'Peer-to-Peer & WebRTC Messaging',
    status: 'Interactive simulation',
    summary: 'Interactive simulation of peer-to-peer message exchange and WebRTC DataChannel browser pairing.',
    targetTab: 'lab',
    details: 'Demonstrates direct node-to-node message routing without routing payloads through the centralized coordinator.'
  },
  {
    id: 'u2-naming',
    unit: 'Unit II',
    title: 'Names, Identifiers, and Addresses',
    status: 'Implemented',
    summary: 'Station nodes have stable unique names (station-alpha), network ports (5011), and globally unique reservation UUIDs.',
    targetTab: 'stations',
    details: 'Demonstrates flat naming, hierarchical entity identifiers, and location transparency.'
  },
  {
    id: 'u2-fault',
    unit: 'Unit II',
    title: 'Fault Tolerance & Detection',
    status: 'Implemented',
    summary: 'Heartbeat loss triggers suspect state, timeout initiates failover election, and node reconnection initiates state resynchronization.',
    targetTab: 'network',
    details: 'Handles fail-stop node crashes and demonstrates automated recovery behavior.'
  },

  // --- UNIT III ---
  {
    id: 'u3-phys-clock',
    unit: 'Unit III',
    title: 'Clock Synchronization: Physical vs Logical',
    status: 'Conceptual explanation',
    summary: 'Explains physical clock skew and drift (NTP, Cristian algorithm) and why logical ordering is superior for distributed reservation sequencing.',
    details: 'Physical clocks cannot guarantee causal order without atomic clocks (Google Spanner TrueTime); logical clocks provide provable causal invariants.'
  },
  {
    id: 'u3-lamport',
    unit: 'Unit III',
    title: 'Lamport Logical Clocks',
    status: 'Implemented',
    summary: 'Full implementation of Lamport rules (L = L + 1 on local event, L = max(L, L_msg) + 1 on receive) with interactive step visualizer.',
    targetTab: 'lab',
    details: 'Imposes a strict partial order on distributed events and resolves event ordering without physical clock synchronization.'
  },
  {
    id: 'u3-vector',
    unit: 'Unit III',
    title: 'Vector Clocks & Causality',
    status: 'Implemented',
    summary: 'Vector clocks track causality across all 3 nodes; interactive comparator evaluates whether events are causal or concurrent (A || B).',
    targetTab: 'lab',
    details: 'Solves Lamport limitation by allowing processes to mathematically verify whether two events are causally related or genuinely concurrent.'
  },
  {
    id: 'u3-snapshot',
    unit: 'Unit III',
    title: 'Global State: Chandy-Lamport Algorithm',
    status: 'Implemented',
    summary: 'Generates consistent global cuts across all station nodes and in-transit communication channels via marker passing.',
    targetTab: 'lab',
    details: 'Captures consistent distributed checkpoint without halting active charging sessions or reservations.'
  },
  {
    id: 'u3-bully',
    unit: 'Unit III',
    title: 'Election Algorithms: Bully Algorithm',
    status: 'Implemented',
    summary: 'Nodes with higher priorities bully lower nodes and claim coordinator leadership upon detecting leader silence.',
    targetTab: 'network',
    details: 'Shows complete trace of ELECTION messages, OK responses, timeouts, and final COORDINATOR announcements.'
  },
  {
    id: 'u3-ring',
    unit: 'Unit III',
    title: 'Election Algorithms: Ring Election Algorithm',
    status: 'Implemented',
    summary: 'Passes active candidate list along a logical ring topology, electing the highest active node upon full circle return.',
    targetTab: 'network',
    details: 'Demonstrates token circulation, skipping offline peers, and coordinator broadcast along the ring.'
  },
  {
    id: 'u3-mutex',
    unit: 'Unit III',
    title: 'Distributed Mutual Exclusion: Ricart-Agrawala',
    status: 'Implemented',
    summary: 'Multicast timestamped REQUEST to all peers; enter Critical Section upon receiving N-1 REPLY messages; flush deferred replies on exit.',
    targetTab: 'lab',
    details: 'Contrasted in documentation and UI against centralized database transactions.'
  },
  {
    id: 'u3-beacon',
    unit: 'Unit III',
    title: 'Beacon Protocol for Failure Detection',
    status: 'Implemented',
    summary: 'Periodic heartbeats sent every 3000ms; 8000ms timeout threshold classifies nodes as OFFLINE and initiates coordinator election.',
    targetTab: 'network',
    details: 'Demonstrates trade-off between heartbeat frequency (network overhead) and detection latency (false positives).'
  },
  {
    id: 'u3-deadlock',
    unit: 'Unit III',
    title: "Self-Study: Lodha-Kshemkalyani & Knapp's Deadlock Detection",
    status: 'Conceptual explanation',
    summary: "Detailed review of fair mutual exclusion with bounded waiting and Knapp's 4 deadlock detection classes.",
    details: "Knapp's 4 classes: 1. Path-pushing, 2. Edge-chasing (Chandy-Misra-Haas), 3. Diffusion computation, 4. Global state detection."
  },

  // --- UNIT IV ---
  {
    id: 'u4-obj',
    unit: 'Unit IV',
    title: 'Distributed Object-Based Systems',
    status: 'Conceptual explanation',
    summary: 'Explains Remote Method Invocation (RMI) and CORBA IDLs, comparing them with modern service-oriented JSON APIs.',
    details: 'Covers remote object references, distributed garbage collection, and stateful vs stateless remote objects.'
  },
  {
    id: 'u4-web',
    unit: 'Unit IV',
    title: 'Distributed Web-Based Systems',
    status: 'Implemented',
    summary: 'Full multi-tier web application architecture featuring React client, Express API gateway, and SQLite persistent storage.',
    targetTab: 'dashboard',
    details: 'Demonstrates HTTP session handling, REST semantics, CORS headers, and browser caching controls.'
  },
  {
    id: 'u4-dfs',
    unit: 'Unit IV',
    title: 'Distributed File Systems (DFS)',
    status: 'Conceptual explanation',
    summary: 'Compares DFS architectures (NFS, GFS, HDFS) against VoltGrid relational SQLite database.',
    details: 'Examines file caching, lease mechanisms, master-chunkserver architecture, and append-only log optimizations.'
  },
  {
    id: 'u4-serverless',
    unit: 'Unit IV',
    title: 'Serverless Computing (FaaS)',
    status: 'Conceptual explanation',
    summary: 'Explains event-driven serverless functions with a hypothetical EV charging push notification trigger.',
    details: 'Discusses cold start latency, stateless execution constraints, auto-scaling characteristics, and cost trade-offs.'
  },
  {
    id: 'u4-cases',
    unit: 'Unit IV',
    title: 'Industry Case Studies (Megaport, Cloudflare, AWS, Hadoop, K8s)',
    status: 'Conceptual explanation',
    summary: 'Structured learning cards highlighting distributed systems lessons from major cloud and infrastructure providers.',
    details: 'Analyzes Megaport NaaS SDN, Cloudflare Anycast edge routing, AWS DynamoDB PACELC, Hadoop MapReduce, and Kubernetes Raft etcd consensus.'
  },
  {
    id: 'u4-blockchain',
    unit: 'Unit IV',
    title: 'Blockchain & Distributed Ledger Technology',
    status: 'Conceptual explanation',
    summary: 'Evaluates Byzantine Fault Tolerance, proof-of-work/stake consensus, and why blockchain is overkill for EV charging reservations.',
    details: 'Centralized coordinator provides 5ms latency; public blockchains introduce 12s-10m block latency, high fees, and unnecessary complexity.'
  },
  {
    id: 'u4-db-tradeoffs',
    unit: 'Unit IV',
    title: 'Distributed Database Trade-offs (CAP & PACELC)',
    status: 'Conceptual explanation',
    summary: 'Analyzes CAP Theorem (Consistency vs Availability under Partition) and ACID vs BASE models.',
    details: 'VoltGrid implements CP behavior during reservations (prioritizing consistency over availability) to prevent double bookings.'
  }
];

interface SyllabusCoveragePageProps {
  onNavigate: (tab: string) => void;
}

export const SyllabusCoveragePage: React.FC<SyllabusCoveragePageProps> = ({ onNavigate }) => {
  const [selectedUnit, setSelectedUnit] = useState<string>('ALL');
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const filteredTopics = SYLLABUS_TOPICS.filter(t => {
    const matchesUnit = selectedUnit === 'ALL' || t.unit === selectedUnit;
    const matchesStatus = selectedStatus === 'ALL' || t.status === selectedStatus;
    return matchesUnit && matchesStatus;
  });

  const getStatusBadge = (status: TopicItem['status']) => {
    switch (status) {
      case 'Implemented':
        return (
          <span className="status-badge available" style={{ gap: '4px' }}>
            <CheckCircle size={12} /> Implemented
          </span>
        );
      case 'Interactive simulation':
        return (
          <span className="status-badge active" style={{ gap: '4px' }}>
            <PlayCircle size={12} /> Simulation
          </span>
        );
      case 'Conceptual explanation':
        return (
          <span className="status-badge reserved" style={{ gap: '4px' }}>
            <FileText size={12} /> Conceptual
          </span>
        );
      default:
        return (
          <span className="status-badge maintenance">
            <Slash size={12} /> N/A
          </span>
        );
    }
  };

  return (
    <div>
      <div className="section-header">
        <div>
          <h2 className="section-title">FA-1 & FA-2 Syllabus Coverage Matrix</h2>
          <p className="section-subtitle">
            Comprehensive curriculum verification for Units I, II, III, and IV of the B.Tech Distributed Systems Course
          </p>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="card" style={{ padding: '14px 18px', marginBottom: '20px' }}>
        <div style={{ display: 'flex', gap: '16px', alignItems: 'center', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Filter size={15} style={{ color: 'var(--text-muted)' }} />
            <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)' }}>Unit:</span>
            <select
              className="form-select"
              style={{ width: 'auto', padding: '6px 12px', fontSize: '0.82rem' }}
              value={selectedUnit}
              onChange={(e) => setSelectedUnit(e.target.value)}
            >
              <option value="ALL">All Units (I - IV)</option>
              <option value="Unit I">Unit I: Introduction to Distributed Systems</option>
              <option value="Unit II">Unit II: Communication in Distributed Systems</option>
              <option value="Unit III">Unit III: Synchronization & Consensus</option>
              <option value="Unit IV">Unit IV: Emerging Paradigms</option>
            </select>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)' }}>Status:</span>
            <select
              className="form-select"
              style={{ width: 'auto', padding: '6px 12px', fontSize: '0.82rem' }}
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
            >
              <option value="ALL">All Statuses</option>
              <option value="Implemented">Implemented in Backend</option>
              <option value="Interactive simulation">Interactive Simulation</option>
              <option value="Conceptual explanation">Conceptual Explanation</option>
            </select>
          </div>

          <div style={{ marginLeft: 'auto', fontSize: '0.78rem', color: 'var(--text-muted)' }}>
            Showing <strong>{filteredTopics.length}</strong> of <strong>{SYLLABUS_TOPICS.length}</strong> topics
          </div>
        </div>
      </div>

      {/* Syllabus Topics Accordion List */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {filteredTopics.map((topic) => {
          const isExpanded = expandedId === topic.id;

          return (
            <div
              key={topic.id}
              className="card"
              style={{
                padding: '16px 20px',
                marginBottom: '0',
                cursor: 'pointer',
                transition: 'border-color 0.15s ease'
              }}
              onClick={() => setExpandedId(isExpanded ? null : topic.id)}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1 }}>
                  <span
                    style={{
                      fontSize: '0.7rem',
                      fontWeight: 700,
                      padding: '3px 8px',
                      borderRadius: 'var(--radius-sm)',
                      backgroundColor: 'var(--bg-card-subtle)',
                      border: '1px solid var(--border-color)',
                      color: 'var(--text-muted)',
                      minWidth: '65px',
                      textAlign: 'center'
                    }}
                  >
                    {topic.unit}
                  </span>

                  <div>
                    <h4 style={{ fontSize: '0.92rem', fontWeight: 700, color: 'var(--text-main)' }}>
                      {topic.title}
                    </h4>
                    <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '2px', lineHeight: '1.3' }}>
                      {topic.summary}
                    </p>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  {getStatusBadge(topic.status)}

                  {topic.targetTab && (
                    <button
                      className="btn btn-outline btn-sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        onNavigate(topic.targetTab!);
                      }}
                      title="Jump to interactive demo"
                    >
                      <span>Open Demo</span> <ExternalLink size={12} />
                    </button>
                  )}

                  <div style={{ color: 'var(--text-subtle)' }}>
                    {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                  </div>
                </div>
              </div>

              {/* Expanded Academic Notes */}
              {isExpanded && (
                <div
                  style={{
                    marginTop: '14px',
                    paddingTop: '14px',
                    borderTop: '1px solid var(--border-color)',
                    fontSize: '0.82rem',
                    color: 'var(--text-main)',
                    lineHeight: '1.5',
                    backgroundColor: 'var(--bg-card-subtle)',
                    padding: '12px 14px',
                    borderRadius: 'var(--radius-md)'
                  }}
                  onClick={(e) => e.stopPropagation()}
                >
                  <div style={{ fontWeight: 700, marginBottom: '4px', color: 'var(--text-muted)' }}>
                    Detailed Academic Explanation:
                  </div>
                  <div>{topic.details}</div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
