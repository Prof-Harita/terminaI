# GUI Automation in TerminaI

TerminaI provides a suite of tools (`ui.*`) to automate interactions with the
desktop environment. This system allows the agent to see the screen (snapshots),
inspect the accessibility tree, and perform actions like clicking and typing.

## Tools

- `ui.snapshot`: Captures the current state of the UI (VisualDOM tree + optional
  screenshot).
- `ui.query(selector)`: Finds elements in the UI matching a selector.
- `ui.click(target)`: Clicks an element. `target` can be a selector or an ID.
- `ui.type(text, target)`: Types text into an element.
- `ui.key(keys)`: Sends global keyboard shortcuts (e.g. `Control+C`).
- `ui.scroll(target, direction)`: Scrolls an element.
- `ui.focus(target)`: Focuses an element.
- `ui.wait(selector, state)`: Waits for an element to be visible/hidden.
- `ui.assert(target, assertion)`: Verifies UI state.
- `ui.capabilities`: Checks what the current driver supports.

## Selectors

Selectors allow finding elements by attributes, hierarchy, and boolean logic.

- **Attribute Matching**: `role="button"`, `name="Submit"`, `id="login-btn"`
- **Search**: `search="Save"` (fuzzy matches name/description)
- **Combinators**:
  - `>>`: Descendant. `role="window" >> role="button"`
  - `&&`: AND. `role="button" && name="Submit"`
  - `??`: Fallback. `name="Submit" ?? name="OK"`

## Setup Requirements

### Linux

Requires `python3` and `pyatspi`.

```bash
sudo apt-get install python3-pyatspi python3-dbus
```

### Windows

Requires the Rust driver sidecar to be built.

```bash
cd packages/desktop-windows-driver
cargo build --release
```

## Security & Policy

GUI automation actions are powerful and potentially dangerous.

- **Read-Only** tools (`query`, `wait`, `assert`) are generally ALLOWED by
  default policies.
- **Write/Action** tools (`click`, `type`, `key`, `snapshot`) default to
  `ASK_USER`, requiring you to approve each action.

Audit trails record hashes of the UI state and verification results for safety.
