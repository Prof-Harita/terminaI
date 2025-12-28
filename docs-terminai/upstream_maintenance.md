# Upstream Maintenance Strategy

> **Document Type:** Architecture Decision Record  
> **Status:** Active  
> **Last Updated:** 2025-12-28  
> **Audience:** Engineering, Product, Executive

---

## Executive Summary

TerminaI is forked from Google's
[Gemini CLI](https://github.com/google-gemini/gemini-cli). We use a **hybrid
maintenance strategy**: GitHub Actions triggers weekly, Jules (AI agent)
classifies and syncs, human reviews and merges.

---

## Architecture

```
Friday 3 PM UTC              Jules (on issue created)           Saturday
      │                             │                              │
      ▼                             ▼                              ▼
┌─────────────┐              ┌─────────────────┐            ┌──────────────┐
│ GitHub      │              │ Fetches upstream│            │ Human review │
│ Action runs │──creates────▶│ Classifies      │──pushes───▶│ Approve PR   │
│             │   issue      │ Creates branch  │   branch   │ Merge        │
└─────────────┘              └─────────────────┘            └──────────────┘
```

---

## Zone Classification

See [FORK_ZONES.md](./FORK_ZONES.md) for the full classification.

| Zone           | Description               | Action                  |
| -------------- | ------------------------- | ----------------------- |
| **IRRELEVANT** | Google-specific, seasonal | Skip                    |
| **FORK**       | Files we've diverged      | Reimplement from intent |
| **CORE**       | Everything else           | Merge directly          |

---

## Weekly Workflow

### Friday (Automated)

- GitHub Action runs at 3 PM UTC (9 AM CST)
- Creates issue titled `[Upstream Sync] Week of YYYY-MM-DD`
- Issue contains instructions for Jules

### Friday-Saturday (Jules)

- Jules picks up the issue
- Fetches upstream, compares to our main
- Classifies each commit using FORK_ZONES.md
- Creates branch `upstream-sync/YYYY-MM-DD`
- Pushes summary and classification

### Saturday (Human Review Trigger)

The review is triggered by **three events**:

1. **GitHub PR Notification**: Jules opens a PR (e.g., #16) and tags the human
   reviewer.
2. **Scheduled Rhythm**: Every Saturday morning (9 AM CST/3 PM UTC), following
   the Friday 3 PM UTC automated start.
3. **Completion Log**: Jules posts a completion comment on the sync issue with a
   link to the PR.

#### Review Steps:

- Review Jules' branch...
- For CORE changes: merge or cherry-pick
- For FORK changes: create task for agent reimplementation
- Update `.upstream/absorption-log.md`
- Merge PR

---

## Conflict Resolution

When Jules' branch has merge conflicts:

1. Check which files conflict
2. If file is in FORK zone → keep ours, reimplement intent
3. If file is in CORE zone → resolve conflict manually
4. Run `npm run test:ci` to verify
5. Commit resolution

---

## Rollback

If a merged upstream change causes issues:

```bash
git revert <commit-hash>
```

Trace back via `.upstream/absorption-log.md` to find which upstream commit
caused the problem.

---

## Files

| File                                | Purpose                |
| ----------------------------------- | ---------------------- |
| `docs-terminai/FORK_ZONES.md`       | Zone classification    |
| `.github/workflows/weekly-sync.yml` | Weekly trigger         |
| `.upstream/absorption-log.md`       | Track absorbed commits |
| `.upstream/patches/`                | Store weekly diffs     |

---

## Manual Trigger

For emergencies or testing:

```bash
gh workflow run weekly-sync.yml
```

Or via GitHub UI: Actions → Weekly Upstream Sync → Run workflow

---

## Settings Required

1. **Enable auto-delete merged branches** (Settings → General → Automatically
   delete head branches)
2. **Create labels** (if not exists): `upstream-sync`, `automated`
3. **Jules access**: Ensure Jules can create branches and close issues

---

## Quick Reference

```
┌─────────────────────────────────────────────────────────────────┐
│                   UPSTREAM SYNC CHEAT SHEET                     │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  WEEKLY (automated):                                            │
│    GitHub Action creates issue → Jules syncs → You review       │
│                                                                 │
│  MANUAL TRIGGER:                                                │
│    gh workflow run weekly-sync.yml                              │
│                                                                 │
│  CLASSIFICATION:                                                │
│    ⚪ IRRELEVANT → Skip                                         │
│    🟢 CORE → Merge                                              │
│    🟡 FORK → Reimplement                                        │
│                                                                 │
│  AFTER MERGE:                                                   │
│    Update .upstream/absorption-log.md                           │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## Changelog

| Date       | Author      | Change                                               |
| ---------- | ----------- | ---------------------------------------------------- |
| 2025-12-27 | Antigravity | Initial document                                     |
| 2025-12-28 | Antigravity | Finalized with Jules integration and hybrid workflow |
