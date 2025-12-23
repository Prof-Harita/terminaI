# Tutorials (System Operator)

These are hands-on, “operator style” tutorials for TerminaI.

> Note on config paths: TerminaI is migrating toward `~/.terminai/` as the
> primary home. Some installs may still read legacy `~/.gemini/` for
> compatibility.

---

## Tutorial 1 — Fix a broken WiFi connection (laptop)

Goal: diagnose + repair WiFi, with approvals for risky steps.

1. Start TerminaI:

```bash
terminai
```

2. Prompt:

```text
My WiFi stopped working. Diagnose what’s wrong and fix it.
Explain what you find. For any destructive step, ask for confirmation first.
```

3. What “good” looks like:

- TerminaI inspects: interface state, driver/module, rfkill, logs.
- It proposes steps like:
  - restart NetworkManager
  - reload a kernel module
  - renew DHCP
- You see confirmations before impactful actions.

---

## Tutorial 2 — Disk cleanup (safe + reversible)

```text
I’m low on disk space. Find the biggest directories and propose a safe cleanup plan.
Prefer reversible cleanups (caches/log rotations) before deletes.
```

Good output includes:

- a ranked list of suspects
- a plan with “safe → riskier” steps
- explicit confirmation before deletions

---

## Tutorial 3 — Restart a broken service and verify it’s healthy

```text
My app is down. Identify the service, restart it safely, and verify it’s healthy.
If there are errors in logs, summarize the root cause.
```

---

## Tutorial 4 — Connect an MCP server (add new powers)

> [!CAUTION] Before using a third-party MCP server, ensure you trust its source
> and understand the tools it provides.

This tutorial demonstrates adding an MCP server using the GitHub MCP server:
https://github.com/github/github-mcp-server

### Prerequisites

- **Docker:** Install and run [Docker].
- **GitHub Personal Access Token (PAT):** Create a new [classic] or
  [fine-grained] PAT.

[Docker]: https://www.docker.com/
[classic]: https://github.com/settings/tokens/new
[fine-grained]: https://github.com/settings/personal-access-tokens/new

### Configure `settings.json`

Create or open your settings file:

- preferred: `~/.terminai/settings.json`
- legacy fallback: `~/.gemini/settings.json`

Add:

```json
{
  "mcpServers": {
    "github": {
      "command": "docker",
      "args": [
        "run",
        "-i",
        "--rm",
        "-e",
        "GITHUB_PERSONAL_ACCESS_TOKEN",
        "ghcr.io/github/github-mcp-server"
      ],
      "env": {
        "GITHUB_PERSONAL_ACCESS_TOKEN": "${GITHUB_PERSONAL_ACCESS_TOKEN}"
      }
    }
  }
}
```

Set your token:

```bash
export GITHUB_PERSONAL_ACCESS_TOKEN="pat_YourActualGitHubTokenHere"
```

Then ask:

```text
List my open GitHub issues assigned to me and summarize them.
```

---

## Tutorial 5 — Run A2A (drive TerminaI from other clients)

If you want to control TerminaI from a browser/desktop client/IDE integration,
start the A2A server and follow:

- `docs-terminai/web-remote.md`
