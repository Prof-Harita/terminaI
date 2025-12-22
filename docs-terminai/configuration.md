# Configuration

## Settings file (CLI / agent)

TerminaI uses the same settings file layout as the upstream Gemini CLI.

- Default path: `~/.gemini/settings.json`

Common options:

- `security.approvalPin` (string, 6 digits)
  - Used for Level C approvals (default: `"000000"`).
- `voice.enabled` (boolean)
  - Enables CLI spoken replies (TTS).
- `voice.pushToTalk.key` (string)
  - CLI key for voice controls (commonly `space`).
- `voice.spokenReply.maxWords` (number)
  - Caps how much text is spoken per assistant turn.

Environment variables:

- `GEMINI_API_KEY`
  - Uses API-key auth instead of the OAuth browser flow.

## Web Remote (A2A) token

When you start the agent with `--web-remote`, the CLI prints (or stores) a token
used by clients.

- Rotate token (prints a new token): `terminai --web-remote-rotate-token`
- Start server with a pinned port:
  `terminai --web-remote --web-remote-port 41242`

## Desktop app settings

Desktop stores its own UI settings locally (agent URL/token, workspace path,
voice toggle/volume). These settings do not replace the agent’s
`~/.gemini/settings.json`.
