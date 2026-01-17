# TerminaI Quick Reference

Essential commands and shortcuts for efficient operation.

## Commands

| Command              | Description             | Default Action     |
| -------------------- | ----------------------- | ------------------ |
| `/help`              | Command reference       | Show core commands |
| `/help all`          | Show all commands       | Including hidden   |
| `/llm`               | LLM provider management | Open wizard        |
| `/model`             | Switch model            | Open selector      |
| `/chat`              | Session management      | List saved chats   |
| `/chat save <tag>`   | Save current chat       | -                  |
| `/chat resume <tag>` | Resume saved chat       | -                  |
| `/mcp`               | MCP server management   | List servers       |
| `/tools`             | Available tools         | List tool names    |
| `/extensions`        | Active extensions       | List extensions    |
| `/logs`              | Session logs            | Show recent        |
| `/settings`          | Configuration           | Open dialog        |
| `/restore`           | Undo changes            | List checkpoints   |
| `/stats`             | Token usage             | Show stats         |
| `/clear`             | Clear screen            | (Ctrl+L)           |
| `/copy`              | Copy last output        | -                  |
| `/quit`              | Exit TerminaI           | (Ctrl+C)           |

## Keyboard Shortcuts

| Shortcut       | Action               |
| -------------- | -------------------- |
| `Ctrl+C`       | Quit / Cancel        |
| `Ctrl+L`       | Clear screen         |
| `Ctrl+S`       | Selection mode       |
| `Ctrl+Y`       | Toggle YOLO mode     |
| `Ctrl+J`       | New line (Linux)     |
| `Ctrl+Enter`   | New line (Windows)   |
| `Shift+Tab`    | Toggle auto-accept   |
| `Esc`          | Cancel / Clear input |
| `Up/Down`      | Prompt history       |
| `Page Up/Down` | Scroll               |

## Context Commands

| Pattern    | Description           |
| ---------- | --------------------- |
| `@file.ts` | Include file content  |
| `@src/`    | Include directory     |
| `!command` | Execute shell command |

## LLM Providers

Use `/llm` to switch between:

- **Google Gemini** - OAuth or API key
- **ChatGPT** - OAuth authentication
- **OpenAI-compatible** - Custom endpoint + API key
- **Local LLM** - Ollama, etc.

---

_See `/help` for complete command list. Full docs: `docs/cli/commands.md`_
