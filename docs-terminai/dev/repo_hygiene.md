# Repo hygiene (public-ready)

## Root directory should stay clean

If you see new files in the repo root like `cli_errors_*.txt`,
`failed_logs*.txt`, `live_log*.txt`, or `test_output*.txt`, they are almost
always **debug artifacts** created by:

- a manual command with shell redirection (for example:
  `npm run typecheck > cli_errors_1.txt`)
- a tool/agent run that writes logs to the current working directory
- copying CI logs locally for analysis

These files are not part of the product and should not be committed.

## Where to put local artifacts instead

Use the repo-local scratch directory `local/` for:

- captured logs
- copied CI output
- one-off prompts/spec drafts
- temporary notes

`local/` is intentionally ignored by git.

## If you need structured logs

- CLI/runtime logs: `~/.terminai/logs/`
- Audit logs: `~/.terminai/logs/audit/`

(Legacy `~/.gemini/` is supported for backward compatibility.)
