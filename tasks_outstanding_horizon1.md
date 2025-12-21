# TermAI Horizon 1 — Outstanding Tasks (Resolved)

> **Update:** All items previously flagged as outstanding are now complete. Ollama (E.1/E.2) remains deferred per instruction.

## Recently Completed

| Theme | Task | Evidence |
|-------|------|----------|
| D: Safety | D.1 Preview Mode | `--preview` flag enforced in `core/src/tools/shell.ts` and `core/src/tools/file-ops.ts`; tests cover preview short-circuit paths. |
| F: Polish | F.1 First-Run Onboarding | `ui/Onboarding.tsx`, `utils/firstRun.ts`, and wiring in `gemini.tsx` to set approval/preview/voice on first launch. Marker at `~/.termai/.onboarded`. |
| F: Polish | F.2 Demo Scripts | `docs/demos.md` + navigation entry in `docs/sidebar.json`. |
| F: Polish | F.3 Security Posture | `docs/security-posture.md` + navigation entry in `docs/sidebar.json`. |

## Notes
- Voice-safe approvals remain enforced: voice mode disables YOLO automatically.
- Preview mode now returns `[PREVIEW]` responses for shell and file ops without executing.
- Onboarding choices apply immediately to the session (approval mode, preview toggle, voice opt-in).

## Outstanding

None (excluding deferred Ollama tasks).
