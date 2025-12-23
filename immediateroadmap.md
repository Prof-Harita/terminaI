Here is your Top 10 Must-Do Roadmap to transform this from a "vibe-coded fork"
into a sovereign, defensible venture before you broadcast it.

1. Execute the "Hostile Rebrand" (Hours 1–12) If a developer sees
   @google/gemini-md in your package.json, they won't contribute; they’ll just
   wait for Google to fix it.

Action: Rename all internal packages (e.g., @terminai/core,
@terminai/a2a-server).

Legal: Keep the original Apache 2.0 license headers but add: "Portions Copyright
2025 TerminaI Authors. Modified from original work by Google LLC." This asserts
your sovereignty while staying legally compliant.

2. The "Independence" Layer (Abstract the Model) You are currently a "slave" to
   Gemini because your core logic imports the Gemini SDK directly.

Action: Wrap the model calls in an interface. Even if you only support Gemini at
launch, the existence of a ModelProvider interface tells the world: "We aren't a
Google project; we are a shell that currently uses Google's engine."

3. Ship the "System Operator" Recipe Pack Your USP is being "Claude Code for
   Systems." You need to prove it.

Action: Create a recipes/ directory with 10 production-ready Agent Cards (TOML
files). Examples: diagnose-wifi.toml, repair-docker-network.toml,
harden-ssh.toml, cleanup-registry.toml.

Why: This moves the focus from "prompting an LLM" to "running verified system
operations."

4. Hardened "Black Box" Audit Log Enterprises and power users will only give
   "YOLO" permission if they have an unerasable audit trail.

Action: Implement a local SQLite or append-only file that logs every command,
its policy risk level (read, write, yolo), and whether it was auto-approved or
user-approved.

5. Standardize the A2A (Agent-to-Agent) RFC This is your infrastructure moat.

Action: Move the A2A server logic into a standalone spec. Write a SPEC.md that
defines how an external agent (like a Python script or another LLM) can request
a "Governed Shell Session" from termAI.

Why: You want termAI to be the Control Plane for every other agent on the
machine.

6. The "Sovereign" Auth Flow Current auth looks like a Google developer tool.

Action: Move the Google OAuth logic into a providers/google folder. When the
user logs in, the screen should say "Connect termAI to Gemini" rather than
looking like an internal Google login. Use the Gemini credits as the "hook," but
the branding as the "wall."

7. Governance Dashboard (Local Web UI) A terminal is great, but a "Control
   Plane" needs a status view.

Action: Use the Tauri/Desktop app to show a simple real-time dashboard of
"Active Agent Sessions" and "Policy Infractions."

Why: This is the feature that eventually turns into a "Money-Making Venture" for
enterprises managing fleets of agents.

8. One-Line "Operator" Install Action: Create a curl | sh install script hosted
   at install.terminai.org.

Why: Speed-to-value is everything. If it takes more than 30 seconds to get
termAI running and fixing a system issue, you lose the "vibe coding" momentum.

9. "Local-First" Safety Toggle (Ollama/Local LLM) To counter the fear of "slaves
   to Google," you need a "Paranoid Mode."

Action: Add basic support for a local model (via Ollama) to handle the Policy
Engine risk classification locally, even if the actual task goes to Gemini.

Why: This proves that user privacy and governance are handled on-device, not in
the Google cloud.

10. The terminai.org "North Star" Docs Action: The landing page should not say
    "A Gemini CLI." It should say: "The Sovereign Shell: Governed Autonomy for
    Systems and Servers." \* The Pitch: "Google provides the intelligence.
    termAI provides the root access and the guardrails."

termAI: Industrialization & Sovereignty Roadmap

1. Execute the "Hostile Rebrand" (Scrub Identity) Objective: Sever the visual
   and technical link to the "Gemini CLI" to encourage community contribution
   and investor trust.

Project Root: Rename package.json field "name" from @google/gemini-md to
terminai-monorepo.

Core Package: Edit packages/core/package.json: change name to @terminai/core.

CLI Package: Edit packages/cli/package.json:

Change name to @terminai/cli.

Change "bin": { "gemini": "..." } to "bin": { "terminai": "./index.ts" }.

A2A Server Package: Edit packages/a2a-server/package.json: change name to
@terminai/a2a-server.

Global Constants: Open packages/core/src/config/constants.ts:

Change APP_NAME from "gemini" to "terminai".

Change USER_AGENT string to include termAI/0.21.0.

Path Resolution: Edit packages/core/src/utils/paths.ts:

Modify getAppConfigDir() to look for .terminai instead of .gemini.

Modify getAppDataDir() to ensure session logs are stored in
~/.terminai/sessions.

License Headers: Run a regex search-and-replace across the entire packages/
directory:

Find: Copyright 2024 Google LLC

Replace: Copyright 2024 Google LLC\n// Portions Copyright 2025 termAI Authors

Internal Imports: Update all cross-package imports:

Search for import ... from '@google/gemini-md-core'

Replace with import ... from '@terminai/core'.

Binary Name in UI: Open packages/cli/src/ui/components/AboutBox.tsx:

Update the ASCII art or text to strictly say "termAI".

Zsh/Bash Completions: Update scripts/create_alias.sh to target the terminai
command instead of gemini.

Config File Naming: Update packages/core/src/config/config.ts to look for
terminai.yaml instead of config.yaml.

Cleanup Scripts: Edit scripts/clean.js to ensure it removes build artifacts
labeled under the new namespace.

Documentation References: Search docs-terminai/\*.md for any remaining "official
Google tool" claims and pivot them to "Sovereign Agentic Shell".

GitHub Action Workflows: Update .github/workflows/ci.yml and others to use the
new package names for caching and publishing.

Telemetry Namespacing: Edit packages/core/src/telemetry/constants.ts to change
the telemetry event prefix from gemini_cli/ to terminai/.

2. Independence Layer (Model Abstraction) Objective: Stop being a "Gemini fork"
   by making the LLM backend pluggable, even if you keep Gemini as the default.

Define Interface: Create packages/core/src/core/types/provider.ts.

Extract Gemini Logic: Move the content of
packages/core/src/core/geminiRequest.ts into a new class GeminiProvider
implementing BaseModelProvider.

Refactor ContentGenerator: Edit packages/core/src/core/contentGenerator.ts:

Remove direct dependencies on @google/genai.

Inject BaseModelProvider via the constructor.

Router Decoupling: Edit packages/core/src/routing/modelRouterService.ts:

Modify getModelConfig to return a provider-neutral config object.

Mock Provider for Testing: Create
packages/core/src/core/providers/mockProvider.ts to allow unit tests to run
without API keys.

Ollama Bridge: Create packages/core/src/core/providers/ollamaProvider.ts
(skeleton) to show the community how to add local models.

Anthropic Adapter: Create packages/core/src/core/providers/anthropicProvider.ts
(skeleton).

Update Client Factory: Edit packages/core/src/core/client.ts to use a factory
pattern: ProviderFactory.create(config.provider).

Config Schema Update: Edit schemas/settings.schema.json to add a provider field
(enum: google, anthropic, ollama).

Settings Validation: Update packages/cli/src/config/settings-validation.ts to
validate keys based on the selected provider.

Tool Calling Abstraction: Abstract the tool-call format in
packages/core/src/tools/tools.ts so it can be converted to/from OpenAI or
Anthropic tool syntax.

System Prompt Injection: Ensure the system prompt in
packages/core/src/core/prompts.ts is formatted correctly for different providers
(e.g., system role vs developer role).

Token Counting Logic: Move token estimation in
packages/core/src/utils/tokenCalculation.ts into provider-specific strategies.

Error Mapping: Create packages/core/src/core/providers/errorMapper.ts to
normalize 429 (Rate Limit) errors across different APIs.

Context Caching Toggle: Ensure the "Context Caching" feature in
packages/core/src/core/geminiChat.ts is only active when the provider is google.

3. Ship the "System Operator" Recipe Pack Objective: Move from "Chat with AI" to
   "Run Verified System Ops" using your Policy Engine.

Recipe Directory: Create packages/core/src/policy/recipes/.

WiFi Diagnostic Recipe: Create wifi-fix.toml:

Include commands like nmcli, ip link, and ping.

Set policy level to read-only for status and write for restart.

Docker Cleanup Recipe: Create docker-prune.toml:

Include docker system prune -f.

Set policy to yolo for non-production environments.

Windows Registry Recipe: Create registry-clean.toml:

Target specific temporary keys.

Set policy to high-risk-prompt.

DNS Troubleshooter: Create dns-debug.toml using dig and nslookup.

Disk Space Recovery: Create disk-purge.toml targeting /var/log or Windows Temp.

Service restarter: Create systemd-manager.toml.

TOML Loader Update: Edit packages/core/src/policy/toml-loader.ts:

Add a method loadBuiltInRecipes() that scans the new recipes/ folder on startup.

Agent Card Registry: Edit packages/core/src/agents/registry.ts:

Register these recipes as "System Agents" that can be summoned via @system.

Discovery Logic: Edit packages/core/src/services/fileDiscoveryService.ts to
recognize common system paths for logs and configs.

Prompt Template: Create packages/core/src/core/prompts/system-operator.ts to
give termAI instructions on how to act as a SysAdmin.

Safety Defaults: Update packages/core/src/policy/policies/read-only.toml to
include all "safe" status commands (e.g., uptime, whoami).

YOLO Expansion: Add dangerous system commands to
packages/core/src/policy/policies/yolo.toml with strict warnings.

Recipe Validation: Add a script scripts/validate-recipes.ts to ensure all TOML
files meet the policy schema.

CLI Examples: Add a "Help" section in packages/cli/src/ui/components/Help.tsx
specifically for "System Operations".

4. Hardened Black Box Audit Log Objective: Provide a non-repudiable log of every
   shell action taken by the AI, essential for enterprise trust.

Audit Store: Create packages/core/src/persistence/auditLog.ts.

SQLite Integration: Add better-sqlite3 to packages/core to manage a local
audit.db.

Schema Definition: Create a table with columns: timestamp, session_id, command,
policy_level, status (success/fail), approval_type (auto/manual).

Hook Implementation: Edit packages/core/src/core/coreToolScheduler.ts:

Inside executeTool, add a this.auditLog.record() call before and after
execution.

Shell Permission Capture: Edit packages/core/src/utils/shell-permissions.ts to
log whenever a command is blocked or allowed.

Log Rotation: Implement a 30-day rotation policy in auditLog.ts.

ReadOnly View: Create a hidden slash command /audit in
packages/cli/src/ui/hooks/slashCommandProcessor.ts to view the last 20 entries.

Integrity Check: Add a SHA-256 hashing mechanism to each log entry to detect
manual tampering of the audit file.

Context Injection: Allow termAI to read its own audit log to learn from past
command failures.

Export Tool: Create packages/core/src/tools/export-audit.ts to allow users to
generate a JSON report of AI actions.

Privacy Filter: Ensure the audit log redacts sensitive strings (like API keys)
using packages/core/src/telemetry/sanitize.ts.

Metadata Capture: Log the thought (reasoning) behind each command to provide
context for the audit.

Session Linking: Link audit entries to the session artifacts stored in
packages/core/src/services/chatRecordingService.ts.

Error Tracing: Ensure STDOUT/STDERR of failed AI commands are captured in the
audit entry.

Performance: Ensure audit logging is asynchronous so it doesn't block the
terminal UI.

5. Standardize the A2A (Agent-to-Agent) RFC Objective: Turn termAI into the
   "local server" that other agents use to interact with the machine securely.

Formalize RFC: Rewrite packages/a2a-server/development-extension-rfc.md into
A2A_PROTOCOL_SPEC.md.

Capability Negotiation: Edit packages/a2a-server/src/types.ts:

Add a Capabilities interface (e.g., filesystem:read, terminal:write).

JSON-RPC Migration: Refactor packages/a2a-server/src/http/server.ts to use a
standard JSON-RPC 2.0 structure for requests.

Auth Token Handshake: Implement a "pairing" flow where an external agent must
provide a token generated by the termAI CLI (terminai auth-token).

Session Multiplexing: Edit packages/a2a-server/src/agent/executor.ts to support
multiple concurrent agent connections.

Event Stream (SSE): Enhance packages/a2a-server/src/http/replay.ts to stream
real-time shell output back to the connected agent.

Policy Proxying: Ensure that any command sent via A2A passes through the
packages/core/src/policy/policy-engine.ts.

Agent Metadata: Allow external agents to send a name and version so the UI can
show: "Python Script 'DeployBot' is requesting root access."

Discovery Service: Implement a simple DNS-SD (mDNS) or file-based discovery so
other local tools can find the termAI server port.

Handshake timeout: Implement strict timeouts in
packages/a2a-server/src/http/app.ts for unauthenticated requests.

Rate Limiting: Add a local rate-limiter for A2A requests to prevent a runaway
script from nuking the API quota.

Example Client: Create packages/a2a-server/examples/python_client.py to
demonstrate the protocol.

CORS Hardening: Edit packages/a2a-server/src/http/cors.ts to only allow
localhost and specific app origins.

Graceful Shutdown: Ensure the A2A server cleans up all PTY sessions in
packages/desktop/src-tauri/src/pty_session.rs on exit.

Log redirection: Allow the A2A server to redirect its logs to the main termAI
audit log.

6. Sovereign Auth Flow Objective: Use Gemini credits as the fuel, but termAI as
   the dashboard.

Auth UI Rebrand: Open packages/cli/src/ui/auth/AuthDialog.tsx:

Change heading to "Connect termAI to a Model Provider".

Google-specific UI: Move Google-specific instructions into
packages/cli/src/ui/auth/providers/GoogleAuth.tsx.

OAuth Scoping: Edit packages/core/src/code_assist/oauth2.ts:

Ensure the redirect URI points to a terminai.org relay rather than a generic
Google one.

Token Storage Path: Update
packages/core/src/code_assist/oauth-credential-storage.ts to store tokens in the
~/.terminai/auth/ directory.

Multi-account Support: Refactor the storage logic to allow switching between
different Google/API accounts via the CLI.

Key Entry UX: Edit packages/cli/src/ui/auth/ApiAuthDialog.tsx to support pasting
a Google AI Studio key directly if OAuth fails.

Logout Logic: Ensure packages/cli/src/ui/components/LogoutConfirmationDialog.tsx
wipes all local session data and audit caches.

Quota Awareness: Edit packages/cli/src/ui/hooks/useQuotaAndFallback.ts to show
"termAI Quota" based on the underlying Gemini tier.

Connection Test: Implement a "Test Connection" button in the auth flow that runs
a tiny whoami prompt to verify the key.

Environment Var Priority: Ensure that TERMINAI_API_KEY env var overrides stored
credentials for CI/CD usage.

Credential Masking: Update packages/core/src/core/logger.ts to aggressively
scrub auth tokens from debug logs.

Browser Relay: Create a simple HTML/JS landing page at auth.terminai.org to
handle the OAuth callback flow.

Session Renewal: Implement silent token refresh in
packages/core/src/code_assist/oauth2.ts to prevent "Vibe Coding" session
interruptions.

Security Warnings: Display a warning in the UI if the user is using a "Write"
policy without a password-protected key store.

Self-hosted Relay Option: Allow users to specify their own OAuth client ID in
the config for maximum privacy.

7. Governance Dashboard (UI) Objective: Use the Tauri app to visualize the
   "System Operator" actions.

Dashboard Route: Add a "Dashboard" tab in packages/desktop/src/App.tsx.

Session List: Refactor packages/desktop/src/components/SessionsSidebar.tsx to
show a summary of policy infractions per session.

Real-time Policy Feed: Create packages/desktop/src/components/PolicyFeed.tsx:

Show a scrolling list of every command being analyzed by the Policy Engine.

Approval Queue: Create a dedicated view for "Pending YOLO Actions" where a user
can click "Approve All".

Token Usage Graph: Use a charting library in the Desktop app to show consumption
over the last 24 hours.

PTY Bridge Visualization: Show the status of the active Rust PTY session in the
UI footer.

Agent Collaboration View: Create a visual "Agent Map" showing the CLI talking to
the A2A server.

Config Editor: Add a GUI for editing terminai.yaml and TOML recipes.

System Health Widget: Show CPU/RAM usage alongside termAI activity to correlate
AI actions with system performance.

Audit Log Browser: Implement a searchable table in the desktop app linked to the
SQLite audit database.

Notification Center: Use Tauri's notification system to alert the user when a
long-running background task finishes.

Theme Sync: Ensure the desktop app's theme matches the CLI theme selected in
packages/cli/src/core/theme.ts.

IPC Bridge Enhancement: Edit packages/desktop/src-tauri/src/cli_bridge.rs to
allow the GUI to send "Stop" signals to the CLI process.

Diagnostic Export: Add a "Save Logs for Debugging" button that zips the audit
log and current config.

Quick-Action Recipes: Add a "Favorites" sidebar in the GUI to trigger common
system recipes (e.g., "Clear Cache").

8. One-Line "Operator" Install Objective: Zero friction deployment for SREs and
   sysadmins.

Base Script: Create scripts/termai-install.sh.

OS Detection: Use uname -s to handle Darwin (macOS), Linux, and MINGW (Windows).

Architecture Check: Handle x86_64 vs arm64 for the binary download.

Version Resolution: Script should query the GitHub API for the latest release
tag.

Path Management: Automatically add ~/.terminai/bin to the user's $PATH in .zshrc
or .bashrc.

Dependency Check: Check for node (if running from source) or just install the
pre-compiled binary.

Rust/Tauri Bundling: Create a CI step to build the standalone binary with the
core engine embedded.

Alias Creation: Offer to create the t alias (e.g., alias t="terminai").

Permission setup: Automatically run chmod +x on the downloaded binary.

Default Config Generation: Script should create a default read-only.toml if it
doesn't exist.

Verification Step: End the install with terminai --version to confirm success.

Uninstaller: Create scripts/termai-uninstall.sh to clean up the .terminai folder
and binary.

Homebrew Formula: Create Formula/terminai.rb for macOS users.

NPM Global: Ensure npm install -g @terminai/cli works flawlessly and handles
peer dependencies.

Windows Powershell Script: Create install.ps1 for native Windows users outside
of WSL.

9. Local-First Safety Toggle (Ollama/Local LLM) Objective: Provide a
   privacy-first mode where risk assessment doesn't leave the machine.

Local Classifier: Edit packages/core/src/safety/risk-classifier.ts.

Toggle logic: Add useLocalSafety: boolean to the configuration.

Ollama Request Handler: Implement a specific method to hit
localhost:11434/api/generate for classification.

Local Prompt Template: Create a simplified safety prompt in
packages/core/src/brain/prompts/localRisk.ts optimized for Llama 3.

Fallback Logic: If Ollama is not running, fallback to Gemini with a "Cloud
Safety Check" warning in the UI.

Offline Cache: Cache safety results for common commands in a local JSON file to
speed up repeated tasks.

Regex Pre-filter: Add a fast-path regex check for extremely dangerous commands
(e.g., rm -rf /) that bypasses the LLM entirely.

Token Usage Optimization: Ensure the local safety check doesn't send massive
file contexts, only the command and immediate shell state.

User UI Indicator: Show a "Local Safety Active" badge in
packages/cli/src/ui/components/Header.tsx.

Latency Monitoring: Log the time taken for local vs cloud safety checks to help
the user choose the best mode.

Config UI: Add a toggle in packages/cli/src/ui/components/SettingsDialog.tsx for
"Privacy-First Safety".

Model Selection: Allow users to specify which local model to use for safety
(e.g., phi3, mistral).

System Prompt for Safety: Hardcode a "Safety Monitor" persona for the local
model to prevent hallucinations.

Error Handling: Gracefully handle "Connection Refused" if the user hasn't
installed Ollama.

Unit Testing: Add tests in packages/core/src/safety/risk-classifier.test.ts for
the local path.

10. The terminai.org "North Star" Docs Objective: Establish the brand as the
    authority on "Governed Autonomy."

Landing Page Content: Draft docs-terminai/index.md to lead with "The Operator"
value prop.

Governance Deep-Dive: Create docs-terminai/governance.md explaining the tiered
policy system.

Recipe Contribution Guide: Create docs-terminai/contributing-recipes.md to
encourage community TOML sharing.

A2A Protocol Spec: Finalize the rendering of the A2A spec into a readable
documentation page.

"Why Gemini?" Section: Explain the 2M token context advantage for system-wide
debugging.

Security Posture Page: Refine docs/security-posture.md to address enterprise
concerns about agent root access.

Comparison Guide: Expand docs/termai-comparison.md to show why termAI is better
for systems than Aider or Claude Code.

Case Studies: Add hypothetical examples (e.g., "Fixing a broken Kubernetes node
with termAI").

Interactive Tutorial: Link to docs/cli/tutorials.md but rewrite them for system
tasks.

Troubleshooting Guide: Update docs-terminai/troubleshooting.md with common
terminal/PTY issues.

API Reference: Generate documentation for the @terminai/core package for
developers building plugins.

Theme Showcase: Update docs/cli/themes.md with screenshots of the new
termAI-specific themes.

Install Instructions: Prominently feature the one-line install script on the
home page.

Roadmap Transparency: Add a ROADMAP.md to the site showing the path to 1.0.

SEO Optimization: Ensure keywords like "AI System Operator," "Governed
Terminal," and "Gemini Shell" are integrated.

Here is the enhanced roadmap with Criticality Markers:

[H] High (Launch Blocker): Must exist for v0.21.0 release.

[M] Medium (Fast Follow): "Coming Soon" in the docs; acceptable to ship v1.0
without it but needs stubs.

[L] Low (Nice to Have): purely strictly value-add for later.

termAI: Sovereign Industrialization Roadmap 0. Infrastructure Decoupling & Repo
Setup (New) Criticality: [H] Objective: Establish a sovereign GitHub identity
while preserving the "Standing on Shoulders of Giants" credit history.

Repo Detachment (The "Hard Fork"):

Create a new, empty public repository on GitHub called terminai (do not use the
"Fork" button).

Locally, in your current project: git remote rename origin upstream.

Add your new repo: git remote add origin
https://github.com/yourusername/terminai.git.

Push history: git push -u origin main.

Result: You keep every commit and contributor from Google, but the repo header
on GitHub no longer says "forked from...".

Website Repo Integration:

Link the terminai-website repo in your main README.md under a "Documentation"
section.

Set up a git submodule or just a simple link if you want them loosely coupled.

CI/CD "De-Googling":

Audit Workflows: Delete .github/workflows/release-nightly.yml and
release-docker.yml (these usually rely on internal Google secrets).

Create Sovereign Release: Create .github/workflows/release-terminai.yml that
uses npm publish with your own NPM_TOKEN.

Tauri Build: Create .github/workflows/build-desktop.yml that runs cargo tauri
build for Mac/Linux/Windows artifacts.

Dependabot: Review .github/dependabot.yml. Keep it, but ensure it targets your
new package names.

1. Execute the "Hostile Rebrand" (Scrub Identity) Criticality: [H] Objective:
   Sever the visual link to "Gemini CLI" to encourage community contribution.

Project Root: Rename package.json field "name" to terminai-monorepo.

Core Package: Edit packages/core/package.json: change name to @terminai/core.

CLI Package: Edit packages/cli/package.json:

Change name to @terminai/cli.

Change "bin": { "terminai": "./index.ts" }.

A2A Server Package: Edit packages/a2a-server/package.json: change name to
@terminai/a2a-server.

Global Constants: Open packages/core/src/config/constants.ts:

Change APP_NAME from "gemini" to "terminai".

Change USER_AGENT string to include termAI/0.21.0.

Path Resolution: Edit packages/core/src/utils/paths.ts:

Modify getAppConfigDir() to look for .terminai.

Modify getAppDataDir() to ensure session logs are in ~/.terminai/sessions.

License Headers: Run regex replace:

Find: Copyright 2024 Google LLC

Replace: Copyright 2024 Google LLC\n// Portions Copyright 2025 termAI Authors

Internal Imports: Search/Replace from '@google/gemini-md-core' to from
'@terminai/core'.

Binary Name in UI: Update packages/cli/src/ui/components/AboutBox.tsx ASCII art
to "termAI".

Zsh/Bash Completions: Update scripts/create_alias.sh to target terminai.

Config File Naming: Update packages/core/src/config/config.ts to look for
terminai.yaml.

Cleanup Scripts: Edit scripts/clean.js to target new artifacts.

Documentation References: Pivot docs-terminai/\*.md to say "Sovereign Agentic
Shell".

GitHub Action Workflows: Update .github/workflows/ci.yml to use new package
names.

Telemetry Namespacing: Edit packages/core/src/telemetry/constants.ts prefix to
terminai/.

2. Independence Layer (Model Abstraction) Criticality: [M] (Architecture is H,
   implementation of others is M) Objective: Stop being a "Gemini fork" by
   making the LLM backend pluggable.

Define Interface: Create packages/core/src/core/types/provider.ts defining
BaseModelProvider. [H]

Extract Gemini Logic: Move packages/core/src/core/geminiRequest.ts into
GeminiProvider class. [H]

Refactor ContentGenerator: Inject BaseModelProvider into
packages/core/src/core/contentGenerator.ts. [H]

Router Decoupling: Modify packages/core/src/routing/modelRouterService.ts to
return provider-neutral config. [H]

Mock Provider: Create packages/core/src/core/providers/mockProvider.ts for unit
tests. [H]

Ollama Bridge: Create skeleton
packages/core/src/core/providers/ollamaProvider.ts. [M]

Anthropic Adapter: Create skeleton
packages/core/src/core/providers/anthropicProvider.ts. [L]

Update Client Factory: Update packages/core/src/core/client.ts to use factory
pattern. [H]

Config Schema Update: Add provider enum to schemas/settings.schema.json. [H]

Settings Validation: Update packages/cli/src/config/settings-validation.ts. [H]

Tool Calling Abstraction: Abstract tool-call format in
packages/core/src/tools/tools.ts. [M]

System Prompt Injection: Format system prompt dynamically in
packages/core/src/core/prompts.ts. [H]

Token Counting Logic: Strategy pattern for token estimation in
packages/core/src/utils/tokenCalculation.ts. [M]

Error Mapping: Create packages/core/src/core/providers/errorMapper.ts. [M]

Context Caching Toggle: Limit "Context Caching" in geminiChat.ts to Google
provider only. [H]

3. Ship the "System Operator" Recipe Pack Criticality: [H] Objective: Move from
   "Chat with AI" to "Run Verified System Ops".

Recipe Directory: Create packages/core/src/policy/recipes/.

WiFi Diagnostic: Create wifi-fix.toml (read-only status, write restart).

Docker Cleanup: Create docker-prune.toml (yolo policy).

Windows Registry: Create registry-clean.toml (high-risk-prompt).

DNS Troubleshooter: Create dns-debug.toml.

Disk Space Recovery: Create disk-purge.toml.

Service Manager: Create systemd-manager.toml.

TOML Loader Update: Add loadBuiltInRecipes() to
packages/core/src/policy/toml-loader.ts.

Agent Card Registry: Register recipes in packages/core/src/agents/registry.ts.

Discovery Logic: Update fileDiscoveryService.ts to find system logs/configs.

Prompt Template: Create packages/core/src/core/prompts/system-operator.ts.

Safety Defaults: Update read-only.toml with uptime, whoami, top.

YOLO Expansion: Add dangerous commands to yolo.toml with warnings.

Recipe Validation: Add scripts/validate-recipes.ts.

CLI Examples: Add "System Operations" section to
packages/cli/src/ui/components/Help.tsx.

4. Hardened Black Box Audit Log Criticality: [H] Objective: Non-repudiable log
   of every shell action. Enterprise requirement.

Audit Store: Create packages/core/src/persistence/auditLog.ts.

SQLite Integration: Add better-sqlite3 dependency.

Schema Definition: Create table (timestamp, command, policy_level,
approval_type).

Hook Implementation: Add recording hook to
packages/core/src/core/coreToolScheduler.ts.

Shell Permission Capture: Log blocks/allows in
packages/core/src/utils/shell-permissions.ts.

Log Rotation: Implement 30-day rotation.

ReadOnly View: Create /audit slash command in slashCommandProcessor.ts.

Integrity Check: Add SHA-256 hash to each log entry row.

Context Injection: Allow termAI to read audit log for error recovery.

Export Tool: Create packages/core/src/tools/export-audit.ts.

Privacy Filter: Integrate packages/core/src/telemetry/sanitize.ts into audit
logger.

Metadata Capture: Log the AI's "thought" alongside the command.

Session Linking: Link audit rows to session IDs in chatRecordingService.ts.

Error Tracing: Capture STDOUT/STDERR of failed commands.

Performance: Ensure logging is non-blocking (async).

5. Standardize the A2A (Agent-to-Agent) RFC Criticality: [M] (Docs are H,
   Implementation is M) Objective: Turn termAI into the "local server" for other
   agents.

Formalize RFC: Create A2A_PROTOCOL_SPEC.md in root. [H]

Capability Negotiation: Add Capabilities interface to
packages/a2a-server/src/types.ts.

JSON-RPC Migration: Standardize packages/a2a-server/src/http/server.ts.

Auth Token Handshake: Implement terminai auth-token flow.

Session Multiplexing: Update packages/a2a-server/src/agent/executor.ts for
concurrency.

Event Stream (SSE): Enhance packages/a2a-server/src/http/replay.ts.

Policy Proxying: Route A2A commands through policy-engine.ts. [H]

Agent Metadata: Display connecting agent name in CLI UI.

Discovery Service: Implement file-based port discovery.

Handshake Timeout: Enforce timeouts in http/app.ts.

Rate Limiting: Add local rate-limiter.

Example Client: Create packages/a2a-server/examples/python_client.py. [H]

CORS Hardening: Lock down http/cors.ts.

Graceful Shutdown: Clean up PTYs in pty_session.rs.

Log Redirection: Pipe A2A logs to main audit log.

6. Sovereign Auth Flow Criticality: [H] Objective: "Connect termAI to Gemini"
   (BYOK/OAuth), not "Login to Google".

Auth UI Rebrand: Rename header in packages/cli/src/ui/auth/AuthDialog.tsx.

Google-specific UI: Isolate Google UI logic to providers/GoogleAuth.tsx.

OAuth Scoping: Point redirect URI to terminai.org relay in oauth2.ts.

Token Storage Path: Store in ~/.terminai/auth/ (update
oauth-credential-storage.ts).

Multi-account Support: Refactor storage for multiple keys.

Key Entry UX: Allow direct API key paste in ApiAuthDialog.tsx.

Logout Logic: Ensure complete wipe in LogoutConfirmationDialog.tsx.

Quota Awareness: Label quota as "termAI Quota (via Gemini)" in
useQuotaAndFallback.ts.

Connection Test: Add "Test Connection" button running whoami.

Environment Var Priority: TERMINAI_API_KEY takes precedence.

Credential Masking: Scrub logs in packages/core/src/core/logger.ts.

Browser Relay: Deploy simple relay page at auth.terminai.org.

Session Renewal: Silent refresh in oauth2.ts.

Security Warnings: Warn if "Write" policy is active without secure storage.

Self-hosted Relay: Add config option for custom OAuth client ID.

7. Governance Dashboard (UI) Criticality: [M] (Fast Follow - CLI is the product)
   Objective: Visualize "System Operator" actions.

Dashboard Route: Add route in packages/desktop/src/App.tsx.

Session List: Show policy infractions in SessionsSidebar.tsx.

Real-time Policy Feed: Create components/PolicyFeed.tsx.

Approval Queue: Create "Pending YOLO" view.

Token Usage Graph: Add usage chart.

PTY Bridge Visualization: Show active Rust PTY status.

Agent Collaboration View: Visualize A2A connections.

Config Editor: GUI for terminai.yaml.

System Health Widget: Show CPU/RAM usage.

Audit Log Browser: Table view for audit database.

Notification Center: Tauri system notifications.

Theme Sync: Match CLI theme in Desktop.

IPC Bridge Enhancement: "Stop" signal support in cli_bridge.rs.

Diagnostic Export: "Save Logs" button.

Quick-Action Recipes: GUI trigger for common recipes.

8. One-Line "Operator" Install Criticality: [H] Objective: Frictionless
   adoption.

Base Script: Create scripts/termai-install.sh.

OS Detection: Handle Darwin/Linux/MINGW.

Architecture Check: x86_64 vs arm64.

Version Resolution: Query GitHub Releases API.

Path Management: Update .zshrc/.bashrc with ~/.terminai/bin.

Dependency Check: Verify/Install Node if needed.

Rust/Tauri Bundling: CI step for standalone binary.

Alias Creation: Suggest alias t="terminai".

Permission Setup: chmod +x.

Default Config: Generate safe read-only.toml.

Verification: Run terminai --version.

Uninstaller: Create scripts/termai-uninstall.sh.

Homebrew Formula: Create Formula/terminai.rb. [M]

NPM Global: Ensure npm i -g @terminai/cli works.

Windows Script: Create install.ps1. [M]

9. Local-First Safety Toggle (Ollama/Local LLM) Criticality: [L] (Nice to have,
   trust builder) Objective: Privacy-first risk assessment.

Local Classifier: Edit risk-classifier.ts.

Toggle Logic: Add useLocalSafety to config.

Ollama Request Handler: Hit localhost:11434.

Local Prompt Template: Optimize prompt for Llama 3.

Fallback Logic: Fallback to Gemini if Ollama fails.

Offline Cache: JSON cache for known safe commands.

Regex Pre-filter: Fast-path for rm -rf / etc.

Token Optimization: Minimal context for local check.

User UI Indicator: "Local Safety" badge in Header.

Latency Monitoring: Log check times.

Config UI: Toggle in Settings.

Model Selection: Dropdown for local model name.

System Prompt: "Safety Monitor" persona.

Error Handling: Catch connection refused.

Unit Testing: Tests for local path.

10. The terminai.org "North Star" Docs Criticality: [H] Objective: Brand
    authority.

Landing Page: "The Operator" value prop in docs-terminai/index.md.

Governance Deep-Dive: docs-terminai/governance.md.

Recipe Contribution: contributing-recipes.md.

A2A Protocol Spec: Render A2A spec.

"Why Gemini?": Explain 2M context window advantage.

Security Posture: Enterprise root access concerns in security-posture.md.

Comparison Guide: termAI vs Aider vs Claude Code.

Case Studies: "Fixing Kubernetes Node".

Interactive Tutorial: System task walkthroughs.

Troubleshooting: PTY issues.

API Reference: Core package docs.

Theme Showcase: Screenshots of themes.

Install Instructions: One-line install script.

Roadmap: Public ROADMAP.md.

SEO: Optimization for "Agentic Shell".
