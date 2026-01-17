# Troubleshooting

## OpenAI-compatible model prints commands instead of executing tools

If you see replies like `Command: ...` or `curl ...` without any tool execution,
the model is not emitting tool calls.

- Try a model with stronger tool-calling behavior (for example, GPT-4o/GPT-4.1
  families).
- If your command failed (permissions, missing binary), re-prompt with “run the
  command using the tool, don’t print it”.

## OpenAI-compatible: hardware commands fail with “Permission denied”

Some hardware/BIOS queries require root (for example `dmidecode`).

- Prefer non-root sources where possible (for example, `hostnamectl` and
  `/sys/class/dmi/id/*`).
- If you do need root, use `sudo ...` and enter your password when prompted.

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

- PIN is `security.approvalPin` in `~/.terminai/settings.json` (default
  `"000000"`). Some installs may still read legacy `~/.gemini/settings.json`.
- PIN must be exactly 6 digits and match exactly.

## `terminai` command not found

- If you installed from source, ensure you ran:

  ```bash
  npm link --workspace packages/termai
  ```

- If you installed via npm, ensure your global npm bin is on PATH.

## A2A server won’t start (port already in use)

- Start on a different port:

  ```bash
  CODER_AGENT_PORT=41243 terminai --web-remote
  ```

- Or stop the existing process that’s using the port.

## MCP server won’t start

- Verify the `command` exists (e.g. `docker`).
- Run the MCP command manually to check for errors.
- If you used environment variables in settings, ensure they are exported in the
  shell that launches TerminAI.

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
