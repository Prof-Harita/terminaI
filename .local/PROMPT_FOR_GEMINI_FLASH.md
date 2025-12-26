# Execution Prompt for Gemini Flash: TerminaI Cognitive Architecture

## Your Role

You are **Gemini Flash**, tasked with implementing the TerminaI Cognitive
Architecture as a senior TypeScript engineer. You will work autonomously to
build the meta-cognitive routing layer that makes TerminaI intelligent from the
first interaction.

## Context

**Project:** TerminaI - An AI-powered CLI tool  
**Codebase:** `/home/profharita/Code/terminaI`  
**Your Task:** Implement the Cognitive Architecture defined in the
specifications below

## Critical Documents (Read These First)

1. **Architecture Specification:**  
   `file:///home/profharita/Code/terminaI/.local/COGNITIVE_ARCHITECTURE_SPEC.md`  
   This defines the WHAT: SystemSpec, 6 thinking frameworks, PAC loops,
   integration points.

2. **Task Breakdown:**  
   `file:///home/profharita/Code/terminaI/.local/tasks_cognitive_architecture.md`  
   This defines the HOW: 20+ granular tasks across 6 phases with file paths and
   verification steps.

3. **Existing Brain Module:**  
   `file:///home/profharita/Code/terminaI/packages/core/src/brain/`  
   Study the existing structure: `riskAssessor.ts`, `historyTracker.ts`,
   `taskDecomposer.ts`, etc.

## Execution Strategy

### Phase-by-Phase Approach

Work through the phases **sequentially**:

- **Phase 0:** Already complete (shell crash fix)
- **Phase 1:** System Specification Layer (START HERE)
- **Phase 2:** Framework Selector
- **Phase 3:** Consensus Framework
- **Phase 4:** PAC Loop
- **Phase 5:** Remaining Frameworks
- **Phase 6:** Integration & Testing

### Per-Task Protocol

For each task in `tasks_cognitive_architecture.md`:

1. **Read the task specification carefully**
   - Note the file path (NEW or existing)
   - Understand the action required
   - Review the verification step

2. **Study related code**
   - If modifying existing file: read it fully
   - If creating new file: examine similar files for patterns
   - Check imports and dependencies

3. **Implement the solution**
   - Follow existing code style (observe indentation, naming conventions,
     TypeScript patterns)
   - Add comprehensive JSDoc comments
   - Include error handling
   - Keep functions focused and testable

4. **Verify your work**
   - Run the verification command specified in the task
   - Fix any TypeScript errors
   - Ensure tests pass (or write tests if missing)

5. **Report progress**
   - Mark task as `[x]` in `tasks_cognitive_architecture.md`
   - Summarize what you implemented and any decisions made

## Code Quality Standards

### TypeScript Best Practices

```typescript
// ✅ Good: Clear types, error handling, documentation
/**
 * Scans the system for available capabilities.
 * @returns Complete system specification
 * @throws Error if critical capabilities cannot be detected
 */
async function scanSystem(): Promise<SystemSpec> {
  try {
    const os = await detectOS();
    const runtimes = await detectRuntimes();
    return { os, runtimes /* ... */ };
  } catch (error) {
    debugLogger.error('System scan failed', error);
    throw new Error('Failed to scan system capabilities');
  }
}

// ❌ Bad: No types, no error handling
async function scan() {
  const os = getOS();
  return os;
}
```

### File Organization

- **One responsibility per file**
- **Clear exports** (prefer named exports over default)
- **Minimal dependencies** (don't create circular imports)
- **Consistent naming:**
  - Files: `camelCase.ts`
  - Classes: `PascalCase`
  - Functions: `camelCase`
  - Constants: `UPPER_SNAKE_CASE`

### Testing Requirements

For each new module, create a corresponding test file:

- `systemSpec.ts` → `__tests__/systemSpec.test.ts`
- Use `vitest` (already configured in the project)
- Mock external dependencies (`child_process`, file I/O)
- Test both success and error cases

```typescript
// Example test structure
import { describe, it, expect, vi } from 'vitest';
import { scanSystem } from '../systemSpec.js';

describe('scanSystem', () => {
  it('should detect OS correctly', async () => {
    // Arrange: mock os.platform(), os.release()
    // Act: const spec = await scanSystem();
    // Assert: expect(spec.os.name).toBe('Ubuntu');
  });

  it('should handle missing binaries gracefully', async () => {
    // Test when 'which' returns empty
  });
});
```

## Integration Points (Critical)

### Where to Hook In

1. **System Spec Injection**
   - Load system spec on CLI startup
   - Inject into base system prompt (find where system prompt is built, likely
     in `packages/core/src/config/` or `packages/cli/src/`)
   - Cache in memory, refresh if stale

2. **Framework Selection**
   - Hook into the request processing pipeline **before** tool execution
   - Current flow: User message → LLM → Tool calls → Execute
   - New flow: User message → **Select Framework** → Framework orchestrates
     LLM/tools → Execute

3. **Tool Execution Wrapper**
   - Wrap tool execution with PAC loop
   - Current: `toolInvocation.execute()`
   - New:
     `pacLoop.execute(goal, successCriteria, () => toolInvocation.execute())`

### Files to Study for Integration

- `packages/core/src/core/coreToolScheduler.ts` - Tool execution orchestration
- `packages/cli/src/cli.ts` - CLI entry point
- `packages/core/src/config/config.ts` - Configuration and system setup

## LLM Interaction Guidelines

When implementing advisors that call LLMs:

```typescript
// Use the existing LLM client infrastructure
import type { GenerativeModelAdapter } from '../brain/index.js';

async function proposeApproach(
  task: string,
  systemSpec: SystemSpec,
  model: GenerativeModelAdapter,
): Promise<AdvisorProposal> {
  const prompt = `
Task: ${task}

System Capabilities:
${formatSystemSpec(systemSpec)}

What is the best approach? Respond with:
- Approach name
- Steps required
- Dependencies needed
- Estimated time (fast/medium/slow)
  `;

  const response = await model.generateContent(prompt);
  const text = response.response.text();

  // Parse response into structured AdvisorProposal
  return parseProposal(text);
}
```

## Common Pitfalls to Avoid

1. **Don't break existing functionality**
   - Run `npm run build` after major changes
   - Run `npm test` to ensure no regressions

2. **Don't create circular dependencies**
   - If A imports B and B imports A → refactor shared code into C

3. **Don't hardcode paths**
   - Use `config.getProjectRoot()`, not `/home/profharita/Code/terminaI`

4. **Don't ignore error cases**
   - What if `which libreoffice` fails?
   - What if file write fails?
   - What if LLM call times out?

5. **Don't skip documentation**
   - Every exported function needs JSDoc
   - Complex logic needs inline comments

## Verification Checklist (Before Marking Phase Complete)

- [ ] All files compile (`npm run build`)
- [ ] All tests pass (`npm test`)
- [ ] No TypeScript errors (`npm run type-check` if available)
- [ ] No lint errors (`npm run lint`)
- [ ] Code follows existing patterns in the codebase
- [ ] New modules are exported from `packages/core/src/brain/index.ts`
- [ ] Documentation is complete (JSDoc on public APIs)

## When You Need Help

If you encounter:

- **Ambiguous specifications:** Ask for clarification with specific questions
- **Architectural decisions:** Present 2-3 options with pros/cons, ask for
  preference
- **Blocking issues:** Report with: what you tried, what failed, what you need

## Success Criteria

The implementation is complete when:

1. **System Spec works:**
   - Can scan Ubuntu/macOS/Windows
   - Persists to `~/.terminai/system-spec.json`
   - Refreshes when stale

2. **Framework Selection works:**
   - Given "convert docx to pdf" → selects `FW_CONSENSUS`
   - Given "what's my IP" → selects `FW_DIRECT`
   - Given "why is build failing" → selects `FW_SEQUENTIAL`

3. **Consensus Framework works:**
   - All 5 advisors provide proposals
   - System spec filters impossible approaches
   - Fastest viable approach is selected with clear reasoning

4. **PAC Loop works:**
   - Executes plan → act → check
   - Triggers step-back after 2 consecutive failures
   - Returns to framework selector for alternative approach

5. **E2E Test passes:**
   - "Convert test.docx to pdf" using the new architecture
   - Should use Consensus → select mammoth+Chrome → succeed

## Start Here

Begin with **Phase 1, Task 1.1** in `tasks_cognitive_architecture.md`:

- Create `packages/core/src/brain/systemSpec.ts`
- Define the `SystemSpec` interface

Work methodically through each task. Update `tasks_cognitive_architecture.md` as
you go, marking completed tasks with `[x]`.

**Good luck, Gemini Flash. Build something intelligent.**
