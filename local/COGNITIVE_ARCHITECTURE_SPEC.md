# TerminaI Cognitive Architecture Specification

> **Version:** 1.0  
> **Last Updated:** 2025-12-25  
> **Status:** Draft for Review

---

## 1. Overview

TerminaI implements a **meta-cognitive routing layer** that selects the optimal
thinking framework and execution strategy based on task characteristics. The
goal: be smart from the first interaction, not after learning.

### Design Rationale: Why Over-Specify

We deliberately chose **heavy specification** over lightweight prompting
because:

| Under-specified                  | Over-specified           |
| -------------------------------- | ------------------------ |
| Fast but unreliable              | Slower but predictable   |
| 6 failed attempts before success | Smart from first attempt |
| User loses trust                 | User gains confidence    |

**Trade-offs accepted:**

- **Latency:** More LLM calls, longer prompts (acceptable)
- **Maintenance:** More code to maintain (manageable)

**Trade-offs avoided:**

- **Quality loss:** More guidance = more reliable
- **User frustration:** First impressions matter

_We can always simplify later. We cannot easily recover trust after garbage
experiences._

### Core Principles

1. **System Context First:** Know what's available before deciding how to act.
2. **Framework Selection:** Match thinking style to problem type.
3. **PAC Loops:** Plan-Act-Check with step-back on failure.
4. **Code as Thought:** Use REPLs/scripts for complex logic instead of shell
   sprawl.

---

## 2. System Specification Layer

### 2.1 Purpose

Capture machine capabilities **once** at init, refresh periodically. Inject into
every LLM call so it never attempts impossible actions.

### 2.2 Data Model

```typescript
interface SystemSpec {
  os: {
    name: string; // 'Ubuntu', 'macOS', 'Windows'
    version: string; // '22.04', '14.2', '11'
    arch: string; // 'x64', 'arm64'
  };
  shell: {
    type: 'bash' | 'zsh' | 'powershell' | 'fish';
    version: string;
  };
  runtimes: {
    node?: { version: string; npm: string };
    python?: { version: string; pip: boolean; venv: boolean };
    ruby?: { version: string };
    go?: { version: string };
    rust?: { version: string };
  };
  binaries: {
    [name: string]: { path: string; version?: string };
    // e.g., 'google-chrome', 'docker', 'git', 'libreoffice', 'pandoc'
  };
  packageManagers: ('apt' | 'brew' | 'dnf' | 'pacman' | 'choco')[];
  sudoAvailable: boolean;
  network: {
    hasInternet: boolean;
    proxy?: string;
  };
}
```

### 2.3 Implementation

| File                                          | Purpose                       |
| --------------------------------------------- | ----------------------------- |
| `packages/core/src/brain/systemSpec.ts`       | Scanner + data model          |
| `packages/core/src/brain/systemSpecPrompt.ts` | Format spec for LLM injection |

### 2.4 Refresh Strategy

- **On first boot:** Full scan, persist to `~/.terminai/system-spec.json`
- **On session start:** Load cached, check staleness (>24h = refresh)
- **Manual:** User command `/refresh-system`

---

## 3. Thinking Frameworks

### 3.1 Framework Taxonomy

| ID              | Name              | Trigger Pattern            | Mechanism                            |
| --------------- | ----------------- | -------------------------- | ------------------------------------ |
| `FW_DIRECT`     | Flyweight         | Trivial, single-tool tasks | One-shot execution                   |
| `FW_CONSENSUS`  | Parallel Advisors | Open-ended, multiple paths | 5 advisors propose → synthesize      |
| `FW_SEQUENTIAL` | Logic Chain       | Debugging, diagnosis       | Hypothesis → Test → Observe → Refine |
| `FW_DECOMPOSE`  | Structural        | Multi-file features        | Task tree → DFS execution            |
| `FW_REFLECT`    | Verificative      | Safety-critical code       | Generate → Critique → Refine         |
| `FW_SCRIPT`     | Code Thinker      | Complex data/logic         | Write throwaway script               |

### 3.2 Framework: Flyweight (FW_DIRECT)

**When:** Task maps 1:1 to a tool. No ambiguity.

**Examples:**

- "What's my IP?" → `curl ifconfig.me`
- "Turn on night light" → `gsettings set ...`

**Flow:**

```
User Request → Tool Selection → Execute → Return
```

**Implementation:** Default path, no special module needed.

---

### 3.3 Framework: Parallel Advisors (FW_CONSENSUS)

**When:** Open-ended task with multiple valid approaches.

**Examples:**

- "Convert docx to pdf"
- "Set up a REST API"

**The 5 Advisors:**

| Advisor            | Prompt Focus                                      | Output                 |
| ------------------ | ------------------------------------------------- | ---------------------- | ----- |
| **Enumerator**     | "List ALL possible approaches"                    | `Approach[]`           |
| **PatternMatcher** | "What's the industry best practice?"              | `Approach + rationale` |
| **DepScanner**     | "Given system spec, which approaches are viable?" | `FilteredApproach[]`   |
| **FallbackChain**  | "Rank by robustness and speed"                    | `RankedApproach[]`     |
| **CodeGenerator**  | "Could we write a script to solve this faster?"   | `Script                | null` |

**Flow:**

```
User Request
    ↓
[Parallel LLM calls to 5 advisors with system spec]
    ↓
Synthesis: Pick fastest viable approach with reasoning
    ↓
Execute via PAC loop
```

**Implementation:** | File | Purpose | |------|---------| |
`packages/core/src/brain/advisors/enumerator.ts` | Lists all approaches | |
`packages/core/src/brain/advisors/patternMatcher.ts` | Industry patterns | |
`packages/core/src/brain/advisors/depScanner.ts` | Filters by system spec | |
`packages/core/src/brain/advisors/fallbackChain.ts` | Ranks approaches | |
`packages/core/src/brain/advisors/codeGenerator.ts` | Proposes scripts | |
`packages/core/src/brain/consensus.ts` | Orchestrator |

---

### 3.4 Framework: Logic Chain (FW_SEQUENTIAL)

**When:** Debugging, diagnosis, unknown root cause.

**Examples:**

- "Why is my build failing?"
- "The API returns 500 sometimes"

**Flow (per step):**

```
1. Hypothesize: "The most likely cause is X"
2. Test: Execute diagnostic command
3. Observe: Analyze output
4. Decide: Confirmed? → Fix. Rejected? → Next hypothesis.
```

**Implementation:** | File | Purpose | |------|---------| |
`packages/core/src/brain/sequentialThinking.ts` | Chain orchestrator |

---

### 3.5 Framework: Structural (FW_DECOMPOSE)

**When:** Large, multi-part feature implementation.

**Examples:**

- "Add authentication to This app"
- "Build a dashboard with charts"

**Flow:**

```
User Request
    ↓
Decompose into task tree:
  └─ Task A (e.g., Design schema)
       └─ Subtask A1, A2
  └─ Task B (e.g., Implement API)
       └─ Subtask B1, B2
  └─ Task C (e.g., Build UI)
    ↓
Execute DFS with PAC loop per task
```

**Implementation:** | File | Purpose | |------|---------| |
`packages/core/src/brain/taskDecomposer.ts` | Already exists, enhance |

---

### 3.6 Framework: Verificative (FW_REFLECT)

**When:** High-stakes, correctness matters.

**Examples:**

- "Write a database migration"
- "Refactor the auth module"

**Flow:**

```
1. Generate: Produce initial solution
2. Critique: LLM reviews for bugs, edge cases, security
3. Refine: Address critique
4. Test: Run verification (tests, build)
```

**Implementation:** | File | Purpose | |------|---------| |
`packages/core/src/brain/reflectiveCritique.ts` | Generate-Critique-Refine loop
|

---

### 3.7 Framework: Code Thinker (FW_SCRIPT)

**When:** Complex logic that's easier to code than shell-pipe.

**Examples:**

- "Parse this JSON and extract all emails"
- "Calculate memory usage by process type"

**Flow:**

```
1. Write throwaway Python/Node script
2. Execute in REPL or as file
3. Return result
```

**Implementation:** | File | Purpose | |------|---------| |
`packages/core/src/brain/codeThinker.ts` | Script generation + execution | |
`packages/core/src/brain/replManager.ts` | Persistent REPL for session |

---

## 4. Framework Selector

### 4.1 Selection Logic

```typescript
function selectFramework(
  request: string,
  systemSpec: SystemSpec,
  conversationContext: Message[],
): FrameworkId {
  // Heuristic classification
  if (isTrivialTask(request)) return 'FW_DIRECT';
  if (isDebuggingTask(request)) return 'FW_SEQUENTIAL';
  if (isLargeFeature(request)) return 'FW_DECOMPOSE';
  if (isSafetyCritical(request)) return 'FW_REFLECT';
  if (isDataProcessing(request)) return 'FW_SCRIPT';
  return 'FW_CONSENSUS'; // Default: explore options
}
```

### 4.2 LLM-Assisted Classification

For ambiguous cases, ask the LLM:

```
Given this request: "{request}"
Which thinking framework is most appropriate?
- DIRECT: Simple, one-tool task
- CONSENSUS: Open-ended, multiple valid paths
- SEQUENTIAL: Debugging/diagnosis
- DECOMPOSE: Large multi-part feature
- REFLECT: Safety-critical, needs verification
- SCRIPT: Complex logic, better as code
```

**Implementation:** | File | Purpose | |------|---------| |
`packages/core/src/brain/frameworkSelector.ts` | Routing logic |

---

## 5. Execution Engine: PAC Loops

### 5.1 The Loop

```
PLAN → ACT → CHECK
  ↑         ↓
  └─ STEP-BACK (on 2x failure)
```

### 5.2 Step-Back Trigger

If `CHECK` fails twice consecutively for the same sub-goal:

1. Pause execution
2. Return to `FW_CONSENSUS` with remaining approaches
3. Select next best approach
4. Resume

### 5.3 Implementation

| File                                           | Purpose                      |
| ---------------------------------------------- | ---------------------------- |
| `packages/core/src/brain/pacLoop.ts`           | Plan-Act-Check orchestrator  |
| `packages/core/src/brain/stepBackEvaluator.ts` | Failure detection + recovery |

---

## 6. File Structure

```
packages/core/src/brain/
├── index.ts                    # Re-exports all
├── systemSpec.ts               # System capability scanner
├── systemSpecPrompt.ts         # Format for LLM injection
├── frameworkSelector.ts        # Routes to framework
├── pacLoop.ts                  # Execution engine
├── stepBackEvaluator.ts        # Failure recovery
├── advisors/
│   ├── enumerator.ts
│   ├── patternMatcher.ts
│   ├── depScanner.ts
│   ├── fallbackChain.ts
│   └── codeGenerator.ts
├── consensus.ts                # FW_CONSENSUS orchestrator
├── sequentialThinking.ts       # FW_SEQUENTIAL
├── reflectiveCritique.ts       # FW_REFLECT
├── codeThinker.ts              # FW_SCRIPT
└── replManager.ts              # Persistent REPL
```

---

## 7. Integration Points

### 7.1 Where Frameworks Hook In

The framework system integrates at the **tool execution layer**:

```
User Message
    ↓
geminiClient.generateContent()
    ↓
[Before tool execution] → frameworkSelector.selectFramework()
    ↓
Selected framework orchestrates tool calls
    ↓
PAC loop validates each step
```

### 7.2 System Spec Injection

System spec is injected into the **system prompt** for every LLM call:

```typescript
const systemPrompt = `
You are TerminaI...

## System Capabilities
${formatSystemSpec(cachedSystemSpec)}

## Available Frameworks
[Based on your next task, I will select the optimal thinking framework]
`;
```

---

## 8. Testing Strategy

| Test Type   | Coverage                                            |
| ----------- | --------------------------------------------------- |
| Unit        | Each advisor, framework selector, PAC loop          |
| Integration | Full flow: request → framework → execution → result |
| E2E         | "Convert docx to pdf" with mock system specs        |

---

## 9. Rollout Plan

1. **Phase 0:** Fix shell crash (P0 bug) ✓
2. **Phase 1:** Implement SystemSpec scanner
3. **Phase 2:** Implement Framework Selector + FW_DIRECT
4. **Phase 3:** Implement FW_CONSENSUS with 5 advisors
5. **Phase 4:** Implement PAC Loop + Step-Back
6. **Phase 5:** Implement remaining frameworks (Sequential, Reflect, Script)
7. **Phase 6:** E2E validation
