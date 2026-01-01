---
description: full development cycle from idea to deployment
---

# Full Cycle: Complete Development Workflow

This is the **complete workflow** for taking an idea from concept to deployed
code.

## The Pipeline

```
/brainstorm → /architect → /tasks → /crosscheck → /execute → /review → /fix → /final-review → /ship
```

## Stage Summary

| Stage | Command         | Purpose               | Output          |
| ----- | --------------- | --------------------- | --------------- |
| 1     | `/brainstorm`   | Explore all options   | Chosen approach |
| 2     | `/architect`    | Design the solution   | Technical spec  |
| 3     | `/tasks`        | Break down into steps | Task checklist  |
| 4     | `/crosscheck`   | Verify completeness   | Gap analysis    |
| 5     | `/execute`      | Implement the code    | Working code    |
| 6     | `/review`       | Code review           | Issue list      |
| 7     | `/fix`          | Address issues        | Clean code      |
| 8     | `/final-review` | Holistic check        | Final verdict   |
| 9     | `/ship`         | Prepare for deploy    | Merged PR       |

## When to Use Each Stage

- **Starting something new?** → Start at `/brainstorm`
- **Approach already decided?** → Start at `/architect`
- **Spec already exists?** → Start at `/tasks`
- **Code already written?** → Start at `/review`
- **Just fixing bugs?** → Start at `/fix`
- **Ready to merge?** → Start at `/ship`

## Principles

1. **Never skip stages** — Each stage catches different classes of errors
2. **Get confirmation between stages** — User must approve before proceeding
3. **Document decisions** — Artifacts from each stage become project history
4. **Iterate if needed** — Go back to earlier stages if new info emerges

## Quick Reference

```
DIVERGE                          CONVERGE
   │                                │
   ▼                                ▼
┌──────────┐    ┌───────────┐    ┌──────────┐
│brainstorm│───▶│  architect│───▶│  tasks   │
│ (explore)│    │  (design) │    │ (detail) │
└──────────┘    └───────────┘    └──────────┘
                                     │
                     ┌───────────────┘
                     ▼
              ┌──────────┐    ┌──────────┐
              │crosscheck│───▶│ execute  │
              │ (verify) │    │  (code)  │
              └──────────┘    └──────────┘
                                   │
                     ┌─────────────┘
                     ▼
              ┌──────────┐    ┌──────────┐
              │  review  │───▶│   fix    │
              │ (check)  │    │ (repair) │
              └──────────┘    └──────────┘
                                   │
                     ┌─────────────┘
                     ▼
              ┌──────────┐    ┌──────────┐
              │  final   │───▶│   ship   │
              │ (assess) │    │ (deploy) │
              └──────────┘    └──────────┘
```
