# TerminAI comparison (systems-first)

This guide explains _category differences_.

TerminAI is not “another coding agent.” It’s a **system operator**: governed
execution + PTY + auditability, designed to safely fix and manage real machines
(laptops and servers).

## Quick mental model

| Category                                                     | Optimized for                 | What you get                                                                    | What you don’t get                                             |
| ------------------------------------------------------------ | ----------------------------- | ------------------------------------------------------------------------------- | -------------------------------------------------------------- |
| **Coding agents** (Aider / Claude Code / Cursor-style flows) | editing code fast             | great diffs, repo changes                                                       | strong ops governance + audited system repairs                 |
| **Terminal UX tools** (Warp)                                 | nicer terminal experience     | UI + autocomplete + some AI help                                                | an operator loop that executes multi-step tasks with approvals |
| **Desktop automation** (Open Interpreter-style)              | “do stuff on my desktop”      | broad automation                                                                | often weak governance/audit for risky ops                      |
| **TerminAI**                                                 | **governed system operation** | policy ladder + approvals + PTY execution + audit trail + MCP/A2A extensibility | not (yet) a polished enterprise fleet product                  |

## TerminAI vs Gemini CLI (upstream engine)

TerminAI is currently a forked product direction built on a stable upstream
core.

- **Focus:** Gemini CLI is broad and developer-oriented; TerminAI is
  **systems-first**.
- **Product primitives:** TerminAI centers:
  - policy/approval ladders
  - PTY-based execution (real TUIs)
  - auditability
  - A2A + MCP integration
- **Command surface:** TerminaI is branded around `terminai`.

## TerminAI vs Aider

- **Aider wins** when: you want tight, code-only iteration with git-aware edits.
- **TerminAI wins** when: the problem is _the machine_, not just the repo.
  - diagnose environment drift
  - fix build toolchains
  - manage processes/services
  - repair system networking/storage
  - do it under governance (approvals + audit)

## TerminAI vs Claude Code / editor-centric agents

- **Editor agents win** when: the task is entirely inside the editor.
- **TerminAI wins** when: code changes must be paired with **real operational
  actions**:
  - install packages
  - restart services
  - inspect logs
  - run migrations
  - update system config

## TerminAI vs Warp (and other terminal UX)

- **Warp wins** when: you want a beautiful terminal replacement.
- **TerminAI wins** when: you want a **governed operator** layered on your
  terminal/host:
  - multi-step plans
  - tool confirmation
  - structured logs + audit trails

## TerminAI vs Open Interpreter (desktop automation)

- **Open Interpreter wins** when: you want broad “desktop” actions.
- **TerminAI wins** when: you need:
  - explicit trust boundaries
  - preview/approval before destructive ops
  - reproducible actions
  - audit trails you can show other humans

## TerminAI vs “just scripts”

Scripts are great—when you already know the correct script.

TerminAI shines when the job is:

- ambiguous (“why is this machine slow?”)
- environment-specific
- risky (needs guardrails)
- multi-system (MCP/A2A coordination)

## Why contributors should care

If you want to build _trustworthy_ agentic automation, TerminAI is a playground
of the right primitives:

- **Policy engine** (governance)
- **PTY execution** (real operator substrate)
- **Audit log** (accountability)
- **MCP** (capability bus)
- **A2A** (agent control plane)
