# Bridge Refactor: Implementation Tasks

## Implementation Checklist

### Phase 0: CLI Hardening (Day 0) — SURGICAL

- [x] Task 0a: Implement generateConfirmationToken in task.ts
- [x] Task 0b: Add confirmationToken to tool status message
- [x] Task 0c: Implement parseConfirmationToken validation
- [x] Task 0d: Write CLI token tests
- [x] Task 0e: Build and verify CLI still works standalone

### Phase 1: Foundation (Day 1)

- [x] Task 1: Create bridge directory structure
- [x] Task 2: Implement BridgeState types
- [x] Task 3: Implement bridgeReducer function
- [x] Task 4: Implement useBridgeStore
- [x] Task 5: Write reducer unit tests

### Phase 2: Event Handling (Day 2)

- [x] Task 6: Create handleSseEvent function
- [x] Task 7: Create BridgeActions constants (Completed in Phase 1)
- [x] Task 8: Implement event sequencing guard
- [x] Task 9: Write event handler tests

### Phase 3: Hardening (Day 3)

- [x] Task 10: Implement multi-tab lock (BroadcastChannel)
- [x] Task 11: Implement reconnection detection
- [x] Task 12: Write hardening tests

### Phase 4: Integration (Day 4)

- [x] Task 13: Refactor useCliProcess (Replace state with Bridge Store)
- [x] Task 14: Connect handleSseEvent to useCliProcess
- [x] Task 15: Implement sendMessage via Bridge Actions
- [x] Task 16: Remove old state
- [x] Task 17: Verify integration
- [x] Task 16: Remove old state from executionStore

### Phase 5: Testing & Polish (Day 5)

- [ ] Task 18: Final Manual Verification Steps
- [ ] Task 19: Create Walkthrough Artifact - confirmation flow
- [ ] Task 19: Integration test - multi-tab lock
- [ ] Task 20: Manual verification checklist
- [ ] Task 21: Cleanup dead code

---

## Detailed Task Breakdown

### Task 1: Create bridge directory structure

**Objective**: Set up the new bridge module directory.

**Prerequisites**: None

**Files to create**:

- `/packages/desktop/src/bridge/` (directory)
- `/packages/desktop/src/bridge/index.ts`

**Detailed steps**:

1. Create directory `/packages/desktop/src/bridge/`
2. Create barrel export file `index.ts`

**Code snippet**:

```typescript
// index.ts
export * from './types';
export * from './reducer';
export * from './store';
export * from './eventHandler';
```

**Definition of done**:

- [ ] Directory exists
- [ ] index.ts exports (will error initially, that's expected)

---

### Task 2: Implement BridgeState types

**Objective**: Define the discriminated union type for all bridge states.

**Prerequisites**: Task 1

**Files to create**:

- `/packages/desktop/src/bridge/types.ts`

**Detailed steps**:

1. Define `BridgeState` discriminated union
2. Define `BridgeAction` union
3. Define `ConfirmationIdentity` interface
4. Export all types

**Code snippet**:

```typescript
// types.ts

export type BridgeState =
  | { status: 'disconnected' }
  | { status: 'connecting' }
  | { status: 'connected' }
  | { status: 'sending'; text: string }
  | {
      status: 'streaming';
      taskId: string;
      contextId: string;
      eventSeq: number;
    }
  | {
      status: 'awaiting_confirmation';
      taskId: string;
      contextId: string;
      callId: string;
      toolName: string;
      args: unknown;
      eventSeq: number;
    }
  | {
      status: 'executing_tool';
      taskId: string;
      contextId: string;
      callId: string;
      eventSeq: number;
    }
  | {
      status: 'error';
      message: string;
      recoverable: boolean;
    };

export type BridgeAction =
  | { type: 'CONNECT' }
  | { type: 'CONNECTED' }
  | { type: 'DISCONNECTED'; reason?: string }
  | { type: 'SEND_MESSAGE'; text: string }
  | { type: 'STREAM_STARTED'; taskId: string; contextId: string }
  | {
      type: 'CONFIRMATION_REQUIRED';
      taskId: string;
      contextId: string;
      callId: string;
      toolName: string;
      args: unknown;
    }
  | { type: 'CONFIRMATION_SENT' }
  | { type: 'TOOL_COMPLETED' }
  | { type: 'STREAM_ENDED' }
  | { type: 'ERROR'; message: string; recoverable?: boolean }
  | { type: 'RESET' };

export interface ConfirmationIdentity {
  taskId: string;
  callId: string;
}
```

**Definition of done**:

- [ ] File compiles without errors:
      `npx tsc --noEmit packages/desktop/src/bridge/types.ts`
- [ ] All state statuses are exhaustive

---

### Task 3: Implement bridgeReducer function

**Objective**: Create the pure reducer function that handles all state
transitions.

**Prerequisites**: Task 2

**Files to create**:

- `/packages/desktop/src/bridge/reducer.ts`

**Detailed steps**:

1. Implement reducer with switch on action.type
2. Add guards for invalid transitions
3. Add logging for debug builds

**Code snippet**:

```typescript
// reducer.ts
import type { BridgeState, BridgeAction } from './types';

export function bridgeReducer(
  state: BridgeState,
  action: BridgeAction,
): BridgeState {
  switch (action.type) {
    case 'CONNECT':
      if (state.status !== 'disconnected') {
        console.warn('[Bridge] Cannot CONNECT from', state.status);
        return state;
      }
      return { status: 'connecting' };

    case 'CONNECTED':
      if (state.status !== 'connecting') {
        console.warn('[Bridge] Cannot CONNECTED from', state.status);
        return state;
      }
      return { status: 'connected' };

    case 'DISCONNECTED':
      return { status: 'disconnected' };

    case 'SEND_MESSAGE':
      if (state.status !== 'connected') {
        console.warn('[Bridge] Cannot SEND_MESSAGE from', state.status);
        return state;
      }
      return { status: 'sending', text: action.text };

    case 'STREAM_STARTED':
      if (state.status !== 'sending') {
        console.warn('[Bridge] Cannot STREAM_STARTED from', state.status);
        return state;
      }
      return {
        status: 'streaming',
        taskId: action.taskId,
        contextId: action.contextId,
        eventSeq: 0,
      };

    case 'CONFIRMATION_REQUIRED':
      if (state.status !== 'streaming') {
        console.warn(
          '[Bridge] Cannot CONFIRMATION_REQUIRED from',
          state.status,
        );
        return state;
      }
      return {
        status: 'awaiting_confirmation',
        taskId: action.taskId,
        contextId: action.contextId,
        callId: action.callId,
        toolName: action.toolName,
        args: action.args,
        eventSeq: state.eventSeq + 1,
      };

    case 'CONFIRMATION_SENT':
      if (state.status !== 'awaiting_confirmation') {
        console.warn('[Bridge] Cannot CONFIRMATION_SENT from', state.status);
        return state;
      }
      return {
        status: 'executing_tool',
        taskId: state.taskId,
        contextId: state.contextId,
        callId: state.callId,
        eventSeq: state.eventSeq,
      };

    case 'TOOL_COMPLETED':
      if (state.status !== 'executing_tool') {
        console.warn('[Bridge] Cannot TOOL_COMPLETED from', state.status);
        return state;
      }
      return {
        status: 'streaming',
        taskId: state.taskId,
        contextId: state.contextId,
        eventSeq: state.eventSeq,
      };

    case 'STREAM_ENDED':
      if (state.status !== 'streaming' && state.status !== 'executing_tool') {
        console.warn('[Bridge] Cannot STREAM_ENDED from', state.status);
        return state;
      }
      return { status: 'connected' };

    case 'ERROR':
      return {
        status: 'error',
        message: action.message,
        recoverable: action.recoverable ?? true,
      };

    case 'RESET':
      return { status: 'disconnected' };

    default:
      return state;
  }
}
```

**Definition of done**:

- [ ] File compiles without errors
- [ ] All action types are handled

---

### Task 4: Implement useBridgeStore

**Objective**: Create the Zustand store wrapper with selectors.

**Prerequisites**: Task 3

**Files to create**:

- `/packages/desktop/src/bridge/store.ts`

**Detailed steps**:

1. Create Zustand store with persist middleware
2. Implement dispatch function
3. Implement all selectors
4. Add getState() pattern for avoiding stale closures

**Code snippet**:

```typescript
// store.ts
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { bridgeReducer } from './reducer';
import type { BridgeState, BridgeAction, ConfirmationIdentity } from './types';

interface BridgeStore {
  state: BridgeState;
  dispatch: (action: BridgeAction) => void;

  // Selectors
  isConnected: () => boolean;
  isProcessing: () => boolean;
  canSendMessage: () => boolean;
  canRespond: () => boolean;
  getConfirmationIdentity: () => ConfirmationIdentity | null;
  getCurrentTaskId: () => string | null;
}

export const useBridgeStore = create<BridgeStore>()(
  persist(
    (set, get) => ({
      state: { status: 'disconnected' },

      dispatch: (action: BridgeAction) => {
        const currentState = get().state;
        const nextState = bridgeReducer(currentState, action);
        if (nextState !== currentState) {
          set({ state: nextState });
        }
      },

      isConnected: () => {
        const s = get().state;
        return (
          s.status === 'connected' ||
          s.status === 'streaming' ||
          s.status === 'awaiting_confirmation' ||
          s.status === 'executing_tool'
        );
      },

      isProcessing: () => {
        const s = get().state;
        return (
          s.status === 'sending' ||
          s.status === 'streaming' ||
          s.status === 'awaiting_confirmation' ||
          s.status === 'executing_tool'
        );
      },

      canSendMessage: () => get().state.status === 'connected',

      canRespond: () => get().state.status === 'awaiting_confirmation',

      getConfirmationIdentity: () => {
        const s = get().state;
        if (s.status === 'awaiting_confirmation') {
          return { taskId: s.taskId, callId: s.callId };
        }
        return null;
      },

      getCurrentTaskId: () => {
        const s = get().state;
        if ('taskId' in s) return s.taskId;
        return null;
      },
    }),
    {
      name: 'terminai-bridge-state',
      partialize: (store) => ({ state: store.state }),
    },
  ),
);
```

**Definition of done**:

- [ ] File compiles without errors
- [ ] Store can be imported in React component

---

### Task 5: Write reducer unit tests

**Objective**: Verify all state transitions work correctly.

**Prerequisites**: Task 3

**Files to create**:

- `/packages/desktop/src/bridge/reducer.test.ts`

**Detailed steps**:

1. Test all valid transitions
2. Test all invalid transitions (guards)
3. Test edge cases (duplicate events, etc.)

**Code snippet**:

```typescript
// reducer.test.ts
import { describe, it, expect } from 'vitest';
import { bridgeReducer } from './reducer';
import type { BridgeState, BridgeAction } from './types';

describe('bridgeReducer', () => {
  it('transitions from disconnected to connecting on CONNECT', () => {
    const state: BridgeState = { status: 'disconnected' };
    const result = bridgeReducer(state, { type: 'CONNECT' });
    expect(result.status).toBe('connecting');
  });

  it('guards against CONNECT when not disconnected', () => {
    const state: BridgeState = { status: 'connected' };
    const result = bridgeReducer(state, { type: 'CONNECT' });
    expect(result.status).toBe('connected'); // unchanged
  });

  it('stores taskId atomically with callId on CONFIRMATION_REQUIRED', () => {
    const state: BridgeState = {
      status: 'streaming',
      taskId: 'task-1',
      contextId: 'ctx-1',
      eventSeq: 0,
    };
    const result = bridgeReducer(state, {
      type: 'CONFIRMATION_REQUIRED',
      taskId: 'task-1',
      contextId: 'ctx-1',
      callId: 'call-1',
      toolName: 'run_command',
      args: {},
    });

    expect(result.status).toBe('awaiting_confirmation');
    if (result.status === 'awaiting_confirmation') {
      expect(result.taskId).toBe('task-1');
      expect(result.callId).toBe('call-1');
    }
  });

  it('preserves taskId through CONFIRMATION_SENT', () => {
    const state: BridgeState = {
      status: 'awaiting_confirmation',
      taskId: 'task-1',
      contextId: 'ctx-1',
      callId: 'call-1',
      toolName: 'run_command',
      args: {},
      eventSeq: 1,
    };
    const result = bridgeReducer(state, { type: 'CONFIRMATION_SENT' });

    expect(result.status).toBe('executing_tool');
    if (result.status === 'executing_tool') {
      expect(result.taskId).toBe('task-1');
      expect(result.callId).toBe('call-1');
    }
  });
});
```

**Definition of done**:

- [ ] All tests pass: `npm test -- packages/desktop/src/bridge/reducer.test.ts`

---

### Task 6: Create handleSseEvent function

**Objective**: Central SSE event processor that dispatches to BridgeController.

**Prerequisites**: Task 4

**Files to create**:

- `/packages/desktop/src/bridge/eventHandler.ts`

**Detailed steps**:

1. Parse SSE event kind
2. Extract taskId/contextId from event (AUTHORITATIVE)
3. Dispatch appropriate action
4. Call UI callbacks for text/tool updates

**Code snippet**:

```typescript
// eventHandler.ts
import type { BridgeAction } from './types';

interface JsonRpcResponse {
  result?: {
    taskId?: string;
    contextId?: string;
    coderAgent?: {
      kind: string;
      // ... other fields
    };
    text?: string;
    toolName?: string;
    callId?: string;
    args?: unknown;
    status?: {
      state?: string;
    };
  };
}

interface SseEventHandlerOptions {
  dispatch: (action: BridgeAction) => void;
  onText: (text: string) => void;
  onToolUpdate: (update: unknown) => void;
  onComplete?: () => void;
}

export function handleSseEvent(
  event: JsonRpcResponse,
  options: SseEventHandlerOptions,
): void {
  const { dispatch, onText, onToolUpdate, onComplete } = options;
  const result = event.result;
  if (!result) return;

  const taskId = result.taskId;
  const contextId = result.contextId;
  const kind = result.coderAgent?.kind;

  switch (kind) {
    case 'text-content':
      if (result.text) {
        onText(result.text);
      }
      break;

    case 'tool-call-confirmation':
      if (taskId && contextId && result.callId) {
        dispatch({
          type: 'CONFIRMATION_REQUIRED',
          taskId,
          contextId,
          callId: result.callId,
          toolName: result.toolName || 'unknown',
          args: result.args,
        });
      }
      break;

    case 'tool-call-update':
      onToolUpdate(result);
      break;

    case 'state-change':
      if (result.status?.state === 'input-required') {
        dispatch({ type: 'STREAM_ENDED' });
        onComplete?.();
      }
      break;
  }

  // Dispatch STREAM_STARTED on first event with taskId
  if (taskId && contextId && kind !== 'tool-call-confirmation') {
    // This is idempotent - reducer will guard if already streaming
    dispatch({ type: 'STREAM_STARTED', taskId, contextId });
  }
}
```

**Definition of done**:

- [ ] File compiles without errors
- [ ] Function handles all known event kinds

---

### Task 7: Create BridgeActions constants

**Objective**: Create action creator functions for type safety.

**Prerequisites**: Task 2

**Files to modify**:

- `/packages/desktop/src/bridge/types.ts` (add action creators)

**Detailed steps**:

1. Add action creator functions

**Code snippet**:

```typescript
// Add to types.ts

export const BridgeActions = {
  connect: (): BridgeAction => ({ type: 'CONNECT' }),
  connected: (): BridgeAction => ({ type: 'CONNECTED' }),
  disconnected: (reason?: string): BridgeAction => ({
    type: 'DISCONNECTED',
    reason,
  }),
  sendMessage: (text: string): BridgeAction => ({ type: 'SEND_MESSAGE', text }),
  streamStarted: (taskId: string, contextId: string): BridgeAction => ({
    type: 'STREAM_STARTED',
    taskId,
    contextId,
  }),
  confirmationRequired: (
    taskId: string,
    contextId: string,
    callId: string,
    toolName: string,
    args: unknown,
  ): BridgeAction => ({
    type: 'CONFIRMATION_REQUIRED',
    taskId,
    contextId,
    callId,
    toolName,
    args,
  }),
  confirmationSent: (): BridgeAction => ({ type: 'CONFIRMATION_SENT' }),
  toolCompleted: (): BridgeAction => ({ type: 'TOOL_COMPLETED' }),
  streamEnded: (): BridgeAction => ({ type: 'STREAM_ENDED' }),
  error: (message: string, recoverable?: boolean): BridgeAction => ({
    type: 'ERROR',
    message,
    recoverable,
  }),
  reset: (): BridgeAction => ({ type: 'RESET' }),
};
```

**Definition of done**:

- [ ] Action creators compile and export correctly

---

### Task 8: Write event handler tests

**Objective**: Verify SSE events dispatch correct actions.

**Prerequisites**: Task 6

**Files to create**:

- `/packages/desktop/src/bridge/eventHandler.test.ts`

**Detailed steps**:

1. Test each event kind
2. Verify taskId comes from event, not external state

**Code snippet**:

```typescript
// eventHandler.test.ts
import { describe, it, expect, vi } from 'vitest';
import { handleSseEvent } from './eventHandler';

describe('handleSseEvent', () => {
  it('dispatches CONFIRMATION_REQUIRED with taskId from event', () => {
    const dispatch = vi.fn();
    const onText = vi.fn();
    const onToolUpdate = vi.fn();

    handleSseEvent(
      {
        result: {
          taskId: 'task-from-event',
          contextId: 'ctx-1',
          coderAgent: {
            kind: 'tool-call-confirmation',
          },
          callId: 'call-1',
          toolName: 'run_command',
          args: { command: 'ls' },
        },
      },
      { dispatch, onText, onToolUpdate },
    );

    expect(dispatch).toHaveBeenCalledWith({
      type: 'CONFIRMATION_REQUIRED',
      taskId: 'task-from-event', // FROM EVENT, not stale closure
      contextId: 'ctx-1',
      callId: 'call-1',
      toolName: 'run_command',
      args: { command: 'ls' },
    });
  });
});
```

**Definition of done**:

- [ ] All tests pass

---

### Task 9: Refactor useCliProcess - sendMessage

**Objective**: Update sendMessage to use BridgeController.

**Prerequisites**: Tasks 1-8

**Files to modify**:

- `/packages/desktop/src/hooks/useCliProcess.ts`

**Detailed steps**:

1. Import useBridgeStore
2. Replace isProcessing state with store selector
3. Use dispatch for state transitions
4. Read taskId from store.getState() at call time

**Definition of done**:

- [ ] sendMessage compiles
- [ ] sendMessage dispatches SEND_MESSAGE action
- [ ] sendMessage reads taskId from store, not closure

---

### Task 10: Refactor useCliProcess - respondToConfirmation

**Objective**: Fix the stale closure bug using atomic identity.

**Prerequisites**: Task 9

**Files to modify**:

- `/packages/desktop/src/hooks/useCliProcess.ts`

**Detailed steps**:

1. Use getConfirmationIdentity() from store
2. Guard against null identity
3. Dispatch CONFIRMATION_SENT after sending

**Critical code change**:

```typescript
const respondToConfirmation = useCallback(
  async (approved: boolean, pin?: string) => {
    // CRITICAL: Read at call time, not closure time
    const identity = useBridgeStore.getState().getConfirmationIdentity();
    if (!identity) {
      console.warn('[Bridge] No pending confirmation');
      return;
    }

    const { taskId, callId } = identity; // ATOMIC - same object

    // ... send confirmation with these exact IDs

    dispatch({ type: 'CONFIRMATION_SENT' });
  },
  [dispatch], // Minimal deps - no ID dependencies!
);
```

**Definition of done**:

- [ ] respondToConfirmation uses getConfirmationIdentity()
- [ ] No `pendingConfirmationTaskId ?? activeTaskId` pattern

---

### Task 11: Refactor useCliProcess - handleJsonRpc

**Objective**: Replace handleJsonRpc with handleSseEvent.

**Prerequisites**: Task 10

**Files to modify**:

- `/packages/desktop/src/hooks/useCliProcess.ts`

**Detailed steps**:

1. Import handleSseEvent
2. Replace handleJsonRpc callback with handleSseEvent call
3. Wire dispatch, onText, onToolUpdate callbacks

**Definition of done**:

- [ ] handleSseEvent is used instead of handleJsonRpc
- [ ] All SSE events flow through BridgeController

---

### Task 12: Remove old state from executionStore

**Objective**: Clean up deprecated state.

**Prerequisites**: Task 11

**Files to modify**:

- `/packages/desktop/src/stores/executionStore.ts`

**Detailed steps**:

1. Remove `activeTaskId` field
2. Remove `pendingConfirmationTaskId` field
3. Remove setter functions
4. Remove from clearEvents()

**Definition of done**:

- [ ] No task ID state in executionStore
- [ ] TypeScript compiles clean

---

### Task 13: Integration test - full message flow

**Objective**: End-to-end test of message → response.

**Prerequisites**: Tasks 9-12

**Files to create**:

- `/packages/desktop/src/bridge/Bridge.integration.test.ts`

**Definition of done**:

- [ ] Test sends message
- [ ] Test receives SSE events
- [ ] Test ends in 'connected' state

---

### Task 14: Integration test - confirmation flow

**Objective**: End-to-end test of confirmation → tool execution.

**Prerequisites**: Task 13

**Definition of done**:

- [ ] Test receives confirmation event
- [ ] Test responds with CORRECT taskId/callId
- [ ] Test ends in 'connected' state

---

### Task 15: Manual verification checklist

**Objective**: Human verification of all flows.

**Prerequisites**: Tasks 9-14

**Verification steps**:

1. [ ] Start app: `npm run tauri dev`
2. [ ] Send message: "hello" → receive response
3. [ ] Trigger tool: "run `which node`" → see confirmation dialog
4. [ ] Approve tool → see output
5. [ ] Check logs: taskId in confirmation matches taskId in STREAM_STARTED
6. [ ] Navigate to Settings → back to Chat → send message → works
7. [ ] Rapid fire: send 3 messages in 2 seconds → all process

---

### Task 16: Cleanup dead code

**Objective**: Remove old patterns.

**Prerequisites**: Task 15 (all tests pass)

**Files to modify**:

- `/packages/desktop/src/hooks/useCliProcess.ts`

**Detailed steps**:

1. Remove unused refs (if any)
2. Remove unused imports
3. Run lint: `npm run lint`

**Definition of done**:

- [ ] No lint errors
- [ ] No dead code
