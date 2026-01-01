---
description: create detailed architecture and technical specification
---

# Architect: Design Before Code

You are entering **architecture mode**. The goal is to produce a comprehensive
technical specification that leaves no ambiguity for implementation.

## Prerequisites

- A chosen approach from `/brainstorm` or explicit user direction
- Clear understanding of constraints and success criteria

## Deliverable Structure

Create a single markdown document with the following sections:

---

### 1. Executive Summary (for business stakeholders)

- **What**: One paragraph on what we're building
- **Why**: The business value / problem solved
- **When**: High-level timeline estimate
- **Risk**: Top 1-2 risks and mitigations

_Keep this under 200 words. A non-technical person should understand it._

---

### 2. Architecture Overview

- **System diagram** (Mermaid or ASCII art)
- **Component responsibilities**: What each piece does
- **Data flow**: How information moves through the system
- **External dependencies**: APIs, services, databases

---

### 3. Technical Specification

For each component or module:

#### 3.1 [Component Name]

- **Purpose**: What problem does this solve?
- **Interface**:
  ```typescript
  // Exact function signatures, types, or API contracts
  ```
- **Behavior**:
  - Happy path description
  - Edge cases to handle
  - Error conditions and how to handle them
- **Dependencies**: What this component needs
- **Files affected**: List of files to create/modify

---

### 4. Data Models

```typescript
// All types, interfaces, database schemas
// Include field-level comments explaining purpose
```

---

### 5. Security Considerations

- Authentication/authorization requirements
- Data validation rules
- Sensitive data handling

---

### 6. Testing Strategy

- **Unit tests**: What to test at component level
- **Integration tests**: What to test across components
- **Manual verification**: Steps to verify it works

---

### 7. Migration / Rollout Plan (if applicable)

- Backward compatibility considerations
- Feature flags needed
- Rollback procedure

---

### 8. Open Questions

List anything that needs clarification before implementation.

---

## After Creating the Spec

1. Present a **summary over chat** (5-7 bullet points max)
2. Ask for feedback and refinements
3. Do NOT proceed to implementation until user approves the spec
