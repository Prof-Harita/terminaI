# Configuration

## Settings file (CLI / agent)

TerminAI uses the same settings file layout as the upstream Gemini CLI.

- Default path: `~/.terminai/settings.json` (legacy `~/.gemini/settings.json` is
  still read for compatibility)

Common options (high signal):

- `security.approvalPin` (string, 6 digits)
  - Used for Level C approvals (default: `"000000"`). Example: `"123456"`
- `security.approvalMode` (string: "safe" | "prompt" | "yolo")
  - Controls approval ladder behavior (default: `"prompt"`).
- `llm.provider` (string: `"gemini"` | `"openai_compatible"` | `"anthropic"`)
  - Selects the model provider (default: `"gemini"`).
- `voice.enabled` (boolean)
  - Enables CLI spoken replies (TTS).
- `voice.pushToTalk.key` (string)
  - CLI key for voice controls (commonly `space`).
- `voice.spokenReply.maxWords` (number)
  - Caps how much text is spoken per assistant turn.

## OpenAI-compatible provider (OpenAI, OpenRouter, etc.)

Configure OpenAI-compatible providers under `llm.openaiCompatible` and provide
credentials via an environment variable.

Minimal example:

```json
{
  "llm": {
    "provider": "openai_compatible",
    "openaiCompatible": {
      "baseUrl": "https://api.openai.com/v1",
      "model": "gpt-4o-mini",
      "auth": {
        "type": "bearer",
        "envVarName": "OPENAI_API_KEY"
      }
    }
  }
}
```

Notes:

- `llm.openaiCompatible.auth.envVarName` defaults to `OPENAI_API_KEY` if
  omitted.
- `llm.headers` can be used to set extra HTTP headers (for example, some
  gateways require `HTTP-Referer` or `X-Title`).
- Tool calls are supported, but tool-calling quality varies by model/provider.

Environment variables:

- `TERMINAI_API_KEY`
  - Uses API-key auth instead of the OAuth browser flow.
- `TERMINAI_BASE_URL`
  - Override the Gemini API base URL (validated).
- `OPENAI_API_KEY`
  - Default API key for OpenAI-compatible providers (name can be customized via
    `llm.openaiCompatible.auth.envVarName`).

Legacy compatibility: legacy Gemini-prefixed environment variables are aliased
to their TerminAI-prefixed equivalents (TerminAI values win when both are set).

### Settings loading architecture (CLI-Desktop parity)

As of commit `a7d891fd` (2024-12-31), TerminAI uses a **unified settings
infrastructure** (`@terminai/core/config/settings`) shared between:

- CLI (`packages/cli`)
- A2A Server (`packages/a2a-server`)
- Desktop (uses A2A backend)

**Key components:**

- `SettingsLoader` - Reads settings from 4 scopes (system, systemDefaults, user,
  workspace)
- Automatic V1→V2 migration for backward compatibility
- Trust evaluation (workspace settings only applied if folder is trusted)
- Deep merge with configurable strategies for arrays/objects

**Settings precedence (lowest to highest):**

1. System defaults (`/etc/gemini-cli/system-defaults.json`)
2. User settings (`~/.terminai/settings.json`)
3. Workspace settings (`.terminai/settings.json`) - if trusted
4. System overrides (`/etc/gemini-cli/settings.json`)

See the inline documentation in `packages/core/src/config/settings/` for
implementation details.

## Web Remote (A2A) token

When you start the agent with `--web-remote`, the CLI prints (or stores) a token
used by clients.

- Rotate token (prints a new token): `terminai --web-remote-rotate-token`
- Start server with a pinned port:
  `terminai --web-remote --web-remote-port 41242`

## Desktop app settings

Desktop stores its own UI settings locally (agent URL/token, workspace path,
voice toggle/volume). These settings do not replace the agent's
`~/.terminai/settings.json` (legacy `~/.gemini/settings.json` may still be
read).
