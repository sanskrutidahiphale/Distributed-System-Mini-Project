# Distributed Algorithms Reference

This document provides formal descriptions, mathematical formulations, step-by-step pseudo-code, assumptions, example inputs/outputs, and limitations for all distributed algorithms implemented and demonstrated in **VoltGrid**.

---

## 1. Lamport Logical Clocks

### Purpose
To define a partial ordering of events across asynchronous distributed nodes without requiring synchronized physical clocks.

### Algorithm Rules
1. **Rule 1 (Local Event / Sending Event):**
   Before executing a local event or transmitting a message, process $P_i$ increments its local clock $L_i$:
   $$L_i \leftarrow L_i + 1$$
   When sending a message $m$, $P_i$ attaches timestamp $T_m = L_i$ to $m$.

2. **Rule 2 (Message Receipt):**
   When process $P_j$ receives a message $m$ with timestamp $T_m$, it updates its local clock $L_j$:
   $$L_j \leftarrow \max(L_j, T_m) + 1$$

### Assumptions
- Communication channels are reliable (no messages lost).
- Clock values are represented by unbounded non-negative integers.

### Example Walkthrough
1. Node Alpha has $L_\alpha = 2$. Executes local calibration: $L_\alpha \leftarrow 3$.
2. Node Alpha sends telemetry to Node Beta with timestamp $T_m = 3$.
3. Node Beta has $L_\beta = 1$. Upon receipt:
   $$L_\beta \leftarrow \max(1, 3) + 1 = 4$$

### Limitations
- **Lack of strong consistency:** If $L(A) < L(B)$, it does **not** necessarily follow that event $A$ causally preceded event $B$ ($A \to B$). Events may be concurrent. Vector clocks are required to detect genuine causality.

---

## 2. Vector Clocks

### Purpose
To determine the exact causal ("happened-before") relationship between any two events in a distributed system, enabling detection of concurrent events ($A \parallel B$).

### Algorithm Rules
Each process $P_i$ (among $N$ processes) maintains an integer vector $V_i = [V_i[1], V_i[2], \dots, V_i[N]]$.
1. **Local Event:**
   $$V_i[i] \leftarrow V_i[i] + 1$$
2. **Sending Message:**
   Process $P_i$ increments $V_i[i]$ and attaches its current vector $V_i$ to message $m$.
3. **Receiving Message with Vector $V_{msg}$:**
   $$V_j[k] \leftarrow \max(V_j[k], V_{msg}[k]), \quad \forall k \in [1, N]$$
   $$V_j[j] \leftarrow V_j[j] + 1$$

### Causality Comparison Rule
For two events with vector timestamps $V_A$ and $V_B$:
- $V_A \le V_B \iff \forall k, V_A[k] \le V_B[k]$.
- If $V_A \le V_B$ and $V_A \ne V_B$, then **$A \to B$** ($A$ causally preceded $B$).
- If $V_B \le V_A$ and $V_B \ne V_A$, then **$B \to A$** ($B$ causally preceded $A$).
- If neither $V_A \le V_B$ nor $V_B \le V_A$, then **$A \parallel B$** ($A$ and $B$ are **concurrent**).

### Example
- $V_A = [2, 1, 0]$
- $V_B = [1, 2, 0]$
- Comparison: $V_A[1] > V_B[1]$ (2 > 1) but $V_A[2] < V_B[2]$ (1 < 2).
- Neither vector dominates $\implies$ **Events are concurrent ($A \parallel B$)**.

---

## 3. Bully Election Algorithm

### Purpose
To elect a unique coordinator (leader) among distributed nodes when the existing coordinator fails, favoring the node with the highest priority rank.

### Priority Assignments in VoltGrid
- `station-alpha`: Priority 1
- `station-beta`: Priority 2
- `station-gamma`: Priority 3 (Highest)

### Algorithm Steps
1. Any process $P$ notices coordinator failure via heartbeat timeout.
2. $P$ sends an `ELECTION` message to all processes with higher priority than $P$.
3. If no process responds within timeout $T$, $P$ wins the election and sends `COORDINATOR` message to all active processes.
4. If a higher-priority process $Q$ receives `ELECTION`, it sends an `OK` message back to $P$ and initiates its own election.
5. The highest available online process announces itself as leader.

### Assumptions
- Each node has a globally known unique priority.
- Node failures are fail-stop (crashes, no Byzantine behavior).

### Limitations
- High message complexity ($O(N^2)$ in worst case when lowest priority node starts election).

---

## 4. Ring Election Algorithm

### Purpose
To elect a coordinator when processes are logically organized in a unidirectional circle ($P_0 \to P_1 \to \dots \to P_{N-1} \to P_0$).

### Algorithm Steps
1. When process $P$ detects coordinator failure, it creates an `ELECTION` message containing its own ID and forwards it to the next active peer in the ring.
2. If a neighbor is unreachable, $P$ skips it and sends to the next node in the ring.
3. When a process receives an `ELECTION` message, it appends its own ID to the message candidate list and forwards it.
4. When the message completes a full circle and returns to initiator $P$, $P$ chooses the process with the maximum ID/priority from the list.
5. $P$ circulates a `COORDINATOR` message around the ring declaring the new leader.

### Message Complexity
- Exactly $2N$ messages in a ring of $N$ nodes ($N$ for election token circulation, $N$ for coordinator broadcast).

---

## 5. Ricart–Agrawala Mutual Exclusion

### Purpose
Permission-based distributed mutual exclusion ensuring that only one node accesses a shared critical section (CS) at any instant without a centralized lock server.

### Protocol Steps
1. **Requesting Critical Section:**
   Node $P_i$ increments its Lamport clock $L_i$ and multicasts `REQUEST(L_i, i)` to all $N-1$ other nodes.
2. **Receiving a Request at Node $P_j$:**
   - If $P_j$ is **not** requesting the CS and **not** inside the CS: sends `REPLY` immediately to $P_i$.
   - If $P_j$ is currently **inside** the CS: defers sending `REPLY` to $P_i$ until it exits.
   - If $P_j$ also **wants** the CS: compares its own request timestamp $(L_j, j)$ with incoming $(L_i, i)$. If $(L_i, i) < (L_j, j)$, $P_j$ grants `REPLY` immediately; otherwise $P_j$ defers its reply.
3. **Entering Critical Section:**
   Node $P_i$ enters the CS as soon as it receives `REPLY` messages from all $N-1$ active nodes.
4. **Exiting Critical Section:**
   Upon leaving the CS, $P_i$ sends delayed `REPLY` messages to all deferred requests.

### Message Complexity
- $2(N - 1)$ messages per critical section entry ($N - 1$ requests + $N - 1$ replies).

### Contrast with Database Transactions
In VoltGrid, mutual exclusion algorithms demonstrate educational message coordination, while actual reservation data integrity is enforced via SQLite `BEGIN IMMEDIATE` ACID transactions.

---

## 6. Chandy-Lamport Global Snapshot Algorithm

### Purpose
To record a consistent global state (consistent cut) of a distributed system—including local process states and messages in-flight along communication channels—without freezing the system.

### Rules
1. **Snapshot Initiator:**
   - Records its own local state.
   - Sends a `MARKER` message along all outgoing communication channels.
2. **Receiving a Marker along Channel $C$:**
   - **First Marker Received:** The process records its local state, marks channel $C$ as empty, and forwards `MARKER` messages along all its outgoing channels.
   - **Subsequent Marker Received along Channel $C'$:** The process records all messages received on channel $C'$ since its local snapshot was recorded as messages in-transit on $C'$.

---

## 7. Beacon Protocol (Failure Detection)

### Purpose
To detect node crashes in an asynchronous distributed network using periodic keep-alive pings.

### Parameters in VoltGrid
- Heartbeat period: $T_{ping} = 3000\text{ ms}$.
- Failure timeout threshold: $T_{timeout} = 8000\text{ ms}$.
- Miss counter: Increments if no heartbeat is received within expected interval.

### Trade-offs
- Setting $T_{timeout}$ too short leads to **false positives** (marking slow nodes as failed due to network jitter).
- Setting $T_{timeout}$ too long delays failover detection, stalling coordinator operations.
