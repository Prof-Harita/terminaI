# Gemini CLI Comparison Report

## 1. Upstream Repository

The official upstream repository is
**[google-gemini/gemini-cli](https://github.com/google-gemini/gemini-cli)**.
TerminaI is a community fork of this codebase.

## 2. The "Enter" Mystery

**Observation:** In the upstream Gemini CLI, pressing keys that send a Line Feed
(`\n`, often labeled "Enter" in some configurations) instead of Carriage Return
(`\r`) fails to trigger the "Return/Submit" action.

**Technical Root Cause:**

1.  **Context Logic:** Both upstream and local `KeypressContext.tsx` correctly
    distinguish between `\r` (mapped to name `return`) and `\n` (mapped to name
    `enter`).
2.  **Binding Gap:** The upstream `keyBindings.ts` file maps `Command.RETURN`
    **only** to the `return` key:
    ```typescript
    // Upstream
    [Command.RETURN]: [{ key: 'return' }],
    ```
    This means if the terminal sends `\n`, the application emits an `enter`
    event, but no command is triggered because `enter` is not bound to
    `Command.RETURN`.

**TerminaI Resolution:** We patched `keyBindings.ts` to bind both keys to the
`RETURN` command, ensuring robust behavior across different terminals and PTY
configurations:

```typescript
// TerminaI
[Command.RETURN]: [{ key: 'return' }, { key: 'enter' }],
```

We also ensured `Command.SUBMIT` relies on the robust `return` key which we
normalize where necessary.

## 3. Settings Dialog Comparison

The `SettingsDialog.tsx` component was analyzed to verify core integrity and
document enhancements.

| Feature             | Upstream (Gemini CLI)                                             | TerminaI (Local)                                                                    |
| :------------------ | :---------------------------------------------------------------- | :---------------------------------------------------------------------------------- |
| **Core Rendering**  | Uses `ink` `Box`/`Text` with `RadioButtonSelect` and `TextInput`. | **Identical**. Core rendering logic is preserved.                                   |
| **Search**          | Uses `AsyncFzf` for fuzzy searching settings.                     | **Identical**.                                                                      |
| **Scopes**          | Supports User and Project scopes.                                 | **Identical**.                                                                      |
| **Auth Wizard**     | Not present.                                                      | **Added**. Checks `onOpenAuthWizard` prop.                                          |
| **Provider Action** | Not present.                                                      | **Added**. "Change Authentication Provider" item added to list.                     |
| **Security**        | No guardrails on settings changes.                                | **Added**. Checks `enforcedType` to block provider changes if restricted by policy. |

**Code Divergence Example:** In `generateSettingsItems`, TerminaI injects the
provider change action:

```typescript
// TerminaI
if (key === 'action.changeProvider') {
  return {
    label: 'Change Authentication Provider',
    value: key,
    type: 'action',
    toggle: () => {
      if (settings.merged.security?.auth?.enforcedType) { ... }
      onOpenAuthWizard?.();
    },
  };
}
```

## 4. Conclusion

- **Core Integrity:** The core input processing and UI state management logic
  remains faithful to the upstream repository.
- **Input Handling:** TerminaI is strictly **more robust**, handling `\n` input
  which upstream ignores.
- **Settings Dialog:** TerminaI extends the dialog with necessary hooks for the
  new Authentication Wizard and Policy Engine (guardrails), without removing or
  breaking existing functionality.
