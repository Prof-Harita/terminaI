# Upstream Maintenance Strategy

> **Document Type:** Architecture Decision Record  
> **Status:** Active  
> **Last Updated:** 2025-12-28  
> **Audience:** Engineering, Product, Executive

---

## Executive Summary

TerminaI is forked from
[Gemini CLI](https://github.com/google-gemini/gemini-cli). We run a **2-stage
weekly sync**: Jules does 90% of the work overnight, human approves in the
morning.

---

## Architecture

```
Saturday 3 AM UTC                                   Saturday 9 AM CST
       │                                                    │
       ▼                                                    ▼
┌──────────────────────────────────────┐           ┌───────────────┐
│            JULES (90%)               │           │  HUMAN (10%)  │
│                                      │           │               │
│  1. Fetch upstream                   │           │  1. Read      │
│  2. Classify commits                 │───PR───▶  │     release   │
│  3. Cherry-pick CORE                 │           │     notes     │
│  4. Reimplement FORK intent          │           │  2. Spot-     │
│  5. Run tests + lint                 │           │     check     │
│  6. Self-review + fix                │           │  3. Merge     │
│  7. Open PR with full report         │           │     (~8 min)  │
└──────────────────────────────────────┘           └───────────────┘
```

---

## Zone Classification

Jules classifies every upstream commit into one of three zones:

| Zone              | Description               | Jules' Action                   |
| ----------------- | ------------------------- | ------------------------------- |
| 🟢 **CORE**       | Files we haven't modified | Cherry-pick directly            |
| 🟡 **FORK**       | Files we've diverged      | Reimplement upstream's _intent_ |
| ⚪ **IRRELEVANT** | Google-specific, seasonal | Skip entirely                   |

Full classification rules: [FORK_ZONES.md](./FORK_ZONES.md)

---

## What "Reimplement Intent" Means

When upstream changes a FORK file, Jules doesn't merge — it reads the diff,
understands the _problem being solved_, and applies that solution to our
diverged code.

**Example:**

Upstream improves error handling in `gemini.tsx`:

```diff
- catch (e) { console.error(e); }
+ catch (e) { logger.error('Failed', { error: e }); process.exit(1); }
```

Jules applies the same improvement to our `terminai.tsx`:

```typescript
catch (e) { logger.error('TerminaI failed', { error: e }); process.exit(1); }
```

Same pattern, our branding.

---

## Weekly Schedule

| Day      | Time (UTC) | Actor         | Action                         |
| -------- | ---------- | ------------- | ------------------------------ |
| Saturday | 3:00 AM    | GitHub Action | Creates sync issue for Jules   |
| Saturday | 3:01 AM    | Jules         | Starts work on issue           |
| Saturday | ~3:30 AM   | Jules         | Opens PR with full integration |
| Saturday | 3:00 PM    | Human         | Reviews and merges (~8 min)    |

---

## Jules' Deliverables

Every sync PR from Jules must include:

```
.upstream/patches/YYYY-MM-DD/
├── classification.md    # CORE/FORK/IRRELEVANT breakdown
├── commits.txt          # Raw commit list from upstream
├── release_notes.md     # Human-readable summary
└── integration_log.md   # What was cherry-picked, what was reimplemented
```

Plus:

- All CORE commits cherry-picked
- All FORK intents reimplemented
- Tests passing
- Lint passing
- PR description with summary

---

## Human Review Checklist

Saturday morning review should take <10 minutes:

1. [ ] Read `release_notes.md` (1 min)
2. [ ] If FORK reimplementations exist, spot-check one (3 min)
3. [ ] Check CI is green
4. [ ] Merge

If issues found, add comments. Jules or human fixes on Monday.

---

## Conflict Resolution

If Jules can't resolve a conflict:

1. Document in `integration_log.md`
2. Skip the problematic commit
3. Open PR with partial integration
4. Human resolves remaining conflicts

---

## Manual Trigger

For emergencies or testing:

```bash
gh workflow run weekly-sync.yml
```

Or: Actions → Weekly Upstream Sync → Run workflow

---

## Files

| File                                | Purpose                         |
| ----------------------------------- | ------------------------------- |
| `AGENTS.md`                         | Complete instructions for Jules |
| `docs-terminai/FORK_ZONES.md`       | Zone classification rules       |
| `.github/workflows/weekly-sync.yml` | Weekly trigger                  |
| `.upstream/absorption-log.md`       | Track merged commits            |
| `.upstream/patches/`                | Weekly sync artifacts           |

---

## Success Metrics

| Metric             | Target                                   |
| ------------------ | ---------------------------------------- |
| Human review time  | <10 minutes                              |
| Jules success rate | >90% of syncs need no human code changes |
| Test pass rate     | 100% before PR opened                    |
| Weekly cadence     | 52 syncs/year                            |

---

## Changelog

| Date       | Author      | Change                                        |
| ---------- | ----------- | --------------------------------------------- |
| 2025-12-27 | Antigravity | Initial document                              |
| 2025-12-28 | Antigravity | Finalized with Jules integration              |
| 2025-12-28 | Antigravity | Simplified to 2-stage (Jules 90% / Human 10%) |
