# TermAI Integration Review Prompts

Three prompts for holistic integration review, verification, and deployment.

---

## Prompt 1: Holistic Integration Review

```
You are performing a holistic integration code review of TermAI, a fork of Gemini CLI.

## Context

Three parallel task execution streams have just completed:
1. **Horizon 1 Tasks** (`tasks_horizon1.md`) - Core CLI features: sessions, voice, web-remote, safety
2. **Frontend Tasks** (`tasks_frontend.md`) - Tauri desktop app with TUI parity
3. **Brain Tasks** (`tasks_brain.md`) - 6-dimensional risk assessment engine

## Your Mission

Review ALL uncommitted code (`git diff` and `git status`) against ALL three task files. Produce:

1. **Cross-Stream Integration Audit**
   - Do the three streams share types correctly?
   - Are there duplicate implementations of the same concept?
   - Do imports between packages resolve correctly?

2. **Task Completion Matrix**
   For each task in all three files, mark:
   - ✅ Complete and verified
   - ⚠️ Partial (explain what's missing)
   - ❌ Not implemented
   - 🔄 Conflicts with another task

3. **Integration Gaps**
   - Frontend ↔ CLI: Does `useCliProcess.ts` correctly parse CLI output format?
   - Brain ↔ Tools: Is `riskAssessor.ts` hooked into `shell.ts`?
   - Voice ↔ Frontend: Does the desktop app expose voice controls?

4. **Outstanding Tasks List**
   Create `tasks_outstanding.md` with:
   - Every incomplete item from the three task files
   - Every integration gap you discovered
   - Priority and effort estimate for each

## Commands to Run

```bash
# View all changes
git status
git diff --stat
git diff HEAD

# Check for type errors
npm run typecheck

# Check for lint errors
npm run lint

# View key files
cat tasks_horizon1.md | grep -E "^### Task|Status:"
cat tasks_frontend.md | grep -E "^### Task|Status:"
cat tasks_brain.md | grep -E "^### Task|Status:"
```

## Output Format

Create file: `tasks_outstanding.md` with the following structure:

```markdown
# Outstanding Tasks

## From Horizon 1
- [ ] Task X.Y: Description (original status: ⚠️ Partial)

## From Frontend
- [ ] Task X.Y: Description (original status: ❌ Not implemented)

## From Brain
- [ ] Task X.Y: Description (original status: ⚠️ Partial)

## Integration Gaps (NEW)
- [ ] INTg-1: Description of cross-stream issue
- [ ] INT-2: Another integration issue

## Conflicts to Resolve
- [ ] CONFLICT-1: Task A.1 and B.3 both define X differently
```

Be thorough. Miss nothing.
```

---

## Prompt 2: Second Pair of Eyes Verification

```
You are the second reviewer for TermAI's integration.

## Context

A previous review created `tasks_outstanding.md`. Your job is to:
1. Verify every claim in that file
2. Find issues the first reviewer missed
3. Prioritize the outstanding work

## Your Mission

### Phase 1: Verify the First Review

For each item in `tasks_outstanding.md`:
- Check if the task is truly incomplete (view the actual code)
- Check if the effort estimate is accurate
- Add any missing context

### Phase 2: Find What Was Missed

Run these specific checks:

```bash
# Check for orphaned imports
npm run typecheck 2>&1 | grep -i "cannot find"

# Check for console.log statements (remove before commit)
grep -r "console.log" packages/*/src --include="*.ts" --include="*.tsx" | grep -v test

# Check for TODO comments
grep -rn "TODO\|FIXME\|HACK\|XXX" packages/*/src --include="*.ts" --include="*.tsx"

# Check for missing tests
find packages/*/src -name "*.ts" ! -name "*.test.ts" -exec sh -c 'test=$(echo {} | sed "s/\.ts$/.test.ts/"); [ -f "$test" ] || echo "Missing test: $test"' \;

# Check for unused exports
npx ts-prune packages/core/src

# Verify package.json dependencies match imports
npm ls --all 2>&1 | grep -i "peer dep\|UNMET"
```

### Phase 3: Prioritize

Update `tasks_outstanding.md` with:
- `[P0]` for blockers (app won't run)
- `[P1]` for critical (feature broken)
- `[P2]` for important (degraded experience)
- `[P3]` for polish (nice to have)

### Phase 4: Estimate

Add effort estimates:
- `[1h]` trivial fix
- `[2-3h]` small task
- `[4-6h]` medium task
- `[8h+]` large task

## Output Format

Update `tasks_outstanding.md` in place with:
- Verification status for each item
- New items discovered
- Priority and effort tags
- A summary section at top with counts:
  - X P0 blockers
  - Y P1 critical
  - Z P2 important
  - W P3 polish
```

---

## Prompt 3: Deploy & Build Verification

```
You are preparing TermAI for deployment.

## Context

Code review is complete. Now verify the app actually builds and runs.

## Your Mission

### Phase 1: Clean Slate Build

```bash
# Clean everything
rm -rf node_modules packages/*/node_modules
rm -rf packages/*/dist packages/*/build
rm -rf packages/desktop/src-tauri/target

# Fresh install
npm ci

# Full build
npm run build

# Type check
npm run typecheck

# Lint
npm run lint

# Tests
npm run test:ci
```

Document every error. Fix trivial ones. Log others to `tasks_outstanding.md`.

### Phase 2: Manual Verification

Test each major feature:

```bash
# 1. CLI starts
cd packages/termai && npm start
# Ask: "What time is it?" (should respond)

# 2. Voice mode (if available)
# Enable with --voice flag, test push-to-talk

# 3. Sessions
# Ask: "Start a ticker that prints the time every second as 'ticker'"
# Then: "/sessions list"
# Then: "/sessions stop ticker"

# 4. Desktop app (if Tauri deps installed)
cd packages/desktop && npm run tauri dev
# Verify window opens
# Verify can type message
# Verify response appears

# 5. Web remote (if implemented)
cd packages/a2a-server && npm start
# Visit http://localhost:3000/ui
```

### Phase 3: Pre-Commit Cleanup

```bash
# Format all code
npm run format

# Remove console.logs
grep -rl "console.log" packages/*/src --include="*.ts" --include="*.tsx" | xargs sed -i '/console.log/d'

# Check nothing is broken
npm run preflight
```

### Phase 4: Final Checklist

Verify and check off:
- [ ] `npm run preflight` passes
- [ ] No TypeScript errors
- [ ] No ESLint errors
- [ ] All tests pass
- [ ] Desktop app builds (if applicable)
- [ ] CLI responds to basic queries
- [ ] No console.log statements in non-test code
- [ ] No TODO items without tracking

## Output

1. Update `tasks_outstanding.md` with any new issues found
2. Create `DEPLOYMENT_READY.md` when all checks pass, containing:
   - Build verification date
   - Test results summary
   - Known limitations
   - Next steps before release
```

---

## Usage

Run each prompt in sequence:
1. **Prompt 1** → Creates `tasks_outstanding.md`
2. **Prompt 2** → Refines and prioritizes it
3. **Prompt 3** → Builds, tests, and finalizes

After all three, you should have:
- A clean, building codebase
- A prioritized list of remaining work
- Confidence that nothing critical was missed
