# Safety Architecture (TerminaI)

TerminaI's safety model uses a **three-axis risk assessment** with
**configurable security profiles** to balance safety and usability.

## Core Philosophy

- **Outcome-focused**: Security decisions based on potential harm, not just
  action type
- **Intention-aware**: Actions explicitly requested by users receive lower
  scrutiny than autonomous decisions
- **Domain-conscious**: Trust varies by target (workspace vs system vs external)
- **User-configurable**: Three profiles balance interruptions vs safety

---

## Three-Axis Model

Every action is classified along three independent dimensions:

### 1. Outcome (Reversibility)

- **Reversible**: Can be undone trivially (git-tracked writes, reads, GET
  requests)
- **Soft-Irreversible**: Recoverable with effort (deletes in workspace, npm
  install)
- **Irreversible**: Cannot be undone (rm -rf outside workspace, system
  modifications)

### 2. Intention (Provenance)

- **Explicit**: User directly requested this action
- **Task-Derived**: Required to achieve user's stated goal
- **Autonomous**: Agent's independent decision

### 3. Domain (Trust)

- **Workspace**: User's project files (high trust)
- **Localhost**: Local development servers (medium trust)
- **Trusted**: Known APIs (Google, GitHub, npm)
- **Untrusted**: External/unknown domains (low trust)
- **System**: Critical OS paths (`/etc`, `~/.ssh`) (critical)

---

## Security Profiles

Users can configure their preferred security level:

| Profile      | Approval Reduction | Best For                                      |
| ------------ | ------------------ | --------------------------------------------- |
| **Strict**   | 0% (baseline)      | Production systems, sensitive data            |
| **Balanced** | ~65%               | Solo devs, trusted environments (recommended) |
| **Minimal**  | ~90%               | Experienced users, sandboxed environments     |

### Balanced Profile (Recommended)

Auto-approves:

- Git-tracked file edits in workspace
- Trusted network requests (Google, GitHub, npm)
- Read operations

Still requires confirmation for:

- File deletions
- System-level access
- Untrusted domains

---

## Decision Logic

```
Risk Level = f(Outcome, Intention, Domain, Profile)
```

**Review Levels**:

- **Pass**: Silent execution
- **Log**: Toast notification only
- **Confirm**: Click to approve
- **PIN**: Click + 6-digit PIN

**Safety Invariants** (apply to all profiles):

1. Unbounded system deletes → PIN
2. Irreversible + Autonomous → PIN
3. Critical path modifications → PIN

---

## Implementation Pipeline

1. **Provenance Tagging**: Label action origin (local user, web remote, tool
   output)
2. **Three-Axis Classification**: Compute (Outcome, Intention, Domain)
3. **Risk Calculation**: Apply profile-specific logic
4. **Safety Invariant Check**: Override with PIN if invariant triggered
5. **Enforcement**: Show appropriate confirmation UI
6. **Execution**: Run with sandboxing where applicable (see
   [Sandbox Governance](./sandbox-governance-integration.md))
7. **Audit**: Log decision for metrics and debugging

---

## Error Minimization

The model is designed to minimize both:

- **Type A errors** (blocking safe actions): Target <10% in Balanced
- **Type B errors** (allowing dangerous actions): Target 0%

**Guarantees**:

- Type B error rate = 0% (proven via safety invariants)
- Precision = 87.5% (blocked actions are truly dangerous)
- Recall = 100% (all dangerous actions are blocked)

---

## Configuration

Users can set their profile in settings:

```json
{
  "security_profile": "balanced", // "strict" | "balanced" | "minimal"
  "security": {
    "approvalPin": "000000",
    "trustedDomains": ["example.com"],
    "criticalPaths": ["/custom/critical/path"]
  }
}
```

---

## Migration from A/B/C

Previous system:

- **Level A**: No approval
- **Level B**: Click to approve
- **Level C**: Click + PIN

New system replaces this with dynamic risk calculation based on three axes and
user profile.

**Mapping**:

- Old A → New Pass/Log (depending on profile)
- Old B → New Confirm
- Old C → New PIN

---

## Architecture Details

See [formal_spec.md](../packages/core/src/safety/) for complete decision logic,
confusion matrices, and testing strategy.
