# TermAI Security Posture

This document captures the current threat model and controls for TermAI (local
CLI + web-remote). It should be reviewed before enabling non-local access or
relaxing guardrails.

## Threat Model

- **Trusted boundary:** The local terminal user.
- **Conditionally trusted:** Web-remote clients that possess the auth token.
- **Untrusted inputs:** Files from the workspace, model responses, user-provided
  URLs, and web content fetched at runtime.

### Considered Attack Vectors

1. Prompt injection via untrusted files or model responses.
2. Command injection through crafted inputs passed to the shell tool.
3. Web-remote session hijacking or replay.
4. CSRF/XSRF against web-remote endpoints.
5. Destructive shell commands (accidental or malicious).
6. Privilege escalation via `sudo` or device writes.

## Security Controls

| Control                    | Implementation                                                    |
| -------------------------- | ----------------------------------------------------------------- |
| Auth tokens for web-remote | `packages/a2a-server/src/http/auth.ts`                            |
| CORS allowlist             | `packages/a2a-server/src/http/cors.ts`                            |
| Replay protection          | `packages/a2a-server/src/http/replay.ts`                          |
| Session notifications      | `packages/core/src/tools/process-notifications.ts`                |
| Risk classification        | `packages/core/src/safety/risk-classifier.ts`                     |
| Destructive guardrails     | `packages/core/src/safety/built-in.ts` (`checkDestructive`)       |
| Preview mode               | `--preview` flag; enforced in `shell.ts` and `file-ops.ts`        |
| Confirmation bus           | `packages/core/src/confirmation-bus/`                             |
| Folder trust               | `packages/cli/src/config/trustedFolders.ts`                       |
| Voice-safe approvals       | Voice mode forces non-YOLO in `packages/cli/src/config/config.ts` |
| Static web client          | Served from `/ui` with tokenized URL                              |

## Operator Guidance

- Prefer `--preview` when exploring unfamiliar repos.
- Keep web-remote bound to loopback; if exposing externally, rotate tokens
  (`--web-remote-rotate-token`) and set an allowlist of origins.
- Avoid running as root; TermAI will label privileged commands as high risk.
- Treat model responses as untrusted—verify before executing.

## Future Hardening

- Per-command provenance labeling in the UI.
- Stronger CSRF protections with double-submit tokens.
- Explicit opt-in for model-provided URLs before fetching.
- Optional IP allowlisting for web-remote.
