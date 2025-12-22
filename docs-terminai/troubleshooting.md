# Troubleshooting

## Desktop can’t connect (401 / unauthorized)

- Ensure the **Agent URL** points to the A2A server started by
  `terminai --web-remote`.
- Ensure the **Token** is correct.
- If the CLI did not print the token (stored hashed), rotate it:
  `terminai --web-remote-rotate-token`.

## Desktop says “agent can’t authenticate”

Desktop does not run OAuth itself. The agent (CLI/A2A server) must already be
authenticated.

- Run `terminai` once in a terminal and complete the browser auth flow, then
  retry Desktop.

## Browser `/ui` can’t run actions

- The UI needs a token. If the CLI prints a `/ui?token=...` URL, open that once;
  it will store the token locally and remove it from the address bar.
- If no token is printed, rotate it first with
  `terminai --web-remote-rotate-token`.

## Level C approval fails (PIN)

- PIN is `security.approvalPin` in `~/.gemini/settings.json` (default
  `"000000"`).
- PIN must be exactly 6 digits and match exactly.

## Voice install fails

- `terminai voice install` requires internet access only during installation.
- Re-run the command; it is safe to run multiple times.

## Desktop STT/TTS fails after install

- Confirm `~/.terminai/voice` exists and contains:
  - `whisper` / `whisper.exe`
  - `ggml-base.en.bin`
  - `piper` / `piper.exe`
  - `en_US-lessac-medium.onnx`
- Ensure your OS/browser permissions allow microphone access for the Desktop
  app.
