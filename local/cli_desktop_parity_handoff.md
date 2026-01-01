# CLI ↔ Desktop Parity: Execution Handoff

## CRITICAL: READ THIS BEFORE DOING ANYTHING

You are being handed a **high-stakes refactoring task** with significant risk of
breaking the CLI (which is currently rock-solid). The user has spent **3+ days**
debugging intermittent failures and is at the end of their patience.

**Your mandate:**

1. **Follow the task list EXACTLY** — do not improvise
2. **Complete each phase gate** before moving to the next
3. **If you break CLI tests, STOP** — do not proceed
4. **Document every decision** — the user will review

---

## Background Context

### The Product

**TerminaI** is a fork of Google's Gemini CLI with a Desktop App (Tauri +
React). The CLI works perfectly. The Desktop App has been plagued by behavioral
divergence from CLI.

### The Problem

The Desktop App's agent gives **different results** than the CLI for the same
queries:

- Different files found
- Lost context ("which file are you referring to?")
- Tool calls not visible in UI
- Agent sometimes explores directories unprompted

### Previous Debugging Sessions (Last 3 Days)

1. **Bridge FSM refactor** — Implemented state machine for SSE event handling
2. **Config alignment** — Aligned `loadServerHierarchicalMemory` parameters
3. **Model defaults** — Fixed to use `gemini-3-pro-preview`
4. **Workspace path** — Fixed `/tmp` default to use actual CWD
5. **SSE event parsing** — Fixed `status-update` and `artifact-update` handling
6. **Bridge reducer** — Fixed `STREAM_ENDED` to accept `sending` state

### What Was Fixed Today

| Fix                   | Files Changed                                  |
| --------------------- | ---------------------------------------------- |
| Memory loading params | `packages/a2a-server/src/config/config.ts`     |
| Model defaults        | `packages/core/src/config/models.ts`           |
| Bridge FSM bug        | `packages/desktop/src/bridge/reducer.ts`       |
| Workspace path        | `packages/a2a-server/src/config/config.ts`     |
| SSE event parsing     | `packages/desktop/src/bridge/eventHandler.ts`  |
| Test lint cleanup     | `packages/desktop/src/bridge/*.test.ts`        |
| Settings defaults     | `packages/desktop/src/stores/settingsStore.ts` |

### What Remains (This Task)

The settings/config loading differs massively between CLI and A2A server:

| Aspect         | CLI                               | A2A Server          |
| -------------- | --------------------------------- | ------------------- |
| Scopes         | 4 (systemDefaults/system/user/ws) | 2 (user/workspace)  |
| Migration      | V1→V2 with file backup            | None                |
| Validation     | Zod schema                        | None                |
| .env Loading   | Trust-gated                       | Simple substitution |
| Merge Strategy | Custom deep merge with strategies | Shallow spread      |

This causes subtle "same input, different output" bugs.

---

## Your Task

Execute the 22 tasks in 5 phases as documented in:

```
local/cli_desktop_parity_tasks.md
```

Architecture reference:

```
local/cli_desktop_parity_architecture.md
```

---

## Phase Gates (DO NOT SKIP)

### After Phase 0

- [ ] 10 golden CLI snapshots exist
- [ ] Dependency audit documented
- [ ] Upstream diff assessed

### After Phase 1.5

- [ ] Core parity test passes (same merged settings)
- [ ] Core builds without CLI imports

### After Phase 3

- [ ] ALL existing CLI tests pass
- [ ] Golden snapshots unchanged

### After Phase 3.5

- [ ] Desktop works with `USE_UNIFIED_SETTINGS=1`

### After Phase 5

- [ ] Same query gives same response in CLI and Desktop
- [ ] Tool calls visible in both
- [ ] Context retained across turns

---

## Commands to Know

```bash
# Build core
npm run build -w @terminai/core

# Build CLI
npm run build -w @terminai/cli

# Build A2A server
npm run build -w @terminai/a2a-server

# Run CLI tests
npm test -w @terminai/cli

# Run A2A tests
npm test -w @terminai/a2a-server

# Start A2A server (for Desktop)
GEMINI_WEB_REMOTE_TOKEN=test-token npm run start:a2a-server

# Start Desktop dev
cd packages/desktop && npm run dev
```

---

## Risk Mitigation Reminder

| Risk                    | Task That Covers It |
| ----------------------- | ------------------- |
| CLI regression          | 0.1, 1.8, 10, 11    |
| Hidden dependencies     | 0.2                 |
| Upstream sync conflicts | 0.3                 |
| Circular deps           | 1.9                 |
| Safe A2A rollout        | 11.5                |

---

## What Success Looks Like

After completing all tasks:

1. User asks CLI: `find me the most recent docx`
2. User asks Desktop: `find me the most recent docx`
3. **Both find the SAME file**
4. User asks: `convert it to pdf`
5. **Both understand context and proceed**

If there is ANY divergence, the mission is incomplete.

---

## Files to Reference

| File                                         | Purpose             |
| -------------------------------------------- | ------------------- |
| `local/cli_desktop_parity_architecture.md`   | Architecture spec   |
| `local/cli_desktop_parity_tasks.md`          | Task checklist      |
| `packages/cli/src/config/settings.ts`        | CLI settings (878L) |
| `packages/a2a-server/src/config/settings.ts` | A2A settings (166L) |
| `packages/cli/src/config/config.ts`          | CLI loadCliConfig   |
| `packages/a2a-server/src/config/config.ts`   | A2A loadConfig      |

---

## Start Here

```bash
# Read the task list
cat local/cli_desktop_parity_tasks.md

# Start with Task 0.1: Create CLI behavior snapshots
```

Good luck. Follow the spec. Don't break CLI.
