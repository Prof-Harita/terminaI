# Case studies (what TerminaI is for)

These are realistic scenarios TerminaI is designed to handle with governance.

## 1) “My dev environment broke” (toolchain repair)

- Symptom: `npm install` / `pip` / `rustup` failures, PATH conflicts
- Operator loop:
  - inspect versions + PATH
  - detect conflicting installs
  - propose safe repair steps
  - verify builds and tests

## 2) “A service is down on my server” (ops triage)

- Symptom: 5xxs, failed health checks
- Operator loop:
  - inspect systemd status
  - review logs
  - restart service with confirmation
  - verify health endpoint

## 3) “Disk is full” (capacity recovery)

- Symptom: write failures, slow machine
- Operator loop:
  - find biggest directories
  - propose reversible cleanup first
  - require confirmation for deletes
  - verify free space

## 4) “I need new powers” (MCP integration)

- Add an MCP server for GitHub/Jira/Linear/etc.
- TerminaI can then execute tasks that span both your system and external tools.

## 5) “I want to drive TerminaI from another client” (A2A)

- Use the A2A server to connect Desktop/browser/IDE.
- This turns TerminaI into a single agent backend for multiple frontends.
