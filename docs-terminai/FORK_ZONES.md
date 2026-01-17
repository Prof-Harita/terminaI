# Fork Zone Classification

> **Last Reviewed:** 2026-01-15  
> **Audit Status:** Verified against actual codebase  
> **Update Policy:** Update this file when creating new divergences from
> upstream

---

## Zone Taxonomy

TerminaI uses a three-tier classification for upstream sync decisions:

| Zone            | Meaning                                  | Sync Action                          |
| --------------- | ---------------------------------------- | ------------------------------------ |
| 🔴 **CANON**    | TerminaI is the source of truth          | Ignore upstream changes; we own this |
| 🟢 **LEVERAGE** | We deliberately use upstream innovations | Cherry-pick or merge cleanly         |
| ⚪ **SKIP**     | Google-specific or irrelevant            | Auto-skip entirely                   |

---

## 🔴 CANON — TerminaI Owns These

Files in this zone have been significantly modified or created by TerminaI. **Do
not merge upstream changes**—we are the canonical source.

### Multi-LLM Provider Layer

Upstream is Gemini-only. We support OpenAI, ChatGPT OAuth, and Anthropic.

| File/Path                                                | Our Divergence                                                                     |
| -------------------------------------------------------- | ---------------------------------------------------------------------------------- |
| `packages/core/src/core/providerTypes.ts`                | `LlmProviderId` enum with `OPENAI_COMPATIBLE`, `OPENAI_CHATGPT_OAUTH`, `ANTHROPIC` |
| `packages/core/src/core/contentGenerator.ts`             | Multi-provider routing                                                             |
| `packages/core/src/core/openaiContentGenerator.ts`       | OpenAI-compatible content generator                                                |
| `packages/core/src/core/chatGptCodexContentGenerator.ts` | ChatGPT Codex backend generator (587 lines)                                        |
| `packages/core/src/core/apiKeyCredentialStorage.ts`      | API key storage for non-Google providers                                           |
| `packages/core/src/core/baseLlmClient.ts`                | Shared LLM client abstraction                                                      |

### ChatGPT OAuth Module (NEW - TerminaI Only)

| File/Path                                               | Purpose                                    |
| ------------------------------------------------------- | ------------------------------------------ |
| `packages/core/src/openai_chatgpt/oauthClient.ts`       | OAuth flow (PKCE, token exchange, refresh) |
| `packages/core/src/openai_chatgpt/credentialStorage.ts` | Token persistence with `lastRefresh`       |
| `packages/core/src/openai_chatgpt/imports.ts`           | Import from Codex CLI / OpenCode           |
| `packages/core/src/openai_chatgpt/jwt.ts`               | JWT decode for `chatgpt_account_id`        |
| `packages/core/src/openai_chatgpt/constants.ts`         | OAuth URLs, client ID, scopes              |
| `packages/core/src/openai_chatgpt/types.ts`             | Credential types                           |

### Auth Wizard & Provider Registry

| File/Path                                    | Our Divergence                              |
| -------------------------------------------- | ------------------------------------------- |
| `packages/core/src/auth/wizardState.ts`      | Multi-provider wizard state machine         |
| `packages/core/src/auth/wizardSettings.ts`   | Settings application for multiple providers |
| `packages/core/src/auth/providerRegistry.ts` | Provider metadata registry                  |

### Brain / Thinking Frameworks (NEW - TerminaI Only)

| File/Path                                         | Purpose                        |
| ------------------------------------------------- | ------------------------------ |
| `packages/core/src/brain/index.ts`                | Brain module entry             |
| `packages/core/src/brain/thinkingOrchestrator.ts` | PAC/thinking coordination      |
| `packages/core/src/brain/frameworkSelector.ts`    | Thinking framework selection   |
| `packages/core/src/brain/pacLoop.ts`              | Plan-Act-Critique loop         |
| `packages/core/src/brain/riskAssessor.ts`         | Risk assessment for tool calls |
| `packages/core/src/brain/toolIntegration.ts`      | Brain-tool bridging            |
| `packages/core/src/brain/advisors/*`              | Advisory modules               |
| `packages/core/src/brain/*.ts`                    | All 20+ brain modules          |

### Voice Mode (NEW - TerminaI Only)

| File/Path                                       | Purpose                    |
| ----------------------------------------------- | -------------------------- |
| `packages/cli/src/voice/voiceController.ts`     | Voice mode controller      |
| `packages/cli/src/voice/VoiceStateMachine.ts`   | Voice state management     |
| `packages/cli/src/voice/AudioController.ts`     | Audio I/O                  |
| `packages/cli/src/voice/stt/*`                  | Speech-to-text integration |
| `packages/cli/src/voice/tts/*`                  | Text-to-speech integration |
| `packages/cli/src/commands/voice.ts`            | Voice command entry        |
| `packages/cli/src/ui/components/VoiceOrb.tsx`   | Voice UI component         |
| `packages/cli/src/ui/contexts/VoiceContext.tsx` | Voice React context        |

### Settings & Configuration

| File/Path                                     | Our Divergence                                                                     |
| --------------------------------------------- | ---------------------------------------------------------------------------------- |
| `packages/core/src/config/settings/schema.ts` | Extended with `llm.openaiCompatible.*`, `llm.openaiChatgptOauth.*`, brain settings |
| `packages/core/src/config/settings/loader.ts` | Unified settings loader (CLI/A2A parity)                                           |
| `packages/core/src/config/builder.ts`         | Shared config construction                                                         |
| `packages/core/src/config/brainAuthority.ts`  | Brain authority resolution                                                         |
| `packages/cli/src/config/settings.ts`         | Thin wrapper (logic in core)                                                       |

### Token Storage Layer

| File/Path                                                       | Our Divergence              |
| --------------------------------------------------------------- | --------------------------- |
| `packages/core/src/mcp/token-storage/hybrid-token-storage.ts`   | Keychain with file fallback |
| `packages/core/src/mcp/token-storage/keychain-token-storage.ts` | Keychain integration        |
| `packages/core/src/mcp/token-storage/file-token-storage.ts`     | Encrypted file storage      |
| `packages/core/src/mcp/oauth-provider.ts`                       | Extended MCP OAuth          |
| `packages/core/src/mcp/oauth-token-storage.ts`                  | Token persistence           |

### Branding & Entry Points

| File/Path                     | Our Divergence                  |
| ----------------------------- | ------------------------------- |
| `packages/cli/src/gemini.tsx` | Entry point (TerminaI branding) |
| `README.md`                   | TerminaI branding               |
| `package.json` (name field)   | `terminai-monorepo`             |
| `.terminai/*` vs `.gemini/*`  | Config directory branding       |

### TerminaI-Added Packages

| Package                    | Purpose                             |
| -------------------------- | ----------------------------------- |
| `packages/evolution-lab/*` | Test harness, question generation   |
| `packages/a2a-server/*`    | Agent-to-Agent communication server |
| `packages/desktop/*`       | Desktop application                 |
| `packages/web-client/*`    | Web client                          |
| `packages/cloud-relay/*`   | Cloud relay service                 |
| `packages/termai/*`        | Core TerminaI package               |

### Logger (Modified)

| File/Path                               | Our Divergence             |
| --------------------------------------- | -------------------------- |
| `packages/core/src/core/logger.ts`      | JSONL format (O(1) writes) |
| `packages/core/src/core/logger.ts`      | JSONL format (O(1) writes) |
| `packages/core/src/core/logger.test.ts` | Tests for JSONL format     |

### Build Infrastructure (NEW - TerminaI Only)

| File/Path              | Our Divergence                          |
| ---------------------- | --------------------------------------- |
| `turbo.json`           | Turborepo configuration                 |
| `package.json`         | `packageManager` (npm@11), `workspaces` |
| `scripts/verify-ci.sh` | Optimized for Turbo caching             |
| `scripts/build.js`     | Invokes `turbo run build`               |

---

## 🟢 LEVERAGE — Take Upstream Innovations

Files in this zone are maintained primarily by upstream. We want their
improvements. **Cherry-pick or merge directly** unless we've made minor
modifications.

### Core Engine (Process Execution)

| File/Path                                             | Why We Leverage                                    |
| ----------------------------------------------------- | -------------------------------------------------- |
| `packages/core/src/services/shellExecutionService.ts` | node-pty improvements, spawn logic                 |
| `packages/core/src/services/gitService.ts`            | Git integration                                    |
| `packages/core/src/services/fileSystemService.ts`     | File operations                                    |
| `packages/core/src/core/turn.ts`                      | Turn execution logic                               |
| `packages/core/src/core/coreToolScheduler.ts`         | Tool scheduling                                    |
| `packages/core/src/core/geminiChat.ts`                | Gemini-specific chat (we keep for Gemini provider) |

### Tools (NOT brain-integrated ones)

| File/Path                                    | Why We Leverage    |
| -------------------------------------------- | ------------------ |
| `packages/core/src/tools/read-file.ts`       | File reading       |
| `packages/core/src/tools/web-fetch.ts`       | Web fetching       |
| `packages/core/src/tools/repl.ts`            | REPL tool          |
| `packages/core/src/tools/process-manager.ts` | Process management |
| Most `packages/core/src/tools/*.ts`          | Generic tools      |

**EXCEPTION:** Tools that reference `brainAuthority` have TerminaI
modifications:

- `packages/core/src/tools/shell.ts` (modified)
- `packages/core/src/tools/write-file.ts` (modified)
- `packages/core/src/tools/edit.ts` (modified)
- `packages/core/src/tools/ui-click.ts` (modified)

### MCP Core (non-auth parts)

| File/Path                            | Why We Leverage |
| ------------------------------------ | --------------- |
| `packages/core/src/mcp/client.ts`    | MCP client      |
| `packages/core/src/mcp/server.ts`    | MCP server      |
| `packages/core/src/mcp/transport.ts` | Transport layer |

### Prompts & Policy

| File/Path                                    | Why We Leverage                             |
| -------------------------------------------- | ------------------------------------------- |
| `packages/core/src/prompts/*`                | System prompts                              |
| `packages/core/src/policy/*`                 | Policy engine (unless brain-related)        |
| `packages/core/src/safety/approval-ladder/*` | Approval ladder (except domain classifiers) |

### Security Fixes (All Zones)

**Always prioritize security fixes** regardless of zone. If upstream patches a
vulnerability in a CANON file, we must evaluate and apply an equivalent fix.

---

## ⚪ SKIP — Irrelevant to TerminaI

Files in this zone are Google-specific or not relevant. **Auto-skip during
sync.**

| Category                | Examples                                      |
| ----------------------- | --------------------------------------------- |
| Google telemetry        | `clearcut/*`, proprietary telemetry endpoints |
| Google IDE integrations | `vscode-ide-companion/*` (unless we adopt it) |
| Seasonal/cosmetic       | Holiday themes, splash animations             |
| Internal Google tooling | Build scripts for internal systems            |
| Version bump chores     | Minor version bumps without code changes      |

### Google Telemetry (DELETED)

> [!IMPORTANT] Google telemetry code has been **completely removed** from
> TerminaI, not just skipped.

| Component              | Status                        |
| ---------------------- | ----------------------------- |
| `clearcut-logger/*`    | **Deleted**                   |
| `gcp-exporters.ts`     | **Deleted**                   |
| `TelemetryTarget.GCP`  | **Removed from enum**         |
| `telemetry_gcp.js`     | **Deleted**                   |
| `@google-cloud/*` deps | **Removed from package.json** |

TerminaI enforces **local-only telemetry** for privacy. Remote OTLP endpoints
are blocked at runtime.

See: [terminai_telemetry.md](terminai_telemetry.md) for full details.

---

## Quick Reference for Sync Decisions

| Upstream File Changed                                 | Zone     | Action                                      |
| ----------------------------------------------------- | -------- | ------------------------------------------- |
| `packages/core/src/auth/*`                            | CANON    | **Ignore** – we own auth                    |
| `packages/core/src/core/providerTypes.ts`             | CANON    | **Ignore** – we own providers               |
| `packages/core/src/brain/*`                           | CANON    | **Ignore** – we created this                |
| `packages/core/src/openai_chatgpt/*`                  | CANON    | **Ignore** – we created this                |
| `packages/cli/src/voice/*`                            | CANON    | **Ignore** – we created this                |
| `packages/core/src/services/shellExecutionService.ts` | LEVERAGE | **Take** – we want node-pty improvements    |
| `packages/core/src/tools/read-file.ts`                | LEVERAGE | **Take** if no brain hooks                  |
| `packages/core/src/tools/shell.ts`                    | CANON    | **Evaluate** – has brain integration        |
| `packages/core/src/prompts/system.ts`                 | LEVERAGE | **Evaluate** – may want prompt improvements |
| `clearcut/*`                                          | SKIP     | **Ignore** – Google telemetry               |

---

## Zone Boundaries Diagram

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         TerminaI Codebase                               │
│                                                                         │
│  ┌───────────────────────────────────────────────────────────────────┐  │
│  │  🔴 CANON: TerminaI Owns                                          │  │
│  │                                                                   │  │
│  │   Multi-LLM Providers        Brain Frameworks       Voice Mode   │  │
│  │   • providerTypes.ts         • brain/*              • voice/*     │  │
│  │   • contentGenerator.ts      • thinkingOrch.ts      • VoiceOrb    │  │
│  │   • openaiContentGen.ts      • pacLoop.ts           • stt/tts     │  │
│  │   • chatGptCodexGen.ts       • riskAssessor.ts                    │  │
│  │   • openai_chatgpt/*         • advisors/*                         │  │
│  │                                                                   │  │
│  │   Settings Schema            Token Storage          Branding      │  │
│  │   • schema.ts                • HybridTokenStorage   • gemini.tsx  │  │
│  │   • llm.openai*              • keychain-*           • README.md   │  │
│  │                              • oauth-*                            │  │
│  │                                                                   │  │
│  │   NEW Packages: evolution-lab, a2a-server, desktop, cloud-relay   │  │
│  │                                                                   │  │
│  └───────────────────────────────────────────────────────────────────┘  │
│                                                                         │
│  ┌───────────────────────────────────────────────────────────────────┐  │
│  │  🟢 LEVERAGE: Take Upstream Innovations                           │  │
│  │                                                                   │  │
│  │   Core Engine          Tools (non-brain)      MCP (non-auth)      │  │
│  │   • shellExecution     • read-file.ts         • client.ts         │  │
│  │   • turn.ts            • web-fetch.ts         • transport.ts      │  │
│  │   • geminiChat.ts      • repl.ts                                  │  │
│  │                                                                   │  │
│  │   Prompts & Policy                                                │  │
│  │   • system prompts                                                │  │
│  │   • approval ladder                                               │  │
│  │                                                                   │  │
│  └───────────────────────────────────────────────────────────────────┘  │
│                                                                         │
│  ┌───────────────────────────────────────────────────────────────────┐  │
│  │  ⚪ SKIP: Irrelevant                                              │  │
│  │                                                                   │  │
│  │   Google Telemetry     IDE Companions      Seasonal               │  │
│  │   • clearcut/*         • vscode-*          • holiday themes       │  │
│  │                                                                   │  │
│  └───────────────────────────────────────────────────────────────────┘  │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## Adding New CANON Files (Checklist)

When diverging a new file from upstream:

1. [ ] Add the file to the **CANON** zone table above
2. [ ] Update the **Last Reviewed** date at the top
3. [ ] Document the divergence reason in the table
4. [ ] If it's a new subsystem, add a sub-section
5. [ ] Commit this change with your PR
6. [ ] Consider adding a CI guard if the file is critical (see
       `upstream_sync_protection.md`)

---

## Changelog

| Date       | Author      | Change                                                                                                                                                                      |
| ---------- | ----------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 2025-12-28 | Antigravity | Initial document                                                                                                                                                            |
| 2026-01-15 | Antigravity | Complete rewrite based on codebase audit: documented `openai_chatgpt/`, `brain/`, `voice/`, multi-provider layer, token storage. Three-tier taxonomy (CANON/LEVERAGE/SKIP). |
