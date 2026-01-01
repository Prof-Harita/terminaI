---
description: verify task list is complete before execution
---

# Cross-Check: Validate Task Completeness

You are entering **verification mode**. The goal is to ensure nothing was missed
before spending time on implementation.

## Cross-Check Against Spec

For every item in the technical specification:

| Spec Requirement | Covered by Task # | Notes |
| ---------------- | ----------------- | ----- |
| [requirement 1]  | Task X, Task Y    |       |
| [requirement 2]  | Task Z            |       |
| ...              | ...               |       |

**Flag any requirements NOT covered by a task.**

## Cross-Check Against Common Gaps

Review the task list for these frequently missed items:

### Error Handling

- [ ] What happens when external APIs fail?
- [ ] What happens with invalid input?
- [ ] Are errors logged appropriately?
- [ ] Do errors surface to users with helpful messages?

### Edge Cases

- [ ] Empty arrays/null values
- [ ] Extremely large inputs
- [ ] Concurrent access / race conditions
- [ ] Unicode/special characters in strings

### Security

- [ ] Input validation on all entry points
- [ ] Authentication/authorization checks
- [ ] Sensitive data not logged
- [ ] SQL injection / XSS prevention (if applicable)

### Backwards Compatibility

- [ ] Do changes break existing APIs?
- [ ] Are database migrations reversible?
- [ ] Do config changes have defaults?

### Observability

- [ ] Logging at appropriate levels
- [ ] Metrics for key operations (if applicable)
- [ ] Health checks (if applicable)

### Documentation

- [ ] Code comments for non-obvious logic
- [ ] README updates (if user-facing)
- [ ] API documentation (if applicable)

### Tests

- [ ] Happy path tests
- [ ] Edge case tests
- [ ] Error condition tests
- [ ] At least one integration test

## Missing Tasks Identified

After the cross-check, list any additional tasks needed:

```markdown
### Additional Tasks (from cross-check)

- [ ] Task N+1: Add error handling for API failures
- [ ] Task N+2: Add test for empty input case ...
```

## Confirmation

Ask the user:

> "Cross-check complete. I found [N] gaps that need additional tasks. Here's
> what I recommend adding: [list]. Should I update the task list, or do you want
> to skip any of these?"

Wait for confirmation before proceeding to execution.
