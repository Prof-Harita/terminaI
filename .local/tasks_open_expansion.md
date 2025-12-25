# Open Items — Expand Beyond Gemini (Provider Optionality)

Source plan: `.local/plan_expand_beyond_gemini_vGPT5.2.md`

## Status vs Plan

### Phase 0: Gemini-compatible base URL override

- Implemented: `TERMINAI_GEMINI_BASE_URL` plumbed into
  `GoogleGenAI({ httpOptions.baseUrl })` in
  `packages/core/src/core/contentGenerator.ts`.
- Fixed: Base URL validation/normalization (http/https only; trailing slash
  behavior). Added unit tests proving `httpOptions.baseUrl` is only set when env
  var is present and invalid values rejected.

### Phase 1: Provider config model + settings

- Implemented:
  - `packages/core/src/core/providerTypes.ts` (provider union + capabilities)
  - `Config` stores providerConfig + exposes `getProviderConfig()` /
    `getProviderCapabilities()`
  - CLI settings schema adds `llm.*` keys and CLI config resolves
    `providerConfig`.
- Missing:
  - Tests for provider defaults + capability matrix.
  - CLI config tests for `llm.*` resolution (incl `auth.envVarName` key
    resolution and `llm.headers`).

### Phase 1: OpenAI-compatible generator

- Implemented: `packages/core/src/core/openaiContentGenerator.ts` + basic unit
  tests.
- Critical gaps/bugs (see next section).

### Phase 4/5: Capability gating + UX + debug metadata

- Implemented: About UI can display `provider` (AboutBox + aboutCommand +
  HistoryItem wiring).
- Missing:
  - Capability gating is not wired anywhere (citations, preview-model messaging,
    image handling, etc.).
  - About should show provider model + baseUrl host (sanitized) in addition to
    provider id.

## Critical correctness issues (must fix)

### 1) OpenAI generator ignores the actual request shape used by the app

**Fixed:** `OpenAIContentGenerator` now reads `request.config.tools`,
`request.config.systemInstruction`, and passes `request.config.abortSignal`
through to `fetch()`.

### 2) Model selection is inconsistent / ModelDialog changes don’t affect OpenAI requests

**Files:**

- `packages/cli/src/config/config.ts`
- `packages/core/src/core/openaiContentGenerator.ts`
- `packages/cli/src/ui/components/ModelDialog.tsx`
- `packages/cli/src/ui/commands/aboutCommand.ts`

**Mostly fixed:**

- CLI config now forces `Config.model` to the OpenAI model when
  `llm.provider=openai_compatible`.
- OpenAI generator now uses `request.model`.

**Still open:** confirm the model-routing stack doesn’t rewrite non-Gemini model
ids (and add a small integration test that the selected model string reaches the
OpenAI request body).

### 3) System role mapping is wrong for OpenAI messages

**Fixed:** system role now maps to OpenAI `system`.

### 4) Proxy support likely broken for OpenAI-compatible calls

**Fixed:** use ProxyAgent when gcConfig.getProxy() is set in fetchOpenAI method.

### 5) Unsupported modalities are silently dropped

**Fixed:** detect non-text parts (inlineData/fileData) and throw clear error in
generateContent and generateContentStream.

### 6) `countTokens()` is a hardcoded stub

**Fixed:** implement best-effort token estimation using estimateTokenCountSync
from utils/tokenCalculation.

## Missing tests (must protect Gemini OAuth + provider correctness)

### 1) Gemini OAuth regression tests

**Goal:** ensure default behavior still constructs Code Assist generator when
auth is OAuth.

Add/extend tests in:

- `packages/core/src/core/contentGenerator.test.ts`

Cases:

- default provider = Gemini AND `authType=LOGIN_WITH_GOOGLE` uses
  `createCodeAssistContentGenerator`.
- setting `TERMINAI_GEMINI_BASE_URL` must not affect OAuth paths.

### 2) OpenAI-compatible unit tests need to match production call shape

**Goal:** tests should build requests as `GeminiChat` does.

Update/add tests in:

- `packages/core/src/core/openaiContentGenerator.test.ts`

Cases:

- tools passed via `request.config.tools` are sent as OpenAI `tools`.
- systemInstruction passed via `request.config.systemInstruction` becomes OpenAI
  `system` message.
- streaming SSE: text deltas + tool call deltas + `[DONE]` handling.
- abort: an AbortController cancels streaming promptly.

### 3) CLI config mapping tests for `llm.*`

**Files:** `packages/cli/src/config/config.test.ts`

Cases:

- `llm.provider=openai_compatible` correctly populates providerConfig.
- `auth.envVarName` resolves to an apiKey when env is set.
- `llm.headers` are passed through.

## Capability gating / UX gaps

### 1) Wire `Config.getProviderCapabilities()` into UI

**Goal:** avoid Gemini-only UI in non-Gemini mode.

Targets (examples):

- citations display (`supportsCitations`)
- any Gemini preview-model messaging (`supports*` + provider check)
- model picker content should not advertise Gemini-only models when provider !=
  Gemini.

### 2) About should display effective provider metadata

**Goal:** supportability.

Show (sanitized):

- provider id
- effective model
- baseUrl host (no path/query/credentials)

## Future follow-ups (not required for MVP, but planned)

- Embeddings for OpenAI-compatible (`/embeddings`) with capability toggle.
- Images / multi-modal mapping.
- Anthropic provider implementation or explicit guidance to use
  OpenRouter/LiteLLM.
- Standardized error mapping (401/429/5xx) into user-actionable messages.
