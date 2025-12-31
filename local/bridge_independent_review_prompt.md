# TerminaI Desktop Bridge: Independent Architectural Review Request

## Context

I am the maintainer of TerminaI, a fork of Google's Gemini CLI. The CLI works
perfectly. I have built a Desktop Application (Tauri + React) that spawns the
CLI as a sidecar and communicates with it over HTTP/SSE using a JSON-RPC-like
protocol.

**The pain point:** The Desktop App has been plagued by intermittent failures in
the "Bridge" layer that connects the React frontend to the CLI backend. After 3
days of debugging and a "comprehensive" architectural review, we are still
whacking moles.

---

## Original Problem Statement

I asked an AI assistant to perform a "Deep System Scan" of the Bridge
architecture with the following brief:

> **Mission:** Perform a Deep System Scan Analysis of the TerminaI Desktop
> Application's Bridge.
>
> **Objective:** Identify and eliminate every possible architectural fragility
> in the Bridge layer. The deliverable is a prioritized list of risks and a
> concrete plan to fix them.
>
> **Success Criteria:**
>
> - 100% behavior parity with CLI
> - Sub-100ms latency
> - Rock-solid stability

---

## What the AI Found

### Initial Risk Assessment (8 risks, 5 criteria)

| Priority | Risk                                 | Description                                                                                                    |
| -------- | ------------------------------------ | -------------------------------------------------------------------------------------------------------------- |
| P0       | Task ID Drift on Unmount/Remount     | `activeTaskIdRef` and `pendingConfirmationTaskIdRef` were component-scoped React refs that reset on navigation |
| P0       | Rapid-Fire Input ID Misalignment     | Sending multiple messages before SSE response could create orphan tasks                                        |
| P1       | SSE Reader Leak                      | Missing `finally { reader.releaseLock() }`                                                                     |
| P1       | Abort Controller Kills Answer Stream | Aggressive abort logic could kill ongoing streams                                                              |
| P2       | Tool Event Accumulation              | Unbounded memory growth in `terminalOutput`                                                                    |
| P3       | Keep-Alive Headers Missing           | ~50ms latency cost per request                                                                                 |
| P3       | Health Check Timeout Too Long        | 3s instead of 500ms                                                                                            |
| Tracked  | Replay Protection Disabled           | Tech debt for remote deployments                                                                               |

### Fixes Applied

1. **Task ID Drift:** Moved `activeTaskId` and `pendingConfirmationTaskId` from
   refs to Zustand store (`executionStore.ts`)
2. **SSE Leak:** Added `finally { reader.releaseLock() }` to `sse.ts`
3. **Abort Logic:** Added conditional `if (!pendingConfirmationTaskId)` check
   before aborting
4. **Memory Bound:** Added `.slice(-100000)` to `appendTerminalOutput`
5. **Keep-Alive:** Added `Connection: keep-alive` and `keepalive: true` to fetch
6. **Timeout:** Reduced health check from 3s to 500ms
7. **Rapid-Fire:** User added message queue; AI fixed queue unlock bug

### The Test

After all fixes, we tested. The logs revealed:

```
[WARN] Received tool confirmation for unknown or already processed callId: run_terminal_command-1767142997453-e516f4d3672848
```

**Translation:** The frontend sent a tool confirmation, but the backend rejected
it because the `taskId` was wrong. Despite moving task IDs to a Zustand store,
they STILL drifted.

**Root Cause:** When the user clicked "Approve" on a tool confirmation, the
`pendingConfirmationTaskId` in the store was stale or incorrect. The
confirmation was sent to a NEW task instead of the ORIGINAL task that was
waiting.

---

## The AI's Proposed Solution

The AI proposed a **Bridge State Machine**: an explicit FSM (Finite State
Machine) that models the CLI's states on the frontend, with typed states, atomic
transitions, and guards.

**Key Claim:** A state machine makes `taskId` and `callId` physically the same
value (part of one state object), so they cannot diverge.

### Proposed State Machine

```typescript
type BridgeState =
  | { status: 'disconnected' }
  | { status: 'connecting' }
  | { status: 'connected' }
  | { status: 'sending'; text: string }
  | { status: 'streaming'; taskId: string; contextId: string }
  | {
      status: 'awaiting_confirmation';
      taskId: string;
      contextId: string;
      callId: string;
      toolName: string;
      args: unknown;
    }
  | {
      status: 'executing_tool';
      taskId: string;
      contextId: string;
      callId: string;
    }
  | { status: 'error'; message: string; recoverable: boolean };
```

**The invariant:** You CANNOT be in `awaiting_confirmation` without knowing the
exact `taskId` and `callId` because they're part of the same discriminated
union.

---

## My Question to You (Independent Reviewer)

I am not qualified to evaluate whether this state machine proposal is correct.
My patience is exhausted.

**A.** We still have pain despite "comprehensive" analysis and patches.

**B.** I want an independent architectural review: **Can the Desktop-CLI Bridge
design ever be perfected to a point where 100% of these integration bugs are
eliminated?**

**C.** If the answer is "no" or "theoretically yes but practically very
difficult," I will **eliminate the Desktop App entirely** and distribute only
the CLI. The CLI is rock-solid.

**D.** If the answer is "yes, it can be 100% reliable," I want to know **the
best architecture to achieve that**—whether it's the proposed state machine, a
different pattern, or a fundamental redesign.

---

## Technical Details for Your Review

### Architecture Summary

```
┌────────────────────────────────────────────────────────────────┐
│                    Desktop App (Tauri + React)                 │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  useCliProcess.ts (~700 lines)                           │  │
│  │  - Manages connection state, messages, confirmations     │  │
│  │  - Refs for activeTaskId, pendingConfirmationTaskId      │  │
│  │  - AbortController for stream management                 │  │
│  │  - Voice integration, history, settings sync             │  │
│  └──────────────────────────────────────────────────────────┘  │
│                           │                                    │
│                           ▼                                    │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  agentClient.ts                                          │  │
│  │  - HTTP POST with HMAC-signed headers                    │  │
│  │  - Returns ReadableStream<Uint8Array>                    │  │
│  └──────────────────────────────────────────────────────────┘  │
│                           │                                    │
│                           ▼                                    │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  sse.ts                                                  │  │
│  │  - Parses SSE stream, calls onMessage for each event     │  │
│  └──────────────────────────────────────────────────────────┘  │
└───────────────────────────────┬────────────────────────────────┘
                                │
                      HTTP POST + SSE
                                │
                                ▼
┌────────────────────────────────────────────────────────────────┐
│                     CLI Sidecar (Node.js)                      │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  webRemoteServer.ts                                      │  │
│  │  - Starts Express server, binds to localhost:PORT        │  │
│  │  - Handshake: sends port + token via stdout              │  │
│  └──────────────────────────────────────────────────────────┘  │
│                           │                                    │
│                           ▼                                    │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  app.ts (Express + A2A SDK)                              │  │
│  │  - Routes: /healthz, /tasks, POST /                      │  │
│  │  - Task creation, message handling, SSE streaming        │  │
│  └──────────────────────────────────────────────────────────┘  │
│                           │                                    │
│                           ▼                                    │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  executor.ts (CoderAgentExecutor)                        │  │
│  │  - Task state machine (submitted → working → input-req)  │  │
│  │  - Tool call scheduling and confirmation handling        │  │
│  │  - LLM interaction via GeminiClient                      │  │
│  └──────────────────────────────────────────────────────────┘  │
└────────────────────────────────────────────────────────────────┘
```

### The Fundamental Challenge

The CLI has a clear state machine:

1. IDLE → EXECUTING (user sends message)
2. EXECUTING → CONFIRMING (tool needs approval)
3. CONFIRMING → TOOL_RUNNING (user approves)
4. TOOL_RUNNING → EXECUTING (tool completes)
5. EXECUTING → IDLE (turn ends)

The Desktop frontend tries to mirror this with:

- React component state (`isProcessing`, `messages`)
- React refs (`activeTaskIdRef`, `pendingConfirmationTaskIdRef`)
- Zustand stores (`executionStore`, `settingsStore`)
- AbortController for stream lifecycle

**The problem:** React's lifecycle (mount/unmount, re-renders, effect timing)
constantly interferes with state synchronization. Even with Zustand, the TIMING
of state updates during async SSE processing can cause drift.

### Questions for Your Review

1. **Is the state machine approach fundamentally sound?** Does modeling the
   CLI's state explicitly on the frontend eliminate the class of bugs we're
   seeing?

2. **Are there edge cases the state machine doesn't handle?** For example:
   - SSE events arriving out of order
   - Network disconnection mid-stream
   - User navigating away during tool execution
   - Multiple browser tabs

3. **Is there a simpler solution?** For example:
   - Making the CLI maintain all state and the frontend truly stateless (just a
     renderer)
   - WebSocket instead of HTTP/SSE
   - Different frontend framework (Solid, Svelte) with different lifecycle
     semantics

4. **What's the cost-benefit of perfect reliability?** If achieving 100%
   reliability requires a rewrite of the entire frontend, is the Desktop App
   worth keeping?

---

## Appendix: Key Code Excerpts

### useCliProcess.ts: The Core Problem Area

```typescript
// This ref-based approach was the original sin
const activeTaskIdRef = useRef<string | null>(null);
const pendingConfirmationTaskIdRef = useRef<string | null>(null);

// We moved to Zustand, but the timing still drifts
const { activeTaskId, setActiveTaskId, pendingConfirmationTaskId, setPendingConfirmationTaskId } = useExecutionStore();

// When sending a confirmation, we use the potentially stale ID
const respondToConfirmation = useCallback(async (callId, approved) => {
  const taskId = pendingConfirmationTaskId ?? activeTaskId; // ← THIS CAN BE WRONG
  // ...
}, [pendingConfirmationTaskId, activeTaskId, ...]);
```

### handleJsonRpc: Where State Should Be Set

```typescript
const handleJsonRpc = useCallback((event: JsonRpcResponse) => {
  // When we receive a task ID from the backend, we set it
  if ('taskId' in event.result) {
    setActiveTaskId(event.result.taskId);
  }

  // When we receive a confirmation request, we set the pending ID
  if (event.result?.coderAgent?.kind === 'tool-call-confirmation') {
    setPendingConfirmationTaskId(event.result.taskId);
    setAssistantPendingConfirmation({ ... });
  }
}, [...]);
```

### The Race Condition

The bug happens when:

1. `handleJsonRpc` sets `pendingConfirmationTaskId` to "abc"
2. React batches state updates
3. User clicks "Approve" immediately
4. `respondToConfirmation` reads `pendingConfirmationTaskId`, but Zustand hasn't
   flushed yet
5. Falls back to stale `activeTaskId` or creates new task

---

## Your Deliverable

Please provide:

1. **Verdict:** Can this be 100% reliable? (Yes/No/Conditional)
2. **Recommended Architecture:** If yes, what pattern should we use?
3. **Cost Estimate:** How much effort to implement correctly?
4. **Risk Assessment:** What could still go wrong?
5. **Alternative:** If you recommend abandoning the Desktop App, explain why.

Thank you for your time.
