# Upstream Deep Scrub Rules

> **Purpose:** Rigorous analysis framework for upstream changes  
> **Philosophy:** Quality >> Speed >> Cost  
> **Last Updated:** 2026-01-20

---

## Core Principles

1. **Verification Before Claims** — Never mention a file, function, or pattern
   without verifying it exists
2. **Scope Anchoring** — Every classification references real commit hashes
3. **Uncertainty → QUARANTINE** — When unsure, escalate rather than guess
4. **Completeness Over Brevity** — A 50-page perfect plan beats a 5-page wrong
   one

---

## Phase 1: Structural Analysis

### Rule 1: New Subsystem Quarantine

If upstream adds a new directory under `packages/*/src/`:

- **Default Classification:** 🟡 QUARANTINE
- **Required Analysis:**
  - Does this overlap with existing TerminaI systems?
  - Does this introduce new user-facing consent mechanisms?
  - Does this add new LLM provider integrations?
  - Does this touch authentication or trust boundaries?
- **Output:** Detailed recommendation with rationale

### Rule 2: Overlap Detection Matrix

Check every upstream file against known CANON systems:

| If upstream touches...         | Check for overlap with...                                 |
| ------------------------------ | --------------------------------------------------------- |
| `**/auth/*`, `**/oauth/*`      | `openai_chatgpt/`, `auth/`, `mcp/token-storage/`          |
| `**/consent/*`, `**/trust/*`   | `safety/`, `approval-ladder/`, `config/settings/trust.ts` |
| `**/agents/*`                  | `brain/`, `a2a-server/`                                   |
| `**/config/*`, `**/settings/*` | `config/settings/*`, `builder.ts`                         |
| `**/providers/*`               | `providerTypes.ts`, `*ContentGenerator.ts`                |
| `**/scheduler/*`               | `core/coreToolScheduler.ts`, `brain/`                     |
| `**/sandbox/*`, `Dockerfile`   | `packages/sandbox-image/`, `sandboxConfig.ts` **(CANON)** |

**Verification Required:**

```bash
# Before claiming overlap, verify with grep
grep -r "relevant_term" packages/core/src/
```

### Rule 3: Import Chain Tracing

For every LEVERAGE file:

1. Extract all imports from the file
2. For each import targeting a new file → Classify that file first
3. For each import targeting a CANON file → Escalate to MANUAL review
4. Document the full dependency chain

```bash
# Trace imports
grep -E "^import|^export.*from" packages/core/src/path/to/file.ts
```

---

## Phase 2: Safety Analysis

### Rule 4: Safety Keyword Scan

Flag any file containing these terms for manual review:

**Trust/Auth Keywords:**

- `consent`, `trust`, `approve`, `confirm`, `authorize`
- `apiKey`, `token`, `credential`, `secret`, `password`
- `oauth`, `bearer`, `authentication`

**Risk Keywords:**

- `dangerous`, `destructive`, `sudo`, `root`, `admin`
- `bypass`, `override`, `skip`, `disable`

**Verification:**

```bash
grep -i "consent\|trust\|approve\|token\|credential" path/to/file.ts
```

### Rule 5: User-Facing String Branding

Scan for branding that needs replacement:

- "Gemini" in user-facing strings → Must rebrand to "TerminaI"
- "gemini-cli" in paths or names → Evaluate for update
- `.gemini` config references → Check against `.terminai`

### Rule 6: Security Fix Priority

Any commit with security implications gets special treatment:

**Detection Patterns:**

- `CVE-*` in commit message
- `security`, `vulnerability`, `exploit`, `injection` keywords
- Files in `safety/`, `policy/`, `approval-ladder/`
- Authentication or authorization changes

**Action:** ALWAYS evaluate for application, even in CANON zones. Security fixes
may need equivalent implementation in our diverged code.

---

## Phase 3: Architectural Impact

### Rule 7: Type Signature Analysis

For any `.ts` file being merged:

1. Extract all exported types, interfaces, and function signatures
2. Compare against current TerminaI version
3. Flag breaking changes:
   - New required parameters
   - Removed properties
   - Changed return types
   - Renamed exports

**Verification:**

```bash
# List exports
grep -E "^export (interface|type|function|class|const)" path/to/file.ts
```

### Rule 8: Test Compatibility

For any `.test.ts` file:

1. Check mock patterns against our `test-utils/`
2. Verify tests don't depend on modules we've replaced
3. Confirm test fixtures are compatible
4. Check for imports of renamed files

---

## Phase 4: Decision Matrix

| Condition                             | Zone          | Action                        |
| ------------------------------------- | ------------- | ----------------------------- |
| New directory under `packages/*/src/` | 🟡 QUARANTINE | Full analysis, human decision |
| Overlaps CANON system (verified)      | 🔴 CANON      | Reimplement intent            |
| Contains safety/consent keywords      | 🟡 MANUAL     | Detailed review required      |
| Security fix in any zone              | 🔴 EVALUATE   | Apply equivalent fix          |
| Type signature breaking change        | 🟡 MANUAL     | Compatibility analysis first  |
| Import chain touches CANON            | 🔴 CANON      | Cannot cleanly merge          |
| Clean file, no overlaps               | 🟢 LEVERAGE   | Cherry-pick directly          |
| Google-internal (telemetry, etc.)     | ⚪ SKIP       | Ignore                        |
| Version bump only                     | ⚪ SKIP       | Ignore                        |

---

## Drafter Agent Guardrails

### Grounding Requirements

1. **Before mentioning any file path** → Run `ls` or `find` to verify it exists
2. **Before claiming overlap** → Run `grep` to confirm the term appears
3. **Every classification** → Must reference a real commit hash from `git log`
4. **When uncertain** → Mark as QUARANTINE with explanation, don't guess

### Ordered Phases (Complete Each Fully Before Proceeding)

1. Read `.upstream/absorption-log.md` to get last synced hash
2. Fetch upstream: `git fetch upstream`
3. List commits: `git log {LAST_HASH}..upstream/main --oneline`
4. Classify ALL commits using this rule set
5. For each CANON commit: Write full architecture specification
6. For each architecture: Write complete atomic task list
7. Self-review the entire plan before submitting

### Quality Standards

- Take as long as needed for perfection
- Length is acceptable if accurate and complete
- Every claim must be verifiable
- When in doubt, provide more detail rather than less

---

## Red-Team Verification Checklist

The Red-Team agent will verify:

- [ ] All file paths mentioned actually exist
- [ ] All commit hashes are real and in the correct range
- [ ] All claimed overlaps are verified with grep output
- [ ] Architecture specs match current codebase structure
- [ ] Task lists have valid code snippets
- [ ] No hallucinated features or files
- [ ] Security implications properly flagged
- [ ] QUARANTINE items have clear rationale
