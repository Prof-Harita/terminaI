# Master Prompt: TerminaI Autonomous Upstream Maintenance

> **Purpose:** Complete setup, testing, and validation of autonomous upstream
> maintenance  
> **Created:** 2025-12-28  
> **Phases:** Jules Setup → Test Jules → Test Full E2E Loop

---

## Mission

Set up and validate the **fully autonomous upstream maintenance system** for
TerminaI.

**Three phases:**

1. **Setup Jules** — Connect Jules to repo, configure permissions
2. **Test Jules** — Verify Jules can execute tasks on our repo
3. **Test E2E** — Validate the complete Friday→Saturday autonomous loop

---

## Project Context

**TerminaI** is a fork of
[Gemini CLI](https://github.com/google-gemini/gemini-cli).

| Aspect          | Value                         |
| --------------- | ----------------------------- |
| **Our repo**    | `Prof-Harita/terminaI`        |
| **Upstream**    | `google-gemini/gemini-cli`    |
| **Fork commit** | `70696e364` (v0.21.0 nightly) |

### Key Divergences

- `logger.ts` — JSONL format (not JSON arrays)
- `gemini.tsx` → `terminai.tsx` — Entry point renamed
- `voice/*`, `evolution-lab/*` — TerminaI additions
- `.terminai/` — Config branding

---

# PHASE 1: JULES SETUP

## 1.1 Connect Jules to GitHub

| Step | Action                                     | Verification          |
| ---- | ------------------------------------------ | --------------------- |
| 1    | Go to [jules.google](https://jules.google) | Page loads            |
| 2    | Sign in with Google account                | Authenticated         |
| 3    | Click "Connect GitHub"                     | OAuth flow starts     |
| 4    | Authorize Jules for `Prof-Harita/terminaI` | Repo visible in Jules |

## 1.2 Verify Jules Permissions

Jules needs:

- **Read access** to repository contents
- **Write access** to create branches
- **Write access** to create pull requests
- **Read access** to issues (to receive tasks)

Check in GitHub: Settings → Integrations → Applications → Jules

## 1.3 Create AGENTS.md (Jules Context File)

Create `AGENTS.md` at repo root:

```markdown
# TerminaI Agent Context

## Project

TerminaI is a fork of Google's Gemini CLI with AI agent superpowers.

## Key Divergences

- `logger.ts`: Uses JSONL, not JSON arrays
- Entry point: `terminai.tsx`, not `gemini.tsx`
- Added: `voice/*`, `evolution-lab/*`
- Config: `.terminai/` not `.gemini/`

## Zone Classification

See `docs-terminai/FORK_ZONES.md` for full classification:

- IRRELEVANT: Skip (telemetry, themes)
- FORK: Reimplement from intent (logger, voice)
- CORE: Merge directly (tools, mcp, security)

## Test Commands

npm run test:ci # Full test suite npm run lint # Linting npm run build # Build
all packages

## Upstream Sync Task

When assigned an upstream sync issue:

1. Add upstream remote: git remote add upstream
   https://github.com/google-gemini/gemini-cli.git
2. Fetch: git fetch upstream
3. Compare: git log --oneline HEAD..upstream/main
4. Classify each commit per FORK_ZONES.md
5. Create branch: git checkout -b upstream-sync/YYYY-MM-DD
6. Document in .upstream/patches/YYYY-MM-DD/
7. Push and open PR
```

## 1.4 Create GitHub Labels

Create these labels in the repo:

- `upstream-sync` — For sync issues/PRs
- `automated` — Marks automated actions

Using GitHub MCP or manually in UI.

## 1.5 Enable Auto-Delete Branches

Go to: Settings → General → Pull Requests → "Automatically delete head branches"
✅

---

# PHASE 2: TEST JULES SETUP

## 2.1 Simple Task Test

Before testing the full workflow, verify Jules works with a simple task:

1. Create a test issue manually:

   ```
   Title: [Test] Jules connectivity check
   Body: Please create a file called `jules-test.txt` in the repo root
         containing "Jules was here" and open a PR.
   ```

2. Assign to Jules (or wait for Jules to pick up)

3. **Success criteria:**
   - Jules acknowledges the issue
   - Jules creates a branch
   - Jules creates `jules-test.txt`
   - Jules opens a PR

4. If successful: Close PR without merging, delete test file

## 2.2 Verify Jules Can Access Upstream

Create another test issue:

```
Title: [Test] Upstream access check
Body: Please run these commands and report the output:
      git remote add upstream https://github.com/google-gemini/gemini-cli.git || true
      git fetch upstream
      git log --oneline HEAD..upstream/main | head -5
```

**Success criteria:** Jules reports the upstream commits

---

# PHASE 3: TEST END-TO-END LOOP

## 3.1 Trigger the Workflow

The workflow creates an issue that triggers Jules.

```bash
# Manual trigger
gh workflow run weekly-sync.yml

# Verify it ran
gh run list --workflow=weekly-sync.yml --limit=1
```

## 3.2 Verify Issue Created

```bash
gh issue list --label=upstream-sync
```

Expected: Issue titled `[Upstream Sync] Week of YYYY-MM-DD`

## 3.3 Verify Jules Picks Up

Check Jules dashboard at [jules.google](https://jules.google):

- Issue appears in Jules task list
- Jules starts processing
- Jules shows execution logs

## 3.4 Verify Jules Executes Correctly

| Check              | Expected                                         |
| ------------------ | ------------------------------------------------ |
| Fetches upstream   | `git fetch upstream` runs                        |
| Compares branches  | `git log HEAD..upstream/main` runs               |
| Creates branch     | `upstream-sync/YYYY-MM-DD` exists                |
| Creates files      | `.upstream/patches/YYYY-MM-DD/commits.txt`       |
|                    | `.upstream/patches/YYYY-MM-DD/files.txt`         |
|                    | `.upstream/patches/YYYY-MM-DD/classification.md` |
| Classifies commits | Each marked IRRELEVANT/FORK/CORE                 |
| Opens PR           | PR visible in `gh pr list`                       |

## 3.5 Human Review (Final Validation)

1. Open the PR Jules created
2. Review the classification accuracy
3. Check the documentation quality
4. Merge if correct
5. Update `.upstream/absorption-log.md`

---

## The Autonomous Loop (Visual)

```
┌──────────────────────────────────────────────────────────────────────────────┐
│                    END-TO-END AUTONOMOUS SYNC                                │
├──────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│   FRIDAY 3PM UTC           FRIDAY-SATURDAY              SATURDAY             │
│   ───────────────          ───────────────              ───────────────      │
│                                                                              │
│   ┌─────────────┐          ┌─────────────┐              ┌─────────────┐      │
│   │ GitHub      │          │ Jules       │              │ Human       │      │
│   │ Action      │──issue──▶│ Agent       │───branch────▶│ Review      │      │
│   │ (cron)      │          │ (autonomous)│              │ (15 min)    │      │
│   └─────────────┘          └─────────────┘              └─────────────┘      │
│        │                         │                            │              │
│        ▼                         ▼                            ▼              │
│   Creates issue            - Fetches upstream           Reviews PR           │
│   with instructions        - Classifies commits         Approves/Merges      │
│                            - Creates branch                                  │
│                            - Pushes summary                                  │
│                            - Opens PR                                        │
│                                                                              │
└──────────────────────────────────────────────────────────────────────────────┘
```

---

## Troubleshooting

| Problem                     | Cause                | Fix                            |
| --------------------------- | -------------------- | ------------------------------ |
| Jules not in dashboard      | Not connected        | Re-auth at jules.google        |
| Jules can't see repo        | Permissions          | Re-authorize in GitHub Apps    |
| Jules doesn't pick up issue | Not assigned/labeled | Check issue labels match       |
| Workflow doesn't run        | Cron not triggered   | Use manual `workflow_dispatch` |
| Issue missing labels        | Labels don't exist   | Create labels first            |
| Jules errors on git         | No upstream remote   | Include in AGENTS.md           |
| Wrong classification        | Missing context      | Improve AGENTS.md              |

---

## Components Built

| Component           | File                                    | Status       |
| ------------------- | --------------------------------------- | ------------ |
| Zone classification | `docs-terminai/FORK_ZONES.md`           | ✅ Created   |
| Strategy doc        | `docs-terminai/upstream_maintenance.md` | ✅ Created   |
| Weekly trigger      | `.github/workflows/weekly-sync.yml`     | ✅ Created   |
| Absorption log      | `.upstream/absorption-log.md`           | ✅ Created   |
| Upstream remote     | `git remote upstream`                   | ✅ Added     |
| **AGENTS.md**       | Root of repo                            | 🔲 To create |
| **GitHub labels**   | `upstream-sync`, `automated`            | 🔲 To create |

---

## Success Checklist

**Phase 1 (Setup):**

- [ ] Jules connected to GitHub
- [ ] Jules has repo permissions
- [ ] AGENTS.md created
- [ ] GitHub labels created
- [ ] Auto-delete branches enabled

**Phase 2 (Test Jules):**

- [ ] Simple task test passes
- [ ] Upstream access test passes

**Phase 3 (Test E2E):**

- [ ] Workflow triggered manually
- [ ] Issue created with correct labels
- [ ] Jules picks up issue
- [ ] Jules fetches and classifies
- [ ] Jules creates branch and files
- [ ] Jules opens PR
- [ ] Human reviews and merges
- [ ] Absorption log updated

**Total human time per week: ~15 minutes**

---

## Quick Reference Commands

```bash
# Trigger workflow
gh workflow run weekly-sync.yml

# Check workflow runs
gh run list --workflow=weekly-sync.yml

# See sync issues
gh issue list --label=upstream-sync

# See PRs
gh pr list

# Fetch upstream manually
git fetch upstream
git log --oneline HEAD..upstream/main | head -20
```
