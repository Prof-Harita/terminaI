# Security Policy

TerminAI is an agentic system operator. That means a bug can have real impact.

## Reporting a vulnerability

Please **do not** open a public GitHub issue for security-sensitive reports.

Instead:

1. Go to the repository **Security** tab and open a private report via
   **Security Advisories**:
   - https://github.com/Prof-Harita/terminaI/security/advisories
2. Include:
   - affected version/commit
   - reproduction steps
   - expected vs actual behavior
   - impact assessment (what an attacker could do)
   - any suggested fix

If you can’t use Security Advisories, open a minimal issue that says “security
report submitted out-of-band” without details, and we’ll coordinate privately.

## Scope

We consider security issues to include (not exhaustive):

- auth/token leaks (A2A/web remote)
- command execution bypassing policy/approval ladders
- sandbox escapes
- prompt injection leading to unintended execution
- sensitive data exfiltration via tools

## Additional context

- Threat model + controls: `docs/security-posture.md`
