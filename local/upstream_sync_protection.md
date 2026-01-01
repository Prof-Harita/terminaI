# Upstream Sync: Settings Refactor Protection

## The Risk

After this refactor, `packages/cli/src/config/settings.ts` and related files
will be **significantly changed**:

| File                                  | Impact                                  |
| ------------------------------------- | --------------------------------------- |
| `packages/cli/src/config/settings.ts` | Most logic **moved to `packages/core`** |
| `packages/cli/src/config/config.ts`   | Changed to call core builder            |
| `packages/core/src/config/settings/*` | **NEW modules created** (5-7 files)     |

If Google's Gemini CLI updates `settings.ts` or `config.ts` after our refactor,
Jules must:

1. **Recognize the FORK divergence**
2. **Reimplement intent into Core, not CLI**
3. **Not accidentally revert our refactor**

---

## Required Updates

### 1. Update FORK_ZONES.md

Add these files to the **FORK zone**:

```markdown
## FORK (reimplement from intent)

| File                                            | Our Divergence                                               |
| ----------------------------------------------- | ------------------------------------------------------------ |
| `packages/cli/src/config/settings.ts`           | Thin wrapper; logic in `packages/core/src/config/settings/*` |
| `packages/cli/src/config/config.ts`             | Calls shared `buildConfigFromLoadedSettings` from core       |
| `packages/core/src/config/settings/loader.ts`   | **NEW**: Unified settings loader (extracted from CLI)        |
| `packages/core/src/config/settings/schema.ts`   | **NEW**: Schema + merge strategies                           |
| `packages/core/src/config/settings/migrate.ts`  | **NEW**: V1→V2 migration                                     |
| `packages/core/src/config/settings/validate.ts` | **NEW**: Zod validation                                      |
| `packages/core/src/config/settings/trust.ts`    | **NEW**: Trust + .env loading                                |
| `packages/core/src/config/builder.ts`           | **NEW**: Config construction from LoadedSettings             |
| `packages/a2a-server/src/config/settings.ts`    | Re-exports from core                                         |
| `packages/a2a-server/src/config/config.ts`      | Calls shared loader/builder                                  |
```

**Reason**: "TerminaI unified CLI and A2A config loading by extracting shared
logic to Core (CLI ↔ Desktop parity refactor, 2025-12-31)"

---

### 2. Add Specific Sync Instructions to Documentation

Create `docs-terminai/upstream_sync_settings.md`:

````markdown
# Upstream Sync: Settings/Config Changes

## Context

On 2025-12-31, we refactored settings/config loading to achieve CLI ↔ Desktop
parity.

**What changed:**

- CLI's 878-line `settings.ts` was split into
  `packages/core/src/config/settings/*`
- CLI now calls shared modules from Core
- A2A server now uses the same shared modules

**Implication:** If upstream modifies `packages/cli/src/config/settings.ts` or
`config.ts`, you must apply the change to `packages/core/src/config/settings/*`
instead.

---

## How to Sync Settings/Config Changes

### Step 1: Identify the upstream intent

Read the upstream diff. Common scenarios:

| Upstream Change       | Our Action                                 |
| --------------------- | ------------------------------------------ |
| New setting field     | Add to Core's Settings type + schema       |
| New merge strategy    | Add to `schema.ts` getMergeStrategyForPath |
| Trust behavior change | Update `trust.ts`                          |
| Migration logic       | Update `migrate.ts`                        |
| Validation change     | Update `validate.ts`                       |

### Step 2: Apply to Core modules

**Example**: Upstream adds a new `security.autoUpdate` setting:

Upstream diff:

```diff
// packages/cli/src/config/settings.ts
+ security: {
+   autoUpdate?: boolean;
+ }
```
````

Our equivalent:

```diff
// packages/core/src/config/settings/types.ts (or wherever Settings is defined)
+ security: {
+   autoUpdate?: boolean;
+ }
```

### Step 3: Test parity

```bash
# CLI must still work
npm test -w @terminai/cli

# A2A must still work
npm test -w @terminai/a2a-server

# Parity test must pass
npm test -w @terminai/core -- parity.test.ts
```

---

## Red Flags (DO NOT DO THIS)

❌ **Merge upstream settings.ts directly into CLI** → This will revert the
refactor and break A2A parity

❌ **Ignore settings.ts changes because "we refactored"** → Must reimplement the
intent in Core

✅ **Extract intent, apply to Core modules**

````

---

### 3. Update B-sync-review.md Workflow

Add a specific check for settings/config changes:

```markdown
// In .agent/workflows/B-sync-review.md, add after step 3:

3.5. **CRITICAL: Settings/Config Refactor Check**

   If the PR touches any of these files:
   - `packages/cli/src/config/settings.ts`
   - `packages/cli/src/config/config.ts`
   - `packages/core/src/config/settings/*`

   Verify Jules reimplemented the intent in Core, not reverted the refactor:

   ```bash
   # CLI settings.ts should remain thin (< 100 lines)
   wc -l packages/cli/src/config/settings.ts

   # Core modules should exist
   ls packages/core/src/config/settings/
````

If logic was moved **back to CLI**, reject and ask Jules to fix.

````

---

### 4. Add Automated Guard (CI Check)

Create `.github/workflows/parity-guard.yml`:

```yaml
name: Settings Parity Guard

on:
  pull_request:
    paths:
      - 'packages/cli/src/config/settings.ts'
      - 'packages/cli/src/config/config.ts'
      - 'packages/core/src/config/settings/**'
      - 'packages/a2a-server/src/config/**'

jobs:
  verify-parity:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Check CLI settings.ts is thin
        run: |
          LINES=$(wc -l < packages/cli/src/config/settings.ts)
          if [ $LINES -gt 150 ]; then
            echo "❌ CLI settings.ts has $LINES lines (max 150)"
            echo "Settings logic should be in packages/core/src/config/settings/*"
            exit 1
          fi
          echo "✅ CLI settings.ts is thin ($LINES lines)"

      - name: Check Core modules exist
        run: |
          if [ ! -f "packages/core/src/config/settings/loader.ts" ]; then
            echo "❌ Core settings loader missing"
            exit 1
          fi
          echo "✅ Core settings modules intact"

      - name: Run parity tests
        run: |
          npm ci
          npm test -w @terminai/core -- parity.test.ts
````

---

### 5. Pre-Merge Reminder (For This PR)

After completing the refactor (Phase 5), **before merging**, do:

1. Update `docs-terminai/FORK_ZONES.md` with all 10 files listed above
2. Create `docs-terminai/upstream_sync_settings.md`
3. Update `.agent/workflows/B-sync-review.md`
4. Add `.github/workflows/parity-guard.yml`
5. Commit these 4 documentation updates with the refactor PR

---

## Summary: 4 Layers of Protection

| Layer                            | Mechanism                               | Catches                             |
| -------------------------------- | --------------------------------------- | ----------------------------------- |
| **1. FORK_ZONES.md**             | Jules knows these files diverged        | Naive cherry-picks                  |
| **2. upstream_sync_settings.md** | Explicit instructions for this refactor | Confusion on where to apply changes |
| **3. B-sync-review workflow**    | Human checklist for settings changes    | Jules mistakes                      |
| **4. CI parity-guard**           | Automated verification                  | CLI bloat regression                |

This ensures Jules (and any future maintainer) **cannot accidentally undo the
refactor**.
