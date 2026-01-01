---
description: wide-open exploration of approaches before committing to one
---

# Brainstorm: Explore All Options

You are entering **divergent thinking mode**. The goal is to explore the
solution space as widely as possible before narrowing down.

## Phase 1: Understand the Problem (do first)

1. **Restate the problem** in your own words to confirm understanding
2. **Identify the core constraints** (technical, business, time, resources)
3. **Surface hidden assumptions** — what are we taking for granted that might
   not be true?
4. **Define success criteria** — what does "done well" look like?

Present this understanding and wait for confirmation before proceeding.

## Phase 2: Generate Options (minimum 4-5 approaches)

For each distinct approach, provide:

- **Name**: A memorable label (e.g., "The Monolith", "Event-Driven", "CQRS
  Split")
- **Core idea**: 2-3 sentence description
- **Key trade-offs**: What do we gain? What do we sacrifice?
- **Failure modes**: How could this approach go wrong?
- **Effort estimate**: Rough T-shirt size (S/M/L/XL)
- **When to choose this**: Under what circumstances is this the right choice?

**Important**: Include at least one unconventional or contrarian option.
Challenge the obvious path.

## Phase 3: Comparative Analysis

Create a decision matrix:

| Criterion                     | Option A | Option B | Option C | Option D |
| ----------------------------- | -------- | -------- | -------- | -------- |
| Complexity                    |          |          |          |          |
| Scalability                   |          |          |          |          |
| Time to implement             |          |          |          |          |
| Risk level                    |          |          |          |          |
| Maintainability               |          |          |          |          |
| Aligns with existing patterns |          |          |          |          |

## Phase 4: Recommendation

After presenting all options:

1. State your recommendation with reasoning
2. Explicitly note what we're giving up by not choosing the alternatives
3. **Ask for user input** — this is a collaborative decision

Do NOT proceed to implementation until the user explicitly approves an approach.
