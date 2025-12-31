# CLI ↔ Desktop Parity: Implementation Tasks

## Implementation Checklist

### Phase 0: Pre-Flight (Risk Mitigation)

- [ ] Task 0.1: Snapshot CLI behavior
- [ ] Task 0.2: Dependency audit
- [ ] Task 0.3: Upstream diff check

### Phase 1: Foundation (Extract to Core)

- [ ] Task 1: Create settings types module
- [ ] Task 2: Create settings schema module
- [ ] Task 3: Create settings migration module
- [ ] Task 4: Create settings validation module
- [ ] Task 5: Create settings trust module
- [ ] Task 6: Create settings loader module
- [ ] Task 7: Create barrel export

### Phase 1.5: Guard Rails

- [ ] Task 1.8: CLI settings parity test
- [ ] Task 1.9: Core isolation test

### Phase 2: Config Builder

- [ ] Task 8: Create config builder module
- [ ] Task 9: Extract policy engine setup

### Phase 3: CLI Integration

- [ ] Task 10: Wire CLI to use shared loader
- [ ] Task 11: Verify CLI tests pass

### Phase 3.5: A2A Canary

- [ ] Task 11.5: Feature flag A2A settings

### Phase 4: A2A Integration

- [ ] Task 12: Replace A2A settings.ts
- [ ] Task 13: Update A2A loadConfig
- [ ] Task 14: Update A2A tests

### Phase 5: Verification

- [ ] Task 15: Add parity snapshot tests
- [ ] Task 16: Manual E2E verification

---

## Phase 0: Pre-Flight (Risk Mitigation)

### Task 0.1: Snapshot CLI behavior

**Objective**: Create golden test outputs to detect any CLI regression.

**Prerequisites**: None

**Detailed steps**:

1. Create test fixture directory: `packages/cli/test/fixtures/settings-snapshots/`
2. Create 10 test scenarios with different settings combinations
3. Run CLI with each scenario, capture output
4. Save as JSON snapshots

**Code snippet**:

```bash
# Create snapshot script
cat > scripts/create-settings-snapshots.sh << 'EOF'
#!/bin/bash
for scenario in test/fixtures/settings-scenarios/*.json; do
  name=$(basename "$scenario" .json)
  node dist/cli.js --dump-config > "test/fixtures/settings-snapshots/${name}.snapshot.json"
done
EOF
```

**Definition of done**:

- [ ] 10 golden snapshots exist
- [ ] Script to regenerate snapshots exists
- [ ] Snapshot comparison test exists

---

### Task 0.2: Dependency audit

**Objective**: Document all imports in CLI settings.ts, flag unmovable ones.

**Prerequisites**: None

**Detailed steps**:

1. Run: `grep -n "import.*from" packages/cli/src/config/settings.ts`
2. For each import, categorize as:
   - ✅ Can move to core (pure utilities)
   - ⚠️ Needs abstraction (UI hooks, CLI-specific)
   - ❌ Cannot move (CLI-only)

**Definition of done**:

- [ ] Dependency list documented
- [ ] Each dependency categorized
- [ ] Abstraction strategy for ⚠️ items defined

---

### Task 0.3: Upstream diff check

**Objective**: Document divergence from Google's Gemini CLI.

**Prerequisites**: None

**Detailed steps**:

1. Clone upstream: `git clone https://github.com/anthropics/gemini-cli.git /tmp/upstream`
2. Diff: `diff -u /tmp/upstream/packages/cli/src/config/settings.ts packages/cli/src/config/settings.ts`
3. Document differences

**Definition of done**:

- [ ] Diff documented
- [ ] Impact on future syncs assessed

---

## Phase 1: Foundation

### Task 1: Create settings types module

**Objective**: Define all shared types for settings loading.

**Prerequisites**: Phase 0 complete

**Files to modify**:

- `packages/core/src/config/settings/types.ts` — NEW

**Code snippet**:

```typescript
export enum SettingScope {
  User = "User",
  Workspace = "Workspace",
  System = "System",
  SystemDefaults = "SystemDefaults",
  Session = "Session",
}

export type LoadableSettingScope =
  | SettingScope.User
  | SettingScope.Workspace
  | SettingScope.System
  | SettingScope.SystemDefaults;

export interface SettingsFile {
  path: string;
  settings: Settings;
  originalSettings: Settings;
  rawJson?: string;
}

export interface SettingsLoaderOptions {
  mapLegacyThemeName?: (theme: string) => string;
  feedback?: (
    level: "error" | "warn" | "info",
    msg: string,
    err?: unknown
  ) => void;
}
```

**Definition of done**:

- [ ] File exists at `packages/core/src/config/settings/types.ts`
- [ ] TypeScript compiles: `npm run build -w @terminai/core`

---

### Task 2: Create settings schema module

**Objective**: Move merge strategy logic to core.

**Prerequisites**: Task 1

**Files to modify**:

- `packages/core/src/config/settings/schema.ts` — NEW

**Definition of done**:

- [ ] `getMergeStrategyForPath` exported from core
- [ ] TypeScript compiles

---

### Task 3: Create settings migration module

**Objective**: Move V1→V2 migration logic to core.

**Prerequisites**: Task 1

**Files to modify**:

- `packages/core/src/config/settings/migrate.ts` — NEW

**Definition of done**:

- [ ] `needsMigration`, `migrateSettingsToV2`, `migrateSettingsToV1` exported
- [ ] TypeScript compiles

---

### Task 4: Create settings validation module

**Objective**: Move Zod validation to core.

**Prerequisites**: Task 1

**Files to modify**:

- `packages/core/src/config/settings/validate.ts` — NEW

**Definition of done**:

- [ ] `validateSettings` exported from core
- [ ] TypeScript compiles

---

### Task 5: Create settings trust module

**Objective**: Move trust evaluation and .env loading to core.

**Prerequisites**: Task 1

**Files to modify**:

- `packages/core/src/config/settings/trust.ts` — NEW

**Definition of done**:

- [ ] `loadEnvironment`, `isWorkspaceTrusted` exported
- [ ] TypeScript compiles

---

### Task 6: Create settings loader module

**Objective**: Main loader that orchestrates all settings loading.

**Prerequisites**: Tasks 1-5

**Files to modify**:

- `packages/core/src/config/settings/loader.ts` — NEW

**Definition of done**:

- [ ] `loadSettingsV2` exported
- [ ] Returns same `merged` as CLI's `loadSettings`
- [ ] TypeScript compiles

---

### Task 7: Create barrel export

**Objective**: Export all settings modules from single entry point.

**Prerequisites**: Tasks 1-6

**Files to modify**:

- `packages/core/src/config/settings/index.ts` — NEW
- `packages/core/src/index.ts` — ADD re-export

**Definition of done**:

- [ ] Can import `{ loadSettingsV2 }` from `@terminai/core`

---

## Phase 1.5: Guard Rails

### Task 1.8: CLI settings parity test

**Objective**: Prove core loader produces identical output to CLI loader.

**Prerequisites**: Tasks 1-7

**Files to modify**:

- `packages/core/src/config/settings/parity.test.ts` — NEW

**Code snippet**:

```typescript
import { loadSettings as cliLoadSettings } from "@terminai/cli";
import { loadSettingsV2 } from "./loader";

describe("Settings Parity", () => {
  const fixtures = ["empty", "v1-flat", "v2-nested", "with-workspace"];

  for (const fixture of fixtures) {
    it(`produces identical merged for ${fixture}`, () => {
      const cliResult = cliLoadSettings(fixtureDir(fixture));
      const coreResult = loadSettingsV2(fixtureDir(fixture));
      expect(coreResult.merged).toEqual(cliResult.merged);
    });
  }
});
```

**Definition of done**:

- [ ] Test exists and passes
- [ ] Covers V1, V2, workspace, trust scenarios

---

### Task 1.9: Core isolation test

**Objective**: Verify core compiles without CLI imports.

**Prerequisites**: Tasks 1-7

**Detailed steps**:

1. Run: `npm run build -w @terminai/core`
2. Grep core dist for CLI imports: should be zero

**Definition of done**:

- [ ] Core builds standalone
- [ ] No imports from `@terminai/cli` in core

---

## Phase 2: Config Builder

### Task 8: Create config builder module

**Objective**: Build Config from LoadedSettings with CLI-identical interpretation.

**Prerequisites**: Phase 1.5 complete

**Files to modify**:

- `packages/core/src/config/builder.ts` — NEW

**Definition of done**:

- [ ] `buildConfigFromLoadedSettings` exported
- [ ] Produces same Config as CLI for same inputs

---

### Task 9: Extract policy engine setup

**Objective**: Move policy engine creation to shared code.

**Prerequisites**: Task 8

**Definition of done**:

- [ ] Policy engine created identically in both paths

---

## Phase 3: CLI Integration

### Task 10: Wire CLI to use shared loader

**Objective**: CLI calls shared modules, no behavior change.

**Prerequisites**: Phase 2 complete

**Files to modify**:

- `packages/cli/src/config/settings.ts` — MODIFY
- `packages/cli/src/config/config.ts` — MODIFY

**Definition of done**:

- [ ] CLI still works identically
- [ ] Golden snapshots from Task 0.1 still match

---

### Task 11: Verify CLI tests pass

**Objective**: Gate before proceeding to A2A changes.

**Prerequisites**: Task 10

**Definition of done**:

- [ ] `npm test -w @terminai/cli` passes
- [ ] Manual smoke test works

---

## Phase 3.5: A2A Canary

### Task 11.5: Feature flag A2A settings

**Objective**: Test new settings loader in A2A without committing.

**Prerequisites**: Task 11

**Files to modify**:

- `packages/a2a-server/src/config/config.ts` — MODIFY

**Code snippet**:

```typescript
const useUnifiedSettings = process.env["USE_UNIFIED_SETTINGS"] === "1";

const settings = useUnifiedSettings
  ? loadSettingsV2(workspaceDir).merged
  : loadSettings(workspaceDir); // old path
```

**Definition of done**:

- [ ] Feature flag works
- [ ] Desktop works with `USE_UNIFIED_SETTINGS=1`

---

## Phase 4: A2A Integration

### Task 12: Replace A2A settings.ts

**Objective**: A2A uses shared loader permanently.

**Prerequisites**: Task 11.5 validated

**Files to modify**:

- `packages/a2a-server/src/config/settings.ts` — DELETE or thin wrapper

**Definition of done**:

- [ ] A2A settings.ts is <20 lines

---

### Task 13: Update A2A loadConfig

**Objective**: A2A loadConfig calls shared builder.

**Prerequisites**: Task 12

**Files to modify**:

- `packages/a2a-server/src/config/config.ts` — MODIFY

**Definition of done**:

- [ ] A2A loadConfig uses shared pipeline
- [ ] Build succeeds

---

### Task 14: Update A2A tests

**Objective**: A2A tests reflect new behavior.

**Prerequisites**: Task 13

**Definition of done**:

- [ ] All A2A tests pass

---

## Phase 5: Verification

### Task 15: Add parity snapshot tests

**Objective**: Automated tests ensuring CLI and A2A produce same Config.

**Prerequisites**: Phase 4 complete

**Files to modify**:

- `packages/a2a-server/src/config/parity.test.ts` — NEW

**Definition of done**:

- [ ] Parity tests exist and pass

---

### Task 16: Manual E2E verification

**Objective**: Verify parity with real user flow.

**Prerequisites**: Task 15

**Test cases**:

- `hi` → same response
- `find me the most recent docx` → same file found
- `convert it to pdf` → context retained
- Tool calls visible in both

**Definition of done**:

- [ ] Same query → same response
- [ ] Same tools called
- [ ] Context retained
- [ ] Tool calls visible in both

---

## Risk Mitigation Summary

| Risk                    | Covered By Task  |
| ----------------------- | ---------------- |
| CLI regression          | 0.1, 1.8, 10, 11 |
| Hidden dependencies     | 0.2              |
| Upstream sync conflicts | 0.3              |
| Circular deps           | 1.9              |
| Safe A2A rollout        | 11.5             |
