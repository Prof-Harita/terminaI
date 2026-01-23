# Phase B: Capability — Implementation Tasks

> **Spec**: [phase-b-capability-spec.md](./phase-b-capability-spec.md)  
> **Scope**: W4 (Execute/Spawn), W5 (Policy & AMSI)  
> **Prerequisite**: Phase A Infrastructure complete

---

## Security Decisions (From User Review)

> [!IMPORTANT] These decisions shape the implementation:

1. **Approvals in Hands only** — No `preApproved` field. Brain cannot bypass
   policy.
2. **Path canonicalization** — Split `canonicalizePath()` from `classifyZone()`.
   Handle symlinks, junctions, `\\?\` paths.
3. **Hard stops minimal** — Only truly irreversible: `diskpart`, `format`, `dd`,
   `vssadmin delete shadows`, `bcdedit`, credential tools.
4. **Shell mode = Level C** — Not B. Shell metacharacter interpretation is high
   risk.
5. **AMSI unavailable = Block** — Default block script execution. Or C with
   explicit "unscanned" prompt.
6. **Secrets zone = DENY** — No silent read. Allowlist if needed, still C.
7. **Test paths** — Use co-located `*.test.ts`, not `__tests__/`.

---

## Implementation Checklist

### Phase 1: Foundation

- [ ] Task 1: Add execution mode to BrokerSchema (no preApproved)
- [ ] Task 2: Create PolicyTypes.ts
- [ ] Task 3: Add path canonicalization utilities

### Phase 2: Core Logic

- [ ] Task 4: Implement BrokerPolicyEngine
- [ ] Task 5: Replace ALLOWED_COMMANDS with policy flow
- [ ] Task 6: Implement exec/shell mode execution
- [ ] Task 7: Add Hands-side approval prompting

### Phase 3: Integration

- [ ] Task 8: Expand AMSI to all script types (block if unavailable)
- [ ] Task 9: Add audit logging for policy decisions

### Phase 4: Polish

- [ ] Task 10: Implement hard stops enforcement (minimal list)
- [ ] Task 11: Add zone classification for all path types

### Phase 5: Testing

- [ ] Task 12: Unit tests for BrokerPolicyEngine
- [ ] Task 13: Integration tests for approval flow
- [ ] Task 14: Manual verification on Windows

---

## Detailed Tasks

---

### Task 1: Add execution mode to BrokerSchema

**Objective**: Add `mode` field to ExecuteRequest. **No `preApproved` field** —
approvals happen in Hands.

**Prerequisites**: None

**Files to modify**:

- `packages/cli/src/runtime/windows/BrokerSchema.ts`

**Detailed steps**:

1. Add `ExecutionModeSchema`:

```typescript
export const ExecutionModeSchema = z.enum(['exec', 'shell']);
export type ExecutionMode = z.infer<typeof ExecutionModeSchema>;
```

2. Update `ExecuteRequestSchema`:

```typescript
/**
 * Execution mode: 'exec' (direct) or 'shell' (interpreted).
 * Default: 'exec' for safety. Shell mode requires Level C approval.
 */
mode: ExecutionModeSchema.optional().default('exec'),

// NOTE: No 'preApproved' field. Approvals happen entirely in Hands.
// Brain cannot bypass policy by claiming pre-approval.
```

**Definition of done**:

- [ ] `mode` field added with default `'exec'`
- [ ] **NO** `preApproved` field
- [ ] Types exported
- [ ] Test:
      `npm run test -- packages/cli/src/runtime/windows/BrokerSchema.test.ts`

---

### Task 2: Create PolicyTypes.ts

**Objective**: Define TypeScript types for policy classification, with zone
awareness.

**Prerequisites**: None

**Files to modify**:

- `packages/cli/src/runtime/windows/PolicyTypes.ts` — **[NEW]**

**Detailed steps**:

1. Create interfaces:

```typescript
export type Zone = 'workspace' | 'userHome' | 'config' | 'system' | 'secrets' | 'unknown';
export type ApprovalLevel = 'A' | 'B' | 'C' | 'DENY';

export interface ActionClassification {
  level: ApprovalLevel;
  reason: string;
  approved: boolean;  // Only true for Level A
  prompt?: string;
  riskFactors: RiskFactor[];
}

export interface RiskFactor {
  factor: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
}

export interface ActionContext {
  command: string;
  args?: string[];
  mode: 'exec' | 'shell';
  cwd: string;
  zone: Zone;
  targetPaths?: string[];
}

export interface SafeZoneConfig { ... }
export interface HardStopConfig { ... }
```

**Definition of done**:

- [ ] All types compile
- [ ] Zone type includes all categories
- [ ] Test: `npm run build -- --filter=@terminai/cli`

---

### Task 3: Add path canonicalization utilities

**Objective**: Create utilities to properly canonicalize paths before zone
classification.

**Prerequisites**: None

**Files to modify**:

- `packages/cli/src/runtime/windows/PathUtils.ts` — **[NEW]**

**Detailed steps**:

1. Create `canonicalizePath`:

```typescript
/**
 * Canonicalize a path: resolve symlinks, junctions, normalize.
 * Handles Windows edge cases:
 * - Reparse points (junctions, symlinks)
 * - \\?\ long path prefix
 * - Drive letter case normalization
 * - .. traversal resolution
 */
export async function canonicalizePath(inputPath: string): Promise<string> {
  const absolute = path.resolve(inputPath);
  const real = await fs.realpath(absolute);
  // Normalize case on Windows
  return process.platform === 'win32' ? real.toLowerCase() : real;
}
```

2. Create `classifyZone`:

```typescript
export function classifyZone(
  canonicalPath: string,
  workspacePath: string,
): Zone {
  // Check in order of specificity
  if (isSecretPath(canonicalPath)) return 'secrets';
  if (isSystemPath(canonicalPath)) return 'system';
  if (isConfigPath(canonicalPath)) return 'config';
  if (isInWorkspace(canonicalPath, workspacePath)) return 'workspace';
  if (isUserHomePath(canonicalPath)) return 'userHome';
  return 'unknown';
}
```

3. Add path detection helpers for Windows and Unix

**Definition of done**:

- [ ] Symlinks/junctions resolved correctly
- [ ] Zone classification accurate
- [ ] Handles `\\?\` prefix, `..` traversal
- [ ] Test: `npm run test -- packages/cli/src/runtime/windows/PathUtils.test.ts`

---

### Task 4: Implement BrokerPolicyEngine

**Objective**: Create policy engine with Safe Zones and Hard Stops.

**Prerequisites**: Tasks 2, 3

**Files to modify**:

- `packages/cli/src/runtime/windows/BrokerPolicyEngine.ts` — **[NEW]**
- `packages/cli/src/runtime/windows/PolicyConfig.ts` — **[NEW]**

**Detailed steps**:

1. Create `PolicyConfig.ts` with refined defaults:

```typescript
export const DEFAULT_SAFE_ZONES: SafeZoneConfig = {
  workspace: { read: 'A', write: 'A', execute: 'A' },
  userHome: { read: 'A', write: 'B', delete: 'C' },
  config: { read: 'A', write: 'A', execute: 'B' },
  system: { read: 'B', write: 'C', execute: 'C' },
  secrets: { read: 'DENY', write: 'DENY', delete: 'DENY' }, // DENY by default
};

export const DEFAULT_HARD_STOPS: HardStopConfig = {
  patterns: [
    // Minimal, principled list (irreversible only)
    { pattern: /^diskpart/i, reason: 'Disk partitioning — irreversible' },
    { pattern: /^format\s+[a-zA-Z]:/i, reason: 'Format drive — irreversible' },
    {
      pattern: /\bdd\b.*\bof=\/dev\//i,
      reason: 'Raw disk write — irreversible',
    },
    { pattern: /vssadmin.*delete.*shadows/i, reason: 'VSS shadow deletion' },
    { pattern: /^bcdedit/i, reason: 'Boot config modification' },
    { pattern: /\bmimikatz\b/i, reason: 'Credential theft tool' },
    { pattern: /\blazagne\b/i, reason: 'Password extraction tool' },
  ],
  paths: [
    {
      path: 'C:\\Windows\\System32\\config\\SAM',
      operation: 'any',
      reason: 'SAM hive',
    },
    { path: '/etc/shadow', operation: 'any', reason: 'Password hashes' },
  ],
};
```

2. Implement `BrokerPolicyEngine.classifyAction()`:
   - Check hard stops first → DENY
   - Shell mode → add risk factor, minimum Level C
   - Classify by zone
   - Compute final level

**Definition of done**:

- [ ] Hard stops return DENY
- [ ] Shell mode = Level C minimum
- [ ] Zone classification works
- [ ] Test:
      `npm run test -- packages/cli/src/runtime/windows/BrokerPolicyEngine.test.ts`

---

### Task 5: Replace ALLOWED_COMMANDS with policy flow

**Objective**: Remove allowlist, integrate policy engine.

**Prerequisites**: Task 4

**Files to modify**:

- `packages/cli/src/runtime/windows/WindowsBrokerContext.ts`

**Detailed steps**:

1. **Remove** `ALLOWED_COMMANDS` (lines 92-109)

2. Add policy engine property and initialize

3. Refactor `handleExecute`:
   - Canonicalize paths first
   - Classify zone
   - Build ActionContext
   - Call `policyEngine.classifyAction()`
   - Handle DENY → error
   - Handle B/C → call `promptUserApproval()` (in Hands!)
   - Handle A or approved → execute

**Definition of done**:

- [ ] `ALLOWED_COMMANDS` removed
- [ ] Policy engine integrated
- [ ] Approvals happen in Hands, not via IPC
- [ ] Test: Workspace execution auto-approves

---

### Task 6: Implement exec/shell mode execution

**Objective**: Mode-based execution with shell mode at Level C.

**Prerequisites**: Task 5

**Files to modify**:

- `packages/cli/src/runtime/windows/WindowsBrokerContext.ts`

**Detailed steps**:

1. Add `executeExecMode()` — uses `shell: false`
2. Add `executeShellMode()` — uses `shell: true`
3. Shell mode triggers Level C in policy engine

**Definition of done**:

- [ ] exec mode = `shell: false`
- [ ] shell mode = `shell: true`
- [ ] shell mode requires Level C approval
- [ ] Test: `dir | findstr txt` triggers C approval

---

### Task 7: Add Hands-side approval prompting

**Objective**: Implement user approval prompts in the Hands (CLI) process.

**Prerequisites**: Task 5

**Files to modify**:

- `packages/cli/src/runtime/windows/WindowsBrokerContext.ts`
- `packages/cli/src/runtime/windows/ApprovalPrompt.ts` — **[NEW]**

**Detailed steps**:

1. Create `ApprovalPrompt.ts`:

```typescript
export interface ApprovalRequest {
  level: 'B' | 'C';
  command: string;
  args?: string[];
  mode: 'exec' | 'shell';
  prompt: string;
  riskFactors: RiskFactor[];
}

export async function promptUserApproval(
  request: ApprovalRequest,
): Promise<boolean> {
  // Display prompt to user via CLI/TUI
  // Wait for y/n response
  // Return true if approved
}
```

2. Integrate in `handleExecute` for Level B/C

**Definition of done**:

- [ ] User sees approval prompt for B/C
- [ ] Can approve or deny
- [ ] Denial stops execution
- [ ] Approval allows execution

---

### Task 8: Expand AMSI to all script types (block if unavailable)

**Objective**: AMSI for Python/Node/batch. **Block by default** if AMSI
unavailable.

**Prerequisites**: Task 5

**Files to modify**:

- `packages/cli/src/runtime/windows/WindowsBrokerContext.ts`

**Detailed steps**:

1. Add `isScriptPath()` — detect interpreters + extensions
2. Add `scanScriptWithAmsi()`:

```typescript
async scanScriptWithAmsi(command: string, args?: string[]): Promise<{
  blocked: boolean;
  reason: string;
  code: string;
}> {
  // Check if AMSI available
  if (!native?.isAmsiAvailable) {
    // BLOCK by default when AMSI unavailable
    return {
      blocked: true,
      reason: 'Script execution blocked: AMSI unavailable for malware scanning',
      code: 'AMSI_UNAVAILABLE',
    };
  }

  // Extract and scan script content
  // ...
}
```

**Definition of done**:

- [ ] Python/Node/batch scripts scanned
- [ ] AMSI unavailable → blocked (not warn+proceed)
- [ ] AMSI detection → blocked
- [ ] Test: EICAR in Python script blocked

---

### Task 9: Add audit logging for policy decisions

**Objective**: Log all policy decisions including zone and risk factors.

**Prerequisites**: Task 5

**Files to modify**:

- `packages/cli/src/runtime/windows/WindowsBrokerContext.ts`

**Detailed steps**:

1. Log after execution:

```typescript
await this.audit.log({
  type: 'execute',
  command,
  mode,
  zone,
  classification: level,
  riskFactors,
});
```

2. Log denials:

```typescript
await this.audit.log({
  type: 'execute_denied',
  command,
  reason,
  level,
  zone,
});
```

**Definition of done**:

- [ ] All executions logged with zone
- [ ] All denials logged with reason
- [ ] Risk factors included

---

### Task 10: Implement hard stops enforcement (minimal list)

**Objective**: Verify hard stops use the minimal, principled list.

**Prerequisites**: Task 4

**Files to modify**:

- `packages/cli/src/runtime/windows/BrokerPolicyEngine.ts`

**Detailed steps**:

1. Verify hard stops checked first in `classifyAction()`
2. Verify minimal list (no `rm -rf /` — that's Level C, not DENY)
3. Verify DENY cannot be bypassed by any means

**Definition of done**:

- [ ] `diskpart` → DENY
- [ ] `format C:` → DENY
- [ ] `mimikatz` → DENY
- [ ] `rm -rf /` → Level C (NOT DENY — it's scary but recoverable)
- [ ] Test: Hard stops return DENY

---

### Task 11: Add zone classification for all path types

**Objective**: Complete zone detection for Windows and Unix paths.

**Prerequisites**: Task 3

**Files to modify**:

- `packages/cli/src/runtime/windows/PathUtils.ts`

**Detailed steps**:

1. Add Windows path detection:

```typescript
function isSecretPath(p: string): boolean {
  const secrets = [
    '%userprofile%\\.ssh',
    '%userprofile%\\.gnupg',
    '%userprofile%\\.aws',
    '~/.ssh',
    '~/.gnupg',
    '~/.aws',
  ];
  return secrets.some((s) => p.startsWith(expandEnv(s).toLowerCase()));
}

function isSystemPath(p: string): boolean {
  const system = ['c:\\windows', 'c:\\program files', '/etc', '/usr', '/var'];
  return system.some((s) => p.startsWith(s.toLowerCase()));
}
```

2. Handle environment variable expansion

**Definition of done**:

- [ ] Secrets detection works on Windows and Unix
- [ ] System path detection works
- [ ] User home detection works
- [ ] Test: Zone classification for each type

---

### Task 12: Unit tests for BrokerPolicyEngine

**Objective**: Comprehensive unit tests.

**Prerequisites**: Task 4

**Files to modify**:

- `packages/cli/src/runtime/windows/BrokerPolicyEngine.test.ts` — **[NEW]**

**Detailed steps**:

```typescript
describe('BrokerPolicyEngine', () => {
  describe('Safe Zones', () => {
    it('returns Level A for workspace execute');
    it('returns Level C for system write'); // Changed from DENY
    it('returns DENY for secrets read'); // Changed from C
  });

  describe('Hard Stops (minimal)', () => {
    it('denies diskpart');
    it('denies format drive');
    it('denies bcdedit');
    it('denies credential theft tools');
    // rm -rf / is NOT here — it's Level C
  });

  describe('Shell Mode', () => {
    it('requires Level C for shell mode'); // Not B
  });
});
```

**Definition of done**:

- [ ] All tests pass
- [ ] Cover all zones
- [ ] Cover minimal hard stops
- [ ] Cover shell mode = C

---

### Task 13: Integration tests for approval flow

**Objective**: Test Hands-side approval flow.

**Prerequisites**: Task 7

**Files to modify**:

- `packages/cli/src/runtime/windows/ApprovalFlow.test.ts` — **[NEW]**
  (co-located)

**Detailed steps**:

```typescript
describe('Hands-side Approval Flow', () => {
  it('auto-approves Level A in workspace');
  it('prompts for Level B in user home');
  it('prompts for Level C for shell mode');
  it('executes after approval');
  it('blocks after denial');
  it('cannot bypass via IPC — no preApproved');
});
```

**Definition of done**:

- [ ] Approval flow tested
- [ ] No bypass via IPC
- [ ] Uses co-located test convention

---

### Task 14: Manual verification on Windows

**Objective**: Verify complete implementation on real Windows.

**Prerequisites**: All previous tasks

**Detailed steps**:

| Test                                  | Expected           |
| ------------------------------------- | ------------------ |
| `echo hello` (exec, workspace)        | Auto-approve (A)   |
| `dir \| findstr txt` (shell)          | Level C prompt     |
| Approve shell command                 | Executes           |
| `python script.py` with EICAR         | AMSI blocks        |
| `python script.py` (AMSI unavailable) | Blocked            |
| `diskpart`                            | Hard stop DENY     |
| `rm -rf /tmp/test`                    | Level C (not DENY) |
| Read `~/.ssh/id_rsa`                  | DENY               |

**Definition of done**:

- [ ] All tests pass
- [ ] No regressions from Phase A
- [ ] Secrets zone = DENY verified
- [ ] Shell mode = C verified
- [ ] AMSI unavailable = blocked verified
