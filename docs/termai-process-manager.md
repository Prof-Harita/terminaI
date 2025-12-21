# terminaI Process Manager — Manual Verification

This page documents the manual verification flow for terminaI's process
orchestration capabilities. These checks ensure that long-running sessions can
be started, observed, and stopped safely.

## Preconditions

- You can run `gemini` from this repo (for example, via `npm run start`).
- You have a project with a long-running command (example: `npm run dev`).

## Manual verification steps

1. **Start a long-running process**

   Prompt:

   ```
   Start `npm run dev` as `devserver` and tell me when it’s ready.
   ```

   Expected:
   - terminaI starts a named session `devserver`.
   - Output is streamed or summarized.
   - Readiness is acknowledged based on output text.

2. **Read recent output**

   Prompt:

   ```
   Show me the last 50 lines from `devserver`.
   ```

   Expected:
   - terminaI returns the last 50 lines from the session buffer.
   - Output is bounded and does not dump the full log.

3. **Stop the session safely**

   Prompt:

   ```
   Send Ctrl+C to `devserver`.
   ```

   Expected:
   - terminaI sends SIGINT (or PTY input) to the process.
   - If a confirmation prompt appears, approve it.
   - The session stops cleanly.

4. **List active sessions**

   Prompt:

   ```
   List running sessions.
   ```

   Expected:
   - terminaI lists known sessions.
   - `devserver` is marked exited/stopped if it was terminated.

## Notes

- If a PTY is unavailable, input may not be accepted. The CLI should surface a
  clear error in this case.
- Destructive actions (stop/restart) should always require confirmation.
