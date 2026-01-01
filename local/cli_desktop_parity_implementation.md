# CLI-Desktop Settings Parity Implementation

**Status**: Complete (commit `a7d891fd` - 2024-12-31)

## Overview

TerminaI now uses a **unified settings infrastructure**
(`@terminai/core/config/settings`) shared across CLI, A2A Server, and Desktop
applications, ensuring identical configuration behavior regardless of entry
point.

## Architecture

### Core Components

| Component        | Purpose                      | Location                                       |
| ---------------- | ---------------------------- | ---------------------------------------------- |
| `SettingsLoader` | Loads settings from 4 scopes | `packages/core/src/config/settings/loader.ts`  |
| `LoadedSettings` | Encapsulates loaded settings | `packages/core/src/config/settings/types.ts`   |
| Migration logic  | V1→V2 automatic migration    | `packages/core/src/config/settings/migrate.ts` |
| Trust evaluation | Workspace trust checking     | `packages/core/src/config/settings/trust.ts`   |
| ConfigBuilder    | Builds Config from settings  | `packages/core/src/config/builder.ts`          |

### Settings Precedence

Settings merge in this order (later overrides earlier):

1. **System Defaults** - `/etc/gemini-cli/system-defaults.json` (lowest
   priority)
2. **User Settings** - `~/.terminai/settings.json`
3. **Workspace Settings** - `.terminai/settings.json` (only if workspace is
   trusted)
4. **System Settings** - `/etc/gemini-cli/settings.json` (highest priority)

### Trust Evaluation

Workspace settings are only applied if:

- `security.folderTrust.enabled` is `true` in merged system+user settings, AND
- Current workspace is marked as trusted

## Implementation Details

### SettingsLoader (`packages/core/src/config/settings/loader.ts`)

```typescript
class SettingsLoader {
  load(): LoadedSettings {
    // 1. Read settings from all 4 scopes
    const system = readSettingsFile(systemPath);
    const systemDefaults = readSettingsFile(systemDefaultsPath);
    const user = readSettingsFile(userPath);
    const workspace = readSettingsFile(workspacePath);

    // 2. Apply V1→V2 migration if needed
    // 3. Evaluate workspace trust
    // 4. Merge with precedence rules

    return new LoadedSettings(
      system,
      systemDefaults,
      user,
      workspace,
      isTrusted,
    );
  }
}
```

### V1→V2 Migration

Legacy flat settings structure is automatically migrated to V2 nested structure:

**V1 (flat)**:

```json
{
  "theme": "dark",
  "model": "gemini-2.5-pro",
  "previewFeatures": true
}
```

**V2 (nested)**:

```json
{
  "ui": { "theme": "dark" },
  "model": { "name": "gemini-2.5-pro" },
  "general": { "previewFeatures": true }
}
```

Migration happens transparently; users don't need to manually convert files.

### CLI Integration (`packages/cli/src/config/config.ts`)

```typescript
export async function loadCliConfig(
  settings: Settings,
  sessionId: string,
  argv: CliArgs,
  cwd: string,
): Promise<Config> {
  const builder = new ConfigBuilder(sessionId);

  // Build comprehensive overrides from CLI args
  const overrides: Partial<ConfigParameters> = {
    model: argv.model || settings.model?.name,
    sandbox: await loadSandboxConfig(settings, argv),
    extensionLoader: extensionManager,
    telemetry: telemetrySettings,
    policyEngineConfig,
    // ...50+ more parameters
  };

  // ✅ FIXED (commit a7d891fd): Pass overrides to builder
  return builder.build({
    workspaceDir: cwd,
    question,
    approvalMode,
    overrides, // Critical fix - was missing
  });
}
```

### A2A Integration (`packages/a2a-server/src/config/config.ts`)

```typescript
export async function loadConfig(
  loadedSettings: LoadedSettings,
  extensionLoader: ExtensionLoader,
  taskId: string,
): Promise<Config> {
  const settings = loadedSettings.merged;

  // Build config from merged settings
  const configParams: ConfigParameters = {
    sessionId: taskId,
    model: settings.general?.previewFeatures
      ? PREVIEW_GEMINI_MODEL
      : DEFAULT_GEMINI_MODEL,
    // ...other parameters from settings
  };

  return new Config(configParams);
}
```

## Testing

### Parity Tests (`packages/core/src/config/settings/parity.test.ts`)

6 tests ensure CLI and Core produce identical settings output:

1. Load empty settings when no files exist
2. Load user settings from `~/.terminai/settings.json`
3. Merge workspace settings with user settings
4. Migrate V1 flat settings to V2 nested structure
5. Apply theme mappings (e.g., `VS2015` → `DefaultDark`)
6. Deep merge nested settings correctly

### Test Results

| Package       | Tests   | Status                      |
| ------------- | ------- | --------------------------- |
| Core Settings | 22/22   | ✅ Pass                     |
| A2A Server    | 78/78   | ✅ Pass                     |
| CLI           | 419/431 | ⚠️ 12 pre-existing failures |

## Migration Path

**For users**: No action required. V1 settings auto-migrate on load.

**For developers**:

- Use `SettingsLoader` from `@terminai/core` instead of custom loading
- Rely on `ConfigBuilder` for Config construction
- Do not bypass settings loading (use `LoadedSettings.merged`)

## Breaking Changes

**None**. All changes are backward compatible:

- V1 settings automatically migrate to V2
- Legacy `.gemini` paths still read
- `GEMINI_*` environment variables still work

## Known Limitations

1. **Pre-existing test failures**: 12 CLI tests fail due to unrelated model
   fallback issues
2. **Type casts**: Some `as any` casts in ConfigBuilder (cosmetic, deferred
   cleanup)
3. **Documentation**: Phase 0 dependency audit and upstream diff not yet
   documented

## References

- **Implementation**: `packages/core/src/config/settings/`
- **Tests**: `packages/core/src/config/settings/*.test.ts`
- **Outstanding Tasks**: `local/cli_desktop_parity_outstanding_tasks.md`
- **Commit**: `a7d891fd` - "fix(settings): Implement SettingsLoader + fix CLI
  overrides"
