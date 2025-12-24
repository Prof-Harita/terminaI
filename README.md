# terminaI

<div align="center">
  <img src="docs-terminai/assets/terminai-banner.svg" alt="terminaI Banner" width="100%">
</div>

<p align="center">
  <a href="https://github.com/Prof-Harita/terminaI/actions/workflows/ci.yml"><img src="https://github.com/Prof-Harita/terminaI/actions/workflows/ci.yml/badge.svg" alt="CI"></a>
  <img src="https://img.shields.io/badge/Core-v0.21.0-blue" alt="Core Version">
  <img src="https://img.shields.io/badge/License-Apache%202.0-green" alt="License">
  <img src="https://img.shields.io/badge/Node.js-20+-339933" alt="Node.js">
</p>

<h3 align="center">AI-Powered Terminal for Everyone</h3>
<p align="center"><i>Governed Autonomy for Systems and Servers</i></p>

---

## 🎯 The Vision

**What if your computer could just _do things_ for you—safely?**

Not "suggest commands." Not "generate scripts." Actually _operate_ your system:
diagnose issues, fix problems, orchestrate workflows—with guardrails that make
it trustworthy.

TerminaI is an **AI-powered system operator** that runs on laptops, dev boxes,
and servers. It combines the power of modern LLMs with the governance
enterprises demand.

> _"Google provides the intelligence. TerminaI provides the root access and the
> guardrails."_

---

## ✨ Why TerminaI

<table>
<tr>
<td width="50%">

### 🏠 For End Users

**"Fix my computer"—for real.**

- _"Why is my laptop slow? Fix it."_
- _"What's eating my disk space? Clean it safely."_
- _"Back up my files before I update."_

No command-line knowledge needed. Just describe what you want.

</td>
<td width="50%">

### ⚡ For Power Users

**Your terminal, supercharged.**

- Voice control (push-to-talk with `space`)
- Process orchestration (`/sessions`)
- MCP extensions (GitHub, Slack, custom tools)
- Audit trail of every action

</td>
</tr>
<tr>
<td width="50%">

### 🔧 For Developers

**The primitives you want to build on.**

- **A2A Protocol**: Agent-to-Agent control plane
- **MCP Ecosystem**: Model Context Protocol integration
- **Policy Engine**: Programmable trust boundaries
- **PTY Bridge**: Real terminal, not simulations

</td>
<td width="50%">

### 📈 For Organizations

**Agentic automation you can audit.**

- Non-repudiable action logs
- Approval workflows for sensitive ops
- Fleet-ready architecture
- No data leaves your infrastructure

</td>
</tr>
</table>

---

## 🔥 What Makes Us Different

|                                            | TerminaI | GitHub Copilot CLI | Open Interpreter | Warp |
| ------------------------------------------ | :------: | :----------------: | :--------------: | :--: |
| **Actually executes** (not just suggests)  |    ✅    |         ❌         |        ✅        |  ❌  |
| **Policy gating** (approval before action) |    ✅    |         ❌         |        ❌        |  ❌  |
| **Audit trail** (what happened, when, why) |    ✅    |         ❌         |        ❌        |  ❌  |
| **Voice control**                          |    ✅    |         ❌         |        ❌        |  ❌  |
| **Agent-to-Agent protocol**                |    ✅    |         ❌         |        ❌        |  ❌  |
| **Fully open source**                      |    ✅    |         ❌         |        ✅        |  ❌  |
| **Self-hosted / air-gapped**               |    ✅    |         ❌         |        ✅        |  ❌  |

**The thesis**: AI system operation must be _governed_. We're building the
infrastructure to make that possible.

---

## 🚀 Quick Start

```bash
# Clone and build
git clone https://github.com/Prof-Harita/terminaI.git
cd terminaI && npm ci && npm run build

# Link the CLI
npm link --workspace packages/termai

# Run
terminai
```

Then just talk to it:

```
> What's using my CPU right now?
> Start the dev server in the background and watch for crashes
> Fix my wifi connection
```

---

## 🛡️ The Trust Model

TerminaI doesn't just run commands. It **governs** them.

```
┌─────────────────────────────────────────────────────────────┐
│  User Intent                                                │
│  "Clean up Docker containers"                               │
└──────────────────────────┬──────────────────────────────────┘
                           ▼
┌─────────────────────────────────────────────────────────────┐
│  Policy Engine                                              │
│  ├─ Classify risk level                                     │
│  ├─ Check trust boundaries                                  │
│  └─ Route to appropriate approval flow                      │
└──────────────────────────┬──────────────────────────────────┘
                           ▼
┌─────────────────────────────────────────────────────────────┐
│  Approval                                                   │
│  "This will remove stopped containers. Proceed? [y/n]"      │
└──────────────────────────┬──────────────────────────────────┘
                           ▼
┌─────────────────────────────────────────────────────────────┐
│  Execution + Audit                                          │
│  ├─ Execute via real PTY                                    │
│  └─ Log to tamper-evident audit trail                       │
└─────────────────────────────────────────────────────────────┘
```

---

## 🔌 Extensibility

### MCP (Model Context Protocol)

Connect TerminaI to external tools and services:

- `@github` — PR management, issue creation
- `@slack` — Team notifications
- Custom servers — Your internal APIs

### A2A (Agent-to-Agent)

Let other programs control TerminaI:

- IDE integrations
- Desktop app companions
- Multi-agent orchestration
- Remote operation via secure pairing

---

## 🗺️ Architecture

```
packages/
├── core/         # Engine: tools, policy, routing, telemetry
├── cli/          # Terminal UI (Ink/React)
├── desktop/      # Tauri app + PTY bridge
├── a2a-server/   # Agent-to-Agent control plane
└── termai/       # The `terminai` launcher
```

---

## 🤝 Contributing

We're building the future of trustworthy system automation. Join us.

**High-impact contribution areas:**

- **Policy Engine** — Make system operation safe by default
- **PTY Hardening** — Resize, signals, backpressure
- **Audit System** — Tamper-evident logging
- **MCP Servers** — New capabilities as plugins
- **A2A Clients** — IDE, GUI, and mobile integrations

→ [Contributing Guide](./CONTRIBUTING.md)  
→ [Open Issues](https://github.com/Prof-Harita/terminaI/issues)

---

## 📜 Lineage

TerminaI is a community fork of
[Google's Gemini CLI](https://github.com/google-gemini/gemini-cli).

**What we changed:**

- Repositioned from "coding agent" → "system operator"
- Added governance layer (policy, approvals, audit)
- Added voice-first interactions
- Added A2A server for agent coordination

**Running on:** Core v0.21.0 (stable, frozen)

---

## 📚 Resources

|                        |                                              |
| ---------------------- | -------------------------------------------- |
| 📖 **Documentation**   | [docs-terminai/](./docs-terminai/index.md)   |
| 🗓️ **Roadmap**         | [tasks_roadmapv2.md](./tasks_roadmapv2.md)   |
| 🔐 **Security**        | [SECURITY.md](./SECURITY.md)                 |
| 📋 **Terms & Privacy** | [docs/tos-privacy.md](./docs/tos-privacy.md) |

---

## ⚖️ License

[Apache License 2.0](LICENSE) — Free as in freedom. Use it, fork it, ship it.

---

<p align="center">
  <b>terminaI</b> — Governed Autonomy for Systems and Servers<br/><br/>
  <a href="https://github.com/Prof-Harita/terminaI/stargazers">⭐ Star on GitHub</a> · 
  <a href="./CONTRIBUTING.md">Contribute</a> · 
  <a href="https://github.com/Prof-Harita/terminaI/issues">Report Issues</a>
</p>
