# Plan vGPT5.2: Expand TerminaI Beyond Gemini (Provider Optionality) — Without Breaking Google OAuth

## Executive Summary

We should expand TerminaI to support **multiple model providers**
(OpenAI-compatible endpoints, OpenRouter, self-hosted models, etc.) **without
touching the existing Gemini OAuth path**.

The previous plan over-indexed on Ollama and suggested a global fetch
interceptor. That is the wrong abstraction for “ultimate optionality” and
introduces unnecessary blast radius.

**Recommendation:**

1. **Do it** — but reframe as **protocol adapters + capability gating**, not
   “Ollama support”.
2. Preserve Gemini OAuth as the default path and treat everything else as
   **opt-in**.
3. Avoid global fetch interception; prefer **SDK-supported base URL override**
   (for Gemini-compatible endpoints) and/or add a clean **OpenAI-compatible
   provider**.

If Google OAuth breaks, the app dies. This plan makes Google OAuth the “safe
lane” and isolates optional providers behind a provider boundary.

---

## Non-Negotiable Constraint

### Gemini OAuth must remain pristine

- The **default behavior** (no extra configuration) must continue to use:
  - `AuthType.LOGIN_WITH_GOOGLE` / `AuthType.COMPUTE_ADC` (existing flows)
  - the current Google SDK + current request/stream logic
- Any new provider code must be:
  - gated behind an explicit setting/env var/flag
  - test-covered so it cannot regress the default OAuth flow

---

## Reality Check: “OAuth for ChatGPT subscription”

There is no dependable, official, consumer-grade OAuth flow that converts a
**ChatGPT consumer subscription** into OpenAI API access. In practice:

- OpenAI API access: **API keys** (or a customer-managed gateway that mints
  tokens).
- Anthropic: **API keys** (or via OpenRouter/LiteLLM).

So the product promise should be:

> “Bring any provider via standard protocols (API keys/bearer tokens + base
> URLs), while keeping Gemini OAuth first-class.”

Not:

> “We’ll implement vendor login for every provider.”

---

## Current Architecture Snapshot (Relevant Pieces)

### Core generation is centralized

- `packages/core/src/core/contentGenerator.ts`
  - constructs `GoogleGenAI` for API-key / Vertex flows
  - uses Code Assist generator for OAuth/ADC flows
  - already supports custom headers and an auth mechanism toggle

### Gemini SDK already supports base URL override

In `@google/genai`, requests use an internal `httpOptions.baseUrl` (defaults to
`https://generativelanguage.googleapis.com/`). That means:

- We can support “Gemini-compatible endpoints” by passing **baseUrl** into
  `GoogleGenAI({ httpOptions: { baseUrl } })`.
- We do **not** need a global fetch interceptor.

### Tool calling and streaming assume `@google/genai` shapes

Types like `Content`, `Part`, `Tool`, `GenerateContentResponse` are used broadly
throughout core and UI.

This is the primary coupling risk when adding other providers.

---

## Why the Previous “Global Fetch Interceptor” Approach Is Not the Right Choice

### It increases blast radius

Global fetch interception can accidentally affect:

- telemetry exporters
- extension downloads
- web tools
- IDE integrations
- anything else that uses `fetch`

### It’s unnecessary

For the Gemini SDK path, base URL override exists already.

### It’s the wrong abstraction for “ultimate optionality”

Optionality isn’t “redirect Google requests to localhost”; it’s:

- selecting a provider
- selecting a protocol
- providing credentials
- adapting streaming/tool-calling semantics
- gating UI and behavior by capability

---

## Product/Tech Framing: Protocol Adapters (Not Ollama)

To maximize optionality while minimizing bespoke integrations, support
**protocol families**:

1. **Gemini protocol** (current; keep OAuth + API-key)
2. **OpenAI-compatible protocol**
   - covers OpenAI API, OpenRouter, LiteLLM, vLLM gateways, LM Studio,
     self-hosted OpenAI-compatible endpoints, and Ollama _if a user chooses to
     expose OpenAI-compatible endpoints_
3. (Optional later) **Anthropic-native**
   - only if needed; otherwise handled by OpenRouter/LiteLLM

This avoids hardcoding Ollama and gives users “use whatever you want”.

---

## Proposed Target Architecture

### Principle: Preserve the “Gemini OAuth safe lane”

- Provider default is **Gemini**.
- Gemini OAuth and current flows remain unchanged.
- Additional providers are opt-in.

### A. Provider selection: first-class configuration

Introduce a provider configuration concept (names illustrative):

- `llm.provider`: `gemini` | `openai_compatible` | `anthropic` (optional)
- `llm.baseUrl`: string
- `llm.auth`:
  - `apiKey` | `bearer` | `none` (for local gateways)
- `llm.apiKey`: string (generally via env var or secure storage)
- `llm.defaultModel`: string
- `llm.headers`: map<string,string>
- `llm.capabilitiesOverrides` (optional): manual toggles if needed

We do **not** remove existing Gemini settings; we add this as an additional,
advanced layer.

### B. Implement providers as `ContentGenerator` implementations

Keep the rest of the app stable by adding new generators behind the existing
interface.

#### 1) Gemini SDK generator (existing)

- Continue using `GoogleGenAI` / Code Assist generator.
- Add _optional_ baseUrl override via SDK option.

#### 2) OpenAI-compatible generator (new)

- Implements `generateContent`, `generateContentStream`, `countTokens`
  (best-effort), and `embedContent` (optional / later).
- Translates TerminaI’s current request semantics into OpenAI-compatible
  payloads.
- Parses streaming (SSE) and emits `GenerateContentResponse`-shaped chunks so
  existing streaming pipeline stays stable.
- Translates tool calling:
  - OpenAI tool calls → `functionCall` parts
  - tool results are already sent back via `functionResponse` parts

### C. Capability matrix (so UX doesn’t “feel broken”)

Add a small provider capability descriptor used by UI and core logic:

- `supportsTools`
- `supportsStreaming`
- `supportsEmbeddings`
- `supportsJsonSchema`
- `supportsCitations`
- `supportsImages`

Then gate:

- citations display
- model dialog messaging (currently Gemini preview specific)
- any Gemini-only flows (quota checks, preview model access messaging)

---

## Recommended Delivery Strategy (Phased)

### Phase 0: Gemini-compatible base URL override (low risk)

Goal: allow routing Gemini SDK traffic to a **Gemini-compatible endpoint**
(proxy/emulator) with minimal change.

Key point: **no global fetch interception**.

### Phase 1: OpenAI-compatible provider (max optionality)

Goal: unlock OpenRouter + self-hosted OpenAI-compatible stacks.

### Phase 2: UX + support boundaries

Goal: reduce support burden with explicit provider display, capability gating,
safe error messages, and strict non-regression of OAuth.

### Phase 3 (Optional): Anthropic-native

Only if required; otherwise, recommend OpenRouter/LiteLLM.

---

## Key Risks and Mitigations

### Risk 1: Gemini types are pervasive

**Mitigation:** use adapter generators that output `@google/genai`-compatible
shapes to avoid refactoring the entire app.

### Risk 2: Tool calling semantics differ across protocols

**Mitigation:** implement the OpenAI adapter to emit `functionCall` parts and
accept `functionResponse` parts, matching TerminaI’s existing tool loop.

### Risk 3: Users will blame TerminaI for provider quality

**Mitigation:**

- clearly show active provider/model/baseUrl host in UI (About/Debug)
- include provider metadata in error reports and bug templates
- define support boundaries (“we support the protocol; we don’t support your
  model quality”)

### Risk 4: Gemini OAuth regression

**Mitigation:**

- feature gate provider selection
- add regression tests that run the OAuth path and ensure no codepath changes
- default provider remains Gemini

---

# FULL TASK LIST

## Conventions for this task list

- Each task includes:
  - **Goal**
  - **Files to inspect/edit** (approximate)
  - **Acceptance criteria**
  - **Tests to add/adjust**
- Do tasks in order.
- Do not break Gemini OAuth.

---

## 0. Preparation / Discovery

### 0.1 Identify current auth flows and invariants

**Goal:** document (in your head / notes) which auth types exist and how they
are used.

**Inspect:**

- `packages/core/src/core/contentGenerator.ts`
- `packages/core/src/config/config.ts` (`refreshAuth`)
- `packages/cli/src/config/auth.ts`
- `packages/cli/src/ui/auth/useAuth.ts`

**Acceptance criteria:**

- You can clearly describe:
  - what triggers OAuth vs API key vs Vertex
  - which code constructs the generator
  - where model routing occurs

---

## 1. Phase 0 — Gemini-compatible base URL override (no interceptor)

### 1.1 Define configuration surface for Gemini base URL override

**Goal:** allow advanced users to set a Gemini SDK base URL while leaving
defaults unchanged.

**Design choice:** use an env var first (minimal UI/setting changes), then
optionally a settings field.

**Proposed env var:** `TERMINAI_GEMINI_BASE_URL` (or reuse `GEMINI_BASE_URL` if
you prefer, but avoid ambiguous names).

**Files to edit:**

- `packages/core/src/core/contentGenerator.ts`

**Implementation notes:**

- When constructing `GoogleGenAI`, set:
  - `httpOptions: { headers, baseUrl: <override> }`
- Normalize baseUrl:
  - must be `http://` or `https://`
  - ensure trailing slash exists (SDK expects baseUrl normalization)
- Only apply override for **Gemini SDK path** (`AuthType.USE_GEMINI` and
  possibly `AuthType.USE_VERTEX_AI` if you want Vertex endpoints too — but
  default should remain unchanged).

**Acceptance criteria:**

- With env var unset: behavior identical.
- With env var set: traffic goes to the new baseUrl.
- Gemini OAuth path is untouched.

**Tests:**

- Add a unit test around generator creation verifying that `httpOptions.baseUrl`
  is set only when env var is present.
  - You can mock `GoogleGenAI` constructor usage.

### 1.2 Add safety logs and metadata (debug-only)

**Goal:** make it obvious when someone is using a custom base URL.

**Files:**

- `packages/core/src/core/contentGenerator.ts`
- optionally a debug logger surface

**Acceptance criteria:**

- In debug mode, log: provider=gemini, baseUrl host, auth type.
- Never print credentials.

---

## 2. Phase 1 — Introduce a Provider Configuration Model (still default Gemini)

### 2.1 Add provider config type(s) in core

**Goal:** centralize provider configuration and pass it through config.

**Files (new/modified):**

- `packages/core/src/core/providerTypes.ts` (new)
  - `LlmProviderId` enum
  - `ProviderConfig` union
  - `ProviderCapabilities`
- `packages/core/src/config/config.ts`
  - store current provider selection and config

**Acceptance criteria:**

- Config can return `getProviderConfig()` and `getProviderCapabilities()`.
- Default provider is `gemini`.

**Tests:**

- Unit tests for default provider and capability values.

### 2.2 Wire settings → provider config (minimal viable)

**Goal:** add settings keys for provider selection without breaking existing
schema loading.

**Files:**

- `packages/cli/src/config/settingsSchema.ts`
- `packages/cli/src/config/settings.ts`
- `packages/cli/src/config/config.ts` (loader)

**Suggested settings shape:**

- `llm.provider`
- `llm.openaiCompatible.baseUrl`
- `llm.openaiCompatible.model`
- `llm.openaiCompatible.auth.type`
- `llm.openaiCompatible.auth.envVarName` (optional; prefer env vars)
- `llm.headers` (map)

**Acceptance criteria:**

- Settings loading works with no changes for existing users.
- If provider settings absent, provider defaults to Gemini.

**Tests:**

- Settings schema validation tests for new keys.

---

## 3. Phase 1 — Implement OpenAI-Compatible Content Generator

### 3.1 Create the generator skeleton

**Goal:** add a new `ContentGenerator` implementation.

**Files (new):**

- `packages/core/src/core/openai/openaiCompatibleContentGenerator.ts`

**Responsibilities:**

- `generateContent` (non-streaming)
- `generateContentStream` (streaming)
- `countTokens` (best-effort; can be approximate initially)
- `embedContent` (optional; can throw “unsupported” initially)

**Acceptance criteria:**

- It compiles and can be instantiated.
- It does not affect Gemini path.

### 3.2 Implement request translation (Gemini-like → OpenAI-like)

**Goal:** convert TerminaI’s current request objects into OpenAI-compatible
request payloads.

**Implementation details:**

- Convert `contents: Content[]` into `messages: {role, content}` with tool call
  support.
- Map roles:
  - Gemini `user` → OpenAI `user`
  - Gemini `model` → OpenAI `assistant`
- Map parts:
  - text parts → content
  - functionCall parts → OpenAI tool calls
  - functionResponse parts → tool result messages
- System instruction:
  - map Gemini `systemInstruction` into OpenAI `system` message (or
    request-level field depending on API)

**Acceptance criteria:**

- A simple prompt returns assistant text.
- A tool call roundtrip works: model requests a tool; TerminaI executes; tool
  result is sent; model continues.

### 3.3 Implement streaming (SSE) and chunk mapping

**Goal:** support streaming output and tool call streaming semantics.

**Notes:**

- OpenAI-compatible streaming yields deltas; you must accumulate into
  TerminaI-compatible chunk objects.
- Emit chunks that can be consumed by existing code expecting
  `GenerateContentResponse`.

**Acceptance criteria:**

- Streaming output appears incrementally in UI.
- Abort signal cancels promptly.
- Errors map to TerminaI’s error handling.

### 3.4 Implement auth + headers

**Goal:** support API key / bearer / none.

**Notes:**

- Never log tokens.
- Support custom headers.

**Acceptance criteria:**

- Works with OpenRouter / LiteLLM style headers.

### 3.5 Integrate generator selection into `createContentGenerator`

**Goal:** choose generator based on provider config while keeping default Gemini
behavior.

**Files:**

- `packages/core/src/core/contentGenerator.ts`
- optionally `packages/core/src/config/config.ts` changes to pass provider
  settings

**Acceptance criteria:**

- Default: Gemini OAuth still works.
- Provider set to openai-compatible: uses new generator.

**Tests:**

- Regression tests for Gemini OAuth path: ensure no changes.
- New tests for openai-compatible path with mocked HTTP.

---

## 4. Capability Gating + UI Changes (Prevent “Broken UX”)

### 4.1 Add provider-aware capability checks

**Goal:** UI and core features degrade gracefully.

**Files:**

- `packages/core/src/config/config.ts` (capabilities getter)
- `packages/cli/src/ui/...` components that currently assume Gemini

**Acceptance criteria:**

- Citations UI only appears if supported.
- Gemini preview messaging only appears for Gemini provider.

### 4.2 Update Model Dialog to support non-Gemini

**Goal:** avoid hardcoding Gemini models.

**Files:**

- `packages/cli/src/ui/components/ModelDialog.tsx`

**Approach (MVP):**

- If provider is Gemini: keep existing UX.
- Else:
  - show a simple input/select for `model` string
  - show provider + baseUrl host

**Acceptance criteria:**

- Gemini users see unchanged dialog.
- Non-Gemini users can set a model name.

---

## 5. Support Boundaries / Debuggability

### 5.1 Always show active provider metadata in About/Debug

**Goal:** reduce support burden.

**Files:**

- `packages/cli/src/ui/components/AboutBox.tsx`
- any debug drawer surfaces

**Acceptance criteria:**

- Display provider id, model, and baseUrl host (no credentials).

---

## 6. Testing Plan (Must Protect Gemini OAuth)

### 6.1 Add hard regression tests for Gemini OAuth

**Goal:** guarantee “app is dead if OAuth breaks” doesn’t happen.

**Tests to add:**

- Ensure default provider remains Gemini.
- Ensure OAuth auth type selection still constructs Code Assist generator path.
- Ensure new provider settings do not change OAuth behavior.

### 6.2 Add tests for OpenAI-compatible streaming + tools

**Goal:** cover the hardest parts.

**Approach:**

- Use MSW or equivalent request mocking already used in repo.
- Test:
  - streaming text
  - tool call request
  - tool result
  - continuation
  - abort
  - error mapping

---

## 7. Rollout / Compatibility

### 7.1 Feature gating

**Goal:** ship safely.

**Approach:**

- Keep provider selection hidden behind advanced settings at first.
- Default remains Gemini.
- Add a “provider experimental” toggle if needed.

**Acceptance criteria:**

- Existing users are unaffected.
- Advanced users can opt-in.

---

## Definition of Done (DoD)

1. Gemini OAuth flows work exactly as before.
2. OpenAI-compatible provider can:
   - stream text
   - execute tool calls
3. UI does not show Gemini-only elements for non-Gemini providers.
4. Provider metadata is visible for support/debug.
5. Tests cover:
   - Gemini OAuth regression
   - OpenAI-compatible core scenarios
