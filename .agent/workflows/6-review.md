---
description: thorough code review with requirement traceability
---

# Review: Code Review with Traceability

You are entering **review mode**. The goal is to verify the implementation
matches the specification and identify any issues.

## Review Methodology

This is a **strict code review**. Act as a senior engineer who will block merge
if quality is insufficient.

## Step 1: Requirement Traceability

For every requirement in the specification, verify:

| Requirement | File:Line       | Status      | Notes             |
| ----------- | --------------- | ----------- | ----------------- |
| [req 1]     | `file.ts:42-58` | ✅ Complete |                   |
| [req 2]     | `file.ts:60-75` | ⚠️ Partial  | Missing edge case |
| [req 3]     | —               | ❌ Missing  | Not implemented   |

**Every requirement must map to code.** Flag anything missing.

## Step 2: Bug Hunt

Look for these specific issues:

### Logic Errors

- Off-by-one errors
- Incorrect conditionals
- Wrong operator (= vs ==, && vs ||)
- Variable shadowing
- Incorrect null/undefined handling

### Resource Issues

- Memory leaks (unclosed handles, listeners not removed)
- Missing cleanup in error paths
- Unbounded growth

### Async Issues

- Missing await
- Race conditions
- Unhandled promise rejections
- Deadlock potential

### Security Issues

- Unsanitized input
- Exposed secrets
- Missing authorization checks
- Injection vulnerabilities

## Step 3: Code Quality

Assess these dimensions:

- **Naming**: Are variables/functions clearly named?
- **Complexity**: Are functions too long? Too nested?
- **DRY**: Is there unnecessary duplication?
- **Error handling**: Are errors handled appropriately?
- **Comments**: Are complex parts explained?
- **Tests**: Is the test coverage adequate?

## Step 4: Output Format

Present findings in priority order:

### 🚨 Critical (must fix before merge)

1. [File:line] Description of issue and fix

### ⚠️ Important (should fix)

1. [File:line] Description of issue and fix

### 💡 Suggestions (nice to have)

1. [File:line] Description of improvement

### ✅ What's Good

- Note things that were done well

## Step 5: Outstanding Tasks

If issues are found, create a task list:

```markdown
## Outstanding Tasks (from review)

### Critical

- [ ] Fix: [description]

### Important

- [ ] Fix: [description]
```

## After Review

Ask the user:

> "Review complete. Found [N] critical, [M] important issues. Should I proceed
> to fix these, or do you want to review first?"
