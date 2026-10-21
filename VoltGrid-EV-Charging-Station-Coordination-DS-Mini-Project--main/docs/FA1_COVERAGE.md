# FA-1 Syllabus Coverage Matrix (Units I & II)

This document provides rigorous academic verification for **Formative Assessment 1 (FA-1)** of the B.Tech Computer Engineering Distributed Systems syllabus.

---

## Unit I: Introduction to Distributed Systems

| Syllabus Topic | Status | Implementation Reference | Description & Demonstration in VoltGrid |
| :--- | :--- | :--- | :--- |
| **Definition, Goals, and Types of Distributed Systems** | **Implemented** | `server/src/index.ts`<br>`client/src/pages/DashboardPage.tsx` | VoltGrid coordinates multiple identifiable charging station nodes (`Alpha`, `Beta`, `Gamma`) presenting a single cohesive service to drivers. Demonstrates resource sharing (connectors), distribution transparency, openness (standard JSON-RPC & REST), and node scalability. |
| **Distributed System Architectures** | **Implemented** | `docs/ARCHITECTURE.md`<br>`client/src/pages/NetworkMonitorPage.tsx` | Implements a hybrid multi-tier architecture: edge station nodes, an elected coordinator service, and centralized SQLite persistence with real-time Socket.IO synchronization. |
| **Design Issues: Concurrency, Partial Failures, and Consistency** | **Implemented** | `server/src/services/reservationService.ts`<br>`server/src/services/nodeNetwork.ts` | **Concurrency:** Handled via SQLite atomic transactions preventing overlapping bookings. **Partial Failure:** Handled via beacon heartbeats and automated Bully elections. **Consistency:** Strong consistency (CP behavior) enforced on connector schedules. |
| **Middleware** | **Implemented** | `server/src/services/rpcService.ts`<br>`server/src/index.ts` | Express REST middleware, JSON-RPC 2.0 dispatcher, and Socket.IO real-time transport shield application logic from underlying socket handling and message serialization. |
| **Overview of Distributed Systems** | **Implemented** | Entire Application Suite | Complete end-to-end working demonstration on Windows laptop without cloud dependencies or paid APIs. |
| **Distributed Multimedia Systems** | **Conceptual explanation** | `client/src/pages/SyllabusCoveragePage.tsx` | Contrasts continuous loss-tolerant high-bandwidth audio/video streams with VoltGrid's discrete, loss-intolerant, low-latency telemetry packets and reservation transactions. |
| **Model of Distributed Computations** | **Implemented** | `server/src/services/nodeNetwork.ts`<br>`client/src/pages/LabPage.tsx` | Processes execute independent local events and communicate via message passing. Events are traced monotonically using Lamport logical clocks and vector timestamps. |
| **Virtualization and Containers** | **Conceptual explanation** | `docs/ARCHITECTURE.md`<br>`client/src/pages/SyllabusCoveragePage.tsx` | Explains hypervisor vs OS-level virtualization (Docker containers) and how each station node can be containerized into an independent microservice container. |

---

## Unit II: Communication in Distributed Systems

| Syllabus Topic | Status | Implementation Reference | Description & Demonstration in VoltGrid |
| :--- | :--- | :--- | :--- |
| **Communication Fundamentals & Layering** | **Implemented** | `server/src/index.ts`<br>`client/src/pages/NetworkMonitorPage.tsx` | Client-server communication over TCP/IP using HTTP REST, WebSockets, and Server-Sent Events. Handles connection timeouts, failed packet retransmissions, and disconnects. |
| **Remote Procedure Call (RPC)** | **Implemented** | `server/src/services/rpcService.ts`<br>`client/src/pages/LabPage.tsx` | Compliant **JSON-RPC 2.0** endpoint (`POST /api/rpc`) with procedures (`station.ping`, `station.getStatus`, `station.getConnectors`, `coordinator.requestLock`). Enforces spec error codes (`-32600`, `-32601`, `-32602`, `-32000`). |
| **Message-Oriented Communication** | **Implemented** | `server/src/services/nodeNetwork.ts`<br>`client/src/pages/DashboardPage.tsx` | Socket.IO publish-subscribe message broker broadcasting asynchronous cluster events (`reservation_created`, `node_status_change`, `heartbeat_tick`). |
| **Stream-Oriented Communication** | **Implemented** | `server/src/index.ts` (`/api/stream/telemetry`)<br>`client/src/pages/LabPage.tsx` | Continuous Server-Sent Events (SSE) telemetry pipeline pushing real-time active power (kW), DC voltage, current, and EV battery State-of-Charge (SoC) at 1 Hz. |
| **Peer-to-Peer Messaging** | **Interactive simulation** | `client/src/pages/LabPage.tsx` | Simulated direct node-to-node message exchange bypassing the central coordinator for local coordination. |
| **WebRTC Messaging** | **Interactive simulation** | `client/src/pages/LabPage.tsx` | Conceptual and interactive demonstration of peer-to-peer browser data channels, detailing signaling, STUN/TURN traversal, and direct socket tunneling. |
| **Names, Identifiers, and Addresses** | **Implemented** | `server/src/db/database.ts`<br>`client/src/pages/StationsPage.tsx` | Identifiable flat node names (`station-alpha`), simulated TCP ports (`5011`, `5012`, `5013`), hierarchical bay IDs (`ALPHA-01`), and globally unique reservation UUIDs. |
| **Fault Tolerance & Recovery** | **Implemented** | `server/src/services/nodeNetwork.ts`<br>`client/src/pages/NetworkMonitorPage.tsx` | Operators can disconnect any node in the UI. The cluster detects the fault after missed heartbeats, fails over if the leader is lost, and resynchronizes state upon node reconnection. |
| **Protocol Comparison Matrix** | **Implemented** | `client/src/pages/LabPage.tsx` | Explicit comparative analysis of REST vs RPC vs Event Messaging vs Streaming vs WebRTC. |

---

## Academic Assessment Checklist for FA-1

- [x] **Working JSON-RPC 2.0 Endpoint:** Tested with valid procedure calls, invalid method calls, and invalid parameter formats.
- [x] **Live Streaming Telemetry:** Verified 1-second interval push over Server-Sent Events.
- [x] **Message Dissemination:** Real-time event log updated via WebSockets without page reload.
- [x] **Fault Detection:** Immediate node status change and leader election upon failure.
