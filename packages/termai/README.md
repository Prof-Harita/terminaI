# TerminaI CLI

TerminaI is a terminal-first AI built on Gemini CLI. This package provides the
`termai` executable with the TerminaI system prompt enabled by default.

## Quickstart

```bash
npx termai
```

Or install globally:

```bash
npm install -g termai
termai
```

If you want to override the system prompt:

```bash
export GEMINI_SYSTEM_MD=/path/to/your/system.md
termai
```

For full documentation, see the repo README and `docs/`.
