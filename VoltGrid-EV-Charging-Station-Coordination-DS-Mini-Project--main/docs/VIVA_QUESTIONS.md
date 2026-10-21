# VoltGrid Viva Voce Questions & Answers

This guide prepares students for oral examinations (viva voce) on **VoltGrid** and the B.Tech Distributed Systems curriculum (Units I–IV).

---

## 1. Project & Architecture Fundamentals

### Q1: What is the primary problem statement of VoltGrid?
**Answer:** Electric vehicles have limited charging points, and multiple drivers may request the same physical connector at the same or overlapping time windows. In a distributed charging network where stations and coordinators may suffer communication delays or node failures, the system must guarantee single-seat reservation safety (preventing double bookings) and dynamically detect and recover from node failures.

### Q2: What is the difference between a centralized system and VoltGrid's distributed design?
**Answer:** In a centralized system, a single server handles all logic and failure halts the entire network. VoltGrid models distributed charging station nodes (`Alpha`, `Beta`, `Gamma`) that maintain local status and logical clocks, communicate via heartbeat beacons, and elect a new coordinator dynamically via consensus algorithms (Bully/Ring) if the leader crashes.

### Q3: What is Middleware, and where is it used in VoltGrid?
**Answer:** Middleware is software that resides between the operating system/network transport and user applications to provide a uniform communication abstraction. In VoltGrid, Express middleware handles HTTP routing and JSON serialization, the JSON-RPC layer handles procedure dispatching, and Socket.IO provides publish/subscribe event distribution over raw TCP sockets.

---

## 2. Communication in Distributed Systems

### Q4: How does JSON-RPC 2.0 differ from REST?
**Answer:**
- **REST** is resource-oriented: it maps HTTP verbs (`GET`, `POST`, `PUT`, `DELETE`) to URI resources (e.g., `GET /api/stations/alpha`).
- **RPC** is action/procedure-oriented: the client invokes a named remote procedure with parameters via a uniform endpoint (e.g., `POST /api/rpc` with `{"jsonrpc": "2.0", "method": "station.ping", "params": {...}, "id": 1}`). JSON-RPC 2.0 defines standardized error objects with numeric codes (e.g. `-32601 Method not found`).

### Q5: How does Server-Sent Events (SSE) differ from regular Request/Response polling?
**Answer:** In Request/Response polling, the client repeatedly establishes new HTTP connections at intervals, creating heavy header overhead and latency. In SSE, the client opens a single persistent HTTP connection, and the server continuously pushes unidirectional event streams (`text/event-stream`) in real-time as new sensor data arrives.

### Q6: What is the difference between synchronous and asynchronous communication?
**Answer:**
- In **synchronous communication** (like RPC), the caller blocks and waits until the callee returns a response or a timeout occurs.
- In **asynchronous communication** (like Socket.IO events or message queues), the sender dispatches a message and continues execution immediately without waiting for the receiver to process it.

---

## 3. Synchronization & Clocks

### Q7: Why are physical clocks insufficient for distributed synchronization?
**Answer:** Physical quartz clocks suffer from physical drift and skew due to temperature and crystal imperfections. Network protocols like NTP only synchronize to within milliseconds, which is too coarse to distinguish the true ordering of microsecond events. Logical clocks solve this by ordering events based on causality rather than physical time.

### Q8: What are Lamport's two clock update rules?
**Answer:**
1. **Rule 1 (Local/Send):** Before executing an event or sending a message, a node increments its local clock: $L_i \leftarrow L_i + 1$.
2. **Rule 2 (Receive):** Upon receiving a message with timestamp $T_m$, a node updates its clock: $L_j \leftarrow \max(L_j, T_m) + 1$.

### Q9: What is the limitation of Lamport logical clocks that Vector Clocks solve?
**Answer:** Lamport clocks guarantee that if $A \to B$, then $L(A) < L(B)$. However, the converse does **not** hold: $L(A) < L(B)$ does not prove that $A$ caused $B$; they might be independent concurrent events. **Vector Clocks** track causality across all processes, allowing us to mathematically verify whether two events are causally related or concurrent ($A \parallel B$).

### Q10: How do you determine if two vector clock timestamps are concurrent?
**Answer:** For vectors $V_A$ and $V_B$, if neither $V_A \le V_B$ nor $V_B \le V_A$ holds (meaning some elements in $V_A$ are greater than $V_B$ while other elements in $V_B$ are greater than $V_A$), then the events are **concurrent** ($A \parallel B$).

---

## 4. Consensus, Elections & Mutual Exclusion

### Q11: Explain how the Bully Election Algorithm works.
**Answer:** Each node has a globally known priority rank. When a node detects that the coordinator has failed, it sends an `ELECTION` message to all nodes with strictly higher priority. If any higher node is online, it responds with `OK` and takes over the election. If no higher node responds within a timeout, the initiating node declares itself the new coordinator and broadcasts a `COORDINATOR` announcement to all peers.

### Q12: How does the Ring Election Algorithm differ from the Bully Algorithm?
**Answer:** In the Ring algorithm, nodes are logically organized in a unidirectional circle. The initiator circulates a token containing a list of online candidate IDs. Each peer appends its ID and forwards the message. When the token returns to the initiator, the process with the highest ID is elected and a `COORDINATOR` message circles the ring. Message complexity is fixed at $2N$, whereas the Bully algorithm can take $O(N^2)$ messages in the worst case.

### Q13: What is the Ricart–Agrawala algorithm?
**Answer:** It is a permission-based distributed mutual exclusion algorithm. A node requesting the critical section multicasts a timestamped `REQUEST(T, id)` to all $N-1$ peers. Peers reply immediately if they do not want the critical section, or defer reply if they have a higher-priority request. The requesting node enters the critical section once it receives $N-1$ `REPLY` messages, and flushes deferred replies when exiting.

### Q14: Why do we use database transactions instead of Ricart–Agrawala for actual reservations in VoltGrid?
**Answer:** Ricart–Agrawala requires all $N-1$ nodes to be online to grant permission; if any node crashes, the critical section stalls unless complex fault-tolerant extensions are used. For persistent booking records, SQLite ACID transactions (`BEGIN IMMEDIATE`) with disk durability, rollback protection, and indexing provide instant sub-millisecond safety and crash recovery.

---

## 5. Fault Tolerance & Emerging Paradigms

### Q15: What is the Beacon Protocol? What is the danger of setting the timeout threshold too short?
**Answer:** The beacon protocol uses periodic heartbeat pings (e.g. every 3000ms) to detect node liveness. If no ping arrives within a timeout threshold (e.g. 8000ms), the node is declared suspect/offline. If the timeout is too short, normal network jitter or temporary GC pauses cause **false positives**, triggering unnecessary elections and cluster instability.

### Q16: What is the CAP Theorem, and how does VoltGrid position itself?
**Answer:** The CAP Theorem states that a distributed data store can guarantee at most two of three properties under network partitioning: **Consistency (C)**, **Availability (A)**, and **Partition Tolerance (P)**. VoltGrid prioritizes **Consistency over Availability (CP)** for reservations: if a station node is offline or partitioned, the coordinator rejects new reservations for that node rather than risking an inconsistent double booking.

### Q17: Why is Blockchain unnecessary for an EV charging network like VoltGrid?
**Answer:** Blockchain consensus (Proof-of-Work / Proof-of-Stake) is designed for trustless environments where untrusted parties maintain a shared ledger without central authority. It introduces high latency (12 seconds to 10 minutes), transaction fees, and high compute overhead. In an EV charging network managed by an authorized operator, centralized coordinator transactions provide 5ms latency, zero transaction fees, and immediate deterministic finality.
