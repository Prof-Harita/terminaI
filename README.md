# TerminaI

### Local-first computer operator (PTY terminal) with explicit approvals + audit logs

Runs on Windows/Linux/macOS. Model-agnostic: supports Gemini, ChatGPT sign-in,
and OpenAI-compatible endpoints (OpenRouter + local gateways). Designed for real
system changes — governed, reviewable, and reversible when possible.

> Looking for an open-source alternative to Cowork-style “computer operators”?
> TerminaI is a governed, CLI-first operator runtime.

<div align="center">
  <img src="docs-terminai/assets/terminai-banner.svg" alt="TerminaI Banner" width="100%">
</div>

<p align="center">
  <a href="https://github.com/Prof-Harita/terminaI/actions/workflows/ci.yml"><img src="https://github.com/Prof-Harita/terminaI/actions/workflows/ci.yml/badge.svg" alt="CI"></a>
  <img src="https://img.shields.io/badge/Node.js-20+-339933" alt="Node.js 20+">
  <img src="https://img.shields.io/badge/License-Apache%202.0-green" alt="License">
</p>

**TerminaI is an AI-powered system operator.**  
You describe what you want; TerminaI inspects your machine, proposes a plan, and
executes it through **governed tools** with a deterministic **approval ladder**
and an **audit trail**.

> **Status: Public Preview (v0.x)**  
> The core operator loop is usable today. CLI is the canonical surface.
> Desktop/Voice/A2A are optional and still being hardened across platforms.
> Expect power; expect rough edges. Contributions welcome.

> **Maintainer note (Jan 2026):** I welcomed my newborn in Jan. Development will
> be bursty for a few weeks. If you hit bugs, PRs are the fastest path—small
> fixes will get reviewed quickly.

---

## What this is / what this is not

**This is:**

- A **local-first operator runtime**: intent → governed plan → approvals →
  execution → audit log.
- A **real terminal operator** (true PTY): it can handle interactive sessions
  (sudo prompts, ssh, vim/htop-style flows).
- A **model-flexible** setup: choose a provider you already use (including
  OpenAI-compatible endpoints and local gateways).
- **100% free and 100% private** if you want it to be. Use free models on
  OpenRouter, run local LLMs—no telemetry, no charges, ever.

**This is not:**

- A hosted service. There is **no "contact sales," no pilots, no managed
  deployment**, and no support obligations—this is best-effort OSS.
- An "unchecked agent" that silently runs commands. Risky actions are gated
  behind explicit approvals and logged locally.
- A promise that every surface is production-hardened today
  (desktop/voice/remote features are optional previews).

---

## Demo

<div align="center">
  <img src="docs-terminai/assets/Kooha_combined_cropped.gif" alt="TerminaI Demo" width="100%">
</div>

---

## Vision

What if your computer could do things for you safely?

Not just suggesting commands. Not just generating scripts. Actually operating
your system—diagnosing issues, fixing problems, and orchestrating
workflows—**with guardrails that make execution trustworthy.**

For years, "internet help" meant: copy instructions from a chat window, paste
into your terminal, and hope you didn't miss a step. Coding tools (Cursor,
Aider, etc.) reduced that friction for software development—but the rest of your
computer is still stuck in the copy/paste era.

TerminaI is the next interface: you state intent, it proposes a governed plan,
you approve at the right level, and it executes with an audit trail. Fewer
fragile steps. More outcomes—without handing your machine to an unchecked agent.

---

## Why this exists

Computers are powerful, but operating them still requires memorizing syntax,
hunting through logs, and repeating the same diagnosis steps.

TerminaI compresses the gap between **intent** and **execution**—without turning
your machine into an uncontrolled "agent."

**Intent → Governed plan → Approval → Execution → Audit**

---

## Who it's for

- **Generalist users** — “Review the largest files in my downloads folder,
  prioritizing the oldest first, i need to free up 200 GB of space.” “What is
  wrong with my internet; reset my adapter.” “Setup a HP printer.” "Monitor the
  stock price of NVDA and alert me when it hits xx$". "Why is my system so slow?
  Can you free up memory" "Can you install the best markdown viewer on my linux
  machine?". "I just re-installed Windows. Find specific drivers for my GPU and
  install them".
- **Developers** — “Set up my machine for this repo.” “Fix my dev environment.”
  “Explain what broke and how to recover.” "Install all the dependencies for
  this project"
- **Tech purists** — AI leverage with deterministic guardrails, explicit
  approvals, and tamper-evident logs.
- **Professional engineers / DevOps** — Remotely control your servers,
  repeatable workflows, headless-friendly CLI, safer execution, readable audit
  trails.

---

## Two ways to use TerminaI

- **CLI (canonical):** for developers, power users, and headless environments.
- **Desktop (preview):** a Tauri wrapper around the same engine (GUI + voice
  surface). Linux/Windows are early; macOS is in progress. Treat as experimental
  until hardened.

The canonical command is: `terminai`.

---

## What makes TerminaI different

AI system operation must be governed. TerminaI is built around that primitive.

- **True PTY support:** handles interactive applications correctly (sudo
  prompts, ssh sessions, vim/htop-like flows) via `node-pty`.
- **Governed autonomy:** a strict **policy engine** + deterministic **approval
  ladder** (A/B/C) replaces "yolo execution."
- **Audit trail by default:** structured **JSONL** logs for actions and intent
  tracking (local files you can review/replay).
- **Provider flexibility:** choose what you already use—Google, OpenAI sign-in,
  or any OpenAI-compatible `/chat/completions` endpoint (OpenRouter, local
  gateways, etc.).
- **Deep extensibility:** first-class support for **MCP** (tool connectors) and
  an optional **Agent-to-Agent (A2A)** control plane (preview).
- **Local-first posture:** core operation runs on your machine; no hosted relay
  is required. Any optional remote features are opt-in and under your control.

## Read more: `docs-terminai/why-terminai.md`

## Install

### CLI (npm)

Prereqs: Node.js 20+

```bash
npm i -g @terminai/cli
terminai --version
terminai
```

> If you don't see the CLI package yet (or want bleeding-edge), install from
> source below.

### Desktop (installers) — preview

Download installers from GitHub Releases:

- https://github.com/Prof-Harita/terminaI/releases

---

### Git clone and build (contributors / bleeding-edge)

```bash
git clone https://github.com/Prof-Harita/terminaI.git
cd terminaI
npm install
npm run build
```

---

## Upgrade (if you installed earlier)

If you installed before the recent multi-provider updates, upgrade so you get
the latest auth + platform parity.

- **npm global:**
  ```bash
  npm i -g @terminai/cli@latest
  terminai --version
  ```
- **release installers:** grab the latest from Releases and reinstall:
  - https://github.com/Prof-Harita/terminaI/releases
- **source build:**
  ```bash
  git pull
  npm install
  npm run build
  ```

---

## Quick start (providers)

Run `terminai` and the wizard guides you through setup.

### Google Gemini (default)

Fastest path for many users.

```bash
terminai
# Select "Google Gemini" → browser opens → sign in
```

Or use an API key:

```bash
export TERMINAI_API_KEY="your-gemini-key"
terminai
```

### ChatGPT sign-in (OAuth) — preview

Use an OpenAI browser sign-in flow (similar to how Codex tooling supports "Sign
in with ChatGPT").

```bash
terminai
# Select "ChatGPT Sign-in (OAuth)" → sign in with OpenAI
```

> Note: this is still being hardened. If anything fails, attach logs (see below)
> and open an issue.

### OpenAI-Compatible

Connect to OpenAI Platform, OpenRouter, Ollama gateways, or any
`/chat/completions` endpoint.

```bash
export OPENAI_API_KEY="sk-..."
terminai
# Select "OpenAI Compatible" → enter base URL and model
```

**Popular configurations:**

- OpenAI: `https://api.openai.com/v1`
- OpenRouter: `https://openrouter.ai/api/v1`
- Local LLM gateway: `http://localhost:11434/v1`

See: `docs-terminai/multi-llm-support.md`

```markdown
Once in the CLI interface, use `/help` to understand the commands available, or
begin chatting away!.
```

---

## First win (10 minutes)

Pick one of these prompts and paste it into TerminaI:

1. **Free disk space safely**

   > "I need to free 50GB. Start with read-only inspection: show largest
   > folders/files and estimate reclaim options. Propose a plan and wait for
   > approval before deleting anything."

2. **Fix a failing service**

   > "My service is failing. Start with read-only diagnosis (status + recent
   > logs). Propose the smallest fix plan and wait for approval before changing
   > anything."

3. **Repair broken network**
   > "My internet is flaky. Diagnose first (read-only), propose a step-by-step
   > plan, and only apply changes after explicit approval."

Each path should end with: **verify** (show the outcome) and **audit** (show
where the log is).

---

## Safety model (high level)

TerminaI routes execution through governed tools and a deterministic approval
ladder:

- **Level A**: safe/reversible actions (no approval)
- **Level B**: mutating actions (explicit approval)
- **Level C**: destructive or high-risk actions (explicit approval + PIN)

Audit logs are written to `~/.terminai/logs/audit/` (JSONL). Runtime/session
logs live in `~/.terminai/logs/`.

## Zero telemetry by design. No opt-in, no opt-out: just local logs you can inspect. Nothing leaves your system, except for the LLM provider you choose to use.

## Documentation

Start here:

- `docs-terminai/quickstart.md`
- `docs-terminai/configuration.md`
- `docs-terminai/troubleshooting.md`
- `docs-terminai/voice.md`
- `docs-terminai/multi-llm-support.md`

Contributor and security references:

- `AGENTS.md`
- `CONTRIBUTING.md`
- `SECURITY.md`

---

<details>
<summary><strong>Architecture (monorepo)</strong></summary>

```text
packages/
├── core/           # Engine: tools, policy, routing, logging/telemetry (opt-in)
├── cli/            # Terminal UI (Ink/React)
├── desktop/        # Tauri app + PTY bridge (preview)
├── a2a-server/     # Agent-to-Agent control plane (preview)
├── termai/         # `terminai` launcher
└── cloud-relay/    # Self-hosted relay server (optional/preview; not provided as a service)
```

</details>

<details>
<summary><strong>Development</strong></summary>

Prereqs:

- Node.js 20+
- Rust (latest stable) for Desktop builds
- Platform-specific build tools (see below)

**First-time setup** (auto-installs dependencies):

```bash
npm ci
npm run setup:dev
```

This detects your OS and installs the required build tools:

- **Windows**: Visual Studio Build Tools (C++ workload), WebView2
- **Linux**: build-essential, webkit2gtk, libappindicator, librsvg
- **macOS**: Xcode Command Line Tools

Build and run the CLI from source:

```bash
npm run build
npm start
```

Desktop dev:

```bash
npm run desktop:dev
# Or: cd packages/desktop && npm run tauri dev
```

</details>

---

## Why TerminaI vs “chat-first” computer assistants?

| Capability            | Chat-first assistants / UI shells   | TerminaI (governed operator runtime)                                                   |
| --------------------- | ----------------------------------- | -------------------------------------------------------------------------------------- |
| Real terminal control | Often best-effort command execution | **True PTY** (interactive sudo/ssh/TTY flows)                                          |
| Safety model          | “Be careful” prompts                | **Policy + A/B/C approvals** for risky actions                                         |
| Traceability          | Partial transcripts                 | **Local JSONL audit logs** of what ran and why                                         |
| Provider choice       | Frequently tied to one model/vendor | **Model-agnostic** (Gemini / ChatGPT native Oauth, OpenAI-compatible + local gateways) |
| Platforms             | Varies                              | **Windows + Linux + macOS** (CLI-first)                                                |
| Goal                  | Assist with tasks                   | **Mutate system state safely** (review → approve → execute → verify)                   |
| Privacy               | Varies.                             | Zero telemetry. Works great with local-hosted models                                   |
| Price                 | $100                                | Free. Works great with free models in OpenRouter (e.g., GPT-OSS)                       |

## Lineage

TerminaI is a community fork of Google's Gemini CLI:

- https://github.com/google-gemini/gemini-cli (Upstream)

---

## License and trademarks

- License: Apache-2.0 (see `LICENSE`)
- Trademark: see `TRADEMARK.md`
