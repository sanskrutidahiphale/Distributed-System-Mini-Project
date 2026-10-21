# FA-2 Syllabus Coverage Matrix (Units III & IV)

This document provides rigorous academic verification for **Formative Assessment 2 (FA-2)** of the B.Tech Computer Engineering Distributed Systems syllabus.

---

## Unit III: Synchronization & Consensus

| Syllabus Topic | Status | Implementation Reference | Description & Demonstration in VoltGrid |
| :--- | :--- | :--- | :--- |
| **Clock Synchronization: Physical vs Logical** | **Conceptual explanation** | `client/src/pages/LabPage.tsx`<br>`docs/ALGORITHMS.md` | Explains clock skew, drift rates, NTP/Cristian protocols, and why logical clocks are required to prevent conflicting events when physical clocks diverge. |
| **Lamport Logical Clocks** | **Implemented** | `server/src/services/nodeNetwork.ts`<br>`client/src/pages/LabPage.tsx` | Strict implementation of Lamport rules:<br>• **Rule 1:** $L_i = L_i + 1$ before local event or send.<br>• **Rule 2:** $L_j = \max(L_j, L_{msg}) + 1$ upon receiving message.<br>Interactive UI permits stepping through events and inspecting clock updates. |
| **Vector Clocks & Causality** | **Implemented** | `server/src/services/nodeNetwork.ts`<br>`client/src/pages/LabPage.tsx` | Nodes maintain $[V_\alpha, V_\beta, V_\gamma]$. Merging occurs via component-wise maximum. UI includes an interactive comparator that verifies whether $V_A \le V_B$ ($A \to B$), $V_B \le V_A$ ($B \to A$), or $A \parallel B$ (concurrent events). |
| **Global State: Chandy-Lamport Snapshot** | **Implemented** | `server/src/services/nodeNetwork.ts`<br>`client/src/pages/LabPage.tsx` | Demonstrates consistent global cuts across all 3 nodes and in-transit communication channels via marker passing without pausing active operations. |
| **Election Algorithms: Bully Algorithm** | **Implemented** | `server/src/services/nodeNetwork.ts`<br>`client/src/pages/NetworkMonitorPage.tsx` | Nodes with higher priority bully lower nodes. Upon coordinator crash, highest online node claims leadership. Full step-by-step trace of `ELECTION`, `OK`, and `COORDINATOR` messages is displayed. |
| **Election Algorithms: Ring Election Algorithm** | **Implemented** | `server/src/services/nodeNetwork.ts`<br>`client/src/pages/NetworkMonitorPage.tsx` | Circulates an active candidate list along a logical ring $(\alpha \to \beta \to \gamma \to \alpha)$. When token circles back to initiator, the highest priority candidate is declared leader and broadcasted. |
| **Distributed Mutual Exclusion: Ricart-Agrawala** | **Implemented** | `server/src/services/nodeNetwork.ts`<br>`client/src/pages/LabPage.tsx` | Multicast timestamped `REQUEST(T_i, i)` to all $N-1$ peers. Peers reply immediately or defer. Requester enters Critical Section upon collecting $N-1$ `REPLY` messages and releases deferred replies upon exit. |
| **Beacon Protocol for Failure Detection** | **Implemented** | `server/src/services/nodeNetwork.ts`<br>`client/src/pages/NetworkMonitorPage.tsx` | Heartbeats emitted every 3000ms. If last received ping exceeds 8000ms, node is flagged `OFFLINE`, and automated failover election is initiated. |
| **Self-Study: Lodha-Kshemkalyani Fair Mutex** | **Conceptual explanation** | `client/src/pages/SyllabusCoveragePage.tsx`<br>`docs/ALGORITHMS.md` | Explains fair distributed mutual exclusion with bounded waiting ($O(N)$ message complexity), preventing process starvation through priority aging. |
| **Self-Study: Knapp's Deadlock Classifications** | **Conceptual explanation** | `client/src/pages/SyllabusCoveragePage.tsx`<br>`docs/ALGORITHMS.md` | Details Knapp's 4 classes of distributed deadlock detection algorithms:<br>1. Path-pushing algorithms (e.g., Obermarck)<br>2. Edge-chasing algorithms (Chandy-Misra-Haas)<br>3. Diffusion computations<br>4. Global state detection algorithms. |

---

## Unit IV: Emerging Paradigms

| Syllabus Topic | Status | Implementation Reference | Description & Demonstration in VoltGrid |
| :--- | :--- | :--- | :--- |
| **Distributed Object-Based Systems** | **Conceptual explanation** | `client/src/pages/SyllabusCoveragePage.tsx` | Reviews Remote Object Invocation (Java RMI, CORBA ORB, DCOM) vs modern service-oriented REST/RPC architectures. Explains remote references and distributed garbage collection. |
| **Distributed Web-Based Systems** | **Implemented** | Entire VoltGrid Architecture | Demonstrates modern 3-tier web architecture: React client browser tier, Express API gateway coordinator tier, and SQLite persistent storage tier. |
| **Distributed File Systems (DFS)** | **Conceptual explanation** | `client/src/pages/SyllabusCoveragePage.tsx` | Compares DFS (NFS caching, Google File System master-chunk architecture, HDFS block replication) against VoltGrid's centralized SQLite relational database. |
| **Serverless Computing (FaaS)** | **Conceptual explanation** | `client/src/pages/SyllabusCoveragePage.tsx` | Explains event-driven serverless architectures, stateless function lifecycles, and cold start latency, illustrated with an EV charging push-notification trigger scenario. |
| **Case Study 1: Megaport** | **Conceptual explanation** | `client/src/pages/SyllabusCoveragePage.tsx` | Software-Defined Network-as-a-Service (NaaS), multi-cloud peering, elastic interconnects, and dynamic bandwidth provisioning. |
| **Case Study 2: Cloudflare** | **Conceptual explanation** | `client/src/pages/SyllabusCoveragePage.tsx` | Anycast global routing, distributed CDN caching, DDoS mitigation, and edge compute workers running close to drivers. |
| **Case Study 3: Amazon Web Services (AWS)** | **Conceptual explanation** | `client/src/pages/SyllabusCoveragePage.tsx` | Highly available cloud infrastructure, DynamoDB PACELC design, availability zones, and multi-region consensus. |
| **Case Study 4: Apache Hadoop** | **Conceptual explanation** | `client/src/pages/SyllabusCoveragePage.tsx` | Batch distributed data processing, HDFS rack-aware replication, MapReduce data locality, and YARN resource orchestration. |
| **Case Study 5: Kubernetes** | **Conceptual explanation** | `client/src/pages/SyllabusCoveragePage.tsx` | Distributed container orchestration, Raft-based `etcd` consensus store, declarative state reconciliation loops, and ingress load balancing. |
| **Blockchain & Distributed Ledger Technology** | **Conceptual explanation** | `client/src/pages/SyllabusCoveragePage.tsx` | Evaluates Byzantine Fault Tolerance, Proof-of-Work/Stake consensus, and explains why blockchain consensus is unnecessary and inefficient for single-operator EV networks. |
| **Distributed Database Trade-offs: CAP & PACELC** | **Conceptual explanation** | `client/src/pages/SyllabusCoveragePage.tsx`<br>`docs/ARCHITECTURE.md` | Formal analysis of CAP Theorem and PACELC. VoltGrid operates in a CP mode during reservation validation: rejecting bookings if node state cannot be strongly verified. |

---

## Academic Assessment Checklist for FA-2

- [x] **Working Bully Election:** Step-by-step trace showing `ELECTION` $\to$ `OK` $\to$ `COORDINATOR` messages.
- [x] **Working Ring Election:** Step-by-step trace showing token pass along ring until leader is elected.
- [x] **Working Lamport Clocks:** Rule 1 and Rule 2 updating monotonic integers on event and message exchange.
- [x] **Working Vector Clocks:** Causality comparator identifying $A \to B$ vs $A \parallel B$ concurrent events.
- [x] **Mutual Exclusion vs DB Transactions:** Clear demonstration of Ricart-Agrawala algorithm and explanation of when each is appropriate.
