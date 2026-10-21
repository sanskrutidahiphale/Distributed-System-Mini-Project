# VoltGrid Demonstration Guide

Follow this concise, step-by-step walkthrough to present **VoltGrid** during an academic project evaluation, lab viva, or FA-1 / FA-2 demonstration.

---

## Step 1: Launch Application & Overview (Dashboard)
1. Start the application:
   ```powershell
   npm run dev
   ```
2. Open your browser at `http://localhost:5173`.
3. Point out the **Operations Dashboard**:
   - Total Stations: `3/3` online (`VoltGrid Central Hub`, `Tech Corridor`, `West Expressway`).
   - Fleet capacity: `1,060 kW`.
   - Active elected leader badge: `Leader: Tech Corridor` (Node Beta).
   - Real-time distributed activity stream updating dynamically with Lamport clock timestamps.
4. Toggle the theme button in the top right to verify **Light Mode** (default) and **Dark Mode** contrast.

---

## Step 2: Station Inspection & Fleet Fleet Bays
1. Click **Charging Stations** in the left sidebar.
2. Filter connectors by type: select `CCS2 (DC Fast)` or `Type 2 (AC)`.
3. Open a connector by clicking **Specs**:
   - Show simulated voltage, current, rated kW power, and operational status.
4. Click **Reserve** on connector `ALPHA-01` to pre-fill the booking workflow.

---

## Step 3: Atomic Reservation & Safety Verification
1. Navigate to **Reservations & Safety** page.
2. Select connector `ALPHA-01` at `VoltGrid Central Hub`.
3. Click the `+30m Now` preset button.
4. Click **Check Availability**:
   - Verify that the slot is reported as *Available and clear*.
5. Click **Confirm Reservation**:
   - Note the confirmed reservation ID (e.g. `res-1728...`).
   - Show that the booking appears immediately in the table below and an atomic commit event is logged in the distributed activity log with an advanced Lamport clock.

---

## Step 4: Provable Conflict Rejection (ACID Overlap Test)
1. In the top right of the Reservations page, click the red button:
   **Simulate Overlap Conflict**.
2. Explain what happens under the hood:
   - A concurrent request is submitted for the exact same connector with an overlapping time interval.
   - The coordinator executes SQLite `BEGIN IMMEDIATE` transaction and verifies interval intersection:
     $$(new\_start < existing\_end) \land (new\_end > existing\_start)$$
   - The backend rejects the request with **HTTP 409 Conflict**.
   - The UI displays an explicit conflict card highlighting the colliding driver and booking ID.

---

## Step 5: Distributed Network Monitor & Node Failure
1. Click **Distributed Network** in the left sidebar.
2. Review the topology diagram:
   - All 3 stations are reporting heartbeats every 3000ms.
   - Note simulated ports (5011, 5012, 5013) and priority levels (P1, P2, P3).
3. Click **Disconnect Node** on `VoltGrid Central Hub` (Station Alpha).
   - The node flips to `OFFLINE`.
   - Attempting a booking on this node will immediately be rejected by the coordinator because consensus commit cannot reach the offline dispenser.
4. Click **Reconnect Node**:
   - The node reconnects, resynchronizes state, and emits a recovery log event.

---

## Step 6: Consensus Leader Election (Bully & Ring)
1. On the Network Monitor page, click **Run Bully Algorithm**:
   - Station Alpha (P1) initiates the election.
   - It sends `ELECTION` to higher priority nodes (Beta P2, Gamma P3).
   - Gamma (highest online priority P3) answers `OK`, suppresses lower nodes, and broadcasts `COORDINATOR`.
   - Inspect the step-by-step trace in the results table.
2. Now select **Run Ring Algorithm**:
   - Observe the token circulating through the logical ring $(\alpha \to \beta \to \gamma \to \alpha)$.
   - Each peer appends its ID; when the token returns to the initiator, the highest priority node is declared leader.

---

## Step 7: Distributed Systems Lab Demos
Navigate to **Distributed Systems Lab**:
1. **JSON-RPC 2.0 Tab:**
   - Select method `station.ping` and click **Execute Remote Procedure Call**.
   - Show the JSON-RPC 2.0 formatted response with measured latency and clock value.
   - Try an invalid method (e.g. `unknown.method`) to show spec error `-32601 Method not found`.
2. **Stream Telemetry (SSE) Tab:**
   - Point out continuous 1-second pushes of active power (kW), voltage, current, and EV battery SoC %.
   - Explain how SSE differs from discrete Request/Response polling.
3. **Lamport Clocks Tab:**
   - Click **Local Event (+1)** on Node Alpha to show Rule 1 ($L_i = L_i + 1$).
   - Click **Alpha → Beta** to show Rule 2 ($L_j = \max(L_j, L_{msg}) + 1$).
4. **Vector Clocks Tab:**
   - Click **Preset: Concurrent (A ∥ B)**.
   - Click **Evaluate Vector Causality** to demonstrate concurrent execution across independent nodes.
5. **Ricart–Agrawala Mutex Tab:**
   - Click **Run Mutex Simulation** to see `REQUEST`, `REPLY`, `ENTER_CS`, and `EXIT_CS` step-by-step phases.

---

## Step 8: FA-1 / FA-2 Syllabus Verification
1. Click **FA-1 / FA-2 Syllabus** in the left sidebar.
2. Filter by **Unit I**, **Unit II**, **Unit III**, or **Unit IV**.
3. Expand any topic (e.g., *Virtualization and Containerization*, *CAP Theorem*, *Knapp's Deadlock Detection*, or *Case Studies: Cloudflare & Kubernetes*) to review the academic summary.
4. Click **Reset Demo** in the top bar to restore the database and cluster state to clean initial defaults.
