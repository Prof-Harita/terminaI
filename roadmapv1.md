# Purpose of this roadmap:

To transform termAI from a "vibe-coded fork" into a sovereign, defensible
venture with a clear path to v0.21.0 and beyond. This roadmap details the
critical steps for rebranding, architectural independence, system operations
capabilities, and enterprise-grade governance.

Criticality legend: [H] High (Launch Blocker): Must exist for v0.21.0 release.
[M] Medium (Fast Follow): "Coming Soon" in the docs; acceptable to ship v1.0
without it but needs stubs. [L] Low (Nice to Have): purely strictly value-add
for later.

# Chapter 0: Infrastructure Decoupling & Repo Setup (New)

## Why

Establish a sovereign GitHub identity while preserving the "Standing on
Shoulders of Giants" credit history. This severing is crucial to be seen as a
standalone project rather than just a downstream fork.

## What:

1. [H] **Repo Detachment (The "Hard Fork")**: Create a new, empty public
   repository on GitHub called `terminai` (do not use the "Fork" button). Rename
   the local `origin` to `upstream`, add the new repo as `origin`, and push the
   history (`git push -u origin main`). Result: You keep every commit and
   contributor from Google, but the repo header on GitHub no longer says "forked
   from...". --- ** dONE **
2. [H] **Website Repo Integration**: Link the `terminai-website` repo in your
   main `README.md` under a "Documentation" section. Set up a git submodule or
   just a simple link to keep them loosely coupled.
3. [H] **CI/CD "De-Googling"**:
   - **Audit Workflows**: Delete `.github/workflows/release-nightly.yml` and
     `release-docker.yml` as these likely rely on internal Google secrets.
   - **Create Sovereign Release**: Create
     `.github/workflows/release-terminai.yml` that uses `npm publish` with your
     own `NPM_TOKEN`.
   - **Tauri Build**: Create `.github/workflows/build-desktop.yml` that runs
     `cargo tauri build` for Mac/Linux/Windows artifacts.
   - **Dependabot**: Review `.github/dependabot.yml`. Keep it, but ensure it
     targets your new package names.

# Chapter 1: Execute the "Hostile Rebrand" (Scrub Identity)

## Why

Sever the visual and technical link to the "Gemini CLI" to encourage community
contribution and investor trust. If a developer sees `@google/gemini-md` in
`package.json`, they won't contribute; they’ll just wait for Google to fix it.

## What:

1. [H] **Project Root**: Rename `package.json` field "name" from
   `@google/gemini-md` to `terminai-monorepo`.
2. [H] **Core Package**: Edit `packages/core/package.json`: change name to
   `@terminai/core`.
3. [H] **CLI Package**: Edit `packages/cli/package.json`:
   - Change name to `@terminai/cli`.
   - Change `"bin": { "gemini": "..." }` to
     `"bin": { "terminai": "./index.ts" }`.
4. [H] **A2A Server Package**: Edit `packages/a2a-server/package.json`: change
   name to `@terminai/a2a-server`.
5. [H] **Global Constants**: Open `packages/core/src/config/constants.ts`:
   - Change `APP_NAME` from "gemini" to "terminai".
   - Change `USER_AGENT` string to include `termAI/0.21.0`.
6. [H] **Path Resolution**: Edit `packages/core/src/utils/paths.ts`:
   - Modify `getAppConfigDir()` to look for `.terminai` instead of `.gemini`.
   - Modify `getAppDataDir()` to ensure session logs are stored in
     `~/.terminai/sessions`.
7. [H] **License Headers**: Run a regex search-and-replace across the entire
   `packages/` directory:
   - Find: `Copyright 2024 Google LLC`
   - Replace:
     `Copyright 2024 Google LLC\n// Portions Copyright 2025 termAI Authors`.
     This asserts sovereignty while staying legally compliant.
8. [H] **Internal Imports**: Update all cross-package imports. Search for
   `import ... from '@google/gemini-md-core'` and replace with
   `import ... from '@terminai/core'`.
9. [H] **Binary Name in UI**: Open
   `packages/cli/src/ui/components/AboutBox.tsx`. Update the ASCII art or text
   to strictly say "termAI".
10. [H] **Zsh/Bash Completions**: Update `scripts/create_alias.sh` to target the
    `terminai` command instead of `gemini`.
11. [H] **Config File Naming**: Update `packages/core/src/config/config.ts` to
    look for `terminai.yaml` instead of `config.yaml`.
12. [H] **Cleanup Scripts**: Edit `scripts/clean.js` to ensure it removes build
    artifacts labeled under the new namespace.
13. [H] **Documentation References**: Search `docs-terminai/*.md` for any
    remaining "official Google tool" claims and pivot them to "Sovereign Agentic
    Shell".
14. [H] **GitHub Action Workflows**: Update `.github/workflows/ci.yml` and
    others to use the new package names for caching and publishing.
15. [H] **Telemetry Namespacing**: Edit
    `packages/core/src/telemetry/constants.ts` to change the telemetry event
    prefix from `gemini_cli/` to `terminai/`.

# Chapter 2: Independence Layer (Model Abstraction)

## Why

Stop being a "Gemini fork" by making the LLM backend pluggable, even if you keep
Gemini as the default. You are currently a "slave" to Gemini because your core
logic imports the Gemini SDK directly. The existence of a `ModelProvider`
interface tells the world: "We aren't a Google project; we are a shell that
currently uses Google's engine."

## What:

1. [H] **Define Interface**: Create `packages/core/src/core/types/provider.ts`
   defining `BaseModelProvider`.
2. [H] **Extract Gemini Logic**: Move the content of
   `packages/core/src/core/geminiRequest.ts` into a new class `GeminiProvider`
   implementing `BaseModelProvider`.
3. [H] **Refactor ContentGenerator**: Edit
   `packages/core/src/core/contentGenerator.ts`:
   - Remove direct dependencies on `@google/genai`.
   - Inject `BaseModelProvider` via the constructor.
4. [H] **Router Decoupling**: Edit
   `packages/core/src/routing/modelRouterService.ts`. Modify `getModelConfig` to
   return a provider-neutral config object.
5. [H] **Mock Provider for Testing**: Create
   `packages/core/src/core/providers/mockProvider.ts` to allow unit tests to run
   without API keys.
6. [M] **Ollama Bridge**: Create
   `packages/core/src/core/providers/ollamaProvider.ts` (skeleton) to show the
   community how to add local models.
7. [L] **Anthropic Adapter**: Create
   `packages/core/src/core/providers/anthropicProvider.ts` (skeleton).
8. [H] **Update Client Factory**: Edit `packages/core/src/core/client.ts` to use
   a factory pattern: `ProviderFactory.create(config.provider)`.
9. [H] **Config Schema Update**: Edit `schemas/settings.schema.json` to add a
   `provider` field (enum: `google`, `anthropic`, `ollama`).
10. [H] **Settings Validation**: Update
    `packages/cli/src/config/settings-validation.ts` to validate keys based on
    the selected provider.
11. [M] **Tool Calling Abstraction**: Abstract the tool-call format in
    `packages/core/src/tools/tools.ts` so it can be converted to/from OpenAI or
    Anthropic tool syntax.
12. [H] **System Prompt Injection**: Ensure the system prompt in
    `packages/core/src/core/prompts.ts` is formatted correctly for different
    providers (e.g., system role vs developer role).
13. [M] **Token Counting Logic**: Move token estimation in
    `packages/core/src/utils/tokenCalculation.ts` into provider1-specific
    strategies.
14. [M] **Error Mapping**: Create
    `packages/core/src/core/providers/errorMapper.ts` to normalize 429 (Rate
    Limit) errors across different APIs.
15. [H] **Context Caching Toggle**: Ensure the "Context Caching" feature in
    `packages/core/src/core/geminiChat.ts` is only active when the provider is
    `google`.

# Chapter 3: Ship the "System Operator" Recipe Pack

## Why

Move the focus from "prompting an LLM" to "running verified system operations."
Your USP is being "Claude Code for Systems." You need to prove it.

## What:

1. [H] **Recipe Directory**: Create `packages/core/src/policy/recipes/`.
2. [H] **WiFi Diagnostic Recipe**: Create `wifi-fix.toml` including commands
   like `nmcli`, `ip link`, and `ping`. Set policy level to read-only for status
   and write for restart.
3. [H] **Docker Cleanup Recipe**: Create `docker-prune.toml`. Include
   `docker system prune -f`. Set policy to `yolo` for non-production
   environments.
4. [H] **Windows Registry Recipe**: Create `registry-clean.toml`. Target
   specific temporary keys. Set policy to `high-risk-prompt`.
5. [H] **DNS Troubleshooter**: Create `dns-debug.toml` using `dig` and
   `nslookup`.
6. [H] **Disk Space Recovery**: Create `disk-purge.toml` targeting `/var/log` or
   Windows Temp.
7. [H] **Service Restarter**: Create `systemd-manager.toml`.
8. [H] **TOML Loader Update**: Edit `packages/core/src/policy/toml-loader.ts`.
   Add a method `loadBuiltInRecipes()` that scans the new `recipes/` folder on
   startup.
9. [H] **Agent Card Registry**: Edit `packages/core/src/agents/registry.ts`.
   Register these recipes as "System Agents" that can be summoned via `@system`.
10. [H] **Discovery Logic**: Edit
    `packages/core/src/services/fileDiscoveryService.ts` to recognize common
    system paths for logs and configs.
11. [H] **Prompt Template**: Create
    `packages/core/src/core/prompts/system-operator.ts` to give termAI
    instructions on how to act as a SysAdmin.
12. [H] **Safety Defaults**: Update
    `packages/core/src/policy/policies/read-only.toml` to include all "safe"
    status commands (e.g., `uptime`, `whoami`, `top`).
13. [H] **YOLO Expansion**: Add dangerous system commands to
    `packages/core/src/policy/policies/yolo.toml` with strict warnings.
14. [H] **Recipe Validation**: Add a script `scripts/validate-recipes.ts` to
    ensure all TOML files meet the policy schema.
15. [H] **CLI Examples**: Add a "Help" section in
    `packages/cli/src/ui/components/Help.tsx` specifically for "System
    Operations".

# Chapter 4: Hardened "Black Box" Audit Log

## Why

Enterprises and power users will only give "YOLO" permission if they have an
unerasable audit trail. Provide a non-repudiable log of every shell action taken
by the AI, essential for enterprise trust.

## What:

1. [H] **Audit Store**: Create `packages/core/src/persistence/auditLog.ts`.
2. [H] **SQLite Integration**: Add `better-sqlite3` to `packages/core` to manage
   a local `audit.db`.
3. [H] **Schema Definition**: Create a table with columns: `timestamp`,
   `session_id`, `command`, `policy_level`, `status` (success/fail),
   `approval_type` (auto/manual).
4. [H] **Hook Implementation**: Edit
   `packages/core/src/core/coreToolScheduler.ts`. Inside `executeTool`, add a
   `this.auditLog.record()` call before and after execution.
5. [H] **Shell Permission Capture**: Edit
   `packages/core/src/utils/shell-permissions.ts` to log whenever a command is
   blocked or allowed.
6. [H] **Log Rotation**: Implement a 30-day rotation policy in `auditLog.ts`.
7. [H] **ReadOnly View**: Create a hidden slash command `/audit` in
   `packages/cli/src/ui/hooks/slashCommandProcessor.ts` to view the last 20
   entries.
8. [H] **Integrity Check**: Add a SHA-256 hashing mechanism to each log entry to
   detect manual tampering of the audit file.
9. [H] **Context Injection**: Allow termAI to read its own audit log to learn
   from past command failures.
10. [H] **Export Tool**: Create `packages/core/src/tools/export-audit.ts` to
    allow users to generate a JSON report of AI actions.
11. [H] **Privacy Filter**: Ensure the audit log redacts sensitive strings (like
    API keys) by integrating `packages/core/src/telemetry/sanitize.ts` into the
    audit logger.
12. [H] **Metadata Capture**: Log the thought (reasoning) behind each command to
    provide context for the audit.
13. [H] **Session Linking**: Link audit entries to the session artifacts stored
    in `packages/core/src/services/chatRecordingService.ts`.
14. [H] **Error Tracing**: Ensure STDOUT/STDERR of failed AI commands are
    captured in the audit entry.
15. [H] **Performance**: Ensure audit logging is asynchronous so it doesn't
    block the terminal UI.

# Chapter 5: Standardize the A2A (Agent-to-Agent) RFC

## Why

This is your infrastructure moat. You want termAI to be the "Control Plane" or
local server for every other agent on the machine (like a Python script or
another LLM) to interact with the machine securely.

## What:

1. [H] **Formalize RFC**: Rewrite
   `packages/a2a-server/development-extension-rfc.md` into
   `A2A_PROTOCOL_SPEC.md`.
2. [H] **Policy Proxying**: Ensure that any command sent via A2A passes through
   the `packages/core/src/policy/policy-engine.ts`.
3. [H] **Example Client**: Create
   `packages/a2a-server/examples/python_client.py` to demonstrate the protocol.
4. [M] **Capability Negotiation**: Edit `packages/a2a-server/src/types.ts`. Add
   a `Capabilities` interface (e.g., `filesystem:read`, `terminal:write`).
5. [M] **JSON-RPC Migration**: Refactor `packages/a2a-server/src/http/server.ts`
   to use a standard JSON-RPC 2.0 structure for requests.
6. [M] **Auth Token Handshake**: Implement a "pairing" flow where an external
   agent must provide a token generated by the termAI CLI
   (`terminai auth-token`).
7. [M] **Session Multiplexing**: Edit
   `packages/a2a-server/src/agent/executor.ts` to support multiple concurrent
   agent connections.
8. [M] **Event Stream (SSE)**: Enhance `packages/a2a-server/src/http/replay.ts`
   to stream real-time shell output back to the connected agent.
9. [M] **Agent Metadata**: Allow external agents to send a name and version so
   the UI can show: "Python Script 'DeployBot' is requesting root access."
10. [M] **Discovery Service**: Implement a simple DNS-SD (mDNS) or file-based
    discovery so other local tools can find the termAI server port.
11. [M] **Handshake timeout**: Implement strict timeouts in
    `packages/a2a-server/src/http/app.ts` for unauthenticated requests.
12. [M] **Rate Limiting**: Add a local rate-limiter for A2A requests to prevent
    a runaway script from nuking the API quota.
13. [M] **CORS Hardening**: Edit `packages/a2a-server/src/http/cors.ts` to only
    allow localhost and specific app origins.
14. [M] **Graceful Shutdown**: Ensure the A2A server cleans up all PTY sessions
    in `packages/desktop/src-tauri/src/pty_session.rs` on exit.
15. [M] **Log redirection**: Allow the A2A server to redirect its logs to the
    main termAI audit log.

# Chapter 6: The "Sovereign" Auth Flow

## Why

Current auth looks like a Google developer tool. You need to use the Gemini
credits as the "hook," but the branding as the "wall." When the user logs in,
the screen should say "Connect termAI to Gemini" rather than looking like an
internal Google login.

## What:

1. [H] **Auth UI Rebrand**: Open `packages/cli/src/ui/auth/AuthDialog.tsx`.
   Change heading to "Connect termAI to a Model Provider".
2. [H] **Google-specific UI**: Move Google-specific instructions into
   `packages/cli/src/ui/auth/providers/GoogleAuth.tsx`.
3. [H] **OAuth Scoping**: Edit `packages/core/src/code_assist/oauth2.ts`. Ensure
   the redirect URI points to a `terminai.org` relay rather than a generic
   Google one.
4. [H] **Token Storage Path**: Update
   `packages/core/src/code_assist/oauth-credential-storage.ts` to store tokens
   in the `~/.terminai/auth/` directory.
5. [H] **Multi-account Support**: Refactor the storage logic to allow switching
   between different Google/API accounts via the CLI.
6. [H] **Key Entry UX**: Edit `packages/cli/src/ui/auth/ApiAuthDialog.tsx` to
   support pasting a Google AI Studio key directly if OAuth fails.
7. [H] **Logout Logic**: Ensure
   `packages/cli/src/ui/components/LogoutConfirmationDialog.tsx` wipes all local
   session data and audit caches.
8. [H] **Quota Awareness**: Edit
   `packages/cli/src/ui/hooks/useQuotaAndFallback.ts` to show "termAI Quota"
   (via Gemini) based on the underlying Gemini tier.
9. [H] **Connection Test**: Implement a "Test Connection" button in the auth
   flow that runs a tiny `whoami` prompt to verify the key.
10. [H] **Environment Var Priority**: Ensure that `TERMINAI_API_KEY` env var
    overrides stored credentials for CI/CD usage.
11. [H] **Credential Masking**: Update `packages/core/src/core/logger.ts` to
    aggressively scrub auth tokens from debug logs.
12. [H] **Browser Relay**: Create a simple HTML/JS landing page at
    `auth.terminai.org` to handle the OAuth callback flow.
13. [H] **Session Renewal**: Implement silent token refresh in
    `packages/core/src/code_assist/oauth2.ts` to prevent "Vibe Coding" session
    interruptions.
14. [H] **Security Warnings**: Display a warning in the UI if the user is using
    a "Write" policy without a password-protected key store.
15. [H] **Self-hosted Relay Option**: Allow users to specify their own OAuth
    client ID in the config for maximum privacy.

# Chapter 7: Governance Dashboard (Local Web UI)

## Why

A terminal is great, but a "Control Plane" needs a status view. This is the
feature that eventually turns into a "Money-Making Venture" for enterprises
managing fleets of agents.

## What:

1. [M] **Dashboard Route**: Add a "Dashboard" tab in
   `packages/desktop/src/App.tsx`.
2. [M] **Session List**: Refactor
   `packages/desktop/src/components/SessionsSidebar.tsx` to show a summary of
   policy infractions per session.
3. [M] **Real-time Policy Feed**: Create
   `packages/desktop/src/components/PolicyFeed.tsx`. Show a scrolling list of
   every command being analyzed by the Policy Engine.
4. [M] **Approval Queue**: Create a dedicated view for "Pending YOLO Actions"
   where a user can click "Approve All".
5. [M] **Token Usage Graph**: Use a charting library in the Desktop app to show
   consumption over the last 24 hours.
6. [M] **PTY Bridge Visualization**: Show the status of the active Rust PTY
   session in the UI footer.
7. [M] **Agent Collaboration View**: Create a visual "Agent Map" showing the CLI
   talking to the A2A server.
8. [M] **Config Editor**: Add a GUI for editing `terminai.yaml` and TOML
   recipes.
9. [M] **System Health Widget**: Show CPU/RAM usage alongside termAI activity to
   correlate AI actions with system performance.
10. [M] **Audit Log Browser**: Implement a searchable table in the desktop app
    linked to the SQLite audit database.
11. [M] **Notification Center**: Use Tauri's notification system to alert the
    user when a long-running background task finishes.
12. [M] **Theme Sync**: Ensure the desktop app's theme matches the CLI theme
    selected in `packages/cli/src/core/theme.ts`.
13. [M] **IPC Bridge Enhancement**: Edit
    `packages/desktop/src-tauri/src/cli_bridge.rs` to allow the GUI to send
    "Stop" signals to the CLI process.
14. [M] **Diagnostic Export**: Add a "Save Logs for Debugging" button that zips
    the audit log and current config.
15. [M] **Quick-Action Recipes**: Add a "Favorites" sidebar in the GUI to
    trigger common system recipes (e.g., "Clear Cache").

# Chapter 8: One-Line "Operator" Install

## Why

Speed-to-value is everything. If it takes more than 30 seconds to get termAI
running and fixing a system issue, you lose the "vibe coding" momentum. Zero
friction deployment for SREs and sysadmins.

## What:

1. [H] **Base Script**: Create `scripts/termai-install.sh`.
2. [H] **OS Detection**: Use `uname -s` to handle Darwin (macOS), Linux, and
   MINGW (Windows).
3. [H] **Architecture Check**: Handle x86_64 vs arm64 for the binary download.
4. [H] **Version Resolution**: Script should query the GitHub API for the latest
   release tag.
5. [H] **Path Management**: Automatically add `~/.terminai/bin` to the user's
   `$PATH` in `.zshrc` or `.bashrc`.
6. [H] **Dependency Check**: Check for node (if running from source) or just
   install the pre-compiled binary.
7. [H] **Rust/Tauri Bundling**: Create a CI step to build the standalone binary
   with the core engine embedded.
8. [H] **Alias Creation**: Offer to create the `t` alias (e.g.,
   `alias t="terminai"`).
9. [H] **Permission setup**: Automatically run `chmod +x` on the downloaded
   binary.
10. [H] **Default Config Generation**: Script should create a default
    `read-only.toml` if it doesn't exist.
11. [H] **Verification Step**: End the install with `terminai --version` to
    confirm success.
12. [H] **Uninstaller**: Create `scripts/termai-uninstall.sh` to clean up the
    `.terminai` folder and binary.
13. [M] **Homebrew Formula**: Create `Formula/terminai.rb` for macOS users.
14. [H] **NPM Global**: Ensure `npm install -g @terminai/cli` works flawlessly
    and handles peer dependencies.
15. [M] **Windows Powershell Script**: Create `install.ps1` for native Windows
    users outside of WSL.

# Chapter 9: "Local-First" Safety Toggle (Ollama/Local LLM)

## Why

To counter the fear of "slaves to Google," you need a "Paranoid Mode." This
proves that user privacy and governance are handled on-device, not in the Google
cloud.

## What:

1. [L] **Local Classifier**: Edit `packages/core/src/safety/risk-classifier.ts`.
2. [L] **Toggle logic**: Add `useLocalSafety: boolean` to the configuration.
3. [L] **Ollama Request Handler**: Implement a specific method to hit
   `localhost:11434/api/generate` for classification.
4. [L] **Local Prompt Template**: Create a simplified safety prompt in
   `packages/core/src/brain/prompts/localRisk.ts` optimized for Llama 3.
5. [L] **Fallback Logic**: If Ollama is not running, fallback to Gemini with a
   "Cloud Safety Check" warning in the UI.
6. [L] **Offline Cache**: Cache safety results for common commands in a local
   JSON file to speed up repeated tasks.
7. [L] **Regex Pre-filter**: Add a fast-path regex check for extremely dangerous
   commands (e.g., `rm -rf /`) that bypasses the LLM entirely.
8. [L] **Token Usage Optimization**: Ensure the local safety check doesn't send
   massive file contexts, only the command and immediate shell state.
9. [L] **User UI Indicator**: Show a "Local Safety Active" badge in
   `packages/cli/src/ui/components/Header.tsx`.
10. [L] **Latency Monitoring**: Log the time taken for local vs cloud safety
    checks to help the user choose the best mode.
11. [L] **Config UI**: Add a toggle in
    `packages/cli/src/ui/components/SettingsDialog.tsx` for "Privacy-First
    Safety".
12. [L] **Model Selection**: Allow users to specify which local model to use for
    safety (e.g., `phi3`, `mistral`).
13. [L] **System Prompt for Safety**: Hardcode a "Safety Monitor" persona for
    the local model to prevent hallucinations.
14. [L] **Error Handling**: Gracefully handle "Connection Refused" if the user
    hasn't installed Ollama.
15. [L] **Unit Testing**: Add tests in
    `packages/core/src/safety/risk-classifier.test.ts` for the local path.

# Chapter 10: The terminai.org "North Star" Docs

## Why

The landing page should not say "A Gemini CLI." It should say: "The Sovereign
Shell: Governed Autonomy for Systems and Servers." Establish the brand as the
authority on "Governed Autonomy."

## What:

1. [H] **Landing Page Content**: Draft `docs-terminai/index.md` to lead with
   "The Operator" value prop. _The Pitch: "Google provides the intelligence.
   termAI provides the root access and the guardrails."_
2. [H] **Governance Deep-Dive**: Create `docs-terminai/governance.md` explaining
   the tiered policy system.
3. [H] **Recipe Contribution Guide**: Create
   `docs-terminai/contributing-recipes.md` to encourage community TOML sharing.
4. [H] **A2A Protocol Spec**: Finalize the rendering of the A2A spec into a
   readable documentation page.
5. [H] **"Why Gemini?" Section**: Explain the 2M token context advantage for
   system-wide debugging.
6. [H] **Security Posture Page**: Refine `docs/security-posture.md` to address
   enterprise concerns about agent root access.
7. [H] **Comparison Guide**: Expand `docs/termai-comparison.md` to show why
   termAI is better for systems than Aider or Claude Code.
8. [H] **Case Studies**: Add hypothetical examples (e.g., "Fixing a broken
   Kubernetes node with termAI").
9. [H] **Interactive Tutorial**: Link to `docs/cli/tutorials.md` but rewrite
   them for system tasks.
10. [H] **Troubleshooting Guide**: Update `docs-terminai/troubleshooting.md`
    with common terminal/PTY issues.
11. [H] **API Reference**: Generate documentation for the `@terminai/core`
    package for developers building plugins.
12. [H] **Theme Showcase**: Update `docs/cli/themes.md` with screenshots of the
    new termAI-specific themes.
13. [H] **Install Instructions**: Prominently feature the one-line install
    script on the home page.
14. [H] **Roadmap Transparency**: Add a `ROADMAP.md` to the site showing the
    path to 1.0.
15. [H] **SEO Optimization**: Ensure keywords like "AI System Operator,"
    "Governed Terminal," and "Gemini Shell" are integrated.
