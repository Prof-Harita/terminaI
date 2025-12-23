# Roadmap

This roadmap is focused on shipping a trustworthy “System Operator” platform
without breaking existing users.

## Now (v0.21.x)

- Contributor-first repo surface (docs, security policy, templates)
- TerminaI identity: `terminai` command and docs
- A2A/web-remote stability for Desktop + browser `/ui`

## Next (v0.22–v0.23)

- **PTY hardening** (Desktop): resize, exit status, better lifecycle handling
- **Auditability**: structured local audit log for executed actions
- **A2A hardening**: pairing + short-lived client tokens + revocation
- “Alias & append” migration: `~/.terminai/` as primary config home with safe
  fallback to legacy

## Later (v0.24+)

- Recipe pack: curated, governed system repair playbooks
- Deeper system operator UX (session browser, safe replays, richer
  confirmations)
- Optional provider abstraction (only if it can be done without breaking
  sovereignty goals)

For execution-level detail, see `tasks_roadmapv2.md`.
