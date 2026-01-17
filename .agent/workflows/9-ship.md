---
description: cleanup, build, lint, and prepare for deployment
---

# Ship: Prepare for Deployment

You are entering **ship mode**. The goal is to finalize the implementation for
merge/deployment.

## Pre-Ship Checklist

// turbo-all

### 1.// turbo

3. Build the project: `turbo run build`
4. Run tests: `npm test`e without errors.

### 2. Full Test Suite

```bash
npm run test:ci
```

All tests must pass. Zero tolerance for failures.

### 3. Linting

```bash
npm run lint
```

Must pass. Fix any errors.

### 4. Formatting

```bash
npx prettier --write .
```

Apply consistent formatting.

### 5. Type Check (if not in build)

```bash
npm run check-types
```

No TypeScript errors.

## Code Cleanup

- [ ] Remove all `console.log` debugging statements
- [ ] Remove commented-out code (unless intentional)
- [ ] Remove unused imports
- [ ] Remove TODO comments that were addressed

## Documentation

- [ ] README updated (if user-facing changes)
- [ ] CHANGELOG entry added (if applicable)
- [ ] API docs updated (if applicable)

## Commit Preparation

Stage and review changes:

```bash
git status
git diff --staged
```

Verify only intended changes are included.

## Commit Message

Follow conventional commits:

```
type(scope): description

- Bullet points of major changes
- Reference issue numbers

Closes #XX
```

Types: `feat`, `fix`, `chore`, `docs`, `refactor`, `test`

## Final Status

```
┌────────────────────────────────────────┐
│            SHIP CHECKLIST              │
├────────────────────────────────────────┤
│  [✅/❌] Build passes                  │
│  [✅/❌] Tests pass                    │
│  [✅/❌] Lint passes                   │
│  [✅/❌] Formatted                     │
│  [✅/❌] Types check                   │
│  [✅/❌] Debug code removed            │
│  [✅/❌] Docs updated                  │
│  [✅/❌] Changes staged                │
├────────────────────────────────────────┤
│  Status: READY TO SHIP / NOT READY     │
└────────────────────────────────────────┘
```

## If Ready

Ask user:

> "All checks pass. Ready to commit and push. Proceed?"

If confirmed:

```bash
git commit -m "[message]"
git push
```
