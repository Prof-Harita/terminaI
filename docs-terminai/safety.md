# Safety Guide

TerminAI is a "terminal operator" with a sophisticated safety model that
balances security and usability.

---

## Security Profiles

Choose your preferred level of security oversight:

### Balanced (Recommended) ⭐

**65% fewer interruptions** while maintaining full safety.

Auto-approves:

- Editing files tracked in git
- Network requests to trusted sites (Google, GitHub, npm)
- Reading files and directories

Confirms:

- Deleting files
- System modifications
- Accessing untrusted domains

### Strict (Maximum Security)

Confirms every modification and external access. Best for production systems or
sensitive data.

### Minimal (Maximum Autonomy)

Only blocks catastrophic actions. Best for experienced users in sandboxed
environments.

---

## How It Works

Every action is evaluated on **three dimensions**:

1. **Outcome**: Can this be reversed? (Reversible → Soft-Irreversible →
   Irreversible)
2. **Intention**: Did you ask for this? (Explicit → Task-Derived → Autonomous)
3. **Domain**: Where is it happening? (Workspace → Localhost → Trusted →
   Untrusted → System)

Based on these and your chosen profile, TerminAI decides whether to:

- ✅ **Pass**: Run silently
- 📝 **Log**: Show a notification
- ⚠️ **Confirm**: Ask for approval
- 🔐 **PIN**: Require 6-digit PIN

---

## Always Protected

Regardless of your profile, TerminAI **always** requires PIN for:

- Deleting root directories (`rm -rf /`)
- Modifying system files (`/etc`, `~/.ssh`)
- Irreversible actions initiated autonomously by the agent

---

## Configuration

Set your profile in your config file:

```json
{
  "security_profile": "balanced",
  "security": {
    "approvalPin": "000000"
  }
}
```

Change your PIN from the default `000000` to a secure 6-digit code.

---

## Examples

| Your Request          | Agent Action          | Balanced Profile |
| --------------------- | --------------------- | ---------------- |
| "Edit main.ts"        | Edit git-tracked file | ✅ Auto-approved |
| "What's the weather?" | Google search         | ✅ Auto-approved |
| "Delete temp folder"  | `rm -rf ./temp`       | ⚠️ Confirm       |
| "Clean up project"    | `rm -rf node_modules` | ⚠️ Confirm       |
| Agent optimizes disk  | `rm -rf ~/Downloads`  | 🔐 PIN required  |

---

## Architecture

See [Safety Architecture](./safety-architecture.md) for technical details on the
three-axis model, decision logic, and safety guarantees.

---

## Applies Everywhere

The same safety model works across:

- **CLI** (terminal interface)
- **Desktop** (Tauri app)
- **Web** (browser-based remote)
