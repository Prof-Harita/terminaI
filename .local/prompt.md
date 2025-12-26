You are an autonomous senior engineer working in the repo at
/home/profharita/Code/terminaI (Node 20+, TS monorepo). Your job is to implement
all remaining open items in .local/tasks_open_expansion.md (treat that file as
the single source of truth for what’s still missing), without breaking existing
Gemini OAuth flows.

Hard constraints (non-negotiable) • Do not break Gemini OAuth
(AuthType.LOGIN_WITH_GOOGLE / COMPUTE_ADC) or change its behavior. • Default
behavior (no new settings) must remain Gemini. • Do not update docs/READMEs
unless a test forces it (avoid docs/\* changes). • Avoid new dependencies unless
already present in the repo. • No global fetch interception. • Keep changes
minimal and consistent with existing patterns.

Required workflow

1.  Open and follow: .local/tasks_open_expansion.md
2.  Implement remaining items in order of risk (start with correctness + tests,
    then UX gating).
3.  After each meaningful change, keep tests green.
4.  When an item is completed, update `.local/tasks_open_expansion.md` to mark
    it fixed (move from “open” to “fixed” with a short note and file
    references).

Mandatory validators (must pass at end)

Run these and fix failures: • npm run lint • npm run typecheck • npm run test
--workspace @terminai/core --if-present • npm run test --workspace @terminai/cli
--if-present

Scope of remaining work (deliverables)

Implement everything still “open” in .local/tasks_open_expansion.md,
specifically:

A) Gemini baseUrl override hardening (Phase 0) • Add strict
validation/normalization for TERMINAI_BASE_URL in
packages/core/src/core/contentGenerator.ts: • Only allow http:// or https:// •
Normalize trailing slash behavior consistently • Fail fast with a clear error
message (no secrets logged) • Add unit tests in
packages/core/src/core/contentGenerator.test.ts proving: • baseUrl is applied
only when env var is set • invalid values are rejected

B) Provider/capabilities tests • Add tests for provider defaults + capability
matrix: • packages/core/src/core/providerTypes.ts •
packages/core/src/config/config.ts • Add CLI config mapping tests for llm.\* in
packages/cli/src/config/config.test.ts: • llm.provider=openai_compatible
produces correct providerConfig • auth.envVarName resolution behavior •
llm.headers pass-through

C) OpenAI-compatible provider completeness • Proxy support: ensure
OpenAI-compatible calls honor Config.getProxy() (use the repo’s existing
proxy-aware fetch utilities/patterns rather than raw global fetch if needed). •
Unsupported modalities: if messages include non-text parts
(images/inlineData/fileData), throw a clear actionable error for
OpenAI-compatible mode (since supportsImages=false right now). Add tests. •
countTokens(): replace the hardcoded stub with a best-effort implementation
(prefer existing token estimation utilities already in core). Add tests.

D) Streaming/tool-call/error-path tests for OpenAI provider

Add meaningful tests (core workspace) covering: • streaming text deltas •
streaming tool-call deltas (accumulation + final functionCall parts) •
abort/cancellation behavior • error mapping (non-2xx responses include status +
body) Use existing testing tooling already in repo (Vitest/MSW if appropriate).

E) Capability gating + UX cleanup

Wire Config.getProviderCapabilities() into CLI UI so non-Gemini providers don’t
show Gemini-only UX, including: • citations UI (only if supportsCitations) •
preview-model marketing text in ModelDialog (only for Gemini provider) Audit
likely components under packages/cli/src/ui/components/\* and gate
appropriately.

F) About box supportability improvements

Extend About display to include sanitized provider metadata: • provider id
(already) • effective model • baseUrl host only (no credentials, no querystring)
Update tests accordingly.

Definition of done • All items that were “open” in
.local/tasks_open_expansion.md are implemented and marked fixed there. • All
validators listed above pass. • Gemini OAuth behavior remains unchanged (prove
via tests where feasible).
