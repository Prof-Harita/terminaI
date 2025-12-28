# AGENTS.md — The TerminaI Agent Bible

> **Purpose:** Single source of truth for any AI agent working on this
> codebase  
> **Audience:** Jules, Codex, Antigravity, future agents  
> **Last Updated:** 2025-12-28

---

## 1. Project Identity

**TerminaI** is a fork of
[Google's Gemini CLI](https://github.com/google-gemini/gemini-cli) with AI agent
superpowers.

### What Makes Us Different

| Aspect           | Gemini CLI   | TerminaI                    |
| ---------------- | ------------ | --------------------------- |
| Config directory | `.gemini/`   | `.terminai/`                |
| Entry point      | `gemini.tsx` | `terminai.tsx`              |
| Branding         | "Gemini"     | "TerminaI"                  |
| Logger format    | JSON array   | JSONL (append-only)         |
| Voice mode       | None         | Full STT integration        |
| Evolution Lab    | None         | Adversarial testing harness |
| Target user      | Developers   | AI-native power users       |

### Golden Rule

> **Never break what makes TerminaI different from Gemini CLI.**

When in doubt, preserve our divergences. When upstream changes conflict with our
identity, we reimplement their _intent_, not their code.

---

## 2. Codebase Architecture

```
terminaI/
├── packages/
│   ├── cli/           # Main CLI application
│   │   ├── src/
│   │   │   ├── terminai.tsx      # OUR entry point (not gemini.tsx)
│   │   │   ├── voice/            # OUR voice mode addition
│   │   │   └── ui/               # React components
│   │   └── ...
│   ├── core/          # Shared logic
│   │   ├── src/
│   │   │   ├── core/
│   │   │   │   └── logger.ts     # OUR JSONL logger (diverged)
│   │   │   ├── tools/            # Agent tools
│   │   │   ├── mcp/              # MCP client
│   │   │   └── policy/           # Permission system
│   │   └── ...
│   ├── evolution-lab/  # OUR adversarial testing harness
│   └── ...
├── docs-terminai/      # OUR documentation (not upstream's docs/)
├── .upstream/          # Upstream sync artifacts
└── AGENTS.md           # THIS FILE
```

---

## 3. Zone Classification

Every file falls into one of three zones. **Memorize this.**

### 🟢 CORE — Merge Directly

Files we haven't modified. Upstream changes benefit us.

**Examples:**

- `packages/core/src/tools/*` — New tools are welcome
- `packages/core/src/mcp/*` — MCP improvements help us
- `packages/core/src/policy/*` — Policy engine updates
- Security fixes anywhere — Always prioritize

**Action:** Cherry-pick, merge, ship.

### 🟡 FORK — Reimplement Intent

Files we've diverged from upstream. **Never merge directly.**

| File                               | Our Divergence          | How to Handle Upstream Changes         |
| ---------------------------------- | ----------------------- | -------------------------------------- |
| `packages/core/src/core/logger.ts` | JSONL format            | Port the _intent_ to JSONL pattern     |
| `packages/cli/src/terminai.tsx`    | Renamed from gemini.tsx | Apply logic changes, keep our branding |
| `packages/cli/src/voice/*`         | TerminaI-only feature   | These files don't exist upstream       |
| `packages/evolution-lab/*`         | TerminaI-only feature   | These files don't exist upstream       |
| `.terminai/*` config               | Different from .gemini  | Keep our structure                     |
| `README.md`                        | TerminaI branding       | Never overwrite                        |
| `package.json` name                | `terminai-monorepo`     | Never change to gemini                 |

**Action:** Read upstream diff, understand the problem being solved, solve it
our way.

### ⚪ IRRELEVANT — Skip Completely

Files we don't want or need.

**Examples:**

- `clearcut/*`, `telemetry/*` — Google analytics (we don't use)
- `vscode-ide-companion/*` — IDE integration (not our focus)
- Seasonal themes, holiday animations
- Version bump commits
- Anything with "google internal" in the message

**Action:** Skip. Don't even mention.

---

## 4. Commands Reference

### Build & Test

```bash
# Install dependencies
npm ci

# Build all packages
npm run build

# Run full test suite (CI parity)
npm run test:ci

# Run linting (must pass before push)
npm run lint

# Format code
npx prettier --write .
```

### Git Operations

```bash
# Add upstream remote
git remote add upstream https://github.com/google-gemini/gemini-cli.git

# Fetch upstream
git fetch upstream

# See new commits since our last sync
git log --oneline HEAD..upstream/main

# Cherry-pick with reference
git cherry-pick -x <commit-hash>
```

---

## 5. Task Runbooks

### 5.1 Upstream Sync (Weekly)

**Trigger:** Issue titled `[Upstream Sync] Week of YYYY-MM-DD`

**Your mission:** Absorb upstream improvements while preserving TerminaI
identity.

#### Step 1: Fetch & Analyze

```bash
git remote add upstream https://github.com/google-gemini/gemini-cli.git 2>/dev/null || true
git fetch upstream
git log --oneline HEAD..upstream/main > /tmp/commits.txt
```

#### Step 2: Classify Each Commit

For each commit in the log:

1. Read the commit message and files changed
2. Classify as CORE, FORK, or IRRELEVANT using Section 3 above
3. Record in `.upstream/patches/YYYY-MM-DD/classification.md`

#### Step 3: Integrate CORE Commits

```bash
git checkout -b upstream-sync/YYYY-MM-DD
for each CORE commit:
    git cherry-pick -x <hash>
    # If conflict in CORE file: resolve and continue
    # If conflict in FORK file: skip cherry-pick, handle in Step 4
```

#### Step 4: Reimplement FORK Intent

For each FORK commit, ask yourself:

> "What problem is upstream solving? How do I solve it in our diverged code?"

**Example:**

Upstream changed `gemini.tsx` to improve error handling:

```diff
- catch (e) { console.error(e); }
+ catch (e) {
+   logger.error('Startup failed', { error: e });
+   process.exit(1);
+ }
```

In our `terminai.tsx`, apply the same improvement:

```typescript
// terminai.tsx - apply upstream's improved error handling
catch (e) {
  logger.error('TerminaI startup failed', { error: e });
  process.exit(1);
}
```

Note: We keep "TerminaI" branding but adopt the better pattern.

#### Step 5: Test & Lint

```bash
npm run test:ci
npm run lint
npx prettier --write .
```

Fix any failures. All tests must pass.

#### Step 6: Document

Create these files in `.upstream/patches/YYYY-MM-DD/`:

- `classification.md` — CORE/FORK/IRRELEVANT breakdown
- `commits.txt` — Raw commit list
- `release_notes.md` — Human-readable summary

#### Step 7: Open PR

```bash
git push origin upstream-sync/YYYY-MM-DD
```

Create PR with:

- Title: `[Upstream Sync] Week of YYYY-MM-DD`
- Body: Summary of changes + link to classification.md
- Assign: `@Prof-Harita`
- Labels: `upstream-sync`, `automated`

---

### 5.2 New Feature Development

**Trigger:** Issue describing a new feature

#### Before Writing Code

1. Read related files to understand existing patterns
2. Check if feature touches FORK zone files
3. If touching FORK files, document why in PR description

#### Code Standards

- TypeScript strict mode
- Use existing patterns from codebase
- Add tests for new functionality
- Update docs if user-facing

#### PR Requirements

- Descriptive title
- Link to issue
- Explanation of approach
- Test proof (paste test output)

---

### 5.3 Bug Fix

**Trigger:** Issue describing a bug

1. Reproduce the bug locally
2. Write a failing test that demonstrates the bug
3. Fix the bug
4. Verify test passes
5. Open PR with reproduction steps and fix explanation

---

## 6. FORK Reimplement Examples

### Example 1: Logger Enhancement

**Upstream change:**

```typescript
// logger.ts (upstream)
export class Logger {
  log(entry: LogEntry) {
    this.entries.push(entry); // They added metadata
    this.entries[this.entries.length - 1].timestamp = Date.now();
  }
}
```

**Our reimplementation:**

```typescript
// logger.ts (our JSONL version)
export class Logger {
  log(entry: LogEntry) {
    const enriched = { ...entry, timestamp: Date.now() };
    fs.appendFileSync(this.path, JSON.stringify(enriched) + '\n');
  }
}
```

Same _intent_ (add timestamp), different _implementation_ (JSONL append vs array
push).

### Example 2: Entry Point Change

**Upstream change to gemini.tsx:**

```typescript
// Added new CLI flag
if (args.includes('--experimental-feature')) {
  enableExperimentalFeature();
}
```

**Our reimplementation in terminai.tsx:**

```typescript
// Apply same flag to our entry point
if (args.includes('--experimental-feature')) {
  enableExperimentalFeature();
}
```

Same code because this doesn't touch branding — just copy it.

### Example 3: Branding-Sensitive Change

**Upstream change:**

```typescript
console.log('Welcome to Gemini CLI!');
```

**Our reimplementation:**

```typescript
console.log('Welcome to TerminaI!');
```

Same _intent_ (welcome message), our _branding_.

---

## 7. Quality Gates

Before any PR is opened:

- [ ] `npm run test:ci` passes
- [ ] `npm run lint` passes
- [ ] No "Gemini" branding in user-facing strings (use "TerminaI")
- [ ] No telemetry/clearcut code included
- [ ] FORK zone files not overwritten by upstream
- [ ] All imports resolve
- [ ] TypeScript compiles without errors

---

## 8. Communication

### PR Descriptions

Always include:

1. What this PR does (one sentence)
2. Why (link to issue or explain motivation)
3. How to test
4. Any risks or concerns

### Commit Messages

Format: `type(scope): message`

Examples:

- `feat(voice): add push-to-talk mode`
- `fix(logger): handle empty entries gracefully`
- `chore(upstream): absorb week of 2025-12-28`

---

## 9. Emergency Procedures

### If You Break Something

```bash
git revert <commit-hash>
git push
```

Then open an issue explaining what happened.

### If Tests Fail After Upstream Sync

1. Identify which commits caused failure
2. Revert those specific cherry-picks
3. Document in PR why they were reverted
4. Open follow-up issue for human to investigate

### If Unsure About Classification

Default to **FORK** (safer). It's better to reimplement than to accidentally
overwrite our code.

---

## 10. Reference Links

| Resource          | Location                                    |
| ----------------- | ------------------------------------------- |
| Fork zones detail | `docs-terminai/FORK_ZONES.md`               |
| Upstream strategy | `docs-terminai/upstream_maintenance.md`     |
| Absorption log    | `.upstream/absorption-log.md`               |
| Weekly patches    | `.upstream/patches/YYYY-MM-DD/`             |
| Upstream repo     | https://github.com/google-gemini/gemini-cli |

---

## Changelog

| Date       | Author      | Change                                        |
| ---------- | ----------- | --------------------------------------------- |
| 2025-12-28 | Antigravity | Complete rewrite as comprehensive agent bible |
