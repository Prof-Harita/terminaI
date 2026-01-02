# Auth Wizard System — Implementation Tasks (mechanical checklist)

> **Purpose**: Extremely detailed, sequenced execution plan for implementing the
> auth wizard system across CLI + Desktop + A2A server.

> **Scope**: Phase 1 focuses on Gemini + web-remote/sidecar deferred-auth
> correctness. Multi-provider OAuth beyond Gemini remains “TBD” unless
> explicitly implemented later.

## Implementation Checklist

### Phase 1: Foundation

- [ ] Task 1: Ensure env aliasing runs in all CLI entrypoints

- [ ] Task 2: Add core wizard types + pure state machine

- [ ] Task 3: Add core wizard state machine unit tests

- [ ] Task 4: Add core provider registry + mapping to real settings keys

- [ ] Task 5: Add “apply wizard selection → settings patch” helpers

- [ ] Task 6: Add core “Gemini auth status (non-interactive)” helper

### Phase 2: Core Logic

- [ ] Task 7: Add core exported “begin OAuth loopback flow” API (returns
      `authUrl`)

- [ ] Task 8: Add unit tests for new OAuth begin API (minimal, deterministic)

- [ ] Task 9: Add A2A server deferred-auth mode plumbing (no auth at startup)

- [ ] Task 10: Make A2A server respect `security.auth.selectedType` (not
      env-only)

- [ ] Task 11: Implement `LlmAuthManager` (auth state machine + concurrency
      guard)

- [ ] Task 12: Implement `GET /auth/status` endpoint

- [ ] Task 13: Implement `POST /auth/gemini/api-key` endpoint (keychain +
      refreshAuth)

- [ ] Task 14: Implement `POST /auth/gemini/oauth/start` endpoint (returns
      `authUrl`, sets in-progress)

- [ ] Task 15: Implement `POST /auth/gemini/oauth/cancel` endpoint

- [ ] Task 16: Implement `POST /auth/gemini/vertex` endpoint (validate env/ADC +
      refreshAuth)

- [ ] Task 17: Add “auth required” gate to all LLM-executing endpoints

### Phase 3: Integration

- [ ] Task 18: Ensure web-remote/sidecar enables deferred auth by default

- [ ] Task 19: Desktop: add typed auth client (`/auth/*`) using signed headers

- [ ] Task 20: Desktop: add wizard UI shell + overlay plumbing in `App.tsx`

- [ ] Task 21: Desktop: implement Gemini OAuth step (open browser + poll +
      cancel)

- [ ] Task 22: Desktop: implement Gemini API key step (submit once; never
      persist)

- [ ] Task 23: Desktop: implement Vertex step (instructions + re-check)

- [ ] Task 24: CLI: add provider-selection wizard dialog (Ink) (Gemini vs
      OpenAI-compatible vs Anthropic)

- [ ] Task 25: CLI: wire wizard outputs to settings (`llm.provider`,
      `security.auth.selectedType`)

- [ ] Task 26: CLI: MVP OpenAI-compatible setup step (baseUrl/model/envVarName;
      no secret storage yet)

### Phase 4: Polish

- [ ] Task 27: Redact secrets in server logs and error messages (auth endpoints)

- [ ] Task 28: Atomic write for `oauth_creds.json` + multi-instance safety

- [ ] Task 29: Improve OAuth UX: timeout/error mapping + retry behavior

- [ ] Task 30: Handle corrupted/missing token files gracefully (status + clear +
      retry)

- [ ] Task 31: Add optional handshake field `llmAuthRequired` (nice-to-have)

### Phase 5: Testing

- [ ] Task 32: A2A server integration tests: “server starts when auth missing”

- [ ] Task 33: A2A server integration tests: `/auth/*` happy paths + error paths

- [ ] Task 34: CLI tests for provider wizard (Ink snapshots) + settings mapping

- [ ] Task 35: Desktop tests for auth client + wizard state transitions

- [ ] Task 36: Manual verification script + run preflight

---

### Task 1: Ensure env aliasing runs in all CLI entrypoints

**Objective**: Make `TERMINAI_*` and legacy `GEMINI_*` env vars behave
identically in CLI and sidecar runs.

**Prerequisites**: None

**Files to modify**:

- `packages/cli/src/gemini.tsx` — add a top-of-file side-effect import for env
  aliasing

- `packages/cli/src/utils/envAliases.ts` — keep as-is; ensure it’s actually used

**Detailed steps**:

1. Add this as the first import in `packages/cli/src/gemini.tsx`:

```typescript
import './utils/envAliases.js';
```

2. Confirm no circular import issues.

3. Add (or update) a unit test asserting `TERMINAI_API_KEY` mirrors to
   `GEMINI_API_KEY` early enough for `validateAuthMethod()` and
   `createContentGeneratorConfig()`.

**Definition of done**:

- [ ] Running CLI with only `TERMINAI_API_KEY` set behaves like `GEMINI_API_KEY`

- [ ] Test command to run:
      `npm test --workspace @terminai/cli -- packages/cli/src/config/auth.test.ts`

**Potential issues**:

- If `gemini.tsx` isn’t the actual entry used by the build, add the import to
  the real entry module (verify via build config).

---

### Task 2: Add core wizard types + pure state machine

**Objective**: Provide a shared, deterministic wizard state machine usable by
CLI and Desktop.

**Prerequisites**: Task 1

**Files to modify**:

- `packages/core/src/auth/wizardState.ts` — new pure state transitions

- `packages/core/src/index.ts` — export new module(s)

**Detailed steps**:

1. Create `packages/core/src/auth/wizardState.ts` with:

- `ProviderId = 'gemini' | 'openai_compatible' | 'anthropic'` (keep
  `openai`/`qwen` as later extensions if desired)

- `WizardStep = 'provider' | 'auth_method' | 'setup' | 'complete'`

- Pure functions: `createInitialState`, `selectProvider`, `selectAuthMethod`,
  `setError`, `completeSetup`

2. Ensure transitions encode:

- Providers without sub-options skip `auth_method`

- Back navigation is explicit (either include `back()` transition or implement
  “back” at UI level deterministically)

**Code snippets** (pattern):

```typescript
export type WizardStep = 'provider' | 'auth_method' | 'setup' | 'complete';

export interface WizardState {
  readonly step: WizardStep;

  readonly provider: ProviderId | null;

  readonly authMethod: AuthMethod | null;

  readonly error: string | null;
}
```

**Definition of done**:

- [ ] `packages/core` builds with the new file exported

- [ ] Test command to run: `npm run typecheck --workspace @terminai/core`

**Potential issues**:

- Don’t introduce `any`; use `unknown` and narrow if needed.

---

### Task 3: Add core wizard state machine unit tests

**Objective**: Lock down all required state transitions and edge cases.

**Prerequisites**: Task 2

**Files to modify**:

- `packages/core/src/auth/wizardState.test.ts` — new tests

**Detailed steps**:

1. Add tests for:

- Provider with sub-options → `auth_method`

- Provider without sub-options → `setup`

- OAuth selection → setup shows “open browser”

- API key selection → setup shows “text input”

- Error set/clear behavior

2. Encode “browser back during OAuth” as: user cancels OAuth → returns to
   `setup` or `auth_method` depending on UI decision (pick one, test it).

**Definition of done**:

- [ ] Tests cover the checklist scenarios in the review prompt

- [ ] Test command to run:
      `npm test --workspace @terminai/core -- packages/core/src/auth/wizardState.test.ts`

**Potential issues**:

- Keep tests deterministic; do not rely on timers unless using fake timers.

---

### Task 4: Add core provider registry + mapping to real settings keys

**Objective**: Centralize provider UI metadata and connect it to existing
settings schema (`security.auth.selectedType`, `llm.provider`, etc.).

**Prerequisites**: Task 2

**Files to modify**:

- `packages/core/src/auth/providerRegistry.ts` — new registry

- `packages/core/src/index.ts` — export

**Detailed steps**:

1. Create a registry describing each provider:

- display name, description

- auth methods available

- required input fields per method

2. Ensure Gemini auth methods map to existing `AuthType` values:

- OAuth → `AuthType.LOGIN_WITH_GOOGLE`

- API key → `AuthType.USE_GEMINI`

- Vertex → `AuthType.USE_VERTEX_AI`

**Definition of done**:

- [ ] Registry is consumable by both CLI and Desktop UIs

- [ ] Test command to run: `npm run typecheck --workspace @terminai/core`

**Potential issues**:

- Keep it data-only; no side effects.

---

### Task 5: Add “apply wizard selection → settings patch” helpers

**Objective**: Prevent a “parallel config file”; wizard must write to existing
settings keys only.

**Prerequisites**: Task 4

**Files to modify**:

- `packages/core/src/auth/wizardSettings.ts` — new helper returning a patch
  object

**Detailed steps**:

1. Implement a function like:

```typescript
export function buildWizardSettingsPatch(input: {
  provider: ProviderId;

  geminiAuthType?: AuthType;

  openaiCompatible?: { baseUrl: string; model: string; envVarName: string };
}): Array<{ path: string; value: unknown }>;
```

2. Patch targets:

- `security.auth.selectedType`

- `llm.provider`

- `llm.openaiCompatible.baseUrl`, `llm.openaiCompatible.model`,
  `llm.openaiCompatible.auth.type`, `llm.openaiCompatible.auth.envVarName`

**Definition of done**:

- [ ] CLI and Desktop can apply the same patch list deterministically

- [ ] Test command to run:
      `npm test --workspace @terminai/core -- packages/core/src/auth/wizardSettings.test.ts`
      (create this test)

**Potential issues**:

- Validate baseUrl normalization (`https://` + no trailing slash) to match
  existing core behavior.

---

### Task 6: Add core “Gemini auth status (non-interactive)” helper

**Objective**: Let web-remote/Desktop determine “auth required” without
triggering interactive OAuth.

**Prerequisites**: Task 1

**Files to modify**:

- `packages/core/src/auth/geminiAuthStatus.ts` — new helper

- `packages/core/src/index.ts` — export

**Detailed steps**:

1. Implement checks in order:

- If `security.auth.selectedType === USE_GEMINI`: check
  `process.env.GEMINI_API_KEY` or `await loadApiKey()`

- If `LOGIN_WITH_GOOGLE`: check existence + parseability of
  `Storage.getOAuthCredsPath()` (and optionally legacy fallback)

- If `USE_VERTEX_AI`: check
  `(GOOGLE_CLOUD_PROJECT && GOOGLE_CLOUD_LOCATION) || GOOGLE_API_KEY`

2. Return a typed result:

```typescript

{ status: 'ok' | 'required' | 'error'; message?: string }

```

**Definition of done**:

- [ ] A2A server can call this without network access

- [ ] Test command to run:
      `npm test --workspace @terminai/core -- packages/core/src/auth/geminiAuthStatus.test.ts`

**Potential issues**:

- Avoid logging secrets; never include env var values in messages.

---

### Task 7: Add core exported “begin OAuth loopback flow” API (returns `authUrl`)

**Objective**: Support Desktop-driven OAuth browser opening while keeping the
secure loopback callback flow in core.

**Prerequisites**: Task 6

**Files to modify**:

- `packages/core/src/code_assist/oauth2.ts` — refactor/export safe API

- `packages/core/src/index.ts` — export new function

**Detailed steps**:

1. Identify the code path that generates `authUrl` and starts the local callback
   server (currently internal).

2. Export a function like:

```typescript
export async function beginGeminiOAuthLoopbackFlow(): Promise<{
  authUrl: string;

  waitForCompletion: Promise<void>;

  cancel: () => void;
}>;
```

3. Ensure:

- `redirectUri` stays `http://localhost:<port>/oauth2callback`

- CSRF `state` is validated

- Timeout is enforced (5 minutes)

- Tokens are cached with `0600`

**Definition of done**:

- [ ] Can start OAuth without opening browser automatically

- [ ] Test command to run: `npm run typecheck --workspace @terminai/core`

**Potential issues**:

- Refactor carefully to avoid regressions in existing CLI OAuth flows.

---

### Task 8: Add unit tests for new OAuth begin API (minimal, deterministic)

**Objective**: Prevent regressions while keeping tests stable.

**Prerequisites**: Task 7

**Files to modify**:

- `packages/core/src/code_assist/oauth2.begin.test.ts` (or extend existing
  `oauth2.test.ts`)

**Detailed steps**:

1. Mock HTTP server binding and confirm:

- Returned `authUrl` contains `state=` and
  `redirect_uri=http://localhost:.../oauth2callback`

2. Do not test real browser open or Google token exchange.

3. Add a test for `cancel()` closing the server without throwing.

**Definition of done**:

- [ ] Test passes reliably in CI

- [ ] Test command to run:
      `npm test --workspace @terminai/core -- packages/core/src/code_assist/oauth2.test.ts`

**Potential issues**:

- Keep network fully mocked; avoid flakiness.

---

### Task 9: Add A2A server deferred-auth mode plumbing (no auth at startup)

**Objective**: Allow web-remote server to start even when LLM auth is missing.

**Prerequisites**: Task 6

**Files to modify**:

- `packages/a2a-server/src/http/app.ts` — detect defer mode, avoid blocking

- `packages/a2a-server/src/config/config.ts` — accept `{ deferLlmAuth }` and
  skip `refreshAuth`

**Detailed steps**:

1. Add an options object to `loadConfig(...)` and `createApp(...)`:

- `deferLlmAuth: boolean`

2. In defer mode:

- Still `await config.initialize()`

- Do **not** call `config.refreshAuth(...)`

3. Store “auth not ready” state in a manager (Task 11).

**Definition of done**:

- [ ] `terminai-cli --web-remote` starts and prints JSON handshake even with no
      tokens

- [ ] Test command to run:
      `npm test --workspace @terminai/a2a-server -- packages/a2a-server/src/http/app.test.ts`

**Potential issues**:

- Ensure no background code path still triggers OAuth during startup.

---

### Task 10: Make A2A server respect `security.auth.selectedType` (not env-only)

**Objective**: Ensure wizard-controlled auth selection is honored by server.

**Prerequisites**: Task 9

**Files to modify**:

- `packages/a2a-server/src/config/config.ts` — selection logic

**Detailed steps**:

1. Replace “env-only” selection (`USE_CCPA`, `GEMINI_API_KEY`, default OAuth)
   with:

- If `loadedSettings.merged.security?.auth?.selectedType` is present: use it

- Else fall back to env heuristics (keep current behavior)

2. In non-deferred mode, call `config.refreshAuth(selectedType)`.

**Definition of done**:

- [ ] Changing user settings changes server auth type deterministically

- [ ] Test command to run:
      `npm test --workspace @terminai/a2a-server -- packages/a2a-server/src/config/settings.test.ts`

**Potential issues**:

- Don’t break existing `USE_CCPA` behavior if it’s relied upon.

---

### Task 11: Implement `LlmAuthManager` (auth state machine + concurrency guard)

**Objective**: Centralize auth-required / in-progress / ok / error state and
prevent overlapping OAuth attempts.

**Prerequisites**: Task 9, Task 10

**Files to modify**:

- `packages/a2a-server/src/auth/llmAuthManager.ts` — new

- `packages/a2a-server/src/http/app.ts` — instantiate and share via
  closure/context

**Detailed steps**:

1. Create a manager with:

- `getStatus()`

- `submitGeminiApiKey(apiKey: string)`

- `startGeminiOAuth()` → returns `authUrl`

- `cancelGeminiOAuth()`

- `useGeminiVertex()` (validates env then `refreshAuth`)

2. Add an internal mutex:

- If OAuth already in progress, return `409` from endpoints.

**Definition of done**:

- [ ] Manager methods are unit-testable without starting the full server

- [ ] Test command to run:
      `npm test --workspace @terminai/a2a-server -- packages/a2a-server/src/auth/llmAuthManager.test.ts`

**Potential issues**:

- Ensure API key never appears in thrown error strings.

---

### Task 12: Implement `GET /auth/status` endpoint

**Objective**: Give Desktop (and web UI) a stable way to know whether to show
the wizard.

**Prerequisites**: Task 11

**Files to modify**:

- `packages/a2a-server/src/http/app.ts` — route registration

- (optional) `packages/a2a-server/src/http/authStatus.ts` — extracted route file

**Detailed steps**:

1. Add endpoint returning:

```json
{
  "status": "ok|required|in_progress|error",
  "authType": "...",
  "message": "..."
}
```

2. Ensure it’s protected by web-remote auth middleware (no bypass).

3. Ensure response never includes secrets.

**Definition of done**:

- [ ] Desktop can call it after `cli-ready`

- [ ] Test command to run:
      `npm test --workspace @terminai/a2a-server -- packages/a2a-server/src/http/endpoints.test.ts`

**Potential issues**:

- Make sure OPTIONS/CORS preflight still succeeds.

---

### Task 13: Implement `POST /auth/gemini/api-key` endpoint (keychain + refreshAuth)

**Objective**: Enable Desktop/CLI wizard to set Gemini API key securely.

**Prerequisites**: Task 11

**Files to modify**:

- `packages/a2a-server/src/http/app.ts` (or `http/llmAuth.ts`) — new endpoint

- Uses `@terminai/core` `saveApiKey` + `AuthType.USE_GEMINI`

**Detailed steps**:

1. Accept JSON: `{ apiKey: string }`

2. Validate: non-empty string, trimmed

3. Call `await saveApiKey(apiKey)` then
   `await config.refreshAuth(AuthType.USE_GEMINI)`

4. Return updated `/auth/status`

**Definition of done**:

- [ ] Key is not logged; key not stored in Desktop local storage

- [ ] Test command to run:
      `npm test --workspace @terminai/a2a-server -- packages/a2a-server/src/http/endpoints.test.ts`

**Potential issues**:

- HybridTokenStorage may behave differently in CI; mock it in tests.

---

### Task 14: Implement `POST /auth/gemini/oauth/start` endpoint

**Objective**: Start OAuth without blocking server startup; return `authUrl` so
Desktop can open browser.

**Prerequisites**: Task 7, Task 11

**Files to modify**:

- `packages/a2a-server/src/http/app.ts` (or `http/llmAuth.ts`)

- `packages/a2a-server/src/auth/llmAuthManager.ts`

**Detailed steps**:

1. Endpoint calls `llmAuthManager.startGeminiOAuth()` which:

- Calls core `beginGeminiOAuthLoopbackFlow()`

- Stores `{ inProgress: true }`

- Returns `authUrl`

- Awaits `waitForCompletion` in background; on success runs
  `config.refreshAuth(AuthType.LOGIN_WITH_GOOGLE)` (or updates status
  accordingly)

2. Return `{ authUrl }` immediately.

**Definition of done**:

- [ ] OAuth can be initiated from Desktop without hanging the server process

- [ ] Test command to run:
      `npm test --workspace @terminai/a2a-server -- packages/a2a-server/src/http/endpoints.test.ts`

**Potential issues**:

- Ensure only one OAuth attempt at a time; return `409` otherwise.

---

### Task 15: Implement `POST /auth/gemini/oauth/cancel` endpoint

**Objective**: Let user back out cleanly (browser back, close wizard, retry).

**Prerequisites**: Task 14

**Files to modify**:

- `packages/a2a-server/src/auth/llmAuthManager.ts`

- `packages/a2a-server/src/http/app.ts` (or route file)

**Detailed steps**:

1. Expose a cancel endpoint that:

- Calls the stored `cancel()` from core begin flow

- Clears `in_progress` state

2. Return `/auth/status`

**Definition of done**:

- [ ] Cancel returns wizard to a safe state; retries work

- [ ] Test command to run:
      `npm test --workspace @terminai/a2a-server -- packages/a2a-server/src/auth/llmAuthManager.test.ts`

**Potential issues**:

- Avoid leaving the loopback port bound after cancel.

---

### Task 16: Implement `POST /auth/gemini/vertex` endpoint

**Objective**: Support Vertex selection without storing secrets in clients.

**Prerequisites**: Task 11

**Files to modify**:

- `packages/a2a-server/src/auth/llmAuthManager.ts`

- `packages/a2a-server/src/http/app.ts`

**Detailed steps**:

1. Validate env prerequisites:

- `(GOOGLE_CLOUD_PROJECT && GOOGLE_CLOUD_LOCATION) || GOOGLE_API_KEY`

2. If satisfied: `await config.refreshAuth(AuthType.USE_VERTEX_AI)`

3. Return `/auth/status` with helpful error message if missing.

**Definition of done**:

- [ ] Vertex selection fails fast with actionable message

- [ ] Test command to run:
      `npm test --workspace @terminai/a2a-server -- packages/a2a-server/src/http/endpoints.test.ts`

**Potential issues**:

- Don’t attempt ADC discovery if it can hang; keep validation lightweight.

---

### Task 17: Add “auth required” gate to all LLM-executing endpoints

**Objective**: Prevent confusing failures and avoid accidental OAuth triggers
from background work.

**Prerequisites**: Task 9–16

**Files to modify**:

- `packages/a2a-server/src/http/app.ts` — wrap request handler

- Possibly `packages/a2a-server/src/agent/executor.ts` — early auth check before
  creating tasks

**Detailed steps**:

1. Add a wrapper around the request handler such that:

- If `llmAuthManager.getStatus().status !== 'ok'`, then:

- return a structured error payload (`AUTH_REQUIRED`) and do not execute agent
  tasks

2. Ensure `/auth/*` still works.

**Definition of done**:

- [ ] Calling `message/stream` without auth yields `AUTH_REQUIRED`
      deterministically

- [ ] Test command to run:
      `npm test --workspace @terminai/a2a-server -- packages/a2a-server/src/http/endpoints.test.ts`

**Potential issues**:

- Ensure the gate does not block `/ui` or `/healthz`.

---

### Task 18: Ensure web-remote/sidecar enables deferred auth by default

**Objective**: Make Desktop sidecar always boot quickly, even on clean machines.

**Prerequisites**: Task 9

**Files to modify**:

- `packages/a2a-server/src/http/app.ts` — choose defer default when
  `TERMINAI_SIDECAR=1`

- (optional) `packages/cli/src/utils/webRemoteServer.ts` — set env var
  explicitly

**Detailed steps**:

1. In `createApp()`, set `deferLlmAuth = process.env.TERMINAI_SIDECAR === '1'`
   unless explicitly overridden by a new env var.

2. Add an integration test that simulates `TERMINAI_SIDECAR=1` and missing
   creds; app must still start.

**Definition of done**:

- [ ] Desktop no longer hangs at “Starting agent backend…” when Gemini auth is
      missing

- [ ] Test command to run:
      `npm test --workspace @terminai/a2a-server -- packages/a2a-server/src/http/app.test.ts`

**Potential issues**:

- Don’t change behavior for non-sidecar users unless explicitly opted in.

---

### Task 19: Desktop: add typed auth client (`/auth/*`) using signed headers

**Objective**: Allow Desktop to call server auth endpoints securely (same
token + HMAC signing).

**Prerequisites**: Task 12

**Files to modify**:

- `packages/desktop/src/utils/agentClient.ts` — add helper functions

- (optional) new `packages/desktop/src/utils/llmAuthClient.ts`

**Detailed steps**:

1. Add functions:

- `getAuthStatus(baseUrl, token)`

- `startGeminiOAuth(baseUrl, token)`

- `cancelGeminiOAuth(baseUrl, token)`

- `submitGeminiApiKey(baseUrl, token, apiKey)`

- `useGeminiVertex(baseUrl, token)`

2. Ensure you never `console.log` request bodies.

**Definition of done**:

- [ ] Desktop can call `GET /auth/status` and parse result

- [ ] Test command to run:
      `npm test --workspace @terminai/desktop -- packages/desktop/src/utils/agentClient.test.ts`

**Potential issues**:

- Ensure `pathWithQuery` used in signature matches the actual endpoint path.

---

### Task 20: Desktop: add wizard UI shell + overlay plumbing in `App.tsx`

**Objective**: Show LLM auth wizard after sidecar is ready when server says auth
is required.

**Prerequisites**: Task 19

**Files to modify**:

- `packages/desktop/src/App.tsx` — add “llmAuthNeeded” state and overlay

- `packages/desktop/src/components/auth/*` — new components

**Detailed steps**:

1. Add a new state slice:

- `llmAuthStatus: 'unknown' | 'ok' | 'required' | 'in_progress' | 'error'`

2. After `agentToken` is set (sidecar ready), call `getAuthStatus()`.

3. If `required`, render the wizard overlay (separate from existing
   `AuthScreen`, which is for agent token).

**Definition of done**:

- [ ] Desktop renders main UI but blocks chat with a wizard overlay until LLM
      auth is ready

- [ ] Test command to run:
      `npm test --workspace @terminai/desktop -- packages/desktop/src/App.test.tsx`
      (create/update)

**Potential issues**:

- Avoid storing any provider secrets in Zustand persisted state.

---

### Task 21: Desktop: implement Gemini OAuth step (open browser + poll + cancel)

**Objective**: Complete OAuth by opening the returned `authUrl` and polling
`/auth/status`.

**Prerequisites**: Task 14, Task 20

**Files to modify**:

- `packages/desktop/src/components/auth/GeminiOAuthStep.tsx` — new

- `packages/desktop/src/App.tsx` — integrate step callbacks

**Detailed steps**:

1. On “Open browser”:

- Call `startGeminiOAuth()`, receive `authUrl`

- Open via Tauri opener plugin (or fallback to `window.open`)

2. Enter “waiting” state and poll `/auth/status` every 500–1000ms until:

- `ok` → close wizard

- `error` → show message + retry button

3. Add “Cancel” to call `cancelGeminiOAuth()`.

**Definition of done**:

- [ ] OAuth start, cancel, retry all function without app restart

- [ ] Manual verification: run Desktop with no creds; complete OAuth; chat works

**Potential issues**:

- Polling must stop on unmount; use `AbortController` or cleanup in `useEffect`.

---

### Task 22: Desktop: implement Gemini API key step (submit once; never persist)

**Objective**: Allow API key entry without leaking it to logs or local storage.

**Prerequisites**: Task 13, Task 20

**Files to modify**:

- `packages/desktop/src/components/auth/GeminiApiKeyStep.tsx` — new

**Detailed steps**:

1. Keep API key in local component state only.

2. Submit calls `submitGeminiApiKey()`.

3. On success:

- Clear local input state

- Refresh `/auth/status`

4. Ensure the settings store is not used for this key.

**Definition of done**:

- [ ] API key never appears in Zustand persisted state

- [ ] Manual verification: reload Desktop; key still works (stored server-side)

**Potential issues**:

- Be careful not to surface raw key in error messages.

---

### Task 23: Desktop: implement Vertex step (instructions + re-check)

**Objective**: Support Vertex without storing anything sensitive client-side.

**Prerequisites**: Task 16, Task 20

**Files to modify**:

- `packages/desktop/src/components/auth/GeminiVertexStep.tsx` — new

**Detailed steps**:

1. Show required env vars/ADC instructions.

2. Add “Re-check” button:

- Call `useGeminiVertex()` (or `getAuthStatus()` then `useGeminiVertex()`).

3. Show actionable error messages from server.

**Definition of done**:

- [ ] Vertex path succeeds when env is configured; otherwise shows specific
      missing requirements

- [ ] Manual verification: set env vars; click Re-check; auth becomes ok

**Potential issues**:

- On Desktop, env vars must be set for the sidecar process; document this in the
  UI.

---

### Task 24: CLI: add provider-selection wizard dialog (Ink)

**Objective**: Let CLI users choose provider (Gemini / OpenAI-compatible /
Anthropic) before auth method selection.

**Prerequisites**: Task 2–5

**Files to modify**:

- `packages/cli/src/ui/auth/ProviderWizard.tsx` — new

- `packages/cli/src/ui/components/DialogManager.tsx` — add new dialog route

- `packages/cli/src/ui/types.ts` (or similar) — add new auth-wizard UI state
  enum

**Detailed steps**:

1. Implement a simple arrow-key menu component (reuse existing shared selection
   components).

2. On selection, compute patch list using `buildWizardSettingsPatch(...)`.

3. Apply patch to `LoadedSettings` via
   `settings.setValue(SettingScope.User, ...)`.

4. Transition into existing `AuthDialog` for Gemini provider.

**Definition of done**:

- [ ] CLI first-run offers provider selection before Gemini auth dialog

- [ ] Test command to run:
      `npm test --workspace @terminai/cli -- packages/cli/src/ui/auth/ProviderWizard.test.tsx`

**Potential issues**:

- Keep “no skip” policy: exiting remains Ctrl+C, not a “skip” option.

---

### Task 25: CLI: wire wizard outputs to settings (`llm.provider`, `security.auth.selectedType`)

**Objective**: Make selections persist via `~/.terminai/settings.json`.

**Prerequisites**: Task 24

**Files to modify**:

- `packages/cli/src/ui/AppContainer.tsx` — decide when to show ProviderWizard

- `packages/cli/src/utils/firstRun.ts` — optionally mark onboarded after wizard
  completes

**Detailed steps**:

1. On startup, if no provider is configured (or if auth is missing), open
   ProviderWizard.

2. After completing provider+auth selection, call `markOnboardingComplete()`.

**Definition of done**:

- [ ] Second run does not re-show the wizard if auth is ok

- [ ] Manual verification: delete `~/.terminai`, run CLI, complete wizard,
      restart CLI, wizard not shown

**Potential issues**:

- Sandbox mode: ensure OAuth is still completed before sandbox launch (follow
  existing sandbox pre-auth logic).

---

### Task 26: CLI: MVP OpenAI-compatible setup step (baseUrl/model/envVarName; no secret storage yet)

**Objective**: Allow users to configure OpenAI-compatible provider without
introducing insecure key storage.

**Prerequisites**: Task 24–25

**Files to modify**:

- `packages/cli/src/ui/auth/OpenAICompatibleSetupDialog.tsx` — new

- `packages/core/src/auth/wizardSettings.ts` — ensure it can patch
  openaiCompatible fields

**Detailed steps**:

1. Add inputs for:

- Base URL

- Model ID

- Env var name for API key (default `OPENAI_API_KEY`)

2. Validate baseUrl starts with `https://` (or allow `http://` for local).

3. Persist to settings; instruct user to export the env var.

**Definition of done**:

- [ ] `llm.provider` set to `openai_compatible` and config builds

- [ ] Test command to run: `npm run typecheck --workspace @terminai/cli`

**Potential issues**:

- This won’t work if runtime expects stored keys; document the limitation
  explicitly.

---

### Task 27: Redact secrets in server logs and error messages (auth endpoints)

**Objective**: Guarantee API keys and tokens never show up in logs, even on
failures.

**Prerequisites**: Task 13–16

**Files to modify**:

- `packages/a2a-server/src/http/app.ts` — ensure request logging (if any)
  redacts

- `packages/a2a-server/src/auth/llmAuthManager.ts` — sanitize thrown errors

**Detailed steps**:

1. Add a `redactSecrets()` helper and use it on any logged payload.

2. Ensure errors returned from endpoints never include raw key material.

**Definition of done**:

- [ ] Grep logs/tests for `apiKey` values yields none

- [ ] Test command to run: `npm test --workspace @terminai/a2a-server`

**Potential issues**:

- Beware accidental logging in debug paths.

---

### Task 28: Atomic write for `oauth_creds.json` + multi-instance safety

**Objective**: Prevent token corruption when two processes authenticate at the
same time.

**Prerequisites**: Task 7

**Files to modify**:

- `packages/core/src/code_assist/oauth2.ts` — `cacheCredentials()` write
  strategy

- `packages/core/src/code_assist/oauth2.test.ts` — extend tests

**Detailed steps**:

1. Change write to:

- write to `oauth_creds.json.tmp`

- `fs.rename` to final path

- chmod to `0600`

2. Add a test verifying temp file path is used.

**Definition of done**:

- [ ] Credentials file is always valid JSON even under interruption

- [ ] Test command to run:
      `npm test --workspace @terminai/core -- packages/core/src/code_assist/oauth2.test.ts`

**Potential issues**:

- Windows rename semantics; handle overwrite safely.

---

### Task 29: Improve OAuth UX: timeout/error mapping + retry behavior

**Objective**: Ensure all OAuth error cases map to clear UI states with retry.

**Prerequisites**: Task 14–16, Task 21

**Files to modify**:

- `packages/a2a-server/src/auth/llmAuthManager.ts`

- `packages/desktop/src/components/auth/GeminiOAuthStep.tsx`

**Detailed steps**:

1. Normalize server errors into codes:

- `timeout`, `denied`, `state_mismatch`, `server_bind_failed`,
  `token_exchange_failed`

2. Desktop displays tailored instructions per code.

**Definition of done**:

- [ ] Each error path results in a retryable UI state

- [ ] Manual verification: simulate timeout, verify retry works

**Potential issues**:

- Avoid exposing internal stack traces to client.

---

### Task 30: Handle corrupted/missing token files gracefully (status + clear + retry)

**Objective**: Prevent “wedged” states when token file is malformed or deleted.

**Prerequisites**: Task 6, Task 12

**Files to modify**:

- `packages/core/src/auth/geminiAuthStatus.ts` — robust JSON parse handling

- `packages/a2a-server/src/auth/llmAuthManager.ts` — `clearGeminiAuth()` method

- `packages/a2a-server/src/http/app.ts` — optional `POST /auth/gemini/clear`

**Detailed steps**:

1. If parse fails, report `status=required` with message “credentials
   corrupted”.

2. Provide a clear endpoint that deletes creds and clears caches
   (`clearCachedCredentialFile()`).

**Definition of done**:

- [ ] Corrupted creds no longer crash server; wizard can recover

- [ ] Test command to run: `npm test --workspace @terminai/a2a-server`

**Potential issues**:

- Ensure file deletes are non-destructive and permission-safe.

---

### Task 31: Add optional handshake field `llmAuthRequired` (nice-to-have)

**Objective**: Let Desktop show the wizard instantly without an extra request.

**Prerequisites**: Task 12

**Files to modify**:

- `packages/cli/src/utils/webRemoteServer.ts` — include field in JSON handshake

- `packages/desktop/src-tauri/src/cli_bridge.rs` — parse and emit the field (if
  present)

- `packages/desktop/src/hooks/useSidecar.ts` — store in sidecar state

**Detailed steps**:

1. Extend handshake JSON to include `llmAuthRequired`.

2. Desktop uses that to decide whether to immediately render wizard overlay.

**Definition of done**:

- [ ] Desktop shows wizard without waiting for `/auth/status` (still calls it to
      confirm)

- [ ] Manual verification: first-run shows wizard immediately

**Potential issues**:

- Keep backward compatibility: field may be absent.

---

### Task 32: A2A server integration tests: “server starts when auth missing”

**Objective**: Lock in the critical non-blocking behavior.

**Prerequisites**: Task 9, Task 18

**Files to modify**:

- `packages/a2a-server/src/http/app.test.ts` — add new test case(s)

**Detailed steps**:

1. Start app with `TERMINAI_SIDECAR=1` and no creds.

2. Assert:

- server starts

- `GET /auth/status` returns `required`

**Definition of done**:

- [ ] Test passes in CI

- [ ] Test command to run:
      `npm test --workspace @terminai/a2a-server -- packages/a2a-server/src/http/app.test.ts`

**Potential issues**:

- Use random ports to avoid collisions.

---

### Task 33: A2A server integration tests: `/auth/*` happy paths + error paths

**Objective**: Ensure endpoints are correct, authenticated, and safe.

**Prerequisites**: Task 12–16

**Files to modify**:

- `packages/a2a-server/src/http/endpoints.test.ts` — add auth endpoint coverage

**Detailed steps**:

1. Test unauthorized requests return 401.

2. Test API key path calls `saveApiKey` and results in `ok` (mock refreshAuth).

3. Test OAuth start returns an `authUrl` and sets `in_progress` (mock begin
   flow).

**Definition of done**:

- [ ] Endpoint suite covers required error handling matrix at least at
      API-contract level

- [ ] Test command to run:
      `npm test --workspace @terminai/a2a-server -- packages/a2a-server/src/http/endpoints.test.ts`

**Potential issues**:

- Mock core OAuth begin flow to avoid real network.

---

### Task 34: CLI tests for provider wizard (Ink snapshots) + settings mapping

**Objective**: Prevent UI regressions and ensure deterministic settings writes.

**Prerequisites**: Task 24–26

**Files to modify**:

- `packages/cli/src/ui/auth/ProviderWizard.test.tsx` — new

- `packages/cli/src/ui/AppContainer.test.tsx` — update if needed

**Detailed steps**:

1. Snapshot test the provider list rendering.

2. Simulate selection, assert settings patch applied.

**Definition of done**:

- [ ] Tests pass and snapshots are stable

- [ ] Test command to run: `npm test --workspace @terminai/cli`

**Potential issues**:

- Ink rendering can be sensitive; keep snapshots minimal.

---

### Task 35: Desktop tests for auth client + wizard state transitions

**Objective**: Prevent accidental secret persistence and ensure retry logic
works.

**Prerequisites**: Task 19–23

**Files to modify**:

- `packages/desktop/src/utils/agentClient.test.ts`

- `packages/desktop/src/components/auth/*.test.tsx`

**Detailed steps**:

1. Mock fetch and verify signed headers exist.

2. Verify API key is not written into settings store.

3. Verify polling stops on unmount.

**Definition of done**:

- [ ] Tests pass

- [ ] Test command to run: `npm test --workspace @terminai/desktop`

**Potential issues**:

- Ensure tests run in jsdom and don’t require Tauri runtime.

---

### Task 36: Manual verification script + run preflight

**Objective**: Provide a reliable end-to-end validation procedure and enforce
repo rules.

**Prerequisites**: All tasks above

**Files to modify**:

- `docs-terminai/troubleshooting.md` (optional) — append exact manual steps

- `local/auth_wizard_implementation_tasks.md` — append an “E2E Manual
  Verification” section if preferred

**Detailed steps**:

1. Document manual flows for:

- Desktop sidecar first run (no creds) → wizard → OAuth → chat works

- Desktop retry/cancel

- CLI first run → provider selection → Gemini auth dialog → chat works

- Web-remote server starts even when auth required

2. Run: `npm run preflight`

**Definition of done**:

- [ ] Manual steps are written and reproducible

- [ ] Preflight passes: `npm run preflight`

**Potential issues**:

- CI may differ for keychain-backed storage; ensure tests mock token storage.
