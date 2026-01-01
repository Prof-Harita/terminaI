---
description: break down spec into extremely detailed, sequenced tasks
---

# Tasks: Create Implementation Checklist

You are entering **task breakdown mode**. The goal is to create an
implementation plan so detailed that execution becomes mechanical.

## Prerequisites

- An approved technical specification from `/architect`
- Or explicit user direction on what to build

## Task Breakdown Principles

1. **Each task should take 5-30 minutes** — if longer, split it
2. **Tasks are ordered by dependency** — earlier tasks unblock later ones
3. **Each task is self-contained** — includes all context needed to execute
4. **No ambiguity** — a different person (or AI) should produce the same output

## Task Format

For each task, include:

````markdown
### Task [N]: [Short descriptive title]

**Objective**: One sentence on what this accomplishes

**Prerequisites**: Which tasks must be done first (if any)

**Files to modify**:

- `path/to/file.ts` — what changes

**Detailed steps**:

1. [Specific action with code snippet if helpful]
2. [Next action]
3. ...

**Code snippets** (if non-trivial):

```typescript
// Exact code to write or pattern to follow
```
````

**Definition of done**:

- [ ] Specific verifiable outcome
- [ ] Test command to run: `npm test -- path/to/file.test.ts`

**Potential issues**:

- [What could go wrong and how to handle it]

````

## Task Sequencing

Group tasks into phases:

### Phase 1: Foundation
- Data models, types, interfaces
- Core utilities

### Phase 2: Core Logic
- Main business logic
- Primary functions

### Phase 3: Integration
- Wiring components together
- API endpoints or UI hooks

### Phase 4: Polish
- Error handling improvements
- Edge cases
- Documentation

### Phase 5: Testing
- Unit tests
- Integration tests
- Manual verification

## Checklist Format

Create a checkable list at the top:

```markdown
## Implementation Checklist

### Phase 1: Foundation
- [ ] Task 1: Create data models
- [ ] Task 2: Add utility functions

### Phase 2: Core Logic
- [ ] Task 3: Implement main algorithm
- [ ] Task 4: Add validation

... etc
````

## After Creating Tasks

1. Present the checklist summary
2. Ask: "Does this sequence make sense? Any tasks missing?"
3. Wait for user confirmation before executing
