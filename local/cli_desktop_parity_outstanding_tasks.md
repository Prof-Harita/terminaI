# CLI ↔ Desktop Parity: Outstanding Tasks

> **Review Date**: 2025-12-31 **Scope**: Post-implementation review of tasks in
> `cli_desktop_parity_tasks.md`

---

## Executive Summary

The CLI-Desktop parity implementation completed the **structural foundation**
but has a **critical blocking bug**: the `SettingsLoader.load()` method returns
empty stub files instead of actually loading settings from disk. This means the
entire parity goal (same settings → same behavior) is **not yet achieved**.

### Test Status

| Package    | Passed | Failed | Notes                                  |
| ---------- | ------ | ------ | -------------------------------------- |
| Core       | 229    | 5      | Unrelated fallback/compression tests   |
| A2A Server | 72     | 6      | Settings test file path issues         |
| CLI        | 3495   | 58     | Mix of settings + model fallback tests |

---

## Requirement Traceability Matrix

| Task                         | Requirement                 | File/Evidence                                          | Status       | Notes                                    |
| ---------------------------- | --------------------------- | ------------------------------------------------------ | ------------ | ---------------------------------------- |
| **Phase 0: Pre-Flight**      |
| 0.1                          | 10 golden snapshots exist   | `packages/cli/test/fixtures/settings-snapshots/*.json` | ⚠️ Partial   | 10 snapshots exist, but only 8 scenarios |
| 0.1                          | Regeneration script exists  | `scripts/run-parity-snapshots.sh`                      | ✅ Complete  |                                          |
| 0.1                          | Snapshot comparison test    | —                                                      | ❌ Missing   | No automated test comparing snapshots    |
| 0.2                          | Dependency audit documented | —                                                      | ❌ Missing   | No documentation found                   |
| 0.3                          | Upstream diff documented    | —                                                      | ❌ Missing   | No documentation found                   |
| **Phase 1: Foundation**      |
| 1                            | Settings types module       | `packages/core/src/config/settings/types.ts`           | ✅ Complete  | 175 lines                                |
| 2                            | Settings schema module      | `packages/core/src/config/settings/schema.ts`          | ✅ Complete  | 72KB                                     |
| 3                            | Settings migration module   | `packages/core/src/config/settings/migrate.ts`         | ✅ Complete  | 8KB                                      |
| 4                            | Settings validation module  | `packages/core/src/config/settings/validate.ts`        | ✅ Complete  | 332 lines                                |
| 5                            | Settings trust module       | `packages/core/src/config/settings/trust.ts`           | ✅ Complete  | 235 lines                                |
| 6                            | Settings loader module      | `packages/core/src/config/settings/loader.ts`          | ✅ **FIXED** | Now reads actual files                   |
| 7                            | Barrel export               | `packages/core/src/index.ts:13-27`                     | ✅ Complete  | All settings modules exported            |
| **Phase 1.5: Guard Rails**   |
| 1.8                          | CLI settings parity test    | `packages/core/src/config/settings/parity.test.ts`     | ✅ **FIXED** | 6 tests now pass                         |
| 1.9                          | Core isolation test         | —                                                      | ❌ Missing   | No automated isolation check             |
| **Phase 2: Config Builder**  |
| 8                            | Config builder module       | `packages/core/src/config/builder.ts`                  | ✅ Complete  | 233 lines                                |
| 9                            | Policy engine extraction    | `packages/core/src/policy/config.ts`                   | ✅ Complete  | Already extracted                        |
| **Phase 3: CLI Integration** |
| 10                           | CLI uses shared loader      | `packages/cli/src/config/settings.ts:67-78`            | ✅ Complete  | Uses SettingsLoader                      |
| 11                           | CLI tests pass              | —                                                      | ⚠️ Partial   | 58 failures                              |
| **Phase 3.5: A2A Canary**    |
| 11.5                         | Feature flag A2A settings   | —                                                      | ❌ Missing   | USE_UNIFIED_SETTINGS not found           |
| **Phase 4: A2A Integration** |
| 12                           | A2A settings.ts replaced    | `packages/a2a-server/src/config/settings.ts`           | ✅ Complete  | 35 lines thin wrapper                    |
| 13                           | A2A loadConfig updated      | `packages/a2a-server/src/config/config.ts`             | ✅ Complete  | Uses LoadedSettings                      |
| 14                           | A2A tests pass              | —                                                      | ⚠️ Partial   | 6 failures                               |
| **Phase 5: Verification**    |
| 15                           | Parity snapshot tests       | —                                                      | ❌ Missing   | No parity tests exist                    |
| 16                           | Manual E2E verification     | —                                                      | ❌ Missing   | No evidence of verification              |

### Summary by Phase

| Phase              | Tasks  | Complete | Partial | Missing |
| ------------------ | ------ | -------- | ------- | ------- |
| 0: Pre-Flight      | 3      | 0        | 1       | 2       |
| 1: Foundation      | 7      | 6        | 1       | 0       |
| 1.5: Guard Rails   | 2      | 0        | 0       | 2       |
| 2: Config Builder  | 2      | 2        | 0       | 0       |
| 3: CLI Integration | 2      | 1        | 1       | 0       |
| 3.5: A2A Canary    | 1      | 0        | 0       | 1       |
| 4: A2A Integration | 3      | 2        | 1       | 0       |
| 5: Verification    | 2      | 0        | 0       | 2       |
| **TOTAL**          | **22** | **11**   | **4**   | **7**   |

## 🚨 Critical (Must Fix Before Merge)

### O-1: SettingsLoader.load() Returns Empty Stub Files

**File**: `packages/core/src/config/settings/loader.ts:123-137`

**Problem**: The `SettingsLoader.load()` method returns hardcoded empty
`SettingsFile` objects instead of reading actual settings files from disk:

```typescript
load(): LoadedSettings {
  const emptyFile = (p: string): SettingsFile => ({
    path: p,
    settings: {},        // <-- Always empty!
    originalSettings: {},
  });

  return new LoadedSettings(
    emptyFile('system.json'),
    emptyFile('defaults.json'),
    emptyFile('user.json'),
    emptyFile('workspace.json'),
    true,
  );
}
```

**Impact**: **Entire parity implementation is non-functional**. Settings from
user files, workspace files, system files are never loaded.

**Fix Required**:

1. Read settings files from correct paths:
   - System: `getSystemSettingsPath()`
   - SystemDefaults: `getSystemDefaultsPath()`
   - User: `Storage.getGlobalSettingsPath()`
   - Workspace: `path.join(workspaceDir, '.terminai', 'settings.json')` or
     `path.join(workspaceDir, GEMINI_DIR, 'settings.json')`
2. Parse JSON with comments using `stripJsonComments`
3. Apply V1→V2 migration using `migrateSettingsToV2()`
4. Validate each scope with `validateSettings()`
5. Evaluate trust using `isWorkspaceTrusted()`
6. Load .env files if trusted

**Complexity**: High (requires importing and orchestrating multiple core
modules)

---

### O-2: A2A Settings Tests Failing

**Files**: `packages/a2a-server/src/config/settings.test.ts`

**Problem**: 6 tests failing with `ENOENT: no such file or directory` errors:

```
Error: ENOENT: no such file or directory, open '/tmp/gemini-home-xxx/.terminai/settings.json'
```

**Root Cause**: The mocked `homedir()` returns a temp directory, but the tests
expect the settings file to exist in `.terminai/` subdirectory while Core's
`Storage.getGlobalSettingsPath()` may use a different directory structure
(`.config/terminai/` or similar).

**Fix Required**:

1. Align directory structure between mock and actual implementation
2. Or mock `Storage.getGlobalSettingsPath()` directly
3. Ensure test setup creates the expected directory structure

---

### O-3: ConfigBuilder Not Using Loaded Settings Properly

**File**: `packages/core/src/config/builder.ts:44-46`

**Problem**: `ConfigBuilder.build()` uses `SettingsLoader` which returns empty
settings, so all config values fall back to defaults/undefined:

```typescript
const loader = new SettingsLoader(options);
const loadedSettings = loader.load(); // <-- Returns empty settings
const settings = loadedSettings.merged; // <-- Merged of empty = empty
```

**Impact**: ConfigBuilder produces Config objects that ignore user settings.

**Fix**: This will be automatically resolved when O-1 is fixed.

---

## ⚠️ Important (Should Fix)

### O-4: CLI Tests Failing - Model Fallback Behavior

**Files**:

- `packages/cli/src/ui/hooks/useQuotaAndFallback.test.ts`
- `packages/core/src/fallback/handler.test.ts`

**Problem**: Tests expect specific model names in fallback messages but the
actual model names have changed:

```
Expected: "gemini-2.5-pro"
Received: "gemini-3-pro-preview"
```

**Fix Required**: Update test expectations to match current model configuration,
or verify whether the fallback logic itself needs adjustment.

---

### O-5: CLI Tests Failing - MCP Remove Command

**File**: `packages/cli/src/commands/mcp/remove.test.ts:239`

**Problem**: Tests for MCP server removal are failing:

```
expected updatedContent not to contain "server1"
```

**Root Cause**: The `SettingsLoader` stub returns empty settings which breaks
the save/update logic.

**Fix**: Will be resolved when O-1 is fixed.

---

### O-6: Core Tests Failing - Compression Service

**File**: `packages/core/src/services/chatCompressionService.test.ts:116`

**Problem**: Model name mapping returning wrong alias:

```
Expected: "chat-compression-2.5-pro"
Received: "chat-compression-default"
```

**Fix Required**: Update `modelStringToModelConfigAlias()` to correctly map
`gemini-2.5-pro` to its compression alias.

---

### O-7: Missing Parity Test (Task 1.8 Not Fully Implemented)

**File**: Should exist at `packages/core/src/config/settings/parity.test.ts`

**Problem**: The task specified a parity test comparing CLI `loadSettings`
output with Core `loadSettingsV2` output. This test file does not exist.

**Fix Required**:

1. Create `parity.test.ts` in `packages/core/src/config/settings/`
2. Import CLI's `loadSettings` and Core's loader
3. Test identical outputs for same fixture inputs

---

### O-8: Core Isolation Test (Task 1.9 Not Verified)

**Problem**: Task 1.9 required verification that Core builds without CLI
imports. This should be automated.

**Fix Required**:

1. Add a build step that greps Core dist for CLI imports
2. Fail if any are found
3. Add to CI/CD pipeline

---

## 💡 Suggestions (Nice to Have)

### O-9: Add JSDoc to Core Settings Modules

The new core settings modules lack comprehensive documentation. Adding JSDoc
comments would improve maintainability:

- `loader.ts`: Document the 4-scope merge precedence
- `migrate.ts`: Document V1→V2 field mappings
- `trust.ts`: Document trust evaluation flow

---

### O-10: Feature Flag (Task 11.5) Not Found

**Problem**: The `USE_UNIFIED_SETTINGS` feature flag for A2A canary deployment
was specified in Task 11.5 but is not present in the current A2A config.

**Decision Needed**: Was this flag intentionally skipped, or should it be added
for gradual rollout safety?

---

### O-11: Consolidate Duplicate findEnvFile Implementations

**Files**:

- `packages/core/src/config/builder.ts:193-218`
- `packages/a2a-server/src/config/config.ts:174-201`

**Problem**: Identical `findEnvFile()` implementations exist in both files.

**Fix**: A2A should import `findEnvFile` from `@terminai/core` instead of having
its own copy.

---

## ✅ What's Good

1. **Core Settings Types** (`types.ts`): Well-designed with proper scope enums,
   interface definitions, and type guards.

2. **Schema Module** (`schema.ts`): Comprehensive settings schema with proper
   type inference capability.

3. **Validation Module** (`validate.ts`): Solid Zod-based validation with
   helpful error formatting.

4. **Trust Module** (`trust.ts`): Complete trust evaluation with IDE integration
   and file-based rules.

5. **Migration Module** (`migrate.ts`): V1→V2 migration logic properly
   extracted.

6. **Phase 0 Snapshots**: 10 CLI behavior snapshots exist with regeneration
   script.

7. **A2A Settings Wrapper**: Thin (~35 lines) wrapper correctly using Core's
   `SettingsLoader`.

8. **CLI Settings Wrapper**: Clean re-export pattern from Core with CLI-specific
   theme mappings.

9. **Deep Merge Logic**: `mergeSettings()` properly handles 4-scope precedence
   with trust-gated workspace settings.

---

## Task Sequence

Execute in this order:

### Phase 1: Critical Fixes (Blocks Parity)

1. **O-1**: Implement actual settings file loading in `SettingsLoader.load()`
2. **O-2**: Fix A2A settings test directory mocking

### Phase 2: Important Fixes

3. **O-7**: Add parity test (`parity.test.ts`)
4. **O-4**: Update model fallback test expectations
5. **O-6**: Fix compression service model mapping

### Phase 3: Verification

6. **O-8**: Add Core isolation verification step
7. Re-run all tests to confirm O-3 and O-5 are resolved by O-1

### Phase 4: Cleanup

8. **O-11**: Consolidate duplicate `findEnvFile` implementations
9. **O-9**: Add JSDoc documentation
10. **O-10**: Decide on `USE_UNIFIED_SETTINGS` feature flag

---

## Commands Reference

```bash
# Build core
npm run build -w @terminai/core

# Run core tests
npm test -w @terminai/core -- --run

# Run A2A tests
npm test -w @terminai/a2a-server -- --run

# Run CLI tests
npm test -w @terminai/cli -- --run

# Run specific test file
npm test -w @terminai/core -- --run loader.test.ts

# Regenerate CLI snapshots
./scripts/run-parity-snapshots.sh
```

---

## Files to Modify

| Priority | File                                                   | Action                       |
| -------- | ------------------------------------------------------ | ---------------------------- |
| 🚨       | `packages/core/src/config/settings/loader.ts`          | Implement real file loading  |
| ⚠️       | `packages/a2a-server/src/config/settings.test.ts`      | Fix directory mocking        |
| ⚠️       | `packages/core/src/config/settings/parity.test.ts`     | Create new file              |
| ⚠️       | `packages/core/src/services/chatCompressionService.ts` | Fix model mapping            |
| 💡       | `packages/a2a-server/src/config/config.ts`             | Remove duplicate findEnvFile |
