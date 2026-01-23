# ATS-50 Scoreboard (Agentic Harness)

**Goal:** Reach **≥45/50 tasks passing** on Linux + Windows (90% capability)

## Current Status

| OS      | Passing | Total | Percentage |
| ------- | ------- | ----- | ---------- |
| Linux   | 0       | 50    | 0%         |
| Windows | 0       | 50    | 0%         |

**Combined Progress:** 0/100 (0%)

---

## How to Verify

### Running a specific task

```bash
npm run harness:ats -- 01
```

### Running all tasks (interactive loop)

```bash
npm run harness:ats
```

This harness will:

1. Spawn a `terminai` session with the exact task prompt.
2. Wait for you to exit the session (type `exit` or `Ctrl+C`).
3. Ask you for a Pass/Fail grade and notes.
4. Auto-update the table below.

### Legend

| Symbol | Meaning |
| ------ | ------- |
| ✅     | Pass    |
| ❌     | Fail    |
| ⏳     | Pending |
| ⚠️     | Partial |

---

## Results Table

| ID  | Task                                                  | Runtime | Session | Result | Notes | Actions |
| --- | ----------------------------------------------------- | ------- | ------- | ------ | ----- | ------- |
| 01  | Disk full root-cause and safe cleanup                 |         |         | ⏳     |       |         |
| 02  | Folder cleanup in an arbitrary path                | 52s     |                                      | ❌      | too slow             |                      |
| 03  | Large directory enumeration without context blow-ups  |         |         | ⏳     |       |         |
| 04  | Duplicate file detection (safe)                       |         |         | ⏳     |       |         |
| 05  | Zip/archive workflow                                  |         |         | ⏳     |       |         |
| 06  | Restore from mistake (reversibility)                  |         |         | ⏳     |       |         |
| 07  | Explain and fix "Docker is slow"                      |         |         | ⏳     |       |         |
| 08  | Network diagnosis (DNS/TCP)                           |         |         | ⏳     |       |         |
| 09  | Fix a broken package install                          |         |         | ⏳     |       |         |
| 10  | Python scripting → generate a PDF report              |         |         | ⏳     |       |         |
| 11  | Create a background monitor job                       |         |         | ⏳     |       |         |
| 12  | Kill a runaway process safely                         |         |         | ⏳     |       |         |
| 13  | Log investigation (system/service)                    |         |         | ⏳     |       |         |
| 14  | Fix a broken dev environment                          |         |         | ⏳     |       |         |
| 15  | Install and verify a common CLI tool                  |         |         | ⏳     |       |         |
| 16  | SSH into a server and collect health signals          |         |         | ⏳     |       |         |
| 17  | Server log triage                                     |         |         | ⏳     |       |         |
| 18  | Safe server change with rollback plan                 |         |         | ⏳     |       |         |
| 19  | Create a new user account safely (server)             |         |         | ⏳     |       |         |
| 20  | Firewall inspection (server)                          |         |         | ⏳     |       |         |
| 21  | Backup a directory and verify restore                 |         |         | ⏳     |       |         |
| 22  | Find and remove large old caches safely               |         |         | ⏳     |       |         |
| 23  | Cross-platform path handling sanity                   |         |         | ⏳     |       |         |
| 24  | Print environment + runtime tier active               |         |         | ⏳     |       |         |
| 25  | Detect missing dependency and self-heal               |         |         | ⏳     |       |         |
| 26  | Web research → structured output                      |         |         | ⏳     |       |         |
| 27  | Web research → apply change with verification         |         |         | ⏳     |       |         |
| 28  | File permission repair                                |         |         | ⏳     |       |         |
| 29  | Find suspicious autoruns/startup items                |         |         | ⏳     |       |         |
| 30  | Browser download location and cleanup                 |         |         | ⏳     |       |         |
| 31  | Explain and fix "why is my computer slow"             |         |         | ⏳     |       |         |
| 32  | Python venv hygiene                                   |         |         | ⏳     |       |         |
| 33  | Node/npm hygiene                                      |         |         | ⏳     |       |         |
| 34  | Scheduled task on Windows / cron on Linux             |         |         | ⏳     |       |         |
| 35  | System update safety                                  |         |         | ⏳     |       |         |
| 36  | Printer driver diagnosis                              |         |         | ⏳     |       |         |
| 37  | Disk health / SMART                                   |         |         | ⏳     |       |         |
| 38  | GitHub issue triage for this repo                     |         |         | ⏳     |       |         |
| 39  | Diagnose an app crash using logs                      |         |         | ⏳     |       |         |
| 40  | Safe installation on Windows without AV triggers      |         |         | ⏳     |       |         |
| 41  | Run inside constrained corporate environment          |         |         | ⏳     |       |         |
| 42  | Multi-step workflow with checkpoints                  |         |         | ⏳     |       |         |
| 43  | Audit export and review                               |         |         | ⏳     |       |         |
| 44  | Provenance escalation test (prompt injection defense) |         |         | ⏳     |       |         |
| 45  | MCP tool usage (safe connector)                       |         |         | ⏳     |       |         |
| 46  | Cross-platform shell quoting and piping               |         |         | ⏳     |       |         |
| 47  | Recover from partial failure without looping          |         |         | ⏳     |       |         |
| 48  | Large output summarization (bounded)                  |         |         | ⏳     |       |         |
| 49  | Policy/approval ladder correctness                    |         |         | ⏳     |       |         |
| 50  | End-to-end "fix my computer" generalist scenario      |         |         | ⏳     |       |         |
