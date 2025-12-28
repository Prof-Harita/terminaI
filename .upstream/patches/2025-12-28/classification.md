# Upstream Commit Classification: 2025-12-28

This document classifies new commits from the upstream repository (`google-gemini/gemini-cli`) for the week of 2025-12-28, based on the guidelines in `docs-terminai/FORK_ZONES.md`.

---

## 🟢 CORE (Can merge directly)

- `37be16243` fix(core): enable granular shell command allowlisting in policy engine
- `5566292cc` refactor(core): extract static concerns from CoreToolScheduler
- `a26d19540` fix(cli): add enableShellOutputEfficiency to settings schema
- `21388a0a4` fix(core): handle checkIsRepo failure in GitService.initialize
- `69fc75c0b` do not persist the fallback model
- `56b050422` chore(core): fix comment typo
- `546baf993` Added modifyOtherKeys protocol support for tmux
- `e6344a8c2` Security: Project-level hook warnings
- `873d10df4` feat: terse transformations of image paths in text buffer
- `563d81e08` Add experimental in-CLI extension install and uninstall subcommands
- `5f2861476` chore: limit MCP resources display to 10 by default
- `b6b0727e2` Make schema validation errors non-fatal
- `e9a601c1f` fix: add missing type field to MCPServerConfig
- `308aa7071` refactor(core): remove deprecated permission aliases from BeforeToolHookOutput
- `6be034392` feat: automatic /model persistence across Gemini CLI sessions
- `3b1dbcd42` Implemented unified secrets sanitization and env. redaction options
- `2ac9fe08f` chore: remove clipboard file
- `24c722454` chore: improve error messages for --resume
- `0a216b28f` fix #15369, prevent crash on unhandled EIO error in readStdin cleanup
- `9c48cd849` feat(ui): Add security warning and improve layout for Hooks list
- `0843d9af5` fix(core): use debugLogger.debug for startup profiler logs
- `b0d5c4c05` feat(policy): implement dynamic mode-aware policy evaluation
- `dced409ac` Add Folder Trust Support To Hooks
- `d6a2f1d67` chore(core): refactor model resolution and cleanup fallback logic
- `58fd00a3d` fix(core): Add .geminiignore support to SearchText tool

## ⚪ IRRELEVANT (Skip)

- `a3d214f8d` chore/release: bump version to 0.24.0-nightly.20251227.37be16243
- `65e2144b3` Manual nightly version bump to 0.24.0-nightly.20251226.546baf993
- `acecd80af` Resolve unhandled promise rejection in ide-client.ts
- `9cdb267ba` feat: Show snowfall animation for holiday theme
- `02a36afc3` feat: Add A2A Client Manager and tests
- `d18c96d6a` Record timestamp with code assist metrics.
- `b92360460` feat(telemetry): add clearcut logging for hooks
