# Unfuckup Desktop App: Hyperdetailed Task List

**Date**: 2025-12-31  
**Priority**: CRITICAL - Desktop is functionally broken  
**Total Issues**: 25 (17 A2A regressions + 8 Desktop issues)

---

## Phase 0: Immediate Revert (30 min)

### Task 0.1: Revert A2A Config to Pre-Refactor State

**Priority**: P0 - BLOCKING  
**Assignee**: Agent  
**Files**: `packages/a2a-server/src/config/config.ts`

**Context**: The ConfigBuilder refactor deleted 17 pieces of functionality.

**Steps**:

1. Run:
   `git show 01705a92:packages/a2a-server/src/config/config.ts > /tmp/old_config.ts`
2. Compare with current:
   `diff /tmp/old_config.ts packages/a2a-server/src/config/config.ts`
3. Restore the old `loadConfig()` function with:
   - `loadServerHierarchicalMemory()` call
   - `userMemory` and `geminiMdFileCount` assignment
   - All `configParams` fields (14+)
4. Keep the G-2 fix: Remove `override: true` from `dotenv.config()`
5. Keep the G-7 fix in `app.ts`: TERMINAI env var alias for CORS
6. Build: `npm run build -w @terminai/a2a-server`
7. Test: `npm test -w @terminai/a2a-server -- --run`

**Acceptance Criteria**:

- [ ] `loadServerHierarchicalMemory()` is called
- [ ] `userMemory` is passed to Config
- [ ] `geminiMdFileCount` is passed to Config
- [ ] All 78 A2A tests pass
- [ ] Desktop can answer "what markdown apps do I have" correctly

---

## Phase 1: Conversation Context Persistence (Critical)

### Task 1.1: Add Persistent taskId to Bridge Store

**Priority**: P0 - CRITICAL  
**Severity**: BM-1 from GPT analysis  
**Files**:

- `packages/desktop/src/bridge/store.ts`
- `packages/desktop/src/bridge/reducer.ts`
- `packages/desktop/src/bridge/types.ts`

**Context**: Desktop loses `taskId` when stream ends, causing each message to
start a new conversation.

**Root Cause**: `STREAM_ENDED` action returns `{ status: 'connected' }` without
preserving `taskId`.

**Steps**:

1. **Add `currentConversationId` to BridgeStore** (`store.ts`):

   ```typescript
   interface BridgeStoreState {
     bridgeState: BridgeState;
     currentConversationId: string | null; // ADD THIS
   }

   const initialState: BridgeStoreState = {
     bridgeState: { status: 'disconnected' },
     currentConversationId: null, // ADD THIS
   };
   ```

2. **Update reducer** (`reducer.ts`):

   ```typescript
   case 'STREAM_STARTED':
     // Store the taskId as currentConversationId
     newState.currentConversationId = action.payload.taskId;
     break;

   case 'STREAM_ENDED':
     // DO NOT clear currentConversationId here
     return { ...state, bridgeState: { status: 'connected' } };
   ```

3. **Add explicit clear action** (`reducer.ts`):

   ```typescript
   case 'CLEAR_CONVERSATION':
     newState.currentConversationId = null;
     break;
   ```

4. **Add action creator** (`actions.ts`):

   ```typescript
   export const clearConversation = () => ({
     type: 'CLEAR_CONVERSATION' as const,
   });
   ```

5. **Update `getCurrentTaskId()` selector** (`store.ts`):
   ```typescript
   getCurrentTaskId: () => {
     const state = get();
     // Prefer persistent conversationId over transient taskId
     return state.currentConversationId
       || ('taskId' in state.bridgeState ? state.bridgeState.taskId : null);
   },
   ```

**Acceptance Criteria**:

- [ ] `currentConversationId` survives `STREAM_ENDED`
- [ ] Only cleared on explicit "New Conversation" or `/clear`
- [ ] Follow-up messages include `taskId`
- [ ] Test: Ask question → Ask follow-up → Context is preserved

---

### Task 1.2: Update sendMessage to Always Include taskId

**Priority**: P0 - CRITICAL  
**Files**: `packages/desktop/src/hooks/useCliProcess.ts`

**Context**: `sendMessage()` only includes `taskId` if currentTaskId is truthy.

**Current Code**:

```typescript
...(currentTaskId ? { taskId: currentTaskId } : {}),
```

**Fix**:

```typescript
// Always include taskId if we have a conversation
const taskId =
  bridgeStore.getState().currentConversationId ||
  bridgeStore.getState().getCurrentTaskId();

const messagePayload = {
  ...commonFields,
  taskId, // Always include (can be null for new conversations)
};
```

**Acceptance Criteria**:

- [ ] Every message after the first includes `taskId`
- [ ] A2A server logs show same `taskId` across turns

---

### Task 1.3: Fix Premature Stream End on state-change

**Priority**: P1 - HIGH  
**Severity**: BM-3 from GPT analysis  
**Files**: `packages/desktop/src/bridge/eventHandler.ts`

**Context**: `state-change` event triggers `streamEnded()` but it's not always
end-of-turn.

**Current Code**:

```typescript
case 'state-change':
  dispatch(BridgeActions.streamEnded());
```

**Fix**:

```typescript
case 'state-change':
  // Only end stream on terminal states
  const terminalStates = ['completed', 'canceled', 'failed', 'input-required'];
  const stateValue = event.state || event.payload?.state;
  if (terminalStates.includes(stateValue)) {
    dispatch(BridgeActions.streamEnded());
  }
  // Otherwise, treat as advisory - don't end stream
  break;
```

**Or use the `final` flag**:

```typescript
case 'status-update':
  // ... existing handling ...
  if (event.final === true) {
    dispatch(BridgeActions.streamEnded());
  }
  break;
```

**Acceptance Criteria**:

- [ ] Stream only ends on `final: true` or terminal states
- [ ] Intermediate `state-change` events don't kill the stream

---

## Phase 2: A2A Config Restoration (High)

### Task 2.1: Restore Memory Loading

**Priority**: P0 - CRITICAL  
**Files**: `packages/a2a-server/src/config/config.ts`

**What Was Deleted**:

```typescript
import {
  loadServerHierarchicalMemory,
  FileDiscoveryService,
} from '@terminai/core';

const fileService = new FileDiscoveryService(workspaceDir);
const { memoryContent, fileCount } = await loadServerHierarchicalMemory(
  workspaceDir,
  [],
  configParams.debugMode ?? false,
  fileService,
  extensionLoader,
  settings.folderTrust === true,
  'tree',
  undefined,
  200,
);
configParams.userMemory = memoryContent;
configParams.geminiMdFileCount = fileCount;
```

**Fix**: Add this back BEFORE `new Config(configParams)`.

**Acceptance Criteria**:

- [ ] `terminai.md` files are loaded
- [ ] Agent has workspace context
- [ ] Desktop correctly answers workspace-specific questions

---

### Task 2.2: Restore All Deleted ConfigParameters

**Priority**: P0 - CRITICAL  
**Files**: `packages/a2a-server/src/config/config.ts`

**Deleted Parameters to Restore**:

| Parameter         | Old Code                                          | Status  |
| ----------------- | ------------------------------------------------- | ------- | ---------- | ------- |
| `coreTools`       | `settings.coreTools                               |         | undefined` | RESTORE |
| `excludeTools`    | `settings.excludeTools                            |         | undefined` | RESTORE |
| `showMemoryUsage` | `settings.showMemoryUsage                         |         | false`     | RESTORE |
| `mcpServers`      | `settings.mcpServers`                             | RESTORE |
| `telemetry`       | Full telemetry object                             | RESTORE |
| `fileFiltering`   | `{ respectGitIgnore, enableRecursiveFileSearch }` | RESTORE |
| `embeddingModel`  | `DEFAULT_GEMINI_EMBEDDING_MODEL`                  | RESTORE |
| `debugMode`       | `process.env['DEBUG'] === 'true'                  |         | false`     | RESTORE |
| `question`        | `''`                                              | RESTORE |
| `sandbox`         | `undefined`                                       | RESTORE |
| `checkpointing`   | From env or settings                              | RESTORE |
| `previewFeatures` | `settings.general?.previewFeatures`               | RESTORE |

**Acceptance Criteria**:

- [ ] All 14+ ConfigParameters are set
- [ ] No functionality lost from pre-refactor

---

### Task 2.3: Use LoadedSettings Correctly

**Priority**: P1 - HIGH  
**Files**: `packages/a2a-server/src/config/config.ts`

**Problem**: `loadedSettings` parameter is passed but never used.

**Fix**:

```typescript
export async function loadConfig(
  loadedSettings: LoadedSettings,
  ...
) {
  const settings = loadedSettings.merged;  // USE THIS

  const configParams: ConfigParameters = {
    coreTools: settings.tools?.core,
    excludeTools: settings.tools?.exclude,
    // ... use settings.xxx everywhere
  };
}
```

**Do NOT use ConfigBuilder** - it reloads settings internally.

**Acceptance Criteria**:

- [ ] `loadedSettings.merged` is used for all settings access
- [ ] Settings are NOT loaded twice

---

## Phase 3: Desktop UI Fixes (Medium)

### Task 3.1: Wire Session Restore

**Priority**: P2 - MEDIUM  
**Severity**: BM-2 from GPT analysis  
**Files**: `packages/desktop/src/components/SidePanel.tsx`

**Current Code**:

```typescript
console.log('[TODO] Session restore:', id);
```

**Fix**:

```typescript
const handleSessionRestore = async (sessionId: string) => {
  // Set the conversation ID in bridge store
  bridgeStore.getState().dispatch({
    type: 'SET_CONVERSATION_ID',
    payload: sessionId,
  });

  // Optionally fetch history from backend
  await executeCommand('restore', [sessionId]);

  // Clear input and focus
  setInput('');
  inputRef.current?.focus();
};
```

**Acceptance Criteria**:

- [ ] Clicking session in history restores that conversation
- [ ] Subsequent messages include the restored `taskId`

---

### Task 3.2: Stop Using 'default' as Session ID

**Priority**: P2 - MEDIUM  
**Files**: `packages/desktop/src/hooks/useCliProcess.ts`

**Current Code**:

```typescript
const tid = currentTaskId || 'default';
```

**Fix**:

```typescript
// Don't record history until we have a real taskId
if (!currentTaskId) {
  return; // Or use a pending state
}
const tid = currentTaskId;
```

**Acceptance Criteria**:

- [ ] No 'default' entries in history
- [ ] History only shows real conversations

---

### Task 3.3: Fix Connectivity Indicator Truth

**Priority**: P3 - LOW  
**Severity**: BM-4 from GPT analysis  
**Files**: `packages/desktop/src/components/ConnectivityIndicator.tsx`

**Current Code**:

```typescript
isConnected = !!agentToken;
```

**Fix**:

```typescript
const bridgeStatus = useBridgeStore((s) => s.bridgeState.status);
const sidecarStatus = useSidecarStore((s) => s.bootStatus);

const isConnected =
  bridgeStatus === 'connected' && sidecarStatus === 'ready' && !!agentToken;
```

**Acceptance Criteria**:

- [ ] "Connected" only shows when backend is actually reachable
- [ ] Status updates in real-time

---

### Task 3.4: Fix API Key Banner Copy

**Priority**: P3 - LOW  
**Severity**: BM-5 from GPT analysis  
**Files**: `packages/desktop/src/components/ChatView.tsx`

**Current Copy**: "Gemini API Key Required"

**Correct Copy**: "Agent Token Required" or "Connect to Backend"

**Fix**:

```typescript
{!agentToken && (
  <Banner type="warning">
    Connect to a backend server to start chatting.
    <Link to="/settings">Configure Connection</Link>
  </Banner>
)}
```

**Acceptance Criteria**:

- [ ] Banner text is accurate
- [ ] Links to correct setup flow

---

## Phase 4: Settings Sync (Low)

### Task 4.1: Add Settings Sync Acknowledgment

**Priority**: P3 - LOW  
**Severity**: BM-7 from GPT analysis  
**Files**: `packages/desktop/src/stores/settingsStore.ts`

**Current Code**: `syncToCli()` fires and forgets.

**Fix**:

```typescript
syncToCli: async (key: string, value: unknown) => {
  const response = await executeCommand('config', ['set', key, JSON.stringify(value)]);

  if (response.error) {
    console.error('Settings sync failed:', response.error);
    // Optionally show toast
    return false;
  }

  // Verify by querying
  const verification = await executeCommand('config', ['get', key]);
  if (verification.value !== value) {
    console.warn('Settings sync mismatch');
  }

  return true;
},
```

**Acceptance Criteria**:

- [ ] Settings sync has success/failure feedback
- [ ] UI can show sync status

---

## Phase 5: Verification

### Task 5.1: E2E Parity Test

**Priority**: P0 - Must do before declaring "fixed"  
**Type**: Manual test

**Steps**:

1. Start CLI: `cd ~/Code/terminaI && npm run start:cli`
2. Start Desktop: `cd packages/desktop && npm run tauri dev`
3. Ask both: "what apps do i have on my computer for viewing markdown files?"
4. Compare answers - should be equivalent
5. Ask follow-up: "are all of the above installed?"
6. CLI should reference prior answer
7. Desktop should reference prior answer

**Acceptance Criteria**:

- [ ] Both give similar answers
- [ ] Both maintain conversation context
- [ ] Desktop follow-up doesn't go off-topic

---

### Task 5.2: Add Automated Parity Test

**Priority**: P2 - Should add to CI  
**Files**: `packages/a2a-server/src/__tests__/parity.e2e.test.ts` (NEW)

**Test Spec**:

```typescript
describe('CLI-Desktop Parity', () => {
  it('loads workspace memory', async () => {
    // Create temp workspace with terminai.md
    // Start A2A server
    // Verify config.userMemory is set
  });

  it('maintains conversation context', async () => {
    // Send message 1
    // Get taskId from response
    // Send message 2 with same taskId
    // Verify message 2 references message 1 context
  });
});
```

**Acceptance Criteria**:

- [ ] Test exists
- [ ] Test runs in CI
- [ ] Test catches context loss regressions

---

## Summary Checklist

### Phase 0: Immediate (Today)

- [x] Task 0.1: Revert A2A config ✅ Commit 4fda3d0c

### Phase 1: Critical (Today/Tomorrow)

- [x] Task 1.1: Add persistent taskId to Bridge Store ✅
- [x] Task 1.2: Update sendMessage to include taskId ✅
- [x] Task 1.3: Fix premature stream end ✅

### Phase 2: A2A Restoration (Today)

- [x] Task 2.1: Restore memory loading ✅ (Part of 0.1)
- [x] Task 2.2: Restore all ConfigParameters ✅ (Part of 0.1)
- [x] Task 2.3: Use LoadedSettings correctly ✅ (Part of 0.1)

### Phase 3: UI Fixes (This Week)

- [ ] Task 3.1: Wire session restore
- [x] Task 3.2: Stop using 'default' session ID ✅
- [ ] Task 3.3: Fix connectivity indicator
- [ ] Task 3.4: Fix API key banner copy

### Phase 4: Polish (This Week)

- [ ] Task 4.1: Settings sync acknowledgment

### Phase 5: Verification (Before Declaring Fixed)

- [ ] Task 5.1: Manual E2E parity test ← **USER SHOULD DO THIS**
- [ ] Task 5.2: Automated parity test

---

## Files Modified Summary

| File                                                        | Changes                                        |
| ----------------------------------------------------------- | ---------------------------------------------- |
| `packages/a2a-server/src/config/config.ts`                  | Revert to pre-refactor, keep G-2 and G-7 fixes |
| `packages/desktop/src/bridge/store.ts`                      | Add `currentConversationId`                    |
| `packages/desktop/src/bridge/reducer.ts`                    | Preserve taskId on stream end                  |
| `packages/desktop/src/bridge/eventHandler.ts`               | Fix premature stream end                       |
| `packages/desktop/src/hooks/useCliProcess.ts`               | Always include taskId                          |
| `packages/desktop/src/components/SidePanel.tsx`             | Wire session restore                           |
| `packages/desktop/src/components/ConnectivityIndicator.tsx` | Fix truth                                      |
| `packages/desktop/src/components/ChatView.tsx`              | Fix banner copy                                |
| `packages/desktop/src/stores/settingsStore.ts`              | Add sync ack                                   |

**Total: 9 files, 13 tasks, ~4-6 hours of work**
