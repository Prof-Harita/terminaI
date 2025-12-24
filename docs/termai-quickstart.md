# TerminaI quickstart

TerminaI is a terminal-first AI that ships as a wrapper on top of Gemini CLI. It
runs the same engine with a Terminal AI system prompt by default.

## Install

### Option 1: npx (fastest)

```bash
npx termai
```

### Option 2: npm global install

```bash
npm install -g termai
termai
```

### Option 3: from source

```bash
git clone https://github.com/Prof-Harita/terminaI.git
cd terminaI
npm ci
npm run build
npm link --workspace packages/termai
termai
```

## Authenticate

Pick one of the authentication methods when prompted on first run:

- Google OAuth (recommended for most users)
- Gemini API key
- Vertex AI

## First commands

```text
What's eating my CPU?
How much disk do I have?
Find all large files over 1 GB and summarize them.
What's the weather in Austin right now?
```

## Override the system prompt (optional)

```bash
export GEMINI_SYSTEM_MD=/path/to/your/system.md
termai
```

## Troubleshooting

If you hit permission prompts or tool denials, re-run the command and confirm
explicitly. TerminaI will never bypass your confirmation policies.
