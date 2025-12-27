# Expand Beyond Gemini (Provider Optionality) — Code Review & Follow-ups

> Scope: add `openai_compatible` provider support (OpenAI-style
> `/chat/completions`) while keeping Gemini API key + OAuth (Code Assist) flows
> intact.

## Overall assessment

The implementation is **shippable for basic text+tools OpenAI-compatible usage**
and **does not regress Gemini OAuth** when the provider remains `gemini`. The
core adapter (`OpenAIContentGenerator`) is reasonably complete (auth, headers,
proxy, streaming, tool calls, token estimation) and is integrated via a clean
provider switch in `createContentGenerator`.

Primary remaining gaps are **capability-aware UX**, **a few high-value
regression/integration tests**, and **schema/tooling correctness for strict
OpenAI servers**.

## What looks good

- **Provider plumbing end-to-end**: settings schema → CLI config → core
  `Config.getProviderConfig()` → generator selection.
- **OAuth path preserved (when provider is Gemini)**:
  `AuthType.LOGIN_WITH_GOOGLE` still routes to Code Assist generator.
- **Gemini base URL override hardened**: validation + trailing-slash
  normalization + tests.
- **OpenAI adapter basics covered**:
  - Auth modes: bearer, api-key header, none
  - Optional extra headers
  - Proxy via `ProxyAgent` when `Config.getProxy()` is set
  - Streaming SSE parsing with text delta yields
  - Tool call (non-stream) parsing and streamed accumulation
  - Token counting uses `estimateTokenCountSync` rather than a stub
  - Clear error for unsupported modalities (images/files)
- **UI is minimally aware of provider**: About box shows provider/effective
  model/baseUrl host; ModelDialog supports custom model entry in OpenAI mode.

## Issues / gaps found

### P0 — correctness / regression risk

1. **Tool schema conversion is currently a pass-through and may be incompatible
   with strict OpenAI implementations**
   - `convertSchemaToOpenAI()` returns the Gemini `Schema` object as-is.
   - Gemini’s `Type` enum values (e.g. `Type.OBJECT`) may serialize to values
     that are **not valid JSON Schema** (`"OBJECT"` vs `"object"`), and may
     break tool registration.

2. **No regression test proving Gemini OAuth ignores `TERMINAI_BASE_URL`**
   - Code is correct today (baseUrl override only in API-key/Vertex branches),
     but it’s an easy future regression.

3. **No integration test proving the chosen OpenAI model string reaches the
   outbound request body unchanged**
   - There’s unit coverage of config resolution and generator behavior, but no
     “wiring” test that verifies
     `ModelDialog/--model → loadCliConfig → request.model/body.model`.

### P1 — UX / capability gating

4. **Provider capabilities are defined but not used in CLI UI**
   - `getProviderCapabilities()` exists (and is tested), but UI still treats
     some features as globally available.
   - Example: citations display toggles (`showCitations()` in
     `useGeminiStream.ts`) are only gated by settings, not by
     `supportsCitations`.

5. **Console noise in core adapter**
   - `OpenAIContentGenerator` uses `console.warn(...)` on parse failures.
   - Prefer existing logging facilities (or at least gate behind debug mode) to
     avoid polluting CLI output.

### P2 — streaming hardening / test depth

6. **Streaming tool-call accumulation and edge cases lack coverage**
   - Missing tests for multi-chunk tool call args assembly, `[DONE]` edge cases,
     malformed chunks, and abort cancellation.

## Follow-up tasks (recommended)

### P0 (do before broad release)

- [x] **Implement real JSON Schema conversion for tools** in
      `OpenAIContentGenerator.convertSchemaToOpenAI()`
  - Map Gemini `Type` → JSON Schema `type` (`OBJECT→object`, `STRING→string`,
    etc.), recurse through `properties/items`, and strip Gemini-only fields.
- [x] **Add regression tests for Gemini OAuth + baseUrl override**
  - `AuthType.LOGIN_WITH_GOOGLE` with `TERMINAI_BASE_URL` set should _not_ pass
    `baseUrl` into `createCodeAssistContentGenerator`.
- [x] **Add a wiring test for OpenAI model routing**
  - Verify that when `llm.provider=openai_compatible` and `--model custom-x`,
    the outbound OpenAI request body includes `model: "custom-x"`.

### P1

- [x] **Apply capability gating in UI**
  - Use `config.getProviderCapabilities()` (or equivalent) to hide/disable
    citations, JSON schema-related UI, image-related UI, etc.
- [x] **Replace `console.warn` in `OpenAIContentGenerator`** with structured
      logging (and/or debug-mode-only warnings).

### P2

- [x] **Expand OpenAI streaming tests**
  - Multi-chunk tool calls (name+args deltas)
  - Abort signal handling
  - Malformed/partial SSE chunks
  - Finish chunks that contain only `finish_reason` (no content)

## Notes

- `createContentGenerator()` currently selects the OpenAI generator **before**
  checking `authType`. This is consistent with “provider overrides auth”, but
  it’s worth confirming the intended UX (e.g. what happens if a user previously
  logged in with Google, then switches provider to OpenAI-compatible).
