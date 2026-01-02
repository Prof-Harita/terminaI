# GUI automation (desktop)

TerminaI supports desktop automation via `ui.*` tools (snapshot, query, click,
type, focus, etc.). Under the hood, the CLI routes requests through a governed
execution layer:

- **LLM produces intent**
- **Policy engine gates actions** (allow/ask/deny + approval ladder)
- **OS-specific driver executes** via accessibility APIs (and, in the future,
  vision fallbacks)

> This is experimental. Expect sharp edges, and assume you’ll need to do some
> environment-specific setup on Linux/Windows.

## Status and security model

- **Enabled by default (today)**: `tools.guiAutomation.enabled` defaults to
  `true` in `packages/cli/src/config/settingsSchema.ts`. If you want an explicit
  opt-in posture, set it to `false` and enable per machine.
- **Actions are still governed**: the default policies typically `ASK_USER` for
  actions like `ui.click`, `ui.type`, and `ui.snapshot`, and `ALLOW` for
  read-only tools like `ui.query` and `ui.describe`. See
  `packages/core/src/policy/policies/`.

## How to enable / disable

Edit your settings file (`~/.terminai/settings.json`):

```json
{
  "tools": {
    "guiAutomation": {
      "enabled": true
    }
  }
}
```

Restart TerminaI after changing settings.

## Supported platforms (current reality)

- **Linux**: AT-SPI driver via a Python sidecar (`pyatspi`). This is the only
  platform that currently produces meaningful accessibility trees in practice.
- **Windows**: UIA driver wiring exists, but the Rust driver is currently a stub
  (snapshots/actions return placeholder data). Treat as **non-functional** until
  the driver is implemented.
- **macOS**: Not implemented (NoOp driver).

## Linux prerequisites

Install AT-SPI Python bindings (Debian/Ubuntu):

```bash
sudo apt-get install python3-pyatspi python3-dbus python3-gi gir1.2-atspi-2.0
```

> TerminaI may attempt to auto-install missing Python deps by running
> `sudo apt-get install -y ...` (see
> `packages/core/src/utils/pythonDepsInstaller.ts`). If you don’t have
> passwordless sudo, this will fail/hang — install deps manually instead.

## The actual architecture (code-level)

### Execution pipeline

`ui.*` tool → `DesktopAutomationService` → `DesktopDriver` → sidecar → OS
accessibility APIs

- **Tools**: `packages/core/src/tools/ui-*.ts` (`ui.snapshot`, `ui.query`, etc.)
- **Coordinator**: `packages/core/src/gui/service/DesktopAutomationService.ts`
- **Driver selection**: `packages/core/src/gui/drivers/driverRegistry.ts`
- **Linux driver**: `packages/core/src/gui/drivers/linuxAtspiDriver.ts`
- **Linux sidecar**: `packages/desktop-linux-atspi-sidecar/src/`
- **Windows driver wrapper**:
  `packages/core/src/gui/drivers/windowsUiaDriver.ts`
- **Windows sidecar (Rust)**: `packages/desktop-windows-driver/`

### Snapshot data model (VisualDOM)

Snapshots are a structured accessibility tree plus metadata:

- `activeApp`: best-effort active window/app metadata
- `tree`: accessibility tree rooted at the desktop
- `limits`: maxDepth/maxNodes + truncation indicators

See `packages/core/src/gui/protocol/types.ts`.

## Selectors (v1): important, not CSS

The `ui.query`, `ui.click`, `ui.type`, `ui.focus`, `ui.wait`, and `ui.describe`
tools all take **TerminaI selectors**, not CSS selectors.

Selectors are parsed by `packages/core/src/gui/selectors/parser.ts` and resolved
by `packages/core/src/gui/selectors/resolve.ts`.

### Supported operators and combinators

- **Operators**: `=`, `~=`, `^=`, `$=`
  - `name~="Chrome"` means “name contains Chrome” (case-insensitive)
- **AND**: `&&`
- **Descendant**: `>>`
- **Fallback**: `??` (try the left selector first, else the right)
- **Prefixes** (parsed, but only lightly enforced today): `any:`, `atspi:`,
  `uia:`, `ocr:`

### Examples

- **Find a window by title substring**:

```text
role=window && name~="Chrome"
```

- **Find a button inside a window**:

```text
role=window && name~="Settings" >> role="push button" && name="Save"
```

- **Fallback if a label differs across platforms/versions**:

```text
role="push button" && name="OK" ?? role="push button" && name="Confirm"
```

> Common mistake: `window[name*='Chrome']` is a CSS attribute selector and will
> fail to parse. In TerminaI selectors, `window` is not a “tag name”; it’s a
> `role` value.

### Use `ui.describe` to generate stable selectors

If you can _roughly_ find something, `ui.describe` will return suggested stable
selectors, prioritizing platform IDs when available (e.g.,
`atspi:atspiPath="..."`). See `packages/core/src/tools/ui-describe.ts`.

## Why a “simple browser task” can fail (case study)

In one recorded session, the user asked:

> “open firefox using gui automation. navigate to google.com and type ‘hi’…”

The run failed for three independent reasons:

1. **Firefox could not start**: the environment’s Firefox was a Snap build and
   printed mount-namespace errors (common in containers / restricted sandboxes).
2. **Wrong selector language**: the agent used CSS-like selectors
   (`window[name*='Chrome']`), but TerminaI expects `role=... && name~=...`.
3. **No browser visible in snapshots**: repeated `ui.snapshot` results showed
   only `gnome-shell` at the desktop root. Even correct selectors would not find
   Chrome/Firefox if the accessibility bus doesn’t expose them.

The takeaway: **“ui.health is green” does not currently mean “your environment
is automation-ready.”** See the re-architecture plan below.

## Debugging playbook (Linux)

1. **Check driver health/capabilities**:
   - `ui.health`
   - `ui.capabilities`
2. **Take a snapshot and inspect the root children**:
   - If the desktop root only contains `gnome-shell`, AT-SPI is not seeing other
     applications. You won’t be able to `ui.query` into Chrome/Firefox.
3. **Increase snapshot limits when hunting deep elements**:
   - Defaults are conservative (`snapshotMaxDepth=10`, `snapshotMaxNodes=100`).
     For complex apps (browsers), raise limits in settings under
     `tools.guiAutomation.snapshotMaxDepth` / `snapshotMaxNodes`.
4. **Verify the target app actually launched**:
   - Don’t assume `cmd &` means “window exists.” Check process + wait for a UI
     element via `ui.wait`.
5. **Use `ui.describe` early**:
   - Once you find _anything_, capture a stable selector (`atspiPath`) for
     repeatable automation.

## “Brown M&M” checklist (failure modes you should assume)

Think of these as the subtle conditions that can silently break automation:

### Linux (AT-SPI)

- **Sandboxed apps**: Snap/Flatpak apps may not start (Firefox Snap in
  containers) or may not expose accessibility reliably.
- **Session/DBus mismatch**: AT-SPI depends on your desktop session bus; running
  TerminaI in an unusual context (service, SSH without session, container) can
  yield a partial/empty tree.
- **Wayland vs X11**: input injection and focus behaviors differ; coordinate
  clicks can drift with scaling and multi-monitor layouts.
- **Accessibility not enabled**: if the desktop/toolkit accessibility bridge is
  disabled, apps may not register with AT-SPI (snapshots show only shell/system
  components).
- **Budget starvation**: shallow `maxNodes` can be consumed by `gnome-shell` or
  another “large” subtree before other apps are traversed.
- **Localization / title churn**: window titles and button labels change across
  locales and versions; use `??` fallbacks and prefer `atspiPath` where
  possible.
- **Focus**: `ui.type` assumes focus; if focus isn’t correct, you’ll type into
  the wrong app or nowhere.

### Windows (UIA)

- **Integrity level boundaries**: a non-elevated driver can’t automate elevated
  windows (UAC prompts, admin apps).
- **Secure desktop**: UAC/lock screen is intentionally hard to automate.
- **Custom-rendered apps**: some apps expose weak UIA trees; you need OCR/pixel
  fallback for reliability.
- **DPI scaling / multi-monitor**: coordinate injection and bounds become
  tricky.
- **Driver packaging**: the Rust driver must exist and be executable;
  “connected” should not mean “functional.”

## Re-architecture plan (end-to-end fix)

This is the “make it boringly reliable” redesign we recommend, based on the
observed failure and code review.

### Goals

- **Deterministic selectors**: agents should not guess selector syntax.
- **Truthful health**: `ui.health` should fail if automation cannot see target
  apps.
- **Progressive capture**: enumerate windows/apps cheaply, then zoom into the
  relevant window deeply.
- **Multi-modal fallback**: accessibility-first, OCR/screenshot second,
  coordinate injection last.
- **Cross-platform honesty**: capabilities must reflect what the driver can do.

### Proposed changes (v2)

1. **Add a `ui.diagnose` tool**
   - Runs an environment preflight and returns actionable remediation steps:
     AT-SPI bus presence, session/DBus info, whether apps other than the shell
     are visible, etc.
2. **Make `ui.health` meaningful**
   - Health should include a quick `snapshot` sanity check and report: “desktop
     apps visible: N”, “active window detected: yes/no”, etc.
3. **Snapshot pipeline redesign**
   - **Pass 1 (shallow)**: enumerate desktop → applications → windows only.
   - **Pass 2 (deep)**: capture the active window (or a selected window) with a
     much higher depth/node budget.
   - This avoids “gnome-shell eats the whole node budget” and makes browser
     automation possible without globally massive snapshots.
4. **Selector UX**
   - Embed selector examples directly in tool parameter schemas (so the LLM sees
     the correct syntax).
   - Improve parse errors to recommend `role=... && name~="..."` patterns.
5. **Driver capability enforcement**
   - If a driver returns `canKey=false`, `ui.key` should hard-fail early with a
     clear message (instead of “success but did nothing”).
   - Windows driver should advertise `canSnapshot/canClick/canType=false` until
     the real UIA implementation exists.
6. **Vision fallback (OCR/screenshot)**
   - Implement `includeScreenshot` and `includeTextIndex` across drivers.
   - Implement `ocr:` selector prefix for cases where accessibility is absent.
7. **Packaging**
   - Stop resolving sidecars relative to `process.cwd()`; bundle them as
     resources and locate via `import.meta.url`/resource registry.

## Notes for contributors

- The current Linux sidecar is intentionally minimal; it primarily supports
  snapshots and coordinate-based clicks (`generateMouseEvent`), and it does not
  yet provide robust element re-identification for actions.
- The current Windows driver is a protocol stub.

If you’re picking a place to contribute, start with: (a) meaningful health +
diagnose, (b) snapshot pass-1/pass-2 design, (c) selector UX in tool schemas.
