# GUI Automation Setup

**Status:** Experimental / Opt-in via Settings  
**Architecture:** Defined in
`[.local/GUI_Automation_Architecture.md](../.local/GUI_Automation_Architecture.md)`

TerminaI supports desktop automation (clicking, typing, reading screen state)
via a "Safety Sandwich" architecture where the LLM produces intent, a policy
engine gates it, and an OS-specific driver executes it.

## 🚀 How to Enable

GUI Automation is **disabled by default** for security. To enable it:

1.  **Edit your settings file**: `~/.terminai/settings.json` (legacy
    `~/.gemini/settings.json` is still read)

2.  **Add the `tools.guiAutomation` section**:

    ```json
    {
      "tools": {
        "guiAutomation": {
          "enabled": true
        }
      }
    }
    ```

3.  **Restart TerminaI**.

## Supported Platforms

- **Linux**: AT-SPI driver (requires the Python sidecar).
- **Windows**: UIA driver (experimental).
- **macOS**: Not yet implemented.

## ⚠ Prerequisites (Linux)

You must have the `pyatspi` and `python-dbus` bindings installed for the At-Spi2
sidecar to work:

```bash
# Debian/Ubuntu
sudo apt-get install python3-pyatspi python3-dbus python3-gi gir1.2-atspi-2.0
```

## 🛡️ Architecture & Forensics

If you need to dig into how this works:

- **Service**: `packages/core/src/gui/service/DesktopAutomationService.ts` - The
  central coordinator.
- **Driver**: `packages/core/src/gui/drivers/linuxAtspiDriver.ts` - Spawns a
  Python sidecar.
- **Sidecar**: `packages/desktop-linux-atspi-sidecar/` - Python code that talks
  to the OS accessibility bus.
- **Tools**: `packages/core/src/tools/ui-*.ts` - The tools exposed to the LLM
  (e.g., `ui.click`, `ui.snapshot`).
- **Settings**: `packages/cli/src/config/settingsSchema.ts` - Defines the
  `guiAutomation.enabled` toggle.

## 🔮 Future "Clear Switch"

We aim to add a CLI command to toggle this easily:

```bash
terminai config set tools.guiAutomation.enabled true
```
