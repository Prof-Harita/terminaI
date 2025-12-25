# Launch Materials & Action Items

## 1. Action Items (Good First Issues)

These are candidate issues to help new contributors get started:

### A. Desktop Testing Setup

**Context:** The `packages/desktop` tests currently fail or are skipped because
they lack `testing-library` setup. **Task:**

1. Install `@testing-library/react` and `@testing-library/user-event` in
   `packages/desktop`.
2. Update `packages/desktop/src/components/*.test.tsx` to use `render` from the
   library.
3. Fix the TODOs in the test files.

### B. CLI Command Refactor

**Context:** `packages/cli/src/utils/commands.ts` has a TODO about a "two-pass"
logic that is inefficient. **Task:**

1. Analyze the command parsing logic.
2. Refactor to a single-pass parser if possible.
3. Verify `npm test` still passes.

### C. A2A Replay Protection

**Context:** `packages/a2a-server/src/http/app.ts` mentions a TODO for Replay
Protection. **Task:**

1. Implement a nonce or timestamp check in the auth middleware.
2. Ensure the client sends a unique ID with requests.
3. Reject replayed requests.

---

## 2. Hacker News Draft (Show HN)

**Title:** Show HN: TerminaI - Open source AI PA that lives in your terminal
(Desktop + Web Remote)

**Body:**

Hello HN,

I’ve been working on **TerminaI**, an open-source terminal assistant designed to
keep you in flow. It’s a fork of Google’s Gemini CLI but evolved into a full
"agentic" workspace.

**Repo:** https://github.com/Prof-Harita/terminaI

**The Problem:** I love the terminal, but I hate context switching. Copy-pasting
errors into a browser, looking up `tar` flags, or SSH-ing into a machine just to
check a log file breaks my flow.

**The Solution:** TerminaI is an AI agent that **is** your terminal. It hooks
into your shell (via `PROMPT_COMMAND` / hooks) to understand your context.

**Key Features:**

- **A2A / Web Remote:** Control your terminal from your phone or browser. It’s
  not just a read-only view; it’s an interactive session protected by a token.
  Perfect for checking long-running builds from the couch.
- **Desktop App:** A Tauri-based companion app that gives you a "Voice Mode" for
  your terminal. Talk to your shell while you code.
- **Safety Ladder:** Dangerous commands (like `rm -rf`) require explicit,
  PIN-based approval. You can trust the agent not to wipe your drive.
- **Local & Private:** Configurable to run with local models (via Ollama) or
  cloud APIs.

**Tech Stack:**

- TypeScript / Node.js
- React + Ink (for CLI UI)
- Tauri (Desktop App)
- Model Context Protocol (MCP) for tool use

I’d love your feedback on the "Web Remote" flow. It uses SSE for streaming
terminal output to the browser in real-time.

---

## 3. Reddit Draft (/r/selfhosted or /r/commandline)

**Title:** I built a self-hosted "Web Remote" for my terminal to monitor builds
from my phone

**Body:**

Hey everyone,

I wanted to share **TerminaI**, a project I’ve been hacking on. It started as a
CLI tool but I recently added a **Web Remote** feature that I think this sub
might like.

**What it does:** It spins up a local server (`terminai --web-remote`) that
exposes your active terminal session to a web UI.

You can:

1.  Connect from your phone (on the same WiFi or via Tailscale/Cloudflare
    Tunnel).
2.  See real-time output of running commands.
3.  Send new commands / prompts to the agent.

**Why?** I have long-running test suites and builds. I wanted to be able to step
away from my desk but still "nudge" the terminal if it got stuck or just check
the status without SSH-ing in from a tiny mobile keyboard.

**Self-Hosted Aspects:**

- No cloud relay (unless you bring your own tunnel).
- Direct connection to your machine.
- Token-based authentication generated at startup.

**Repo:** https://github.com/Prof-Harita/terminaI

It's completely open source (Apache 2.0). The "Agent" part uses LLMs (Gemini, or
local via Ollama), but the remote control infrastructure is just good old
Node.js and WebSockets/SSE.

Let me know what you think! I'm looking for feedback on the security model
(Safety Ladder) – basically strict approvals for any command that modifies the
file system.
