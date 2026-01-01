# Fork Zone Classification

> **Last Reviewed:** 2025-12-28  
> **Update Policy:** Update this file when creating new divergences from
> upstream

---

## IRRELEVANT (auto-skip)

Files in this zone are skipped during upstream sync. They are Google-specific or
not relevant to TerminaI.

- Google telemetry (`clearcut/*`, `telemetry/*`)
- IDE integrations (`vscode-ide-companion/*`)
- Seasonal/cosmetic changes (holiday themes, animations)
- Version bump chores
- Internal Google tooling

---

## FORK (reimplement from intent)

Files in this zone have been modified by TerminaI. Do not merge directly —
extract upstream intent and reimplement.

| File                                           | Our Divergence                 |
| ---------------------------------------------- | ------------------------------ |
| `packages/core/src/core/logger.ts`             | JSONL format (O(1) writes)     |
| `packages/core/src/core/logger.test.ts`        | Updated tests for JSONL        |
| `packages/cli/src/gemini.tsx` → `terminai.tsx` | Entry point renamed            |
| `packages/cli/src/voice/*`                     | TerminaI-added voice mode      |
| `packages/evolution-lab/*`                     | TerminaI-added testing harness |
| `.terminai/*` vs `.gemini/*`                   | Config directory branding      |
| `README.md`                                    | TerminaI branding              |
| `package.json` (name field)                    | `terminai-monorepo`            |

---

## CORE (merge or apply directly)

Everything not listed above. Especially:

- `packages/core/src/tools/*` — New tools benefit us
- `packages/core/src/mcp/*` — MCP improvements
- `packages/core/src/prompts/*` — Prompt updates
- Security fixes (any zone) — Always prioritize
- Policy engine updates
- Bug fixes in non-forked files

---

## Maintenance Checklist

When diverging a new file from upstream:

1. [ ] Add the file to the FORK zone above
2. [ ] Update "Last Reviewed" date
3. [ ] Document the divergence reason
4. [ ] Commit this change with your PR
