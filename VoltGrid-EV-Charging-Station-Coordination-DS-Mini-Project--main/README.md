# VoltGrid — Distributed EV Charging Station Coordination System

> **B.Tech Computer Engineering | Distributed Systems Mini-Project**  
> Supporting **Formative Assessment 1 (FA-1)** & **Formative Assessment 2 (FA-2)**.

---

## 1. Project Overview & Problem Statement

Electric vehicles (EVs) require access to physical charging connectors, but charging stations have limited physical capacity. When multiple drivers attempt to reserve the same connector for overlapping intervals, the system must guarantee single-seat reservation safety and reject conflicting requests.

Furthermore, in real-world distributed infrastructure, station nodes and central coordinators experience network latency, packet loss, or process crashes. **VoltGrid** models identifiable distributed charging station nodes, enforces atomic reservation safety using SQLite database transactions, tracks distributed causality with Lamport and Vector clocks, detects node failures using beacon heartbeats, and elects coordinators dynamically via the **Bully** and **Ring** election algorithms.

---

## 2. Key Features

- **Full-Screen Operations Dashboard:** Live cluster metrics, online station health cards, elected coordinator indicators, and real-time distributed activity stream over WebSockets.
- **Fleet & Connector Inspector:** Interactive bay occupancy grid across three identifiable nodes (`VoltGrid Central Hub`, `Tech Corridor`, `West Expressway`) with CCS2, CHAdeMO, and Type 2 connectors.
- **Provable Concurrency Safety:** Server-enforced SQLite transactions (`BEGIN IMMEDIATE`) with interval overlap check $(new\_start < existing\_end) \land (new\_end > existing\_start)$ and one-click conflict simulation returning **HTTP 409 Conflict**.
- **Consensus Leader Election:** Step-by-step interactive executions of both the **Bully Algorithm** and the **Ring Election Algorithm** with message flow tracing.
- **Distributed Systems Lab:**
  - **JSON-RPC 2.0 Playground:** Spec-compliant endpoint with request/response inspector and negative error codes.
  - **Stream Telemetry (SSE):** Continuous 1 Hz Server-Sent Events stream delivering live DC voltage, current, active power, and EV battery SoC %.
  - **Lamport Logical Clocks:** Interactive simulator demonstrating Rule 1 ($L_i = L_i + 1$) and Rule 2 ($L_j = \max(L_j, L_{msg}) + 1$).
  - **Vector Clocks:** Multi-node vector clock engine with causality comparator ($A \to B$ vs $A \parallel B$ concurrent events).
  - **Ricart–Agrawala Mutual Exclusion:** Step-by-step simulation of distributed request multicasting, deferred replies, and critical section access.
  - **Chandy-Lamport Global Snapshot:** Consistent distributed cut capture.
- **Comprehensive Syllabus Verification:** Dedicated matrix mapping all topics across Units I, II, III, and IV with honest academic status badges.
- **Light-Theme-First Design:** Refined operations interface with persistent dark theme toggle, accessible typography, and zero clutter.

---

## 3. Technology Stack

- **Frontend:** React 18, Vite, TypeScript, Lucide Icons.
- **Styling:** Custom CSS design system with CSS custom properties (warm light default & persistent dark mode).
- **Backend:** Node.js v24, Express, TypeScript (`tsx`).
- **Persistence:** Built-in `node:sqlite` (`DatabaseSync`) with atomic transactions, foreign keys, and WAL indexing.
- **Real-Time Communication:** Socket.IO v4 (WebSockets) for asynchronous event dissemination.
- **Protocols:** REST API, JSON-RPC 2.0, Server-Sent Events (SSE).
- **Testing:** Node.js native test runner (`node:test`) with TypeScript execution.

---

## 4. Prerequisites

- **Operating System:** Windows, macOS, or Linux.
- **Node.js:** v22.x or v24.x (uses built-in `node:sqlite`; zero C++ compiler or Python build tools required).
- **npm:** v10.x or v11.x.

---

## 5. Installation and Execution

### Step 1: Install Dependencies
From the repository root:
```powershell
npm run install:all
```
*(Or install in subdirectories: `npm install`, `npm install --prefix server`, `npm install --prefix client`)*

### Step 2: Run Development Mode
Start both the backend coordination server and the React frontend simultaneously:
```powershell
npm run dev
```
- **Frontend URL:** [http://localhost:5173](http://localhost:5173)
- **Backend API:** [http://localhost:5001](http://localhost:5001)

### Step 3: Run Automated Test Suite
Execute the 14 automated unit and distributed algorithm tests:
```powershell
npm test
```

### Step 4: Production Build
```powershell
npm run build
```

---

## 6. Demonstration Workflow

1. **Dashboard:** Inspect active stations, fleet capacity, and real-time activity stream.
2. **Make a Booking:** Go to **Reservations & Safety**, pick connector `ALPHA-01`, select `+30m Now`, and click **Confirm Reservation**.
3. **Trigger Conflict:** Click the red **Simulate Overlap Conflict** button to verify backend **409 Conflict** rejection.
4. **Fail a Node:** Go to **Distributed Network**, click **Disconnect Node** on Station Alpha, and observe heartbeat miss count.
5. **Run Election:** Click **Run Bully Algorithm** or **Run Ring Algorithm** to watch consensus leader election.
6. **Lab Demos:** Go to **Distributed Systems Lab** to test JSON-RPC 2.0, live SSE telemetry stream, Lamport clocks, and Vector causality.

---

## 7. Documentation Index

- [`docs/ARCHITECTURE.md`](file:///c:/Users/SUJAL/Desktop/Disha/VoltGrid/docs/ARCHITECTURE.md) — System components, Mermaid flowcharts, and communication paths.
- [`docs/FA1_COVERAGE.md`](file:///c:/Users/SUJAL/Desktop/Disha/VoltGrid/docs/FA1_COVERAGE.md) — Verification of Unit I & II syllabus topics.
- [`docs/FA2_COVERAGE.md`](file:///c:/Users/SUJAL/Desktop/Disha/VoltGrid/docs/FA2_COVERAGE.md) — Verification of Unit III & IV syllabus topics.
- [`docs/DEMO_GUIDE.md`](file:///c:/Users/SUJAL/Desktop/Disha/VoltGrid/docs/DEMO_GUIDE.md) — Step-by-step evaluator presentation guide.
- [`docs/ALGORITHMS.md`](file:///c:/Users/SUJAL/Desktop/Disha/VoltGrid/docs/ALGORITHMS.md) — Formal formulations, pseudo-code, and complexity.
- [`docs/VIVA_QUESTIONS.md`](file:///c:/Users/SUJAL/Desktop/Disha/VoltGrid/docs/VIVA_QUESTIONS.md) — Viva voce questions and answers.

---

## 8. Known Limitations & Academic Disclaimers

- **Simulated Hardware:** High-voltage DC charging equipment, EV battery chemistry, and payment card gateways are simulated.
- **Node Execution Model:** Station nodes run as a structured in-process state machine simulation rather than separate OS daemon processes to ensure deterministic academic demonstration and avoid Windows port/firewall issues.
- **Fault-Tolerant Mutex:** Ricart–Agrawala is demonstrated as an educational algorithm assuming crash-free participation; persistent reservation safety is enforced via SQLite transactions.
