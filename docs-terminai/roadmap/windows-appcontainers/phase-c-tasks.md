# Phase C: Productization — Implementation Tasks

> **Spec**: [phase-c-productization-spec.md](./phase-c-productization-spec.md)  
> **Scope**: W6 (Native Distribution), W7 (Doctor), W8 (Feature Flags)  
> **Date**: 2026-01-23

---

## Implementation Checklist

### Phase 0: Prerequisites (Must Complete First)

- [ ] Task 0a: Align doctor/gate code with existing native API exports
- [ ] Task 0b: Add version export to native module
- [ ] Task 0c: Verify ESM loader uses createRequire pattern

### Phase 1: Foundation

- [ ] Task 1: Create native loader types and interfaces
- [ ] Task 2: Create platform package manifest (x64 only)
- [ ] Task 3: Create doctor types and interfaces
- [ ] Task 4: Create feature gate types

### Phase 2: Native Distribution (W6)

- [ ] Task 5: Implement enhanced native loader
- [ ] Task 6: Create platform package structure (x64 only)
- [ ] Task 7: Create prebuild CI workflow (x64 only)
- [ ] Task 8: Add optional dependencies to BOTH packages/terminai AND
      packages/cli

### Phase 3: Doctor Command (W7)

- [ ] Task 9: Implement doctor check runner
- [ ] Task 10: Implement platform check
- [ ] Task 11: Implement native module check
- [ ] Task 12: Implement AppContainer profile check (use existing API)
- [ ] Task 13: Implement SID derivation check (use getAppContainerSid)
- [ ] Task 14: Implement workspace ACL check
- [ ] Task 15: Implement secure pipe check (depends on Phase A W2)
- [ ] Task 16: Implement Brain↔Hands ping check (depends on Phase A)
- [ ] Task 17: Implement structured execute check (depends on Phase B)
- [ ] Task 18: Implement AMSI checks
- [ ] Task 19: Implement doctor CLI command
- [ ] Task 20: Implement doctor output renderer

### Phase 4: Feature Flags (W8)

- [ ] Task 21: Implement feature gate
- [ ] Task 22: Implement runtime banner
- [ ] Task 23: Implement Windows config
- [ ] Task 24: Integrate fail-safe initialization
- [ ] Task 25: Integrate fallback behavior

### Phase 5: Testing & Polish

- [ ] Task 26: Unit tests for native loader
- [ ] Task 27: Unit tests for feature gate
- [ ] Task 28: Unit tests for doctor checks
- [ ] Task 29: Integration test for full doctor run
- [ ] Task 30: Documentation updates

---

## Detailed Tasks

### Task 0a: Align doctor/gate code with existing native API exports

**Objective**: Ensure doctor checks and feature gate call APIs that actually
exist in the native module.

**Prerequisites**: None

**Files to modify**:

- `packages/cli/src/commands/doctor/checks/*.ts` — use correct API names
- `packages/cli/src/runtime/windows/featureGate.ts` — use correct API names

**Detailed steps**:

1. Audit current native module exports in `packages/cli/native/main.cpp`:
   - `createAppContainerSandbox(cmd, workspace, enableInternet)` — exists
   - `getAppContainerSid(profileName)` — exists (spec incorrectly calls it
     `deriveAppContainerSid`)
   - `deleteAppContainerProfile(profileName)` — exists
   - `isAmsiAvailable()` — exists
   - `amsiScanBuffer(content, filename)` — exists
2. Update spec and task code to use `getAppContainerSid` instead of
   `deriveAppContainerSid`
3. For doctor profile check, use `createAppContainerSandbox` with a test command
   OR add a new `createAppContainerProfile(name)` export

**Definition of done**:

- [ ] All doctor checks use APIs that exist in native module
- [ ] No "function not found" errors at runtime

---

### Task 0b: Add version export to native module

**Objective**: Export a `version` property from the native module for
diagnostics.

**Prerequisites**: None

**Files to modify**:

- `packages/cli/native/main.cpp` — add version export

**Detailed steps**:

1. Add to native module initialization:
   ```cpp
   exports.Set("version", Napi::String::New(env, "0.28.0"));
   ```
2. Update TypeScript type in `native.ts`:
   ```typescript
   export interface NativeModule {
     version: string;
     // ... other exports
   }
   ```

**Definition of done**:

- [ ] `native.version` returns the module version string
- [ ] Version matches package.json version

---

### Task 0c: Verify ESM loader uses createRequire pattern

**Objective**: Confirm the native loader is ESM-compatible.

**Prerequisites**: None

**Files to modify**:

- `packages/cli/src/runtime/windows/native.ts` — verify pattern

**Detailed steps**:

1. Confirm file uses:
   ```typescript
   import { createRequire } from 'node:module';
   const require = createRequire(import.meta.url);
   ```
2. Ensure all `require()` calls for native modules use this pattern
3. The current implementation already does this — this task is verification only

**Definition of done**:

- [ ] Native loader works in ESM context
- [ ] No "require is not defined" errors

---

### Task 1: Create native loader types and interfaces

**Objective**: Define TypeScript types for native module loading and status.

**Prerequisites**: None

**Files to modify**:

- `packages/cli/src/runtime/windows/native.ts` — add types

**Detailed steps**:

1. Add `NativeModuleStatus` interface with fields: `available`, `source`,
   `version`, `path`, `error`
2. Add type for `source`: `'prebuild' | 'local' | 'unavailable'`
3. Export types for use in other modules

**Definition of done**:

- [ ] Types compile without errors
- [ ] Test command: `npm run typecheck -w @terminai/cli`

---

### Task 2: Create platform package manifests

**Objective**: Create package.json templates for platform-specific native
packages.

**Prerequisites**: None

**Files to modify**:

- `packages/native-win32-x64/package.json` — **[NEW]**
- `packages/native-win32-arm64/package.json` — **[NEW]**

**Detailed steps**:

1. Create `packages/native-win32-x64/` directory
2. Create package.json with:
   ```json
   {
     "name": "@terminai/native-win32-x64",
     "version": "0.28.0",
     "os": ["win32"],
     "cpu": ["x64"],
     "main": "terminai_native.node",
     "files": ["terminai_native.node"]
   }
   ```
3. Repeat for arm64 variant
4. Add placeholder README.md

**Definition of done**:

- [ ] Both packages have valid package.json
- [ ] npm pack succeeds (with placeholder .node file)

---

### Task 3: Create doctor types and interfaces

**Objective**: Define TypeScript types for doctor command.

**Prerequisites**: None

**Files to modify**:

- `packages/cli/src/commands/doctor/types.ts` — **[NEW]**

**Detailed steps**:

1. Create `packages/cli/src/commands/doctor/` directory
2. Define `DoctorCheck` interface: `name`, `description`, `status`, `message`,
   `remediation`, `durationMs`
3. Define `DoctorResult` interface: `platform`, `tier`, `timestamp`, `checks`,
   `overallStatus`, `summary`
4. Export all types

**Definition of done**:

- [ ] Types compile without errors

---

### Task 4: Create feature gate types

**Objective**: Define TypeScript types for feature gating.

**Prerequisites**: None

**Files to modify**:

- `packages/cli/src/runtime/windows/featureGate.ts` — **[NEW]** (types only)

**Detailed steps**:

1. Define `FeatureGateResult` interface
2. Define `RuntimeBannerInfo` interface
3. Define `WindowsConfig` interface

**Definition of done**:

- [ ] Types compile without errors

---

### Task 5: Implement enhanced native loader

**Objective**: Update native.ts to resolve prebuilds before local builds.

**Prerequisites**: Task 1

**Files to modify**:

- `packages/cli/src/runtime/windows/native.ts` — enhanced loader

**Detailed steps**:

1. Add `loadNative()` async function
2. Try `require('@terminai/native-${platform}-${arch}')` first
3. Fall back to local `build/Release/terminai_native.node`
4. Return `NativeModuleStatus` with source info
5. Handle all errors gracefully (no throws)

**Code snippet**:

```typescript
export async function loadNative(): Promise<NativeModuleStatus> {
  const prebuildPkg = `@terminai/native-${process.platform}-${process.arch}`;
  try {
    const path = require.resolve(prebuildPkg);
    return { available: true, source: 'prebuild', path };
  } catch {
    /* continue */
  }
  // ... local fallback
}
```

**Definition of done**:

- [ ] Loader returns correct status for each scenario
- [ ] Test command:
      `npm test -- packages/cli/src/runtime/windows/native.test.ts`

---

### Task 6: Create platform package structure

**Objective**: Set up the directory structure for platform packages.

**Prerequisites**: Task 2

**Files to modify**:

- `packages/native-win32-x64/README.md` — **[NEW]**
- `packages/native-win32-arm64/README.md` — **[NEW]**
- Root `package.json` — add to workspaces (if using)

**Definition of done**:

- [ ] Directories exist with valid package.json and README

---

### Task 7: Create prebuild CI workflow

**Objective**: GitHub Actions workflow to build and publish native modules.

**Prerequisites**: Task 6

**Files to modify**:

- `.github/workflows/native-prebuild.yml` — **[NEW]**

**Detailed steps**:

1. Trigger on version tags (`v*`)
2. Build on `windows-latest`
3. Use `actions/setup-node` and `actions/setup-python`
4. Run `npm run build:native` in packages/cli
5. Copy .node file to platform package
6. Publish to npm with token

**Definition of done**:

- [ ] Workflow file is valid YAML
- [ ] Manual trigger runs successfully

---

### Task 8: Add optional dependencies to CLI

**Objective**: Wire up platform packages as optional dependencies.

**Prerequisites**: Task 6

**Files to modify**:

- `packages/cli/package.json` — add optionalDependencies

**Detailed steps**:

1. Add optionalDependencies section:
   ```json
   "optionalDependencies": {
     "@terminai/native-win32-x64": "0.28.0",
     "@terminai/native-win32-arm64": "0.28.0"
   }
   ```

**Definition of done**:

- [ ] npm install does not fail if optional deps unavailable

---

### Task 9: Implement doctor check runner

**Objective**: Create the core doctor execution engine.

**Prerequisites**: Task 3

**Files to modify**:

- `packages/cli/src/commands/doctor/runner.ts` — **[NEW]**

**Detailed steps**:

1. Create `runChecks(checks: DoctorCheckDef[])` function
2. Execute checks in order, respecting prerequisites
3. Track timing for each check
4. Skip checks if prerequisites failed
5. Compute overall status: `ready` if all pass, `degraded` if warns, `not-ready`
   if fails

**Definition of done**:

- [ ] Runner correctly executes ordered checks
- [ ] Prerequisites are respected

---

### Task 10-18: Implement individual doctor checks

**Objective**: Implement each of the 10 doctor checks.

**Prerequisites**: Task 9

**Files to modify**:

- `packages/cli/src/commands/doctor/checks/` — **[NEW]** directory with check
  files

**Checks to implement**: | Task | Check ID | Description |
|------|----------------------|------------------------------------| | 10 |
platform | Verify Windows 8+ | | 11 | native-module | Native module loads | | 12
| appcontainer-profile | Can create profile | | 13 | sid-derivation | Can derive
SID | | 14 | workspace-acl | Can grant ACL | | 15 | secure-pipe | Can create
DACL pipe | | 16 | brain-hands-ping | E2E ping test | | 17 | structured-execute
| Execute works | | 18 | amsi + amsi-blocks | AMSI functional |

**Definition of done**:

- [ ] Each check returns valid DoctorCheck result
- [ ] Remediation messages are helpful

---

### Task 19: Implement doctor CLI command

**Objective**: Register `terminai doctor` command with yargs.

**Prerequisites**: Task 9, Tasks 10-18

**Files to modify**:

- `packages/cli/src/commands/doctor/index.ts` — **[NEW]**
- `packages/cli/src/nonInteractiveCliCommands.ts` — register command

**Detailed steps**:

1. Create yargs CommandModule for `doctor`
2. Add `--windows` flag
3. Add `--json` flag for machine-readable output
4. Call `runWindowsDoctor()` and render results

**Definition of done**:

- [ ] `terminai doctor --windows` runs all checks
- [ ] `terminai doctor --windows --json` outputs JSON

---

### Task 20: Implement doctor output renderer

**Objective**: Pretty-print doctor results to console.

**Prerequisites**: Task 3

**Files to modify**:

- `packages/cli/src/commands/doctor/renderer.ts` — **[NEW]**

**Definition of done**:

- [ ] Output matches expected format from spec
- [ ] Icons and colors render correctly

---

### Task 21: Implement feature gate

**Objective**: Single gating point for AppContainer enablement.

**Prerequisites**: Task 4, Task 5

**Files to modify**:

- `packages/cli/src/runtime/windows/featureGate.ts` — implementation

**Detailed steps**:

1. Implement `checkAppContainerGate()` async function
2. Check `TERMINAI_WINDOWS_APPCONTAINER` env var
3. Check platform is `win32`
4. Check native module loads
5. Check AppContainer profile creation works
6. Return `FeatureGateResult` with tier and prerequisites

**Definition of done**:

- [ ] Gate returns correct result for all scenarios
- [ ] Test covers enabled, disabled, and prerequisite-failure cases

---

### Task 22: Implement runtime banner

**Objective**: Display tier status at runtime startup.

**Prerequisites**: Task 4

**Files to modify**:

- `packages/cli/src/runtime/windows/runtimeBanner.ts` — **[NEW]**

**Detailed steps**:

1. Implement `getRuntimeBannerInfo()` function
2. Implement `renderRuntimeBanner()` function
3. Use appropriate icons: 🔒 (appcontainer), ⚡ (managed-local), ⚠️ (host)

**Definition of done**:

- [ ] Banner displays correctly for each tier
- [ ] Warnings shown when falling back

---

### Task 23: Implement Windows config

**Objective**: Centralize Windows-specific configuration.

**Prerequisites**: Task 4

**Files to modify**:

- `packages/cli/src/config/windowsConfig.ts` — **[NEW]**

**Detailed steps**:

1. Define `WindowsConfig` interface
2. Implement `loadWindowsConfig()` reading from env vars
3. Document env vars in code comments

**Definition of done**:

- [ ] Config loads correctly from environment

---

### Task 24: Integrate fail-safe initialization

**Objective**: Update WindowsBrokerContext to use feature gate and fail-safe.

**Prerequisites**: Task 21, Task 22, Task 23

**Files to modify**:

- `packages/cli/src/runtime/windows/WindowsBrokerContext.ts`

**Detailed steps**:

1. Call `checkAppContainerGate()` at start of `initialize()`
2. Wrap initialization in try-catch
3. On any failure, call `initializeFallback()`
4. Display runtime banner after init

**Definition of done**:

- [ ] Partial failures trigger complete fallback
- [ ] Banner always displayed

---

### Task 25: Integrate fallback behavior

**Objective**: Delegate to ManagedLocalContext when AppContainer unavailable.

**Prerequisites**: Task 24

**Files to modify**:

- `packages/cli/src/runtime/windows/WindowsBrokerContext.ts`

**Detailed steps**:

1. Add `fallbackContext?: ManagedLocalContext` property
2. In `execute()`, check if fallbackContext exists
3. If so, delegate to fallbackContext.execute()

**Definition of done**:

- [ ] Fallback executes commands successfully
- [ ] No partial isolation state possible

---

### Task 26-29: Unit and Integration Tests

**Files to create**:

- `packages/cli/src/runtime/windows/native.test.ts`
- `packages/cli/src/runtime/windows/featureGate.test.ts`
- `packages/cli/src/commands/doctor/runner.test.ts`
- `packages/cli/src/commands/doctor/windowsDoctor.integration.test.ts`

**Definition of done**:

- [ ] All tests pass
- [ ] Coverage for happy path and error cases

---

### Task 30: Documentation updates

**Objective**: Document new features for users.

**Files to modify**:

- `README.md` — add doctor command docs
- `docs-terminai/windows-appcontainer.md` — **[NEW]** user guide

**Definition of done**:

- [ ] Doctor command documented
- [ ] Environment variables documented
- [ ] Troubleshooting section included
