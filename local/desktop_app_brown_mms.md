# Desktop Functional Parity “Brown M&Ms” (CLI vs Desktop)

**Date**: 2025-12-31

This document is a forensic list of _behavior-level_ parity issues that remain
even after config unification and SSE/tool rendering fixes.

Your example (markdown viewer apps) is a textbook “brown M&M”: it looks like a
simple discrepancy, but it reveals **systemic drift** (conversation identity +
context retention + different tool selection behavior).

---

## BM-1 (Critical): Desktop loses conversation context across turns (taskId not preserved)

### Symptom (matches your screenshot)

- Turn 1: Desktop answers something plausible but incomplete.
- Turn 2: Follow-up question (“are the above all installed?”) **doesn’t refer to
  the list above** and instead runs unrelated environment checks.

### Root cause

Desktop’s `taskId` is stored only in the Bridge FSM state variants that
represent “active stream”. When the stream ends, the reducer transitions to
`{ status: 'connected' }` and **drops `taskId`**. Subsequent user messages are
sent **without** `taskId`, so the backend starts a **new task** (fresh context).

### Evidence in code

- `packages/desktop/src/bridge/reducer.ts`
  - `STREAM_ENDED` returns `{ status: 'connected' }` (no `taskId` retained).
- `packages/desktop/src/bridge/store.ts`
  - `getCurrentTaskId()` returns `state.taskId` only if `'taskId' in state`.
  - After `STREAM_ENDED`, `'taskId' in state` is false → `null`.
- `packages/desktop/src/hooks/useCliProcess.ts`
  - `sendMessage()` includes `taskId` only if `currentTaskId` is truthy:
    - `...(currentTaskId ? { taskId: currentTaskId } : {}),`

### Why CLI behaves differently

CLI maintains a stable conversation/session identity by default. Desktop is
effectively running each message as a new conversation unless the user
explicitly restores a session.

### Fix architecture (recommended)

- Add a **persistent “current conversation id”** in the bridge store that
  survives stream end.
  - Example:
    - `bridgeStore.currentTaskId` (separate field from `BridgeState`)
    - Update it on `STREAM_STARTED(taskId)`
    - Never clear it on `STREAM_ENDED` (clear only on explicit `/clear`, “New
      conversation”, or explicit restore).
- Update `useCliProcess.sendMessage()` to always include `taskId` when
  available.

### Verification

- Desktop: ask a question, then ask a follow-up referring to prior answer.
- Confirm the second `message/stream` call includes `taskId`.
- Confirm `a2a-server` logs show the same `taskId`.

---

## BM-2 (High): History/session UI is not authoritative and can’t restore real context

### Symptom

- History entries exist, but restoring a session is effectively not wired.

### Evidence

- `packages/desktop/src/components/SidePanel.tsx`:
  - `HistoryView` selection handler is
    `console.log('[TODO] Session restore:', id)`.
- `packages/desktop/src/hooks/useCliProcess.ts`:
  - History uses `const tid = currentTaskId || 'default'`.
  - Because `currentTaskId` is often null (BM-1), history gets polluted with
    `default`.

### Fix architecture

- Make history list derived from backend sessions (or at minimum wire click →
  `/restore <id>`).
- Don’t use `'default'` as a session id; only record sessions once the backend
  returns a real taskId.

---

## BM-3 (High): Desktop can “end the stream” too aggressively via `state-change`

### Symptom

- Premature transition to “connected” can drop streaming state early (amplifies
  BM-1).

### Evidence

- `packages/desktop/src/bridge/eventHandler.ts`:
  - `case 'state-change': dispatch(BridgeActions.streamEnded())`
  - `state-change` is treated as terminal, but it’s not always end-of-turn in
    practice.

### Fix architecture

- Treat `state-change` as advisory; only call `streamEnded()` on:
  - `task-ended`, `model-turn-ended`, or `result.final === true` in
    `status-update`.

---

## BM-4 (Medium): Desktop connectivity status is not real connectivity

### Symptom

- Desktop UI can show “Connected” when token exists even if backend is
  unreachable or unhealthy.

### Evidence

- `packages/desktop/src/components/ConnectivityIndicator.tsx`:
  - `isConnected = !!agentToken`.

### Fix

- Drive UI from BridgeStore/healthz results (`useCliProcess.checkConnection`)
  and/or Sidecar boot status.

---

## BM-5 (Medium): Desktop’s “API Key Required” banner is incorrect and can bias user behavior

### Symptom

- UI says “Gemini API Key Required” when it really means “Agent web-remote token
  missing”.

### Evidence

- `packages/desktop/src/components/ChatView.tsx`:
  - `needsApiKey = !useSettingsStore((s) => s.agentToken)`

### Fix

- Rename/correct copy and link to the right flow (web-remote token acquisition,
  not Gemini API key).

---

## BM-6 (Medium): Voice input is implemented but not actually integrated into the primary chat UX

### Symptom

- Main chat mic button doesn’t perform STT; it only toggles state.
- There is a separate STT-capable component (`VoiceOrb`) that isn’t integrated
  into the main flow.

### Evidence

- STT exists:
  - `packages/desktop/src/components/VoiceOrb.tsx` → `invoke('stt_transcribe')`
- Main chat uses its own mic UX:
  - `packages/desktop/src/components/ChatView.tsx`

### Fix

- Unify on one voice input path and ensure it always yields text into the chat
  input.

---

## BM-7 (Medium): Settings sync is “best-effort” and not strongly consistent

### Symptom

- Desktop sends `/config set ...` commands over SSE for some settings, but the
  UI doesn’t reflect whether the backend applied them.

### Evidence

- `packages/desktop/src/stores/settingsStore.ts`:
  - `syncToCli()` posts `/config set` and consumes SSE but discards output.

### Fix

- Add an ack path (or query `/config get`) after set, or surface sync failures
  in UI.

---

## BM-8 (Medium): Tool-selection divergence is not necessarily “wrong model” — it’s often “wrong context”

Your specific example (Desktop ran environment checks rather than scanning for
markdown viewers) is consistent with:

- missing prior turn context (BM-1), plus
- a generic heuristic by the model: “user asked about installed apps → run
  `which`/versions”, which can drift.

**Key point**: fix BM-1 and you remove a whole class of these tool-selection
differences.

---

## Priority order to reach true functional parity

1. **Fix taskId persistence across turns (BM-1)**
2. **Wire real session restore + stop generating `default` sessions (BM-2)**
3. **Stop treating `state-change` as end-of-turn (BM-3)**
4. Clean up: connectivity truth (BM-4), copy correctness (BM-5)
5. Voice integration (BM-6)
6. Stronger settings sync consistency (BM-7)

---

## Status

This document identifies the main “brown M&Ms” currently present in the Desktop
parity layer and provides concrete architectural fixes and code pointers for
each.
