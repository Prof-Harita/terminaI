# TermAI — Future Roadmap (Founder View)

This is a blue-sky but execution-oriented roadmap. Each roadmap bullet is
expanded into:

- **Item**: the original bullet text
- **What it takes**: 1–2 sentences describing the work to achieve it
- **Ease**: H = easy, M = moderate, L = hard
- **Upside**: H = high, M = medium, L = low

---

## North Star (what this becomes)

| Item                                                                                        | What it takes                                                                                                                                                                                          | Ease | Upside |
| ------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ---: | -----: |
| TermAI is the “universal operator” for every computer, not a coding chatbot.                | Align prompts, UX, docs, and feature priorities around “operator” jobs (processes, OS state, automation) and keep coding as a subset. Create a consistent language across CLI, docs, and commands.     |    M |      H |
| It turns intent into safe, observable terminal actions across macOS/Linux/Windows.          | Build a cross-platform command strategy (OS detection, command variants), strengthen observability (streaming, logs), and enforce safety via policy and confirmations everywhere.                      |    L |      H |
| It makes novices powerful without making power users feel slowed down.                      | Add beginner scaffolding (explanations, previews) with explicit toggles and defaults, while preserving fast paths (terse mode, shortcuts, headless).                                                   |    M |      H |
| It stays auditable: every action has a reason, a plan, and a reversible path when possible. | Introduce action metadata (why/plan), durable audit logs, and “undo playbooks” for common destructive operations, wired into confirmation flows.                                                       |    L |      H |
| It is extensible by default: tools, MCP servers, workflows, and “terminal apps”.            | Stabilize extension interfaces, deepen MCP integration and discoverability, and add workflow + app manifests with permissions and versioning.                                                          |    L |      H |
| It is multi-surface: CLI-first, then voice, then web/mobile, then IDE.                      | Treat the core as a single engine with multiple clients; define streaming/confirmation protocols and keep surfaces thin. Invest in “shared state” primitives (tasks/sessions) and surface-specific UX. |    L |      H |
| It is safe by default: trust boundaries, sandboxing, and explicit consent.                  | Make trust and approval modes first-class in UI and config; tighten default policies; add clear consent gates for remote/always-on capabilities.                                                       |    M |      H |
| It is fast: low-latency UI, bounded context, bounded logs, predictable costs.               | Add performance budgets, caching, bounded buffers, and context compression; measure startup latency and tool overhead in CI benchmarks.                                                                |    M |      H |
| It is offline-capable where possible: local tools, local models, local memory.              | Ensure key capabilities work without network tools; design provider abstraction for STT/TTS/models; keep memory local with optional opt-in sync later.                                                 |    L |      M |
| It is open-source-first with a thriving ecosystem and clear governance.                     | Document governance, contribution flows, feature stability levels, and security posture; invest in maintainers, templates, and extension marketplace mechanics.                                        |    M |      H |

## Reality check (what this repo already has that we can build on)

| Item                                                                                                    | What it takes                                                                                                                                                 | Ease | Upside |
| ------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---: | -----: |
| Strong base: TypeScript monorepo (`packages/core`, `packages/cli`, `packages/a2a-server`).              | Keep boundaries clean: core engine APIs, CLI as client, a2a-server as optional remote transport. Add architecture docs and tooling that reinforce separation. |    H |      H |
| TermAI identity + “General Terminal Tasks” prompt already exists (`packages/core/src/core/prompts.ts`). | Maintain prompt tests and ensure upstream merges don’t revert identity; iterate prompts based on real user tasks (ops/admin/automation).                      |    H |      H |
| Compact system snapshot injection already exists (`packages/core/src/utils/environmentContext.ts`).     | Expand snapshot carefully (bounded) and add on-demand deep-dive patterns; ensure portability across platforms and avoid expensive polling.                    |    M |      H |
| PTY execution + streaming + fallbacks already exist (core shell execution).                             | Harden edge cases (PTY availability, binary output, long output), and expose consistent “session” semantics across UI and remote clients.                     |    M |      H |
| Process sessions already exist as a tool (`packages/core/src/tools/process-manager.ts`).                | Promote to a first-class UX (slash commands, session views) and extend with readiness detection, resource signals, and better input handling.                 |    M |      H |
| Web-remote security gate exists (auth + CORS allowlist + replay guard in `packages/a2a-server`).        | Ship a minimal client, add pairing UX, and expand security hardening (rate limits, host header checks) before broader use.                                    |    M |      H |
| Voice “spoken reply” + TTS scaffolding exists (`packages/cli/src/voice/*`), STT/PTT is pending.         | Implement dependency-checked recording + STT, wire voice state machine into UI, and add safe spoken confirmations and interruption behaviors.                 |    L |      H |
| MCP integration exists (tooling + commands), extensions exist, hooks exist.                             | Stabilize APIs, improve discovery/install/update UX, and add permissions/trust and observability for third-party tools.                                       |    M |      H |
| YOLO mode exists, but trust-folder boundaries already exist (good foundation).                          | Make YOLO opt-in and visible, enforce boundaries for untrusted workspaces, and add per-tool/per-workspace policy packs.                                       |    M |      H |

## Product pillars (non-negotiable)

| Item                                                                           | What it takes                                                                                                                                                   | Ease | Upside |
| ------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---: | -----: |
| Safety and trust are features, not friction.                                   | Design confirmations and policies as a smooth flow (preview → explain → confirm), not a modal obstacle; measure safety “false positives” and “false negatives”. |    M |      H |
| “Observe-first” beats “act-first” unless the user explicitly opts in.          | Make diagnostics and summaries the default, and require explicit intent for destructive actions; add mode toggles to shift behavior.                            |    M |      H |
| Default UX must work for novices; advanced mode must delight experts.          | Provide clear onboarding and guided flows, while ensuring power-user shortcuts, terse output, and headless workflows remain first-class.                        |    M |      H |
| Every capability should exist as both: interactive UX and headless automation. | Standardize JSON/streaming outputs and stable CLI subcommands; ensure parity between interactive and `-p/--output-format` flows.                                |    M |      H |
| Extensibility must be first-class: stable APIs, versioning, and distribution.  | Create an extension API surface with semantic versioning, compatibility checks, and a safe install/update story.                                                |    L |      H |
| Cross-platform support is a roadmap item, not a tagline.                       | Build an OS abstraction layer for common tasks and test on CI across OS targets; document the support matrix.                                                   |    L |      H |
| Performance budgets are explicit (tokens, CPU, memory, IO, network).           | Add budgets and enforcement (truncate, cache, compress); add perf tests and dashboards for regressions.                                                         |    M |      H |
| Privacy by design: local-first, redact-by-default, minimal telemetry.          | Build redaction into logs/tool outputs, require opt-in telemetry, and document data flows per feature (voice/web-remote).                                       |    M |      H |
| Predictability: deterministic flags and settings; no “personality drift”.      | Keep behavior behind explicit flags/settings; add regression tests for UX modes and prompt invariants.                                                          |    M |      H |
| Upstream mergeability stays high until we intentionally diverge.               | Limit invasive changes, isolate TermAI deltas, and automate upstream sync checks with conflict hotspots documented.                                             |    M |      H |

---

## Phase 0 (now → 4 weeks): “Make the core feel inevitable”

| Item                                                                                            | What it takes                                                                                                                               | Ease | Upside |
| ----------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- | ---: | -----: |
| Stabilize the TermAI identity in all user-facing text (CLI help, docs, themes).                 | Audit branding strings and UI tips; update docs and tests to prevent regressions during upstream merges.                                    |    H |      M |
| Decide naming: keep `gemini` as upstream-compatible binary, ship `termai` wrapper/alias.        | Add a wrapper command or install script that sets defaults and identity, while keeping upstream binary for compatibility and easy syncing.  |    M |      H |
| Add a first-run onboarding flow (choose safe mode, consent levels, quick tutorial).             | Create a guided interactive screen in CLI and persist choices to settings; include “skip” and “reset onboarding” paths.                     |    M |      H |
| Create “Teach Mode” toggle: explains commands before running them (extra guidance for novices). | Add a verbosity/teaching setting that expands pre-exec explanations and offers safer alternatives; keep it deterministic and testable.      |    M |      H |
| Create “Do Mode” toggle: executes with minimal narration (power users).                         | Add a terse mode that suppresses extra explanation (without bypassing confirmations) and favors direct execution with short status updates. |    H |      M |
| Add “Preview Mode”: print planned commands + predicted impact before asking for approval.       | Add a planning step that outputs a command plan and risk notes, then asks the user to proceed; reuse existing confirmation UI.              |    M |      H |
| Add “Explain This Command” micro-feature: one-line explanation + risk classification.           | Implement a lightweight classifier (read/write/network/privileged) and a formatter used in confirmations, logs, and previews.               |    M |      H |
| Add “What changed?” diff summarizer for file edits and command side-effects.                    | Capture diffs from file tools and summarize in a bounded way; for commands, summarize outputs and changed files when detectable.            |    M |      H |
| Add a visible “Approval Mode” indicator in the UI (Safe/Prompt/YOLO).                           | Surface config state prominently in the TUI and headless output; ensure it updates when workspace trust changes.                            |    H |      H |
| Make tool output bounded everywhere (ensure ring buffers and truncation are consistent).        | Standardize truncation and buffering utilities across tools and sessions; add tests for extreme outputs.                                    |    M |      H |
| Add a “session transcript export” to a file (useful for audits, bug reports).                   | Provide a command to export chat + tool calls + approvals to a sanitized file in temp or user-chosen location.                              |    M |      M |
| Improve error UX: show next-step commands when a tool fails (permission, missing binary, etc.). | Add error mappers that detect common failures and propose minimal next steps; keep suggestions safe and confirmable.                        |    M |      H |
| Add “capabilities check” at startup (what tools/commands are available on this OS).             | Probe for key binaries and features (PTY availability, TTS providers) and show a short capabilities summary with remediation links.         |    M |      M |
| Add a single `docs/termai.md`: “what TermAI is”, “how to stay safe”, “how to extend”.           | Write a canonical entry page that links to safety, extensions, and workflows; keep it aligned with actual code paths and flags.             |    H |      M |
| Publish a “demo script” doc: 10 copy-paste demos that reliably impress.                         | Curate demos that work offline/online, show safety, and avoid fragile dependencies; keep outputs bounded and repeatable.                    |    H |      M |
| Add CI smoke tests for TermAI-branded prompt invariants.                                        | Extend existing prompt tests to cover key identity sections and prevent accidental reversion to coding-only persona.                        |    H |      H |
| Add a lightweight “compatibility policy” doc for upstream merges.                               | Document what files we intentionally diverge on and what must remain mergeable; add a checklist for sync PRs.                               |    H |      M |
| Add a “security posture” doc (threat model summary, especially for web-remote).                 | Summarize threat models, defaults, and mitigations; include upgrade checklist for any new execution surface.                                |    H |      H |
| Add a “support matrix” doc (macOS/Linux/Windows/WSL status).                                    | Track OS support, dependencies, and known limitations; keep it updated per release and use it to guide CI.                                  |    H |      M |
| Add a “stability rubric” for features (experimental/beta/stable).                               | Define criteria (tests, docs, security review, compatibility) and label features in UI/docs accordingly.                                    |    H |      M |
| Add a “breaking changes” policy for extensions/MCP.                                             | Set versioning rules, deprecation windows, and compatibility guarantees; add a changelog template for extension APIs.                       |    M |      H |
| Add a “release channels” story for TermAI (nightly/preview/stable).                             | Define cadence, tagging, and what qualifies for stable; automate release notes from changes and issues.                                     |    M |      M |
| Add a “minimal fork” diff dashboard (auto-report what diverges from upstream).                  | Add a script/workflow to compare tracked files and summarize deltas, so merge risk is visible and actionable.                               |    M |      M |
| Establish a “no regressions on safety prompts” test gate.                                       | Add tests for confirmation behavior and policy boundaries, especially around YOLO and untrusted workspaces.                                 |    M |      H |

---

## Phase 1 (month 2): “Process orchestration becomes the killer feature”

| Item                                                                                 | What it takes                                                                                                               | Ease | Upside |
| ------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------- | ---: | -----: |
| Ship `process-manager` as a user-facing, documented capability (not just a tool).    | Add docs, slash commands, and clear UX around sessions; ensure stable schema and error handling.                            |    M |      H |
| Add a `/sessions` slash command UI (list/status/read/send/stop/restart).             | Implement command routing and UI panels for sessions; reuse existing tool calls and confirmations.                          |    M |      H |
| Add a “tail and summarize” UI action (read last N lines + summary).                  | Combine `read` with a summarization pass that’s bounded and attribution-safe; add quick presets (50/200 lines).             |    M |      H |
| Add readiness detection patterns (ports open, “ready” regex, exit codes).            | Add session metadata rules and optional heuristics; expose simple config like `readyRegex` and `readyPort`.                 |    L |      H |
| Add “structured session metadata” (cwd, env, start time, last output time).          | Expand session schema and ensure it’s persisted/displayed consistently across CLI and remote clients.                       |    H |      M |
| Add “session grouping” by project/workspace.                                         | Tag sessions with workspace roots and show filtered views; add defaults for multi-root workspaces.                          |    M |      M |
| Add “session pinning” (keep key sessions visible in UI).                             | Add UI state to pin sessions and render them persistently; store pin state per workspace.                                   |    M |      M |
| Add “session budget controls” (max sessions, max output, max runtime warnings).      | Add settings for caps and warning thresholds; enforce bounded buffers and warn when limits are approached.                  |    M |      H |
| Add “safe stop ladder” UX (SIGINT → SIGTERM → SIGKILL with explicit escalation).     | Implement a guided stop flow that escalates only with explicit confirmation; track last signal and timing.                  |    M |      H |
| Add “stdin send templates” (send Ctrl+C, send Enter, send common responses).         | Provide prebuilt inputs and keybindings for PTY sessions; ensure safe labeling and avoid accidental injection.              |    M |      M |
| Add “log hygiene” for sessions (redaction rules, secrets detection warnings).        | Add redaction filters and token-like detectors; avoid storing sensitive output by default or provide a privacy setting.     |    L |      H |
| Add “background notifications” in text (build finished, server crashed).             | Implement watchers on session exit and output match triggers; render as non-intrusive UI notices.                           |    M |      H |
| Add “export session output” (last N lines to a file, shareable snippet).             | Add a command that writes bounded output to a safe path; include redaction and confirmation for sensitive locations.        |    M |      M |
| Add “session replay” (save command + cwd + env for restart).                         | Store a restart recipe and expose a “restart with same config” action; ensure env handling is explicit and safe.            |    M |      H |
| Add “session snapshots” (capture last state summary periodically, bounded).          | Add optional periodic summarization with a strict budget and storage cap; keep it opt-in to avoid background cost.          |    L |      M |
| Add “process tree awareness” (child processes, ports, CPU usage per session).        | Add platform-specific probes (ps/lsof/netstat variants) and tie results to session pid; keep probes on-demand or throttled. |    L |      H |
| Add “resource watch per session” (CPU/mem spikes trigger warnings).                  | Add optional polling with budgets and thresholds; emit warnings without auto-executing destructive actions.                 |    L |      M |
| Add “PTY fallbacks” per OS clearly surfaced (why input may not work).                | Detect PTY capability at runtime and present actionable guidance when input cannot be sent to a session.                    |    M |      M |
| Add “interactive command handling” guidelines (when TermAI should hand over).        | Document and implement heuristics for when to avoid interactive commands or how to switch focus safely.                     |    H |      M |
| Add “safety prompts for dangerous long-running commands” (rm loops, fork bombs).     | Add pattern-based detection and mandatory confirmations for high-risk patterns; add tests for false positives.              |    M |      H |
| Add test coverage for session lifecycle edge cases (crash, orphaned pid, no output). | Create unit tests and integration tests for start/stop/restart, output buffering, and failure conditions across platforms.  |    M |      H |
| Add “multi-workspace session routing” (correct cwd and file roots).                  | Ensure sessions launch in intended workspace root and respect trusted-folder constraints; test multi-root behavior.         |    M |      M |
| Add “session naming suggestions” (auto-name from command, but user override).        | Add a naming heuristic and a prompt UX to accept/override; ensure uniqueness and stable references.                         |    H |      L |
| Add “session privacy mode” (do not store output, only status).                       | Add a per-session flag that disables output capture and persists only metadata; enforce everywhere output is handled.       |    M |      M |

---

## Phase 2 (month 3): “TermAI can control other agents and tools”

| Item                                                                                | What it takes                                                                                                                      | Ease | Upside |
| ----------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- | ---: | -----: |
| Build `agent-control` on top of process sessions (spawn/manage external CLIs).      | Implement an agent-control tool that delegates to process-manager, with a safe schema and consistent outputs.                      |    M |      H |
| Add an allowlist-first model for agent binaries (explicitly configured).            | Require configuration for which binaries can be spawned and how; block arbitrary spawning by default with clear errors.            |    M |      H |
| Add “agent profiles” (claude/aider/pytest-runner/terraform-plan runner).            | Define per-agent command templates and IO expectations; store in settings and expose via commands.                                 |    M |      M |
| Add “agent output summarization” (what changed, what failed, what to do next).      | Parse and summarize agent outputs into structured results; capture artifacts like diffs and logs.                                  |    M |      H |
| Add “agent sandbox policy” (agents inherit safety constraints; no silent YOLO).     | Ensure delegated agents run under the same approval policies and trust boundaries, with explicit overrides only.                   |    M |      H |
| Add “agent handoff UX” (user sees what is delegated and can stop it).               | Add UI to show active delegated tasks, their commands, and stop controls; keep it observable and interruptible.                    |    M |      H |
| Add “agent streaming attribution” (who said what: TermAI vs delegated agent).       | Tag outputs with source and render in UI with clear attribution; ensure remote clients preserve the tags.                          |    M |      M |
| Add “agent result artifacts” (patch, diff, logs) saved in project temp dir.         | Standardize artifact locations and naming in project temp directory; provide quick open/export actions.                            |    M |      M |
| Add “agent conflict resolution” (if agent edits files, require review/confirm).     | Gate agent-initiated file modifications behind diff previews and user confirmations; default to safe review flows.                 |    M |      H |
| Add “compose agents” (TermAI as supervisor, multiple workers, bounded parallelism). | Add orchestration limits and scheduling; define concurrency caps and failure aggregation semantics.                                |    L |      H |
| Add “task queue” (run agent tasks sequentially with checkpoints).                   | Implement a queue with durable state and resume points; integrate with existing checkpointing patterns.                            |    L |      H |
| Add “retry policy” (recoverable failures vs hard failures).                         | Classify errors, implement bounded retries, and show clear remediation suggestions; never retry destructive actions automatically. |    M |      M |
| Add “budget enforcement” (time, tokens, tool calls) per delegated agent.            | Add per-agent budgets and enforcement in scheduler; surface budget exhaustion as a user-actionable event.                          |    L |      H |
| Add tests for agent-control safety boundaries.                                      | Add unit tests for allowlists, policy inheritance, and confirmation gating; add minimal integration tests for spawning.            |    M |      H |
| Add a “transcript-to-issue” exporter (bug report with sanitized logs).              | Create a generator that redacts secrets and formats issues with steps, environment, and logs; keep it user-approved.               |    M |      M |
| Add “team mode” concept (multiple operators, shared policies, later enterprise).    | Define multi-user policy model and shared configs as a future design; keep implementation deferred until core is stable.           |    L |      M |
| Add “agents as MCP servers” bridge (treat remote tools as first-class).             | Provide a protocol adapter so an agent can expose tools via MCP, with strict auth and permissions.                                 |    L |      M |

---

## Phase 3 (month 4): “Safety, trust, and permissions become world-class”

| Item                                                                                | What it takes                                                                                                                 | Ease | Upside |
| ----------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- | ---: | -----: |
| Introduce capability-scoped permissions (shell/file/web/MCP) per workspace.         | Add a policy layer that can enable/disable tool categories per workspace and per trust level; wire into UI and config.        |    L |      H |
| Add per-directory allow/deny lists (fine-grained beyond trusted folder).            | Extend workspace trust model to include path-based rules; enforce on file and shell tools that touch paths.                   |    L |      H |
| Add “command risk scoring” (read-only, writes, deletes, network, privilege).        | Implement a classifier and label commands in confirmations and logs; tune with tests to reduce false positives.               |    M |      H |
| Add “sudo awareness” (detect prompts, require explicit user intent).                | Detect sudo usage and password prompts, and require explicit consent before entering privileged flows; document secure usage. |    M |      H |
| Add “destructive guardrails” (rm -rf, chmod -R, dd, mkfs, registry deletes).        | Add deny/confirm rules for known dangerous patterns; add a safe “dry-run/preview” suggestion when available.                  |    M |      H |
| Add “undo playbooks” for common operations (git reset, restore, package rollback).  | Encode reversible procedures and present them as suggested next steps or explicit `/undo` actions with confirmations.         |    L |      H |
| Add “dry-run defaults” for tools that support it (terraform plan, kubectl diff).    | Detect tool ecosystems and prefer non-destructive preview commands first; offer “apply” only after explicit confirmation.     |    M |      H |
| Add “explicit network mode” (offline-only vs allowed), with UI indicator.           | Add a config toggle that disables web tools and network calls; show status prominently and enforce in tool registry.          |    M |      M |
| Add “secret hygiene” (redact env vars by pattern, warn on token-like strings).      | Add redaction filters and detectors; prevent logging of secrets and warn when commands/output likely include credentials.     |    M |      H |
| Add “clipboard hygiene” (when copying secrets, warn, optional time-based clearing). | Add clipboard-aware UX and optional auto-clear timers; ensure it’s opt-in and cross-platform safe.                            |    L |      M |
| Add “audit log mode” (append-only log of actions and approvals, local file).        | Implement structured logging of actions, tool calls, and approvals; store locally with rotation and redaction.                |    M |      H |
| Add “policy packs” (Safe, Dev, Ops, CI) with documented defaults.                   | Define named presets for approvals/tools/network and document them; allow per-workspace override with clear diff display.     |    M |      H |
| Add “per-tool approval rules” (always confirm for tool X, never for tool Y).        | Add configuration to override approval behavior per tool; ensure it cannot bypass hard-deny safety rules.                     |    M |      H |
| Add “safe filesystem mode” (restrict writes outside workspace unless explicit).     | Enforce path boundaries on write/edit tools and shell commands that target paths; require explicit overrides with warnings.   |    L |      H |
| Add “sandbox discoverability” (what sandbox is active and what it blocks).          | Detect sandbox mode and show constraints in UI and error messages; provide remediation steps and docs links.                  |    H |      M |
| Add “threat-model templates” for new features (web-remote, voice, workflows).       | Create repeatable checklists and require them for PRs that add new execution surfaces or always-on behavior.                  |    H |      H |
| Add “security regression suite” for web-remote middleware.                          | Add tests for auth, CORS, replay, rate limiting, and logging redaction; run them in CI on every change.                       |    M |      H |
| Add “secure-by-default tunnels” (if ever added, require explicit consent).          | Design tunnel helpers as plugins with strict consent gates and safe defaults; avoid shipping as default behavior.             |    L |      M |
| Add “least privilege” tool execution (cwd restrictions, env filtering).             | Filter env exposure and restrict execution context; ensure tools only see what they need and user can inspect what’s shared.  |    L |      H |
| Add “command provenance” (why this command was chosen, from which plan step).       | Store reasoning metadata alongside each command and show it in confirmations and audit logs; keep it concise and testable.    |    M |      M |
| Add “human override” gestures (panic stop key, kill all sessions key).              | Add global keybindings to stop TTS, abort current tool, and optionally stop all managed sessions with confirmation.           |    M |      H |
| Add “safe prompts for system-wide package managers” (brew/apt/choco).               | Add extra warnings and preview steps for installs/upgrades; suggest least-destructive options first.                          |    M |      M |
| Add “safe prompts for cloud CLIs” (aws/gcloud/az destructive actions).              | Detect destructive subcommands and require explicit confirmation and “plan/diff” first where supported.                       |    L |      H |
| Add a “security champions” program for contributors.                                | Define security review ownership, checklists, and response processes; recruit maintainers and automate key checks in CI.      |    M |      M |

---

## Phase 4 (month 5): “Make novices dangerous (in a safe way)”

| Item                                                                                | What it takes                                                                                                                            | Ease | Upside |
| ----------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- | ---: | -----: |
| Ship a guided onboarding: “what is a shell”, “what is a file”, “what is a process”. | Add interactive tutorial screens and reusable explainer snippets; store progress and allow replay.                                       |    M |      H |
| Add “explain like I’m new” mode (more context, fewer assumptions).                  | Add a deterministic verbosity mode that expands reasoning and provides safer alternatives; keep it toggleable and testable.              |    M |      H |
| Add “command tutoring” (why flags matter, common patterns).                         | Build short, contextual explanations tied to commands and OS; show “learn more” links without spamming power users.                      |    M |      M |
| Add “interactive confirmations” (rewrite or edit command before running).           | Allow the user to edit the proposed command in a safe editor flow before execution; integrate with existing modify-with-editor outcomes. |    M |      H |
| Add “safe recipes” library (disk cleanup, backups, git rescue, log triage).         | Curate recipes with guardrails, previews, and rollback notes; version them and test against common environments.                         |    M |      H |
| Add “choose-your-own-adventure” flows (troubleshoot wifi, free disk, kill process). | Implement guided multi-step prompts with checkpoints and branching based on system state; keep steps small and confirmable.              |    L |      H |
| Add “ask before installing” defaults (and show what will be installed).             | Detect installs and upgrades and force a preview step; show package lists and disk impact when possible.                                 |    M |      M |
| Add “detect OS + distro” and use correct commands (apt vs dnf vs pacman).           | Build a platform abstraction and command mapping layer; add tests for detection and fallback guidance.                                   |    L |      H |
| Add “copy-paste safe output” (short, minimal, avoids dangerous one-liners).         | Provide curated, safe command snippets and avoid piping curl-to-shell patterns; add a safety linter on outputs.                          |    M |      H |
| Add “replay last solution” (repeat a workflow safely).                              | Store the last plan + commands as a replayable script with previews and confirmations; avoid replaying destructive actions silently.     |    M |      M |
| Add “glossary popovers” in TUI (what is PATH, what is PID).                         | Add a contextual help UI component and a small glossary dataset; surface via keybinding and tooltips.                                    |    M |      M |
| Add “what just happened?” summaries after multi-step ops (bounded, clear).          | Generate a short post-run recap that includes what ran, what changed, and next steps; cap size and include links to artifacts.           |    M |      H |
| Add “suggest next best command” for common failure messages.                        | Build an error-to-remediation map for common tools and OS errors; ensure suggestions are safe and confirmable.                           |    M |      H |
| Add “safe search” for errors (web-search with redacted snippets).                   | Redact sensitive output and only search minimal error signatures; gate behind network permission and provide clear UI.                   |    M |      M |
| Add “learning loop” (“Was that helpful?” optional, local-only feedback).            | Add an opt-in UX prompt that stores local feedback and does not transmit by default; use it to tune defaults and recipes.                |    M |      M |
| Add a “beginner command palette” in the UI (common tasks with prompts).             | Create a searchable list of common tasks that generate safe plans; include OS-aware variants.                                            |    M |      H |
| Add “dangerous command linting” (warn on suspicious patterns).                      | Implement pattern-based checks and risk scoring; integrate with confirmations and preview mode with tests to avoid noise.                |    M |      H |
| Add “project templates” (“set up python env”, “node dev”, “docker dev”).            | Provide templates that detect repo type and propose safe steps; keep them configurable and modular.                                      |    M |      M |
| Add “one-click rollback” for certain flows (git checkout, restore package lock).    | Provide explicit rollback commands and guard them with confirmations; capture “before” state where feasible.                             |    L |      H |
| Add a “trust explained” screen (why TermAI asks for approvals).                     | Add a short, accessible explanation of approval modes, trusted folders, and how to change settings safely.                               |    H |      M |

---

## Phase 5 (month 6): “Workflows: from chat to repeatable automation”

| Item                                                                                  | What it takes                                                                                                                     | Ease | Upside |
| ------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------- | ---: | -----: |
| Define a minimal workflow format (YAML/JSON) with validation.                         | Design a schema, write a validator, and keep v1 minimal (run/verify steps, env vars, cwd, outputs).                               |    L |      H |
| Add “workflow preview” (steps + commands + impact) before execution.                  | Render a plan view with risk classification and required approvals; allow editing before running.                                 |    M |      H |
| Add “workflow checkpointing” (pause/resume, recover on failure).                      | Persist step state and artifacts; implement resume semantics and clear failure reporting.                                         |    L |      H |
| Add “workflow variables” (env, args, detected OS info).                               | Add templating with strict escaping and type checks; provide OS-aware defaults and safe interpolation.                            |    M |      M |
| Add “workflow permissions” (per workflow: allowed tools, allowed roots).              | Bind workflows to policy scopes; require explicit permission grants and display them in previews.                                 |    L |      H |
| Add “workflow artifact capture” (logs, outputs, diffs saved predictably).             | Standardize artifact directories and filenames; expose quick open/export and redact sensitive data.                               |    M |      H |
| Add “workflow sharing” (export/import with signatures, avoid supply-chain surprises). | Create a packaging format with signatures and metadata; warn on unknown authors and require user confirmation.                    |    L |      H |
| Add “workflow marketplace” concept (curated, reviewed, signed).                       | Build an index and review process; start with a curated list and expand with governance and security reviews.                     |    L |      M |
| Add “workflow testing harness” (dry-run mode, mocked tools).                          | Build a test runner that simulates tool results and verifies step ordering and outputs; integrate into CI for workflows.          |    L |      M |
| Add “workflow triggers” (manual, schedule, file change, process output).              | Implement trigger sources with budgets and opt-in; add safe defaults so triggers don’t execute destructive actions automatically. |    L |      M |
| Add “workflow UI” (browse, run, view last run status).                                | Add TUI views for workflows and run history; support quick-run with preview and show artifacts.                                   |    M |      H |
| Add “workflow linting” (dangerous commands, missing confirmations).                   | Implement static analysis rules and show warnings in preview; fail closed for high-risk patterns unless explicitly allowed.       |    M |      H |
| Add “workflow provenance” (who authored it, what version, what changed).              | Store metadata and change history; show diffs between versions and include it in audit logs.                                      |    M |      M |
| Add “workflow policies for CI” (headless, deterministic outputs).                     | Provide a headless runner mode with JSON outputs and deterministic ordering; ensure it respects approvals and policies.           |    M |      H |
| Add “workflow secrets handling” (references to vaults, never inline).                 | Add secret references (env var names, vault keys) and forbid plaintext secrets in workflow files; add scanners and warnings.      |    L |      H |
| Add “workflow dependency checks” (binary presence, versions).                         | Add preflight checks and actionable install instructions per OS; fail early with clear guidance.                                  |    M |      M |
| Add “workflow concurrency controls” (one at a time, or bounded parallel).             | Add concurrency settings and locking per workflow/workspace; define conflict and cancellation semantics.                          |    L |      M |
| Add “workflow rollback hooks” (optional, explicit, never automatic by default).       | Allow rollback steps that are shown in preview and require explicit selection; never auto-run rollback without user consent.      |    L |      M |
| Add “workflow as slash command” (`/run deploy-staging`).                              | Add command routing that loads workflow definitions and launches the runner with previews and confirmations.                      |    M |      M |
| Add “workflow as CLI subcommand” (`termai run deploy-staging`).                       | Add a stable CLI entrypoint for workflows with JSON outputs for scripting; align behavior with interactive mode.                  |    M |      H |
| Add “workflow as MCP server” (export workflows as tools).                             | Expose workflows as tool definitions via MCP with strict permissions and audit logging.                                           |    L |      M |
| Add “workflow analytics” (local stats: success rate, time, common failures).          | Store local run metadata and compute summaries; keep it opt-in and bounded with easy export.                                      |    M |      M |

---

## Phase 6 (month 7–8): “Extensions become an ecosystem, not a folder”

| Item                                                                             | What it takes                                                                                                              | Ease | Upside |
| -------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------- | ---: | -----: |
| Formalize extension APIs (stable interfaces, versioning, compatibility checks).  | Define public APIs, version them, and enforce compatibility at load time; provide clear error messages and migration docs. |    L |      H |
| Add extension signing or trust prompts (supply-chain safety).                    | Implement signature verification or a trust-on-first-use flow; store trust decisions locally per extension version.        |    L |      H |
| Add extension permissions (what can this extension do? file/shell/web/MCP).      | Add a permissions manifest and enforce it in tool registration and execution; surface it in UI on install/upgrade.         |    L |      H |
| Add extension sandboxing (where possible; at least boundaries and warnings).     | Implement runtime restrictions (paths, network) and warnings when isolation isn’t possible; document limitations per OS.   |    L |      H |
| Add an extension registry index (community-run, transparent moderation).         | Build an index format and submission process; add moderation rules and security scanning.                                  |    L |      M |
| Add “one-command install” with reviewable manifest.                              | Implement install command that shows manifest and permissions, then confirms; store in a standard extension directory.     |    M |      H |
| Add “extension update policy” (pin versions, show changelogs).                   | Implement version pinning and upgrade flows; show diffs/changelogs and require confirmation for new permissions.           |    M |      H |
| Add “extension health checks” (broken extension detection, safe disable).        | Detect load/runtime errors and offer auto-disable; provide diagnostics and recovery path.                                  |    M |      M |
| Add “extension profiles” per workspace (enable only what you need).              | Add per-workspace enable/disable settings and a quick UI to toggle; keep defaults conservative.                            |    M |      M |
| Add “extension devkit” (scaffold, tests, docs templates).                        | Provide a generator and templates consistent with repo conventions; add example tests and publishing guidance.             |    M |      M |
| Add “extension examples” (github PR helper, kubectl helper, log parser).         | Build a small curated set of examples that demonstrate best practices, safety, and bounded outputs.                        |    M |      M |
| Add “MCP-first” patterns (extensions as MCP servers, not monolithic hacks).      | Provide guidance and helper libraries for building MCP servers; encourage isolation and clear tool schemas.                |    M |      H |
| Add “tool capability discovery” (describe tool IO schemas to users).             | Surface tool schemas and examples in UI and docs; add `/tools` explorer with search.                                       |    M |      M |
| Add “tool composition” (chain tools with safe intermediate representations).     | Define intermediate data formats (JSON) and guardrails for passing data between tools; add explicit chaining primitives.   |    L |      H |
| Add “tool caching” (avoid repeated expensive calls, bounded lifetime).           | Add per-tool caching with TTL and invalidation; ensure caching does not hide important state changes.                      |    M |      M |
| Add “tool replay” (rerun the same tool call with parameters).                    | Store tool invocations and allow replay with preview; respect current policies and workspace trust.                        |    M |      M |
| Add “tool simulation” (when possible, show what would happen).                   | Prefer `--dry-run`/`--check` modes and parsable previews; fall back to explaining impact when simulation isn’t possible.   |    M |      H |
| Add “tool provenance” (which extension provided the tool).                       | Tag tools with provider metadata and surface it in UI, logs, and audit trails; include version info.                       |    H |      M |
| Add “extension observability” (runtime errors, performance metrics, local logs). | Add local logging and metrics for extension execution; provide a `/diagnose` view and export.                              |    M |      M |
| Add “extension UI contributions” (small panels/widgets in TUI, gated).           | Define a limited UI plugin interface and sandbox it; gate behind explicit permissions and stability levels.                |    L |      M |
| Add “extension distribution” via npm and via single-file bundles.                | Provide packaging formats and verification; keep install flows simple and reviewable.                                      |    L |      M |
| Add “enterprise extension policy” later (allowlist registry, internal signing).  | Design for enterprise constraints but keep it optional; implement allowlists and signing hooks later.                      |    L |      M |
| Add “community spotlights” (weekly featured extensions and workflows).           | Build a repeatable community process and showcase content in docs/releases; keep it low-maintenance.                       |    H |      L |
| Add a “compatibility test suite” for extensions.                                 | Provide a harness that loads and runs extension smoke tests against stable APIs; run in CI for core changes.               |    L |      H |

---

## Phase 7 (month 9): “Voice-first that actually works”

| Item                                                                                | What it takes                                                                                                                         | Ease | Upside |
| ----------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- | ---: | -----: |
| Implement push-to-talk recording on macOS/Linux with dependency checks.             | Add recorder integration (ffmpeg/sox) with runtime detection, clear UX states, and failure guidance.                                  |    L |      H |
| Implement STT via local `whisper.cpp` (no network) as the default.                  | Add a provider that shells out to whisper.cpp, manages temp audio files, and returns transcripts with confidence/error reporting.     |    L |      H |
| Add Windows STT story (WSL support first, native later).                            | Start with WSL compatibility and documented prerequisites; evaluate native capture and whisper integration later with CI coverage.    |    L |      M |
| Add a clear voice UI state machine (OFF / LISTENING / THINKING / SPEAKING).         | Implement state transitions and rendering in the TUI; ensure interruption and cancellation work reliably.                             |    M |      H |
| Add “transcript review” before sending by default (novice-friendly).                | Insert transcript into composer and require Enter to send; add auto-send option behind a setting.                                     |    H |      M |
| Add “auto-send on confidence” option (power users).                                 | Add confidence heuristics and thresholds; ensure safe fallback to manual confirm when confidence is low.                              |    M |      M |
| Add “voice command shortcuts” (stop, cancel, repeat, summarize).                    | Add local commands that operate on the current session/task without extra LLM calls; map to keybindings and voice phrases.            |    M |      M |
| Add “interrupt everything” behavior (PTT cancels TTS and current narration).        | Wire PTT key to cancel speech and active tool narration; ensure it never auto-approves tools.                                         |    M |      H |
| Add “background voice notifications” tied to process sessions (build finished).     | Connect session events to voice notifications; keep it opt-in and non-intrusive with replay support.                                  |    M |      H |
| Add “voice privacy” controls (no storing audio, optional storing transcripts).      | Default to no audio persistence; add explicit settings for transcript retention and clear “delete data” controls.                     |    M |      M |
| Add “voice device selection” (mic, output device) where OS supports it.             | Expose device selection via settings and runtime detection; implement per OS where feasible.                                          |    L |      M |
| Add “voice dependency installer guidance” (ffmpeg/sox instructions).                | Provide OS-specific install instructions and checks; show them when dependencies are missing.                                         |    H |      M |
| Add “voice fallback modes” (STT-only, TTS-only, text-only).                         | Detect what’s available and degrade gracefully; keep UI clear about what’s enabled.                                                   |    M |      M |
| Add “spoken reply tuning” (max words, verbosity, tone).                             | Extend existing spoken reply derivation settings and keep deterministic truncation; add tests.                                        |    H |      M |
| Add “speak confirmations” (read the risky part, ask for yes/no).                    | Add a safe spoken confirmation layer that mirrors on-screen confirmations; require explicit user action to proceed.                   |    L |      H |
| Add “voice-safe approvals” (never YOLO just because voice is on).                   | Ensure approval mode and trust boundaries are independent from voice; add regression tests for this behavior.                         |    M |      H |
| Add “voice macros” (“start dev server”, “tail logs”, “status report”).              | Provide a small set of voice shortcuts that map to safe, explicit commands; keep customization for later.                             |    M |      M |
| Add “voice accessibility” (hearing-impaired: captions; speech-impaired: shortcuts). | Ensure all voice functionality has text equivalents and clear UI; add keyboard-only flows and captions by default.                    |    M |      H |
| Add “wake word” as a future research item (explicitly out of default scope).        | Keep it out of the default product until privacy, dependency, and reliability requirements are met; design as a plugin if ever added. |    L |      M |
| Add “multi-language STT/TTS” roadmap (community contributions welcome).             | Support multiple language models/providers via configuration and docs; keep core interfaces extensible.                               |    L |      M |
| Add a voice demo that feels magical but safe (build + notify + summarize).          | Build a scripted scenario that highlights interruption, safe confirmations, and process notifications without fragile dependencies.   |    M |      M |

---

## Phase 8 (month 10): “Web-remote becomes a real product”

| Item                                                                              | What it takes                                                                                                                | Ease | Upside |
| --------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- | ---: | -----: |
| Ship a tiny authenticated local web client (no framework, fast, mobile-friendly). | Serve static UI behind auth, support streaming, and implement confirmations; keep bundle small and auditable.                |    M |      H |
| Support streaming events + confirmations end-to-end in the web UI.                | Implement SSE parsing, render tool-call confirmations, and send confirmation outcomes with auth and replay protection.       |    M |      H |
| Add QR-code pairing for localhost (still token-based, explicit consent).          | Generate pairing URLs and show QR codes; ensure tokens are short-lived or user-rotatable and never logged.                   |    M |      M |
| Add “read-only remote mode” (observe sessions, no execution).                     | Add server-side authorization that restricts tool execution and confirmations; clearly label mode in UI.                     |    M |      H |
| Add “remote approval required” mode (remote can request, local must approve).     | Implement a two-party confirmation flow where local terminal must approve; store pending requests and timeouts safely.       |    L |      H |
| Add “multi-device sessions” (phone as display, desktop as executor).              | Add session views optimized for mobile and keep state synchronized; ensure device-specific permissions and revocation.       |    L |      H |
| Add “secure tunneling helpers” as optional plugins, not default behavior.         | Provide scripts or extensions with explicit warnings and safe defaults; keep it out of core and require explicit enablement. |    L |      M |
| Add “origin hardening” (DNS rebinding mitigations, strict host checks).           | Validate Host headers, restrict binds, and document safe configs; add tests for bypass attempts.                             |    M |      H |
| Add “rate limits” and “lockout” for repeated auth failures.                       | Add per-IP/token rate limits and exponential backoff; ensure it doesn’t DOS legitimate local use.                            |    M |      M |
| Add “token rotation UX” with clear warnings and one-time display.                 | Implement rotate commands and UI flows; never re-display persisted tokens, only show on creation.                            |    M |      H |
| Add “remote audit log” (what remote requested, what local approved).              | Log remote requests and local approvals in a redacted append-only log; allow export for audits.                              |    M |      M |
| Add “remote session list + tail” as the first killer capability.                  | Expose sessions to remote UI with safe read access; add filters, search, and bounded tail views.                             |    M |      H |
| Add “remote voice” via browser APIs as an optional client feature.                | Use browser STT/TTS and send text to server; keep it behind explicit opt-in and permissions.                                 |    M |      M |
| Add “remote pairing expiry” (tokens can expire and be revoked).                   | Add token TTLs and a revocation list; surface token status and revoke controls clearly.                                      |    M |      H |
| Add “remote device trust list” (label and revoke devices).                        | Store device labels/last-seen, implement revoke; ensure it’s local-only and easy to reset.                                   |    L |      M |
| Add a “security review checklist” before every web-remote release.                | Require checklist completion and test pass gates for releases; treat as a release blocker.                                   |    H |      H |

---

## Phase 9 (month 11–12): “Cross-platform and distribution become boring”

| Item                                                                                   | What it takes                                                                                                                       | Ease | Upside |
| -------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- | ---: | -----: |
| Publish a first-class `termai` binary name (keep `gemini` compatibility if desired).   | Add packaging and entrypoints; preserve upstream `gemini` behavior while enabling TermAI defaults via `termai`.                     |    M |      H |
| Ship Homebrew formula (macOS), Scoop/Winget (Windows), and npm global install docs.    | Create release artifacts and package definitions; automate publishing and verify installs in CI.                                    |    L |      H |
| Add an optional single-file installer script (explicit consent, transparent).          | Write an installer that prints what it will do, supports dry-run, and avoids hidden network behavior; document security trade-offs. |    L |      M |
| Add a reproducible build pipeline (SBOM, checksums, signatures).                       | Add build attestations, SBOM generation, and signing; publish checksums and verify in CI.                                           |    L |      H |
| Add prebuilt binaries where feasible (or documented constraints if not).               | Evaluate packaging approach (pkg, node distributions) and produce per-OS artifacts; document limitations clearly.                   |    L |      H |
| Harden Windows support (native + WSL detection + correct command mapping).             | Build OS-specific command mappings, test on Windows CI, and document WSL path and permission nuances.                               |    L |      H |
| Add “shell integration” (zsh/bash/fish completion, prompt hints, history integration). | Implement completions, add optional prompt integration, and keep it opt-in; ensure it doesn’t break existing shell configs.         |    M |      M |
| Add “clipboard integration” per OS (already partially present; tighten UX).            | Ensure consistent behavior across OS, add safety warnings for sensitive content, and add tests where possible.                      |    M |      M |
| Add “terminal multiplexers” support (tmux/screen friendly behaviors).                  | Detect tmux/screen and avoid UI behaviors that conflict; document recommended settings.                                             |    M |      M |
| Add “SSH remote workflows” guidance (TermAI running on server, user local UI).         | Provide docs and safe patterns for running TermAI on remote hosts, including trust boundaries and secrets handling.                 |    H |      M |
| Add “container mode” (run TermAI inside container with mapped workspace).              | Provide container images, volume mounts, and sandbox policies; document limitations and security implications.                      |    M |      M |
| Add “enterprise proxy support” docs and tests (already some infra exists).             | Document proxy env vars and behaviors; add tests that simulate proxy settings without leaking credentials.                          |    M |      M |
| Add “offline mode” (no web tools) with clear UI.                                       | Add a hard toggle that disables web tools and indicates status; ensure prompts don’t suggest web actions when disabled.             |    M |      M |
| Add “model provider matrix” (Gemini OAuth now; others later).                          | Document supported providers and the plan for pluggability; keep provider integration behind explicit config.                       |    M |      M |
| Add “diagnostics bundle” for bug reports (sanitized, user-approved).                   | Implement a packager that collects logs/configs/redacted environment info; require explicit user approval before writing.           |    M |      H |
| Add “performance baselines” per OS (startup time, idle CPU, memory).                   | Measure and track metrics in CI; set regression thresholds and investigate hot paths.                                               |    L |      H |
| Add “support lifecycle” (which OS versions are supported, for how long).               | Define support windows and deprecation policy; keep docs and CI targets aligned.                                                    |    H |      M |

---

## Phase 10 (year 2): “TermAI becomes the control plane for your computer”

| Item                                                                          | What it takes                                                                                                                | Ease | Upside |
| ----------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- | ---: | -----: |
| Introduce a unified “Task Graph” internally (steps, dependencies, artifacts). | Define a core task model that everything maps to (tools, sessions, workflows) and expose it via streaming events.            |    L |      H |
| Make every tool call an event in that graph (traceable, replayable).          | Emit structured events for tool calls/results/confirmations and store a bounded history; add replay hooks with previews.     |    M |      H |
| Add “task resume” across restarts (persist minimal state safely).             | Persist task graph checkpoints and artifacts; design safe resume semantics that revalidates trust/policies.                  |    L |      H |
| Add “multi-repo / multi-host” orchestration (fleet mode, opt-in).             | Design secure remote execution with strong auth and isolation; start with read-only observability and expand cautiously.     |    L |      H |
| Add “remote agents” (execute on servers) with strong auth and isolation.      | Define remote agent protocol, auth, and sandboxing; ensure approvals remain authoritative and auditable.                     |    L |      H |
| Add “policy-as-code” (org-level rules for what TermAI can do).                | Implement policy files and evaluation, with override rules and audit logs; ensure it’s composable and testable.              |    L |      H |
| Add “team workflows” (shared recipes, shared approvals, shared extensions).   | Add sharing mechanisms with signatures and permissions; design approval workflows and role-based access.                     |    L |      H |
| Add “observability dashboard” (local-first, optional export).                 | Build a local dashboard that reads task graph events and metrics; add optional export hooks for enterprises.                 |    L |      M |
| Add “incident mode” (log triage, alerting, timeline reconstruction).          | Build specialized flows and parsers for logs, errors, and timelines; keep actions safe and preview-first.                    |    L |      H |
| Add “infra mode” (terraform/k8s safe operations with preview diffs).          | Integrate with ecosystem previews (plan/diff) and add guardrails for apply; provide structured summaries.                    |    L |      H |
| Add “data mode” (SQL helpers, safe read-only by default).                     | Add database MCP integrations and defaults to read-only queries; require explicit escalation for writes.                     |    L |      M |
| Add “security mode” (safe scanners, CVE lookup, patch guidance).              | Provide curated scanners and web lookups with redaction; produce actionable remediation plans and safe diffs.                |    L |      M |
| Add “developer mode” (deep code changes still first-class).                   | Maintain strong code editing tools and tests, and ensure coding remains a high-quality subset of the broader operator story. |    M |      H |
| Add “terminal literacy mode” (teaches commands as you go, with guardrails).   | Expand Teach Mode into progressive lessons tied to real tasks; keep opt-in and measurable.                                   |    M |      M |

---

## Phase 11 (year 2): “Models: bring-your-own brain”

| Item                                                                           | What it takes                                                                                                                   | Ease | Upside |
| ------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------- | ---: | -----: |
| Add pluggable model provider interface in core (Gemini remains first-class).   | Define an abstraction for model clients and unify request/streaming semantics; keep Gemini OAuth path stable.                   |    L |      H |
| Add local model support (opt-in, clear hardware requirements).                 | Integrate a local inference backend behind a provider flag and document requirements; ensure tool use remains safe and bounded. |    L |      M |
| Add “cheap model for planning, strong model for execution” routing.            | Implement model routing based on step type and budgets; ensure determinism and user control over provider selection.            |    L |      H |
| Add “privacy tiers” (local-only, cloud-LLM, hybrid) per workspace.             | Add per-workspace configuration that gates network/model usage; surface tier in UI and enforce at runtime.                      |    M |      H |
| Add “context budgeting” controls (token caps, auto-compress thresholds).       | Add explicit token budgets and auto-compression policies; surface when compression occurs and allow tuning.                     |    M |      H |
| Add “structured output contracts” between core and UI (more deterministic UX). | Standardize event schemas and UI rendering rules; reduce reliance on free-form text for state transitions.                      |    M |      H |
| Add “model fallback strategies” (timeouts, retries, degrade gracefully).       | Add retry policies and fallback ordering with clear user visibility; avoid silent switches that change behavior unexpectedly.   |    M |      M |
| Add “benchmarks that matter” (terminal tasks, process ops, safety compliance). | Create eval suites for process management, safety adherence, and operator tasks; run in CI and publish results.                 |    L |      H |
| Add “eval harness” for new features (workflow correctness, safety prompts).    | Build a harness that can replay scenarios and assert tool calls and confirmations; use it as a gate for risky features.         |    L |      H |

---

## Phase 12 (year 2–3): “Terminal apps: an ecosystem people build businesses on”

| Item                                                                            | What it takes                                                                                                      | Ease | Upside |
| ------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------ | ---: | -----: |
| Define a “Terminal App” manifest (tools, workflows, UI panels, permissions).    | Design a manifest schema and lifecycle hooks; keep v1 minimal with strong permissions and versioning.              |    L |      H |
| Add a curated app store index (community-governed, transparent policies).       | Create an index and review process; start with curated apps and expand governance carefully.                       |    L |      M |
| Add an enterprise/private app registry story.                                   | Support private registries with signing and allowlists; document best practices for internal distribution.         |    L |      M |
| Add a “review bot” pipeline for apps (static checks, dangerous patterns).       | Automate linting, permission diffing, and known-bad patterns; require passing checks to list in the index.         |    L |      H |
| Add “app sandboxing” and permission prompts (like mobile OS, but for terminal). | Build runtime enforcement for app permissions and clear prompts; isolate where possible and warn where not.        |    L |      H |
| Add “app interop” (apps call each other’s tools with explicit permission).      | Define safe composition rules and permission delegation; ensure provenance and audit trails across app boundaries. |    L |      M |
| Add “app UX standards” (fast, keyboard-first, accessible).                      | Publish design guidelines and provide UI components/templates; enforce via review and examples.                    |    M |      M |
| Add “app telemetry” local-only by default (opt-in export).                      | Add local metrics collection and an opt-in export mechanism; ensure redaction and user control.                    |    M |      M |
| Add “app monetization hooks” only if aligned with open-source ethos (careful).  | If pursued, design it as optional and community-aligned (e.g., sponsorship links), not paywalled functionality.    |    L |      L |

---

## Moonshots (year 3–5): what “terminal AI” can truly become

| Item                                                                                | What it takes                                                                                                                                                            | Ease | Upside |
| ----------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ---: | -----: |
| TermAI as the universal “operator layer” over computers, servers, and containers.   | Build a secure remote execution architecture with policy-as-code, observability, and strong identity; ship gradually from read-only to controlled execution.             |    L |      H |
| A canonical “intent language” for safe automation (portable across machines).       | Define a portable intermediate representation for tasks and workflows and standardize permissions and previews; build tooling to compile intent to OS-specific commands. |    L |      H |
| A world where “I need to deploy” is a verified workflow with previews and rollback. | Implement workflow validation, previews, policy gates, artifact capture, and optional rollback steps; integrate with infra ecosystems safely.                            |    L |      H |
| A world where “my disk is full” triggers a safe diagnostic, not a panic.            | Create safe diagnostic recipes with bounded scanning and clear remediation options; add a guided flow for cleanup with previews.                                         |    M |      H |
| A world where “start dev, watch logs, ping me on errors” is one sentence.           | Combine process sessions, readiness detection, output-match triggers, and notifications (text/voice) behind a clean UX.                                                  |    M |      H |
| A world where voice works in the real world: noisy rooms, interruptions, urgency.   | Invest in robust STT, interruption behavior, confidence thresholds, and safe spoken confirmations; provide reliable device handling across OSes.                         |    L |      H |
| A world where your phone is a secure window into your terminal sessions.            | Ship web-remote with strong auth, pairing, read-only mode, and local approval gating; then expand to mobile UX.                                                          |    L |      H |
| A world where extensions are safer than copy-pasted shell scripts.                  | Build permissioned, signed extensions with clear provenance, previews, and audit logs; make safe defaults easier than unsafe shortcuts.                                  |    L |      H |
| A world where new users learn the terminal by doing, with guardrails.               | Build tutorial flows, tutoring, and recipe-driven execution with reversible playbooks and explanations; keep it opt-in and measurable.                                   |    M |      H |
| A world where power users run fleets with policy-as-code approvals.                 | Add remote orchestration with org policies, role-based approvals, and audit trails; keep execution bounded and observable.                                               |    L |      H |
| A world where TermAI can prove what it did (audit trails) and why it did it.        | Make provenance and audit logging a core primitive across all tools and surfaces; ensure logs are redacted, bounded, and exportable.                                     |    M |      H |
| A world where “undo” exists for more operations via reversible playbooks.           | Encode reversible operations and capture “before” state when feasible; expose a clear `/undo` UX with previews and confirmations.                                        |    L |      H |
| A world where workflows are shareable, signed, and reproducible.                    | Provide signed workflow packages, deterministic runners, and artifact capture; add an index and review process for sharing.                                              |    L |      H |
| A world where local models handle private tasks entirely offline.                   | Add local model providers and offline-first tool behavior; document constraints and keep opt-in with clear performance expectations.                                     |    L |      M |
| A world where TermAI becomes the de facto standard client for MCP tooling.          | Make MCP discovery, management, permissions, and UX excellent; publish stable APIs and showcase ecosystem wins.                                                          |    L |      H |
