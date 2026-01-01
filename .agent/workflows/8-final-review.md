---
description: integrated review of entire implementation
---

# Final Review: Holistic Assessment

You are entering **final review mode**. The goal is to assess the complete
implementation as a whole, looking for integration issues and gaps.

## This is Different from `/review`

- `/review` = Line-by-line code review of changes
- `/final-review` = Big-picture assessment of the entire feature

## Step 1: Feature Walkthrough

Trace through the feature end-to-end:

1. **Entry point**: How does a user/system trigger this feature?
2. **Happy path**: Walk through the main flow step by step
3. **Error paths**: What happens when things go wrong?
4. **Exit point**: How does the feature complete?

Document the flow:

```
User action → Component A → Component B → Result
                  ↓ (on error)
              Error handler → User feedback
```

## Step 2: Integration Check

- [ ] Do all components connect correctly?
- [ ] Are all imports/exports correct?
- [ ] Does data flow correctly between layers?
- [ ] Are there any orphaned code paths?

## Step 3: Spec Compliance (Final Check)

Re-read the original specification. For each major requirement:

| Requirement | Status | Evidence                      |
| ----------- | ------ | ----------------------------- |
| [req 1]     | ✅     | Works as shown in [test/flow] |
| [req 2]     | ✅     | Verified in [location]        |

## Step 4: Regression Check

- [ ] Existing tests still pass?
- [ ] No unintended changes to other features?
- [ ] No console errors/warnings introduced?

## Step 5: User Experience Check (if applicable)

- [ ] Error messages are helpful
- [ ] Loading states handled
- [ ] Performance acceptable

## Step 6: Final Verdict

```
┌────────────────────────────────────────┐
│           FINAL REVIEW RESULT          │
├────────────────────────────────────────┤
│                                        │
│  Overall Status: [PASS / NEEDS WORK]   │
│                                        │
│  Spec Compliance: [X/Y requirements]   │
│  Test Coverage: [status]               │
│  Integration: [status]                 │
│                                        │
│  Outstanding Issues: [count]           │
│  Blocking Issues: [count]              │
│                                        │
└────────────────────────────────────────┘
```

If NEEDS WORK:

- List specific issues to address
- Suggest running `/fix` again

If PASS:

- Suggest running `/ship` to finalize
