# A2A for Dummies (TerminaI)

## TL;DR

**A2A** (“Agent-to-Agent”) is a **standard API/protocol** that lets _other
software_ (an IDE, a desktop app, a script) talk to an AI “agent” as a service.

In practice, **our A2A server is a local web server** that exposes:

- “Here’s what this agent can do” (an **Agent Card**)
- “Start a job” (a **Task**)
- “Send instructions” (a **Message**)
- “Watch progress live” (a **Stream of events**)

So you don’t have to “drive the agent by typing in a terminal”; a client can
drive it reliably through a protocol.

---

## 1) What does “A2A” actually mean?

Think of an AI agent like a worker in a workshop.

- **Without A2A**: you shout instructions through a doorway (a terminal UI) and
  hope you can interpret the answers.
- **With A2A**: you have a **standard order form** and a **tracking number**.
  - You submit work.
  - You get structured updates.
  - You can reconnect later and continue.

That’s A2A: **a standardized way for a “client” to talk to an “agent”**.

### Key A2A ideas (plain english)

- **Agent Card**: the agent’s “business card” describing name, version, and what
  it supports.
- **Task**: a “job” with an ID (like a ticket). Tasks can run over time.
- **Message**: what the client sends (“fix X”, “do Y”).
- **Streaming Events**: the agent sends a stream of updates (status changes,
  tool usage, partial output).

---

## 2) What are typical use cases (in general)?

### A) IDE integration

Instead of copying/pasting into the terminal, the IDE sends:

- the current file
- diffs
- workspace path
- tool permissions

And receives:

- suggested edits
- streaming progress
- structured tool calls

### B) Automation scripts

A script can ask the agent to:

- analyze logs
- run a command
- apply a change
- produce a report …while observing progress and enforcing permissions.

### C) Remote UI / desktop app

A GUI can show:

- what the agent is doing right now
- tool prompts (“Allow this command?”)
- live output

### D) Multi-agent orchestration

In mature setups, A2A becomes the plumbing for:

- one agent delegating to another
- specialized agents (network agent, securityi agent, code agent)
- supervisors / approval layers

---

## 3) What is the “true potential” of A2A (generally)?

**The ceiling** is big: A2A makes agents **composable infrastructure**.

Instead of “an app with an AI chat box,” you get:

- **clients** (IDE, CLI, GUI, CI) that can all speak a common protocol
- **agents** that can be swapped/upgraded without breaking clients
- **standard events** that can be logged/audited
- **permissioning** that can be handled consistently across surfaces

The real unlock is: **structured, automatable, reconnectable agent workflows**.

---

## 4) What was the setup before our edits? (Original Gemini CLI)

### What Gemini CLI’s A2A server was for

Gemini CLI’s A2A server is essentially a **local “agent server”** meant to
integrate with other clients (IDEs, tools, web UI).

In this repo, you can see it described as a “development-tool” extension in:

- `packages/a2a-server/development-extension-rfc.md`

It focuses on:

- tasks
- streaming events
- tool call lifecycles
- asking for confirmation before executing tools

### What it exposes (conceptually)

The A2A SDK sets up routes such as:

- `/.well-known/agent-card.json` (agent metadata)
- task creation and task streaming routes (A2A task/message model)

And this codebase adds extra helper endpoints:

- `/healthz`
- `/whoami`
- `/listCommands`
- `/executeCommand` (runs a registered CLI command, optionally with SSE
  streaming)

### How auth worked (original model)

It used a simple bearer token model:

- Client sends `Authorization: Bearer <token>`
- Token is verified either via:
  - an environment variable (`TERMINAI_WEB_REMOTE_TOKEN`), or
  - a local file (`web-remote-auth.json`) stored under `~/.gemini/` (via
    `TERMINAI_DIR`)

This is straightforward, but it’s not “pairing-friendly” (it’s basically: “know
the secret, or you’re out”).

---

## 5) What did the fork (TerminaI) change before today?

From what’s currently in the repo:

### A) Packaging / identity changes (some done)

- The A2A server package is branded as:
  - `packages/a2a-server/package.json`: `name: "@terminai/a2a-server"`
  - binary: `terminai-a2a-server`

### B) Engine is still Gemini (mostly unchanged)

Even though package names are TerminaI, the runtime still imports upstream
Gemini core in places (example):

- `packages/a2a-server/src/http/app.ts` imports `SimpleExtensionLoader` and
  `GitService` from `@google/gemini-cli-core`

### C) Auth still uses “GEMINI\_\*” env vars and `~/.gemini`

Example (current state):

- `packages/a2a-server/src/http/auth.ts` looks for `TERMINAI_WEB_REMOTE_TOKEN`
- `packages/a2a-server/src/persistence/remoteAuthStore.ts` stores auth under
  `TERMINAI_DIR` (i.e., `~/.gemini/...`)

So: **we’ve rebranded the package/binary**, but **the auth + storage naming is
still Gemini-flavored** (this is part of the broader rebrand/migration work).

---

## 6) What did we change in the plan today (the “CEO Directive” edits)?

We shifted from “deep refactor sovereignty” to **non-breaking sovereignty**:

### A) A2A: define a real handshake

The roadmap now specifies an explicit auth handshake flow (so external tools can
connect without you manually passing around a long-lived secret):

1. **User issues a pairing code** via CLI
   - `terminai a2a auth issue --name <clientName>`
2. **Client exchanges the code** for a token
   - `POST /auth/exchange { code, client_name }`
3. **Client uses the bearer token**
   - `Authorization: Bearer <access_token>`
4. **Server verifies** via a local signing secret
   - stored at `~/.terminai/a2a/secret.key`
5. **User can revoke clients**
   - `terminai a2a auth revoke <clientId>`

This is the difference between:

- **Before**: “static token you must already have”
- **After (planned)**: “pair like you pair a device”

### B) A2A becomes policy-governed (not a backdoor)

In TerminaI, A2A must not be “a secret port that can run anything.”

The intent is:

- A2A requests that cause execution must go through the **same policy ladder**
  as interactive usage.
- A2A-triggered actions must land in the **audit log**.

---

## 7) The true potential of A2A _inside TerminaI_

TerminaI’s product goal is not “a coding agent.” It’s a **System Operator**: fix
real machines, safely.

In that world, A2A becomes the control plane that ties everything together:

### A) Desktop app / GUI drives the same operator brain

Instead of building a parallel stack for desktop:

- Desktop (or any UI) can use A2A to:
  - start “repair tasks”
  - stream PTY output
  - show approvals/prompts
  - show the audit timeline

### B) Scripts become “safe automation”

Example: your WiFi driver broke.

- A script can call A2A: “Diagnose WiFi; attempt repair.”
- TerminaI uses the PTY to run real commands.
- The policy engine gates what’s allowed.
- Everything is captured in the audit log.

So you get automation **with guardrails**, not automation that silently runs
`sudo`.

### C) A2A unlocks “agent ecosystems” around TerminaI

Once A2A is stable and authenticated:

- IDE plugins can call TerminaI as an operator
- remote helpers can guide tasks
- future agents (network agent, security agent) can plug in

### D) The broadcast-worthy story

For the broadcast, A2A is valuable because it makes TerminaI feel like a
product, not a terminal trick:

- **Brand**: the world talks to `terminai`, not `gemini`.
- **Capability**: external clients can reliably ask TerminaI to fix things.
- **Trust**: every action can be shown in the audit log.

---

## 8) Quick glossary

- **A2A**: Agent-to-Agent protocol (structured integration between clients and
  agents).
- **Agent**: the thing that plans and uses tools.
- **Client**: the UI/app/script controlling the agent.
- **Task**: one unit of work with a lifecycle.
- **Event stream**: live updates while the task runs.
- **Policy**: rules + approval ladder controlling what actions are allowed.
- **Audit log**: tamper-evident record of what happened.
