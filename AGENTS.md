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

```bash
npm run test:ci # Full test suite
npm run lint    # Linting
npm run build   # Build all packages
```

## Upstream Sync Task

When assigned an upstream sync issue:

1. Add upstream remote:
   `git remote add upstream https://github.com/google-gemini/gemini-cli.git`
2. Fetch: `git fetch upstream`
3. Compare: `git log --oneline HEAD..upstream/main`
4. Classify each commit per `FORK_ZONES.md`
5. Create branch: `git checkout -b upstream-sync/YYYY-MM-DD`
6. Document in `.upstream/patches/YYYY-MM-DD/`
7. Push and open PR. **Always mention @Prof-Harita in the PR description** to
   trigger the manual review phase.
