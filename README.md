# TerminaI

<div align="center">
  <img src="docs-terminai/assets/terminai-banner.svg" alt="TerminaI Banner" width="100%">
</div>

<p align="center">
  <a href="https://github.com/Prof-Harita/terminaI/actions/workflows/ci.yml"><img src="https://github.com/Prof-Harita/terminaI/actions/workflows/ci.yml/badge.svg" alt="CI"></a>
  <img src="https://img.shields.io/badge/Node.js-20+-339933" alt="Node.js 20+">
  <img src="https://img.shields.io/badge/License-Apache%202.0-green" alt="License">
</p>

**TerminaI is an AI-powered system operator.** You describe what you want;
TerminaI inspects your machine, proposes actions, and executes them through
**governed tools** with a deterministic **approval ladder** and an **audit
trail**.

> **Status: Public Preview (v0.x)** The core operator loop is usable today. Some
> surfaces (Desktop/Voice/A2A) are still being hardened across platforms. Expect
> power; expect rough edges. Contributions welcome.

⚠️ Status Update: I welcomed my newborn child into the world on Jan 12. Development will be bursty for a few weeks.
​The architecture is sound, but if you find bugs, PRs are highly welcome and will be merged faster than I can write code right now. Help me keep the terminaI dream alive while I learn how to be a dad.

## Demo

<div align="center">
  <img src="docs-terminai/assets/Kooha_combined_cropped.gif" alt="TerminaI Demo" width="100%">
</div>

---

## Vision

What if your computer could do things for you safely?

Not just suggesting commands. Not just generating scripts. Actually operating
your system: diagnosing issues, fixing problems, and orchestrating workflows —
**with guardrails that make execution trustworthy.**

For years, “internet help” meant copy instructions from a chat window, paste
into your terminal, and hope you didn’t miss a step. Coding tools beginning with
Cursor and Aider largely eliminated that for software development — but the rest
of your computer is still stuck in the copy/paste era.

Resolving computer issues or setting up servers or doing end-to-end automated
workflows or doing anything on computer beyond coding ??? Majority of users
still just copy paste instructions from ChatGPT.

TerminaI is the next interface: you state intent, it proposes a governed plan,
you approve at the right level, and it executes with an audit trail. Less
ceremony. Fewer fragile steps. More outcomes — without handing your machine to
an unchecked agent.

---

## Why this exists

Computers are powerful, but operating them still requires memorizing syntax,
hunting through logs, and repeating the same diagnosis steps.

TerminaI compresses the gap between **intent** and **execution** — without
turning your machine into an uncontrolled “agent.”

**Intent → Governed plan → Approval → Execution → Audit**

---

## Who it’s for

- **Generalist users** — “Review the largest files in my downloads folder,
  prioritizing the oldest first, i need to free up 200 GB of space.” “What is
  wrong with my internet; reset my adapter.” “Setup a HP printer.” "Monitor the
  stock price of NVDA and alert me when it hits xx$". "Why is my system so slow?
  Can you free up memory" "Can you install the best markdown viewer on my linux
  machine?". "I just re-installed Windows. Find specific drivers for my GPU and
  install them".
- **Newbie developers** — “Set up my machine for this repo.” “Fix my dev
  environment.” “Explain what broke and how to recover.” "Install all the
  dependencies for this project"
- **Tech purists** — AI leverage with deterministic guardrails, explicit
  approvals, and tamper-evident logs.
- **Professional engineers / DevOps** — Remotely control your servers,
  repeatable workflows, headless-friendly CLI, safer execution, readable audit
  trails.

---

## Two ways to use TerminaI

- **CLI**: the canonical interface for developers, power users, and headless
  environments.
- **Desktop**: a Tauri wrapper around the same engine (GUI + voice surface).
  Linux/Windows are MVP; macOS is coming soon.

The canonical command is `terminai`.

---

## What makes TerminaI different

AI system operation must be governed. We took the experimental Gemini CLI and
rebuilt it as a **production-grade runtime**.

- **Adaptive "System 2" Brain**: Doesn't just guess; it _thinks_. Uses dynamic
  cognitive frameworks (Consensus, Sequential, Reflection) to solve complex
  tasks.
- **Provider Agnostic**: Decoupled from Google-locked infrastructure. Supports
  Gemini, OpenAI, Anthropic, and local models.
- **Production Stability**: Patched critical upstream memory leaks and race
  conditions. Built for long-running sessions.
- **True PTY Support**: Handles interactive applications (vim, htop, ssh)
  correctly via `node-pty`.
- **Governed Autonomy**: Strict **Policy Engine** and **Approval Ladder**
  (A/B/C) replace "yolo" execution.
- **Enterprise Audit**: High-throughput **JSONL** structured logs with
  tamper-evident intent tracking.
- **Deep Extensibility**: First-class support for **MCP** and an
  **Agent-to-Agent (A2A)** control plane.
- **Multi-Surface**: Available as a headless **CLI** for servers and a **Native
  Desktop App** (Linux/Windows) with voice control.
- **Remote Ready**: Securely operate headless instances via the A2A protocol.

---

## Install

### CLI (npm)

Prereqs: Node.js 20+

```bash
npm i -g @terminai/cli
terminai --version
terminai
```

> If you don’t see the CLI package yet (or want bleeding-edge), install from
> source below.

### Desktop (installers)

Download installers from GitHub Releases:

- https://github.com/Prof-Harita/terminaI/releases

---

### Git clone and build

```bash
git clone https://github.com/terminai/terminai.git
cd terminai
npm install
npm run build
```

## Quick start

TerminaI supports Gemini (default) and OpenAI-compatible providers.

> **Note:** Although the authentication wizard supports multiple providers,
> Gemini remains the most extensively tested and stable implementation. Gemini
> was prioritized to ensure accessibility, as its free-tier credits allow for
> broad adoption without immediate cost barriers.

### Gemini

```bash
export TERMINAI_API_KEY="..."
terminai
```

### OpenAI-compatible providers

Configure `llm.provider` and `llm.openaiCompatible` in
`~/.terminai/settings.json` (legacy `~/.gemini/settings.json` is still
supported).

See: `docs-terminai/multi-llm-support.md`

---

## Safety model (high level)

TerminaI routes execution through governed tools and a deterministic approval
ladder:

- **Level A**: safe/reversible actions (no approval)
- **Level B**: mutating actions (explicit approval)
- **Level C**: destructive or high-risk actions (explicit approval + PIN)

Audit logs are written to `~/.terminai/logs/audit/` (JSONL). Runtime/session
logs live in `~/.terminai/logs/`.

High-level flow:

```text
User intent -> policy engine -> approval -> tool execution -> audit
```

---

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
├── core/           # Engine: tools, policy, routing, telemetry
├── cli/            # Terminal UI (Ink/React)
├── desktop/        # Tauri app + PTY bridge
├── a2a-server/     # Agent-to-Agent control plane
├── termai/         # `terminai` launcher
└── cloud-relay/    # Cloud relay server (optional)
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

## Lineage

TerminaI is a community fork of Google’s Gemini CLI:

- https://github.com/google-gemini/gemini-cli

---

## License and trademarks

- License: Apache-2.0 (see `LICENSE`)
- Trademark: see `TRADEMARK.md`
