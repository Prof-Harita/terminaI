# TermAI — Product & Strategic Roadmap

> **The Mission:** TermAI is not a better terminal. It is the **Universal
> Translator between Human Intent and System Action**. We compress the time from
> "I need to..." to "Done." — for everyone from laymen to power users.

---

## Why Now? The Market Inflection Point

The "Vibe Coding" revolution has exploded — Cursor, Claude Code, Copilot, Aider.
But this revolution has **only happened for coding**. The parallel universe for
**general computer operation** remains untouched.

| Domain                      | For Developers                                       | For Everyone Else |
| --------------------------- | ---------------------------------------------------- | ----------------- |
| **Coding**                  | Cursor, Claude Code, Copilot (~$100B market by 2030) | Replit, Bolt, v0  |
| **Terminal / OS Operation** | Claude Code, Codex CLI                               | **❌ NOTHING**    |

**The Gap:** There is no "Cursor for your computer." No tool that lets a layman
say:

- _"Why is my laptop slow? Fix it."_
- _"Back up my important files before I format"_
- _"The shop screen is black. Restart the display software."_
- _"Merge these 50 CSVs and summarize the errors"_

This is TermAI's whitespace. A $36.3B AI productivity market with no dominant
player for terminal/OS automation.

---

## Competitive Positioning: The "Operator Layer" Gap

| Feature              | TermAI                        | Warp           | Aider          | GitHub Copilot CLI | Open Interpreter   |
| -------------------- | ----------------------------- | -------------- | -------------- | ------------------ | ------------------ |
| **Primary Focus**    | **Universal System Operator** | Terminal UI/UX | Code Editing   | Command Suggestion | Desktop Automation |
| **License**          | **Open Source**               | Proprietary    | Open Source    | Proprietary        | Open Source        |
| **Voice + Text**     | **✅ Yes**                    | ❌ Text only   | ❌ Text only   | ❌ Text only       | ❌ Text only       |
| **Execution Safety** | **Confirmed + Sandbox**       | User executes  | Git-revertible | User executes      | ⚠️ High risk       |
| **Remote/Headless**  | **✅ Web-Remote**             | ❌ No          | Via SSH        | Via SSH            | ❌ No              |
| **Extensibility**    | **MCP Protocol**              | Proprietary    | Limited        | None               | Custom scripts     |
| **Model Agnostic**   | **✅ (Ollama, Claude, GPT)**  | N/A            | ✅             | ❌ OpenAI only     | ✅                 |

**TermAI's Moat:**

1. **Open Source + Model Agnostic** — No vendor lock-in, user owns data
2. **Voice-First** — Captures "AFK" users (cooking, driving, accessibility)
3. **Web-Remote** — Control terminal from phone/iPad anywhere
4. **MCP Ecosystem** — Extensible like an app store
5. **Safety Architecture** — Not just fast, but _trustworthy_

---

## Target Personas: Who Needs TermAI?

### Persona 1: The Reluctant Operator

_Junior developers, data scientists terrified of `rm -rf`_

> **Pain:** "I know I need to kill the process on port 8080, but I can't
> remember the syntax and I'm scared I'll break something."

**TermAI Value:** The Safety Net. Preview before execute. Explain why.

### Persona 2: The Grizzled SRE

_10+ years experience, manages fleets, hates latency_

> **Pain:** "Copilot hallucinated a non-existent AWS flag. Cost me 3 hours
> debugging."

**TermAI Value:** Local-first (Ollama), scriptable, auditable.
Generate-then-verify workflow.

### Persona 3: The Involuntary Sysadmin

_Small business owner managing Shopify + Raspberry Pi signage_

> **Pain:** "The digital menu screen is black. I don't know what Nginx is."

**TermAI Value:** Intent-based operation. "Connect to shop screen. Restart the
display."

### Persona 4: The Shadow Analyst

_Marketing manager parsing 50 CSVs for the board meeting_

> **Pain:** "Excel crashes. Engineering says it'll take a week. ChatGPT requires
> uploading sensitive data to the cloud."

**TermAI Value:** Local pandas-power via natural language. Data never leaves
machine.

### Persona 5: The Accessibility User

_Motor/vision impairments, GUIs are hostile_

> **Pain:** "I need to change privacy settings but I can't find the menu."

**TermAI Value:** Voice-first universal interface to system configuration.

---

## Strategic Principles (Non-Negotiable)

| Principle                               | What It Means                                    | Implementation                                           |
| --------------------------------------- | ------------------------------------------------ | -------------------------------------------------------- |
| **Safety is a Feature, Not Friction**   | Confirmations feel like guardrails, not blockers | Preview → Explain → Confirm flow; risk classification    |
| **Observe-First, Act-Second**           | Diagnostics before destructive actions           | Default to read-only; require explicit intent for writes |
| **Works for Novices, Delights Experts** | Clear onboarding + power-user shortcuts          | "Teach Mode" vs "Do Mode" toggle                         |
| **Interactive AND Headless**            | Same power in REPL or CI/CD                      | Stable JSON output, `-p` flag parity                     |
| **Local-First, Cloud-Optional**         | User controls where data goes                    | Ollama support, no mandatory login                       |
| **Extensible by Default**               | MCP protocol, stable APIs                        | Semantic versioning, extension marketplace               |

---

## Roadmap: Three Horizons

### Horizon 1: Foundation (Now — Q1 2025)

_"The best damn terminal agent for power users"_

**Goal:** Ship a polished, safe, differentiated product. Win the SRE/DevOps
early adopter.

| Theme                     | Key Deliverables                                                          | Why It Matters                                                        |
| ------------------------- | ------------------------------------------------------------------------- | --------------------------------------------------------------------- |
| **Safety Architecture**   | ✅ Confirmed actions, ✅ Trust folders, Preview Mode, Risk classification | Trust is the #1 barrier to adoption. Build it into the core.          |
| **Process Orchestration** | `/sessions` UI, tail-and-summarize, readiness detection                   | The killer feature for SREs. "Start dev, watch logs, ping on errors." |
| **Voice MVP**             | Push-to-talk, local whisper.cpp STT, spoken confirmations                 | Differentiation. No competitor has this.                              |
| **Web-Remote v1**         | Authenticated local web client, QR pairing, read-only mode                | "I'm not at my desk" anxiety solved.                                  |
| **Model Flexibility**     | Ollama integration, model fallback strategies                             | Win the "never cloud" privacy segment.                                |
| **Polish & Docs**         | Onboarding flow, demo scripts, security posture doc                       | First impressions matter. Make setup magic.                           |

**Success Metrics:**

- 10K GitHub stars (community validation)
- 100 daily active users (retention signal)
- Zero data-loss incidents (safety validation)
- 3 community-contributed MCP tools (ecosystem health)

---

### Horizon 2: Expansion (Q2 2025 — Q4 2025)

_"The universal translator for computing"_

**Goal:** Expand TAM. Capture the "layman" and "citizen developer" markets.

| Theme                     | Key Deliverables                                                                       | Why It Matters                                                   |
| ------------------------- | -------------------------------------------------------------------------------------- | ---------------------------------------------------------------- |
| **Novice UX**             | Guided onboarding, "Explain Like I'm New" mode, safe recipes library, command tutoring | Demographic expansion. "What is a shell?" should have an answer. |
| **Voice-First Maturity**  | Wake word research, voice macros, ambient notifications, multi-language                | Make voice production-ready, not a gimmick.                      |
| **Web-Remote as Product** | Multi-device sessions, remote approval mode, mobile-optimized UI                       | Phone as secure window into your terminal.                       |
| **Workflow Engine**       | Shareable workflows, workflow templates, replay-with-preview                           | The "Terminal App" primitive. User-generated automation.         |
| **MCP Ecosystem**         | `termai install @slack`, community registry, app security review                       | Shift value from "chatting" to "doing." This is the moat.        |
| **Enterprise Readiness**  | Immutable audit logs, SSO stub, compliance docs (SOC2 path)                            | Enterprise is where the revenue is. Plant seeds now.             |

**Success Metrics:**

- 50K stars (mainstream visibility)
- 1K daily active users
- 50 MCP tools in registry
- 3 enterprise pilots
- First revenue (support contracts or hosted relay)

---

### Horizon 3: Platform (2026+)

_"The operating system is the new browser"_

**Goal:** Become the default "operator layer" for computers. Build a business.

| Theme                       | Key Deliverables                                                            | Why It Matters                                                |
| --------------------------- | --------------------------------------------------------------------------- | ------------------------------------------------------------- |
| **Fleet Orchestration**     | Multi-machine execution, policy-as-code approvals, org dashboards           | Enterprise ITOps market ($10B+).                              |
| **Terminal Apps Ecosystem** | App manifest schema, sandboxed execution, curated app store                 | Become a platform, not just a tool.                           |
| **Intent Language**         | Portable workflow format, cross-platform compilation                        | "Write once, run anywhere" for automation.                    |
| **TermAI Cloud**            | Team sync, hosted agents, managed LLM gateway                               | Sustainability. Fund open-source without crippling free tier. |
| **IDE Integrations**        | VS Code extension, Neovim plugin, JetBrains                                 | Meet developers where they are.                               |
| **Moonshots**               | Undo for more operations, reversible playbooks, proving what AI did and why | The "trust endgame."                                          |

**Success Metrics:**

- Industry standard for terminal AI
- $1M ARR (sustainability)
- 100+ enterprise customers
- TermAI-native companies (equivalent of "Cloud-native")

---

## Risk Register

| Risk                      | Severity  | Mitigation                                                                                              |
| ------------------------- | --------- | ------------------------------------------------------------------------------------------------------- |
| **Big Tech Entrenchment** | 🔴 High   | Move faster. Ship features Google/Microsoft won't (local models, competitor APIs). Stay model-agnostic. |
| **Security Incident**     | 🔴 High   | Build safety into the core. Engage security researchers early. Bug bounty program.                      |
| **Model Quality Gap**     | 🟡 Medium | Abstract model provider. Allow user to upgrade. Tune for efficiency not just accuracy.                  |
| **Community Burnout**     | 🟡 Medium | Plan business model from day 1. Foundation governance. Clear contribution paths.                        |
| **User Trust Barrier**    | 🟡 Medium | Gradual trust building. Training mode. Showcased success stories. Audit trails.                         |
| **Regulatory Changes**    | 🟡 Medium | Build compliance primitives (logging, explicability) now. Stay ahead of EU AI Act.                      |

---

## Anti-Roadmap: What We Will NOT Do

1. **Replace the Shell.** We wrap bash/zsh/PowerShell. We don't rewrite them.
2. **Become an IDE.** We live _alongside_ VS Code/Cursor/Neovim, not inside
   them.
3. **Gate Basic Features.** Voice, local models, and core agent will always be
   free.
4. **Require Login for Local Use.** "No telemetry by default" is a feature.
5. **Sacrifice Safety for Speed.** We will never skip confirmations to seem
   faster.

---

## Commercialization Strategy (Open Core)

Following Supabase/GitLab/PostHog precedent:

| Tier                   | What's Included                                                | Price       |
| ---------------------- | -------------------------------------------------------------- | ----------- |
| **Free (Open Source)** | Full agent, voice, local models, MCP, web-remote (self-hosted) | $0          |
| **Pro (Individual)**   | Managed web-remote relay, priority model routing, cloud sync   | $10-20/mo   |
| **Team**               | Shared context ("What did Bob do last week?"), team audit logs | $50/user/mo |
| **Enterprise**         | SSO, centralized policies, fleet orchestration, SLA            | Custom      |

**Revenue Thesis:** Individual developers will pay for convenience (managed
relay). Teams will pay for shared intelligence. Enterprises will pay for control
and compliance.

---

## The Vision: What Terminal AI Becomes

In 3-5 years, TermAI is not a product. It's a paradigm shift.

> **A world where "I need to deploy" is a verified workflow with previews and
> rollback.**
>
> **A world where "my disk is full" triggers a safe diagnostic, not a panic.**
>
> **A world where "start dev, watch logs, ping me on errors" is one sentence.**
>
> **A world where your phone is a secure window into your terminal sessions.**
>
> **A world where new users learn the terminal by doing, with guardrails.**
>
> **A world where power users run fleets with policy-as-code approvals.**
>
> **A world where TermAI can prove what it did (audit trails) and why it did
> it.**

This is not science fiction. The components exist. We're assembling them.

---

## Appendix: Why This Roadmap Exists

This roadmap synthesizes:

1. **Original TermAI Roadmap** — 400+ line technical execution plan
2. **Market Research** — Competitive landscape, $100B market sizing, user
   personas
3. **Gap Analysis** — Why "Cursor for computing" doesn't exist yet
4. **Product Critique** — What's missing from the original (market context,
   success metrics, commercial path)

The goal is a document that:

- An **investor** can understand in 10 minutes
- A **CPO** can prioritize from
- An **engineer** can build against
- A **community** can rally around

---

_Last Updated: December 2025_ _Version: Opus 1.0_

---

# Appendix: Complete Engineering Backlog

> This appendix contains the full 285-item engineering backlog from the original
> roadmap, organized by strategic theme and mapped to the Three Horizons
> framework. Nothing is lost — this is the implementation checklist.

## Legend

- **H1** = Horizon 1 (Now — Q1 2025)
- **H2** = Horizon 2 (Q2 — Q4 2025)
- **H3** = Horizon 3 (2026+)
- **Ease**: H = easy, M = moderate, L = hard
- **Upside**: H = high, M = medium, L = low

---

## A. Foundation & Polish (H1)

### A.1 Core UX & Identity

| Item                                                                                 | Ease | Upside |
| ------------------------------------------------------------------------------------ | ---- | ------ |
| Add a first-run onboarding flow (choose safe mode, consent levels, quick tutorial)   | M    | H      |
| Create "Teach Mode" toggle: explains commands before running them                    | M    | H      |
| Create "Do Mode" toggle: executes with minimal narration (power users)               | H    | M      |
| Add "Preview Mode": print planned commands + predicted impact before approval        | M    | H      |
| Add "Explain This Command" micro-feature: one-line explanation + risk classification | M    | H      |
| Add "What changed?" diff summarizer for file edits and command side-effects          | M    | H      |
| Add a visible "Approval Mode" indicator in the UI (Safe/Prompt/YOLO)                 | H    | H      |
| Make tool output bounded everywhere (ring buffers and truncation consistent)         | M    | H      |
| Add a "session transcript export" to a file (useful for audits, bug reports)         | M    | M      |
| Improve error UX: show next-step commands when a tool fails                          | M    | H      |
| Add "capabilities check" at startup (what tools/commands are available)              | M    | M      |

### A.2 Documentation & Testing

| Item                                                                                 | Ease | Upside |
| ------------------------------------------------------------------------------------ | ---- | ------ |
| Add a single `docs/termai.md`: "what TermAI is", "how to stay safe", "how to extend" | H    | M      |
| Publish a "demo script" doc: 10 copy-paste demos that reliably impress               | H    | M      |
| Add CI smoke tests for TermAI-branded prompt invariants                              | H    | H      |
| Add a lightweight "compatibility policy" doc for upstream merges                     | H    | M      |
| Add a "security posture" doc (threat model summary, esp. for web-remote)             | H    | H      |
| Add a "support matrix" doc (macOS/Linux/Windows/WSL status)                          | H    | M      |
| Add a "stability rubric" for features (experimental/beta/stable)                     | H    | M      |
| Add a "breaking changes" policy for extensions/MCP                                   | M    | H      |
| Add a "release channels" story (nightly/preview/stable)                              | M    | M      |
| Add a "minimal fork" diff dashboard (auto-report divergence from upstream)           | M    | M      |
| Establish a "no regressions on safety prompts" test gate                             | M    | H      |

---

## B. Process Orchestration (H1)

### B.1 Session Management

| Item                                                                       | Ease | Upside |
| -------------------------------------------------------------------------- | ---- | ------ |
| Ship `process-manager` as a user-facing, documented capability             | M    | H      |
| Add a `/sessions` slash command UI (list/status/read/send/stop/restart)    | M    | H      |
| Add a "tail and summarize" UI action (read last N lines + summary)         | M    | H      |
| Add readiness detection patterns (ports open, "ready" regex, exit codes)   | L    | H      |
| Add "structured session metadata" (cwd, env, start time, last output time) | H    | M      |
| Add "session grouping" by project/workspace                                | M    | M      |
| Add "session pinning" (keep key sessions visible in UI)                    | M    | M      |
| Add "session budget controls" (max sessions, max output, max runtime)      | M    | H      |
| Add "safe stop ladder" UX (SIGINT → SIGTERM → SIGKILL with escalation)     | M    | H      |
| Add "stdin send templates" (Ctrl+C, Enter, common responses)               | M    | M      |
| Add "log hygiene" for sessions (redaction rules, secrets detection)        | L    | H      |
| Add "background notifications" in text (build finished, server crashed)    | M    | H      |
| Add "export session output" (last N lines to file, shareable)              | M    | M      |
| Add "session replay" (save command + cwd + env for restart)                | M    | H      |
| Add "session snapshots" (capture last state summary periodically)          | L    | M      |
| Add "process tree awareness" (child processes, ports, CPU per session)     | L    | H      |
| Add "resource watch per session" (CPU/mem spikes trigger warnings)         | L    | M      |
| Add "PTY fallbacks" per OS clearly surfaced                                | M    | M      |
| Add "interactive command handling" guidelines                              | H    | M      |
| Add "safety prompts for dangerous long-running commands"                   | M    | H      |
| Add test coverage for session lifecycle edge cases                         | M    | H      |
| Add "multi-workspace session routing"                                      | M    | M      |
| Add "session naming suggestions" (auto-name from command)                  | H    | L      |
| Add "session privacy mode" (do not store output, only status)              | M    | M      |

---

## C. Agent Control & MCP (H1-H2)

### C.1 Agent Orchestration

| Item                                                             | Ease | Upside |
| ---------------------------------------------------------------- | ---- | ------ |
| Build `agent-control` on top of process sessions                 | M    | H      |
| Add an allowlist-first model for agent binaries                  | M    | H      |
| Add "agent profiles" (claude/aider/pytest-runner/terraform)      | M    | M      |
| Add "agent output summarization" (what changed, failed, do next) | M    | H      |
| Add "agent sandbox policy" (agents inherit safety constraints)   | M    | H      |
| Add "agent handoff UX" (user sees what is delegated)             | M    | H      |
| Add "agent streaming attribution" (who said what)                | M    | M      |
| Add "agent result artifacts" (patch, diff, logs)                 | M    | M      |
| Add "agent conflict resolution" (require review for file edits)  | M    | H      |
| Add "compose agents" (TermAI as supervisor, bounded parallelism) | L    | H      |
| Add "task queue" (run agent tasks sequentially with checkpoints) | L    | H      |
| Add "retry policy" (recoverable vs hard failures)                | M    | M      |
| Add "budget enforcement" (time, tokens, tool calls) per agent    | L    | H      |
| Add tests for agent-control safety boundaries                    | M    | H      |
| Add a "transcript-to-issue" exporter                             | M    | M      |
| Add "team mode" concept (multiple operators, shared policies)    | L    | M      |
| Add "agents as MCP servers" bridge                               | L    | M      |

### C.2 MCP Ecosystem

| Item                                                                | Ease | Upside |
| ------------------------------------------------------------------- | ---- | ------ |
| Add "MCP discovery UX" (search, browse, install, update)            | M    | H      |
| Add "per-server trust level" in config                              | M    | H      |
| Add "MCP server health checks" (retry, warn, disable)               | M    | M      |
| Add "MCP permission inheritance" (server inherits workspace trust)  | M    | H      |
| Add "MCP output observability" (what was called, returned, latency) | M    | H      |
| Add "MCP versioning" (pin versions, warn on incompatible)           | L    | H      |
| Add "MCP starter templates" (how to write custom servers)           | H    | M      |
| Add "community spotlights" (weekly featured extensions)             | H    | L      |
| Add "compatibility test suite" for extensions                       | L    | H      |

---

## D. Safety & Trust (H1)

### D.1 Permission Architecture

| Item                                                                        | Ease | Upside |
| --------------------------------------------------------------------------- | ---- | ------ |
| Introduce capability-scoped permissions (shell/file/web/MCP) per workspace  | L    | H      |
| Add per-directory allow/deny lists                                          | L    | H      |
| Add "command risk scoring" (read-only, writes, deletes, network, privilege) | M    | H      |
| Add "sudo awareness" (detect prompts, require explicit intent)              | M    | H      |
| Add "destructive guardrails" (rm -rf, chmod -R, dd, mkfs)                   | M    | H      |
| Add "undo playbooks" for common operations                                  | L    | H      |
| Add "confirmation consistency" across all surfaces                          | M    | H      |
| Add "safe filesystem mode" (restrict writes outside workspace)              | L    | H      |
| Add "sandbox discoverability" (show what sandbox blocks)                    | H    | M      |
| Add "threat-model templates" for new features                               | H    | H      |
| Add "security regression suite" for web-remote                              | M    | H      |
| Add "secure-by-default tunnels" (if ever added, require consent)            | L    | M      |
| Add "least privilege" tool execution (cwd, env filtering)                   | L    | H      |
| Add "command provenance" (why this command, from which plan)                | M    | M      |
| Add "human override" gestures (panic stop key, kill all)                    | M    | H      |
| Add "safe prompts for system package managers"                              | M    | M      |
| Add "safe prompts for cloud CLIs" (aws/gcloud destructive)                  | L    | H      |
| Add "security champions" program for contributors                           | M    | M      |

---

## E. Novice UX (H2)

### E.1 Onboarding & Education

| Item                                                                             | Ease | Upside |
| -------------------------------------------------------------------------------- | ---- | ------ |
| Ship guided onboarding: "what is a shell", "what is a file", "what is a process" | M    | H      |
| Add "explain like I'm new" mode                                                  | M    | H      |
| Add "command tutoring" (why flags matter, common patterns)                       | M    | M      |
| Add "interactive confirmations" (rewrite/edit command before running)            | M    | H      |
| Add "safe recipes" library (disk cleanup, backups, git rescue)                   | M    | H      |
| Add "choose-your-own-adventure" flows (troubleshoot wifi, free disk)             | L    | H      |
| Add "ask before installing" defaults                                             | M    | M      |
| Add "detect OS + distro" and use correct commands                                | L    | H      |
| Add "copy-paste safe output" (short, minimal, safe)                              | M    | H      |
| Add "replay last solution"                                                       | M    | M      |
| Add "glossary popovers" in TUI                                                   | M    | M      |
| Add "what just happened?" summaries after multi-step ops                         | M    | H      |
| Add "suggest next best command" for common failures                              | M    | H      |
| Add "safe search" for errors (web-search with redaction)                         | M    | M      |
| Add "learning loop" ("Was that helpful?" local feedback)                         | M    | M      |
| Add "beginner command palette"                                                   | M    | H      |
| Add "dangerous command linting"                                                  | M    | H      |
| Add "project templates" ("set up python env", "node dev")                        | M    | M      |
| Add "one-click rollback" for certain flows                                       | L    | H      |
| Add "trust explained" screen                                                     | H    | M      |

---

## F. Workflows & Automation (H2)

### F.1 Workflow Engine

| Item                                                                | Ease | Upside |
| ------------------------------------------------------------------- | ---- | ------ |
| Define a "Workflow" schema (steps, inputs, outputs, rollback)       | M    | H      |
| Add workflow templates library (build-and-push, backup, log-triage) | M    | H      |
| Add workflow validation (dry-run, test mode)                        | M    | H      |
| Add "workflow pause points" (wait for confirmation mid-flow)        | M    | H      |
| Add "workflow resume" (continue after pause/failure)                | L    | H      |
| Add "workflow observability" (progress bar, step highlighting)      | M    | H      |
| Add "workflow sharing" (export to file, URL, or public index)       | L    | H      |
| Add "workflow parameterization" (prompt for inputs at start)        | M    | M      |
| Add "workflow versioning" (track changes, show diffs)               | M    | M      |
| Add "workflow composition" (one workflow calls another)             | L    | M      |
| Add "workflow triggers" (on file change, on time, on event)         | L    | H      |
| Add "workflow review gate" (require approval before execution)      | M    | H      |
| Add "workflow sandboxing" (run in isolated env)                     | L    | H      |
| Add "workflow artifacts" (capture outputs, logs)                    | M    | M      |
| Add "workflow rollback" (undo if something failed)                  | L    | H      |

---

## G. Voice (H1-H2)

### G.1 Voice MVP (H1)

| Item                                                                 | Ease | Upside |
| -------------------------------------------------------------------- | ---- | ------ |
| Implement push-to-talk recording on macOS/Linux                      | L    | H      |
| Implement STT via local `whisper.cpp` as default                     | L    | H      |
| Add Windows STT story (WSL support first)                            | L    | M      |
| Add a clear voice UI state machine (OFF/LISTENING/THINKING/SPEAKING) | M    | H      |
| Add "transcript review" before sending by default                    | H    | M      |
| Add "interrupt everything" behavior (PTT cancels TTS)                | M    | H      |
| Add "voice-safe approvals" (never YOLO because voice is on)          | M    | H      |
| Add "voice dependency installer guidance"                            | H    | M      |

### G.2 Voice Maturity (H2)

| Item                                                            | Ease | Upside |
| --------------------------------------------------------------- | ---- | ------ |
| Add "auto-send on confidence" option                            | M    | M      |
| Add "voice command shortcuts" (stop, cancel, repeat, summarize) | M    | M      |
| Add "background voice notifications" tied to process sessions   | M    | H      |
| Add "voice privacy" controls                                    | M    | M      |
| Add "voice device selection"                                    | L    | M      |
| Add "voice fallback modes" (STT-only, TTS-only, text-only)      | M    | M      |
| Add "spoken reply tuning" (max words, verbosity, tone)          | H    | M      |
| Add "speak confirmations" (read risky part, ask yes/no)         | L    | H      |
| Add "voice macros" ("start dev server", "tail logs")            | M    | M      |
| Add "voice accessibility" (captions, keyboard-only flows)       | M    | H      |
| Add "wake word" as future research item                         | L    | M      |
| Add "multi-language STT/TTS" roadmap                            | L    | M      |
| Add voice demo that feels magical but safe                      | M    | M      |

---

## H. Web-Remote (H1-H2)

### H.1 Web-Remote MVP (H1)

| Item                                                | Ease | Upside |
| --------------------------------------------------- | ---- | ------ |
| Ship tiny authenticated local web client            | M    | H      |
| Support streaming events + confirmations end-to-end | M    | H      |
| Add QR-code pairing for localhost                   | M    | M      |
| Add "read-only remote mode"                         | M    | H      |
| Add "rate limits" and "lockout" for auth failures   | M    | H      |
| Add "token rotation UX"                             | M    | M      |

### H.2 Web-Remote Maturity (H2)

| Item                                                 | Ease | Upside |
| ---------------------------------------------------- | ---- | ------ |
| Add "remote approval required" mode                  | L    | H      |
| Add "multi-device sessions"                          | L    | H      |
| Add "secure tunneling helpers" as optional plugins   | L    | M      |
| Add "origin hardening" (DNS rebinding mitigations)   | M    | H      |
| Add "remote audit log"                               | M    | M      |
| Add "remote session list + tail"                     | M    | H      |
| Add "remote voice" via browser APIs                  | M    | M      |
| Add "remote pairing expiry"                          | M    | M      |
| Add "remote device trust list"                       | M    | M      |
| Add "security review checklist" before every release | H    | H      |

---

## I. Cross-Platform & Distribution (H2)

| Item                                                          | Ease | Upside |
| ------------------------------------------------------------- | ---- | ------ |
| Publish first-class `termai` binary name                      | M    | H      |
| Ship Homebrew formula, Scoop/Winget, npm global install       | M    | H      |
| Add optional single-file installer script                     | M    | M      |
| Add reproducible build pipeline (SBOM, checksums, signatures) | M    | H      |
| Add prebuilt binaries where feasible                          | M    | M      |
| Harden Windows support (native + WSL detection)               | L    | H      |
| Add "shell integration" (zsh/bash/fish completion)            | M    | M      |
| Add "clipboard integration" per OS                            | M    | M      |
| Add "terminal multiplexers" support (tmux/screen)             | M    | M      |
| Add "SSH remote workflows" guidance                           | M    | M      |
| Add "container mode"                                          | L    | M      |
| Add "enterprise proxy support" docs                           | M    | M      |
| Add "offline mode" with clear UI                              | M    | M      |
| Add "model provider matrix"                                   | M    | M      |
| Add "diagnostics bundle" for bug reports                      | M    | M      |
| Add "performance baselines" per OS                            | M    | M      |
| Add "support lifecycle" docs                                  | H    | M      |

---

## J. Control Plane & Enterprise (H3)

### J.1 Task Architecture

| Item                                             | Ease | Upside |
| ------------------------------------------------ | ---- | ------ |
| Introduce unified "Task Graph" internally        | L    | H      |
| Make every tool call an event in that graph      | M    | H      |
| Add "task resume" across restarts                | L    | H      |
| Add "multi-repo / multi-host" orchestration      | L    | H      |
| Add "remote agents" with strong auth             | L    | H      |
| Add "policy-as-code" (org-level rules)           | L    | H      |
| Add "team workflows" (shared recipes, approvals) | L    | H      |
| Add "observability dashboard"                    | M    | M      |

### J.2 Vertical Modes

| Item                                                 | Ease | Upside |
| ---------------------------------------------------- | ---- | ------ |
| Add "incident mode" (log triage, alerting, timeline) | L    | H      |
| Add "infra mode" (terraform/k8s with preview diffs)  | L    | H      |
| Add "data mode" (SQL helpers, read-only by default)  | M    | M      |
| Add "security mode" (safe scanners, CVE lookup)      | L    | M      |
| Add "developer mode" (deep code changes first-class) | M    | H      |
| Add "terminal literacy mode"                         | M    | M      |

---

## K. Model Provider Abstraction (H2-H3)

| Item                                                          | Ease | Upside |
| ------------------------------------------------------------- | ---- | ------ |
| Add pluggable model provider interface                        | L    | H      |
| Add local model support (Ollama, opt-in)                      | L    | M      |
| Add "cheap model for planning, strong for execution" routing  | L    | H      |
| Add "privacy tiers" (local-only, cloud, hybrid) per workspace | M    | H      |
| Add "context budgeting" controls                              | M    | H      |
| Add "structured output contracts" between core and UI         | M    | H      |
| Add "model fallback strategies"                               | M    | M      |
| Add "benchmarks that matter"                                  | L    | H      |
| Add "eval harness" for new features                           | L    | H      |

---

## L. Terminal Apps Ecosystem (H3)

| Item                                                     | Ease | Upside |
| -------------------------------------------------------- | ---- | ------ |
| Define a "Terminal App" manifest                         | L    | H      |
| Add curated app store index                              | L    | M      |
| Add enterprise/private app registry                      | L    | M      |
| Add "review bot" pipeline for apps                       | L    | H      |
| Add "app sandboxing" and permission prompts              | L    | H      |
| Add "app interop"                                        | L    | M      |
| Add "app UX standards"                                   | M    | M      |
| Add "app telemetry" local-only by default                | M    | M      |
| Add "app monetization hooks" (if aligned with OSS ethos) | L    | L      |

---

## M. Moonshots (H3+)

| Vision                                                            | What It Takes                                                            |
| ----------------------------------------------------------------- | ------------------------------------------------------------------------ |
| Universal "operator layer" over computers, servers, containers    | Secure remote execution, policy-as-code, observability, strong identity  |
| Canonical "intent language" for safe automation                   | Portable IR for tasks, standardized permissions/previews                 |
| "I need to deploy" = verified workflow with previews and rollback | Workflow validation, policy gates, artifact capture                      |
| "My disk is full" = safe diagnostic, not panic                    | Safe diagnostic recipes, bounded scanning, guided cleanup                |
| "Start dev, watch logs, ping me on errors" = one sentence         | Process sessions + readiness detection + output triggers + notifications |
| Voice works in the real world (noisy, interruptions)              | Robust STT, interruption behavior, confidence thresholds                 |
| Phone is a secure window into terminal sessions                   | Web-remote + strong auth + pairing + mobile UX                           |
| Extensions safer than copy-pasted shell scripts                   | Permissioned, signed extensions with provenance and audit logs           |
| New users learn terminal by doing, with guardrails                | Tutorial flows, reversible playbooks, explanations                       |
| Power users run fleets with policy-as-code                        | Remote orchestration, org policies, role-based approvals                 |
| TermAI can prove what it did and why                              | Provenance and audit logging as core primitive                           |
| "Undo" exists for more operations                                 | Reversible operations, capture "before" state, `/undo` UX                |
| Workflows are shareable, signed, reproducible                     | Signed packages, deterministic runners, artifact capture                 |
| Local models handle private tasks offline                         | Local model providers, offline-first tool behavior                       |
| TermAI = de facto standard client for MCP                         | Excellent discovery, management, permissions, UX                         |

---

## Coverage Summary

| Original Phase                 | Items | Mapped To                 | Coverage    |
| ------------------------------ | ----- | ------------------------- | ----------- |
| Phase 0: Core Polish           | 22    | H1: Foundation            | ✅ Complete |
| Phase 1: Process Orchestration | 24    | H1: Process Orchestration | ✅ Complete |
| Phase 2: Agent Control         | 18    | H1-H2: Agent Control      | ✅ Complete |
| Phase 3: Safety & Trust        | 18    | H1: Safety                | ✅ Complete |
| Phase 4: Novice UX             | 20    | H2: Novice UX             | ✅ Complete |
| Phase 5: Workflows             | 15    | H2: Workflows             | ✅ Complete |
| Phase 6: Extensions/MCP        | 9     | H1-H2: MCP Ecosystem      | ✅ Complete |
| Phase 7: Voice                 | 21    | H1-H2: Voice              | ✅ Complete |
| Phase 8: Web-Remote            | 16    | H1-H2: Web-Remote         | ✅ Complete |
| Phase 9: Cross-Platform        | 17    | H2: Distribution          | ✅ Complete |
| Phase 10: Control Plane        | 14    | H3: Enterprise            | ✅ Complete |
| Phase 11: Model Providers      | 9     | H2-H3: Models             | ✅ Complete |
| Phase 12: Terminal Apps        | 9     | H3: Ecosystem             | ✅ Complete |
| Moonshots                      | 15    | H3+: Vision               | ✅ Complete |

**Total: 285 items → All mapped**
