# TerminAI quickstart

TerminAI is a terminal-first AI that ships as a wrapper on top of Gemini CLI. It
runs the same engine with a TerminAI system prompt by default.

## Install

### Option 1: npx (fastest)

```bash
npx terminai
```

### Option 2: npm global install

```bash
npm install -g terminai
terminai
```

### Option 3: from source

```bash
git clone https://github.com/Prof-Harita/terminaI.git
cd terminaI
npm ci
npm run build
npm link --workspace packages/terminai
terminai
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
export TERMINAI_SYSTEM_MD=/path/to/your/system.md
terminai
```

## Troubleshooting

If you hit permission prompts or tool denials, re-run the command and confirm
explicitly. TerminAI will never bypass your confirmation policies.
