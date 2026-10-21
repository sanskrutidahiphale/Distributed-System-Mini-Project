# VoltGrid System Architecture

## 1. Architectural Overview

**VoltGrid** is an educational, distributed coordination system designed for electric vehicle (EV) charging station networks. It models real-world distributed challenges: concurrent connector reservations, partial network partitions, asynchronous message passing, consensus leader election, and high-frequency sensor telemetry.

The system is partitioned into four primary layers:
1. **Driver Client Layer:** A full-screen, responsive React 18 single-page application with light/dark theme support and real-time WebSocket bindings.
2. **Coordination & API Gateway Layer:** Node.js/Express service providing REST endpoints, JSON-RPC 2.0 dispatching, and Server-Sent Events (SSE).
3. **Distributed Station Node Layer:** Autonomous simulated charging station nodes (`station-alpha`, `station-beta`, `station-gamma`), each maintaining independent operational status, priority, logical clocks, and heartbeat beacons.
4. **Persistence Layer:** Relational SQLite with strict ACID transaction guarantees (`BEGIN IMMEDIATE`), foreign key constraints, and WAL mode.

---

## 2. Mermaid Architecture Diagram

```mermaid
flowchart TD
    subgraph ClientLayer ["1. Presentation Layer (Browser Viewport)"]
        UI["React 18 SPA (Vite + TypeScript)"]
        Dashboard["Operations Dashboard"]
        Fleet["Station & Bay Inspector"]
        Bookings["Atomic Reservations"]
        NetMonitor["Network Topology & Failover"]
        Lab["Distributed Systems Lab"]
        Syllabus["Curriculum Matrix"]
        UI --> Dashboard
        UI --> Fleet
        UI --> Bookings
        UI --> NetMonitor
        UI --> Lab
        UI --> Syllabus
    end

    subgraph GatewayLayer ["2. Coordination & Middleware Layer (Port 5001)"]
        Express["Express API Gateway"]
        SocketServer["Socket.IO Gateway (Real-Time Mesh)"]
        RPCEngine["JSON-RPC 2.0 Dispatcher"]
        SSEEngine["SSE Telemetry Stream (1 Hz)"]
        CoordService["Cluster Coordinator (Elected Leader)"]
        
        Express --> RPCEngine
        Express --> SSEEngine
        Express --> CoordService
        SocketServer <--> CoordService
    end

    subgraph NodeLayer ["3. Distributed Station Nodes"]
        NodeAlpha["Station Alpha (P1)\nVoltGrid Central Hub\n150kW CCS2 / 22kW Type 2"]
        NodeBeta["Station Beta (P2)\nVoltGrid Tech Corridor\n150kW CCS2 / 50kW CHAdeMO"]
        NodeGamma["Station Gamma (P3)\nVoltGrid West Expressway\n350kW Ultra CCS2 / 50kW CHAdeMO"]
        
        NodeAlpha <-->|"Heartbeat / Bully / Ring"| NodeBeta
        NodeBeta <-->|"Heartbeat / Bully / Ring"| NodeGamma
        NodeGamma <-->|"Heartbeat / Bully / Ring"| NodeAlpha
    end

    subgraph PersistenceLayer ["4. Persistence Layer (SQLite Engine)"]
        DB[(voltgrid.sqlite)]
        T_Stations["stations"]
        T_Connectors["connectors"]
        T_Reservations["reservations (ACID Index)"]
        T_Logs["activity_logs (Lamport & Vector)"]
        
        DB --- T_Stations
        DB --- T_Connectors
        DB --- T_Reservations
        DB --- T_Logs
    end

    UI <-->|"HTTP REST / JSON-RPC / SSE"| Express
    UI <-->|"WebSockets (Bi-directional)"| SocketServer
    CoordService <-->|"Node Liveness & Clock Sync"| NodeLayer
    CoordService -->|"BEGIN IMMEDIATE (Atomic Reservation)"| DB
```

---

## 3. Component Responsibilities

### A. Driver Client (`client/`)
- Renders responsive operational views at common resolutions (1366×768 to 4K).
- Displays visual connector occupancy grids, latency counters, and logical clocks.
- Submits reservation intervals and executes interactive conflict injections.
- Receives instant state mutations via Socket.IO events (`heartbeat_tick`, `reservation_created`, `election_completed`).

### B. Coordination Service (`server/src/services/`)
- **Reservation Manager (`reservationService.ts`):** Validates timestamps and enforces interval overlap arithmetic `(new_start < existing_end) AND (new_end > existing_start)` inside atomic SQLite transactions.
- **Node Network Manager (`nodeNetwork.ts`):** Emulates independent station state machines, triggers heartbeat checks every 3000ms, and implements consensus election (Bully & Ring), Lamport logical clocks, vector clocks, and Ricart–Agrawala mutual exclusion.
- **JSON-RPC Dispatcher (`rpcService.ts`):** Implements specification-compliant JSON-RPC 2.0 error handling and procedure execution.

### C. Station Nodes
- Station nodes maintain their own:
  - Stable Node ID (`station-alpha`, `station-beta`, `station-gamma`).
  - Priority rank for Bully elections (Alpha = 1, Beta = 2, Gamma = 3).
  - Monotonic Lamport clock ($L_i$) and vector clock ($V_i$).
  - Heartbeat pulse timestamp and miss count.
  - Hardware connector bays and rated power capacities.

---

## 4. Communication Flows

### 1. Atomic Reservation Flow
```mermaid
sequenceDiagram
    autonumber
    actor Driver as Driver Client
    participant Coord as Coordinator Node
    participant DB as SQLite DB
    participant Peers as Station Nodes

    Driver->>Coord: POST /api/reservations (interval, bay, driver)
    Coord->>Coord: Check Node Liveness (station ONLINE?)
    Coord->>DB: BEGIN IMMEDIATE TRANSACTION
    Coord->>DB: Check Overlapping Active Bookings
    alt Conflict Found
        Coord->>DB: ROLLBACK
        Coord-->>Driver: HTTP 409 Conflict (conflicting reservation details)
    else Slot Clear
        Coord->>DB: INSERT reservation & UPDATE connector state
        Coord->>DB: COMMIT TRANSACTION
        Coord->>Coord: Increment Lamport Clock L_i = L_i + 1
        Coord->>Peers: Broadcast reservation_created (Socket.IO)
        Coord-->>Driver: HTTP 201 Created (confirmed booking)
    end
```

### 2. Bully Election & Failover Flow
```mermaid
sequenceDiagram
    autonumber
    participant NodeA as Node Alpha (P1)
    participant NodeB as Node Beta (P2 - Leader)
    participant NodeG as Node Gamma (P3)

    Note over NodeB: Leader crashes (Simulated Disconnection)
    NodeA->>NodeA: Beacon timeout (>8000ms missed)
    NodeA->>NodeG: Send ELECTION message (to higher priority peers)
    NodeG-->>NodeA: Send OK message (takes over election)
    NodeG->>NodeA: Send COORDINATOR announcement
    Note over NodeG: Node Gamma assumes leadership
```

---

## 5. Independent Processes vs. Node Simulator Architecture

| Architectural Trait | Separate OS Processes | VoltGrid Structured Node Simulation |
| :--- | :--- | :--- |
| **Process Model** | 3 separate `node` instances on distinct OS ports. | Structured modular node instances managed by `NodeNetworkManager`. |
| **Communication** | TCP sockets across separate local ports. | In-memory message queue + Socket.IO network broadcast. |
| **Portability** | High risk of port conflicts and firewall blocks on student laptops. | 100% deterministic, zero setup friction, instant launch. |
| **Failure Simulation** | Requires sending OS `SIGKILL` or killing process. | Deterministic operator toggles in UI with live heartbeat timeout observation. |
| **Academic Fidelity** | High OS overhead. | Exactly models asynchronous message passing, priority bullies, vector clocks, and token circulation. |

*VoltGrid uses a structured station-node simulation module with independent state machines, explicit message queues, and node IDs, guaranteeing reproducible academic evaluation.*
