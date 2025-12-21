# TermAI Brain — Cognitive Architecture Task List

> **Goal:** Upgrade TermAI's decision-making engine to be thoughtful, self-aware, and proportionally cautious.
>
> _"The agent should think hard about hard things, and not think at all about trivial things."_

This document contains **surgical, file-level tasks** for implementing the 6-Dimensional Risk Assessment Model and Proportional Execution Strategy.

---

## Context for Execution

### The 6-Dimensional Model

Every request is assessed across 6 dimensions before execution:

| # | Dimension | Question | Range |
|---|-----------|----------|-------|
| 1 | **Uniqueness** | How common is this type of ask? | 0-100 (0=very common) |
| 2 | **Complexity** | Is there a known framework/pattern? | 0-100 (0=scripted) |
| 3 | **Irreversibility** | Can we undo if this fails? | 0-100 (100=permanent) |
| 4 | **Consequences** | What else could break? | 0-100 (100=systemic) |
| 5 | **Confidence** | How sure is the agent? | 0-100 (100=certain) |
| 6 | **Environment** | Dev or Prod? | enum: dev/staging/prod/unknown |

### The Execution Flow

```
Request → Decompose (if multi-step) → Assess each step → Route to execution strategy
```

### Key Files to Create

```
packages/core/src/brain/
├── index.ts                    # Public API
├── riskAssessor.ts             # 6-dimension scorer
├── taskDecomposer.ts           # Multi-step parser
├── executionRouter.ts          # Decision matrix
├── environmentDetector.ts      # Dev/Prod classifier
├── historyTracker.ts           # Learning from outcomes
└── __tests__/
    ├── riskAssessor.test.ts
    ├── taskDecomposer.test.ts
    └── executionRouter.test.ts
```

### Required Reading

| Document | Path | Purpose |
|----------|------|---------|
| **Coding Standards** | `GEMINI.md` | TypeScript patterns |
| **Current Risk Classifier** | `packages/core/src/safety/` | What already exists |
| **Tool Execution** | `packages/core/src/tools/` | Where to hook in |

---

## Theme A: Risk Assessment Engine

> **Goal:** Score each request/command across the 6 dimensions.

### Task A.1: Dimension Scorer (Heuristic Layer)

**Status:** 🔲 Not Started
**Priority:** P0
**Effort:** Medium (4-6 hours)

**Description:**
Create fast heuristic scoring for the 4 primary dimensions (Uniqueness, Complexity, Irreversibility, Consequences). This layer handles 80% of cases without LLM.

**Files to Create:**

| Action | File | Changes |
|--------|------|---------|
| CREATE | `packages/core/src/brain/riskAssessor.ts` | Core scoring logic |
| CREATE | `packages/core/src/brain/patterns.ts` | Known patterns database |
| CREATE | `packages/core/src/brain/__tests__/riskAssessor.test.ts` | Unit tests |

**Implementation Details:**

```typescript
// packages/core/src/brain/riskAssessor.ts
export interface RiskDimensions {
  uniqueness: number;      // 0-100 (0 = very common)
  complexity: number;      // 0-100 (0 = scripted)
  irreversibility: number; // 0-100 (100 = permanent)
  consequences: number;    // 0-100 (100 = systemic)
  confidence: number;      // 0-100 (100 = certain)
  environment: 'dev' | 'staging' | 'prod' | 'unknown';
}

export interface RiskAssessment {
  dimensions: RiskDimensions;
  overallRisk: 'trivial' | 'normal' | 'elevated' | 'critical';
  reasoning: string;
  suggestedStrategy: 'fast-path' | 'preview' | 'iterate' | 'plan-snapshot';
}

// Heuristic patterns for quick classification
const COMMON_PATTERNS: Map<RegExp, Partial<RiskDimensions>> = new Map([
  // Trivial read-only commands
  [/^(ls|pwd|whoami|date|uptime|free|df|cat|head|tail|grep|find|which|echo)\b/, {
    uniqueness: 5, complexity: 5, irreversibility: 0, consequences: 0, confidence: 95
  }],
  
  // Network diagnostics
  [/^(ping|curl|wget|nslookup|dig|traceroute|netstat|ss)\b/, {
    uniqueness: 15, complexity: 10, irreversibility: 0, consequences: 5, confidence: 90
  }],
  
  // Package managers (reversible but consequential)
  [/^(npm|yarn|pip|apt|brew)\s+(install|add)\b/, {
    uniqueness: 10, complexity: 20, irreversibility: 30, consequences: 40, confidence: 85
  }],
  
  // Destructive patterns (high risk)
  [/\brm\s+(-rf?|--recursive)\b/, {
    uniqueness: 20, complexity: 15, irreversibility: 95, consequences: 80, confidence: 60
  }],
  
  // System modification
  [/^sudo\b/, {
    irreversibility: 70, consequences: 70, confidence: 50  // Modifiers, not absolutes
  }],
  
  // Disk operations (critical)
  [/\b(dd|mkfs|fdisk|parted)\b/, {
    uniqueness: 80, complexity: 60, irreversibility: 100, consequences: 100, confidence: 30
  }],
]);

export function assessRiskHeuristic(command: string): Partial<RiskDimensions> | null {
  for (const [pattern, dimensions] of COMMON_PATTERNS) {
    if (pattern.test(command)) {
      return dimensions;
    }
  }
  return null; // Unknown pattern, needs LLM
}

export function calculateOverallRisk(dimensions: RiskDimensions): RiskAssessment['overallRisk'] {
  // Weighted formula: irreversibility and consequences matter most
  const score = (
    dimensions.irreversibility * 0.35 +
    dimensions.consequences * 0.35 +
    dimensions.complexity * 0.15 +
    dimensions.uniqueness * 0.15
  ) * (1 - dimensions.confidence / 200); // Confidence reduces perceived risk
  
  if (score < 15) return 'trivial';
  if (score < 40) return 'normal';
  if (score < 70) return 'elevated';
  return 'critical';
}

export function selectStrategy(
  risk: RiskAssessment['overallRisk'],
  env: RiskDimensions['environment']
): RiskAssessment['suggestedStrategy'] {
  // Environment escalation
  const envMultiplier = env === 'prod' ? 1.5 : env === 'staging' ? 1.2 : 1;
  
  if (risk === 'trivial') return 'fast-path';
  if (risk === 'normal') return envMultiplier > 1.2 ? 'preview' : 'fast-path';
  if (risk === 'elevated') return 'preview';
  return 'plan-snapshot';
}
```

**Verification:**

```bash
npx vitest run packages/core/src/brain/__tests__/riskAssessor.test.ts
```

---

### Task A.2: LLM-Based Assessment (Fallback Layer)

**Status:** 🔲 Not Started
**Priority:** P0
**Effort:** Medium (4-6 hours)

**Description:**
For requests that don't match heuristic patterns, use LLM to assess the 6 dimensions.

**Files to Modify:**

| Action | File | Changes |
|--------|------|---------|
| MODIFY | `packages/core/src/brain/riskAssessor.ts` | Add LLM fallback |
| CREATE | `packages/core/src/brain/prompts/riskAssessment.ts` | Assessment prompt |

**Implementation Details:**

```typescript
// packages/core/src/brain/prompts/riskAssessment.ts
export const RISK_ASSESSMENT_PROMPT = `
You are assessing the risk of a user request. Score each dimension 0-100.

REQUEST: {request}
CONTEXT: {systemContext}

Respond in JSON only:
{
  "uniqueness": <0-100, how rare is this type of request>,
  "complexity": <0-100, is there a known framework or is this novel>,
  "irreversibility": <0-100, can the effects be undone>,
  "consequences": <0-100, what else could break>,
  "confidence": <0-100, how confident are you in this assessment>,
  "reasoning": "<one sentence explaining the assessment>"
}
`;
```

```typescript
// packages/core/src/brain/riskAssessor.ts (addition)
export async function assessRiskWithLLM(
  request: string,
  systemContext: string,
  model: GenerativeModel
): Promise<RiskDimensions & { reasoning: string }> {
  const prompt = RISK_ASSESSMENT_PROMPT
    .replace('{request}', request)
    .replace('{systemContext}', systemContext);
  
  const result = await model.generateContent(prompt);
  const json = JSON.parse(result.response.text());
  
  return {
    uniqueness: clamp(json.uniqueness, 0, 100),
    complexity: clamp(json.complexity, 0, 100),
    irreversibility: clamp(json.irreversibility, 0, 100),
    consequences: clamp(json.consequences, 0, 100),
    confidence: clamp(json.confidence, 0, 100),
    environment: 'unknown', // Filled by detector
    reasoning: json.reasoning,
  };
}

export async function assessRisk(
  request: string,
  command: string | null,
  systemContext: string,
  model: GenerativeModel
): Promise<RiskAssessment> {
  // Try heuristic first
  const heuristic = command ? assessRiskHeuristic(command) : null;
  
  if (heuristic && heuristic.confidence && heuristic.confidence > 80) {
    // High-confidence heuristic match
    const dimensions: RiskDimensions = {
      uniqueness: heuristic.uniqueness ?? 50,
      complexity: heuristic.complexity ?? 50,
      irreversibility: heuristic.irreversibility ?? 50,
      consequences: heuristic.consequences ?? 50,
      confidence: heuristic.confidence,
      environment: detectEnvironment(),
    };
    return {
      dimensions,
      overallRisk: calculateOverallRisk(dimensions),
      reasoning: 'Matched known pattern',
      suggestedStrategy: selectStrategy(calculateOverallRisk(dimensions), dimensions.environment),
    };
  }
  
  // Fallback to LLM
  const llmResult = await assessRiskWithLLM(request, systemContext, model);
  const dimensions: RiskDimensions = {
    ...llmResult,
    environment: detectEnvironment(),
  };
  return {
    dimensions,
    overallRisk: calculateOverallRisk(dimensions),
    reasoning: llmResult.reasoning,
    suggestedStrategy: selectStrategy(calculateOverallRisk(dimensions), dimensions.environment),
  };
}
```

**Verification:**

```bash
npx vitest run packages/core/src/brain/__tests__/riskAssessor.test.ts
```

---

## Theme B: Task Decomposition

> **Goal:** Break multi-step requests into individually assessable steps.

### Task B.1: Step Parser

**Status:** 🔲 Not Started
**Priority:** P0
**Effort:** Medium (4-6 hours)

**Description:**
For complex requests, decompose into steps and assess each step's risk independently.

**Files to Create:**

| Action | File | Changes |
|--------|------|---------|
| CREATE | `packages/core/src/brain/taskDecomposer.ts` | Step extraction |
| CREATE | `packages/core/src/brain/__tests__/taskDecomposer.test.ts` | Tests |

**Implementation Details:**

```typescript
// packages/core/src/brain/taskDecomposer.ts
export interface TaskStep {
  id: string;
  description: string;
  estimatedCommand?: string;
  dependsOn: string[];  // IDs of prerequisite steps
}

export interface DecomposedTask {
  originalRequest: string;
  steps: TaskStep[];
  isMultiStep: boolean;
}

export const DECOMPOSITION_PROMPT = `
Analyze this request and break it into executable steps.

REQUEST: {request}

If this is a single atomic action, return a single step.
If this requires multiple actions, break it down.

Respond in JSON only:
{
  "steps": [
    {
      "id": "step-1",
      "description": "What this step does",
      "estimatedCommand": "the shell command if applicable",
      "dependsOn": []
    }
  ]
}
`;

export async function decomposeTask(
  request: string,
  model: GenerativeModel
): Promise<DecomposedTask> {
  // Quick check: if request looks atomic, skip LLM
  const atomicPatterns = [
    /^(what|show|list|check|find|get|tell me)\b/i,  // Read operations
    /^(run|execute|start|stop)\s+\S+$/i,             // Single command
  ];
  
  if (atomicPatterns.some(p => p.test(request))) {
    return {
      originalRequest: request,
      steps: [{
        id: 'step-1',
        description: request,
        dependsOn: [],
      }],
      isMultiStep: false,
    };
  }
  
  // Use LLM for complex requests
  const prompt = DECOMPOSITION_PROMPT.replace('{request}', request);
  const result = await model.generateContent(prompt);
  const json = JSON.parse(result.response.text());
  
  return {
    originalRequest: request,
    steps: json.steps,
    isMultiStep: json.steps.length > 1,
  };
}
```

**Verification:**

```bash
npx vitest run packages/core/src/brain/__tests__/taskDecomposer.test.ts
```

---

### Task B.2: Per-Step Risk Propagation

**Status:** 🔲 Not Started
**Priority:** P1
**Effort:** Easy (2-3 hours)

**Description:**
Assess each step and propagate risk — the overall task inherits the highest-risk step.

**Files to Modify:**

| Action | File | Changes |
|--------|------|---------|
| MODIFY | `packages/core/src/brain/taskDecomposer.ts` | Add risk aggregation |

**Implementation Details:**

```typescript
// packages/core/src/brain/taskDecomposer.ts (addition)
export interface AssessedStep extends TaskStep {
  assessment: RiskAssessment;
}

export interface AssessedTask extends DecomposedTask {
  assessedSteps: AssessedStep[];
  aggregateRisk: RiskAssessment['overallRisk'];
  highestRiskStep: string;  // ID of the step that drives aggregate risk
}

export async function assessDecomposedTask(
  task: DecomposedTask,
  systemContext: string,
  model: GenerativeModel
): Promise<AssessedTask> {
  const assessedSteps: AssessedStep[] = [];
  
  for (const step of task.steps) {
    const assessment = await assessRisk(
      step.description,
      step.estimatedCommand ?? null,
      systemContext,
      model
    );
    assessedSteps.push({ ...step, assessment });
  }
  
  // Aggregate: take the max risk
  const riskLevels = { trivial: 0, normal: 1, elevated: 2, critical: 3 };
  let maxRisk: RiskAssessment['overallRisk'] = 'trivial';
  let highestRiskStep = assessedSteps[0]?.id ?? '';
  
  for (const step of assessedSteps) {
    if (riskLevels[step.assessment.overallRisk] > riskLevels[maxRisk]) {
      maxRisk = step.assessment.overallRisk;
      highestRiskStep = step.id;
    }
  }
  
  return {
    ...task,
    assessedSteps,
    aggregateRisk: maxRisk,
    highestRiskStep,
  };
}
```

**Verification:**

```typescript
// Test: "Set up dev environment" should decompose and flag DB migration as highest risk
```

---

## Theme C: Execution Router

> **Goal:** Route assessed tasks to the appropriate execution strategy.

### Task C.1: Strategy Router

**Status:** 🔲 Not Started
**Priority:** P0
**Effort:** Medium (4-6 hours)

**Description:**
Given a risk assessment, determine the execution strategy and apply it.

**Files to Create:**

| Action | File | Changes |
|--------|------|---------|
| CREATE | `packages/core/src/brain/executionRouter.ts` | Strategy routing |
| MODIFY | `packages/core/src/tools/shell.ts` | Hook in router |

**Implementation Details:**

```typescript
// packages/core/src/brain/executionRouter.ts
export type ExecutionStrategy = 
  | { type: 'fast-path' }
  | { type: 'preview'; preview: string }
  | { type: 'iterate'; maxRetries: number }
  | { type: 'plan-snapshot'; plan: string; snapshotId?: string };

export interface ExecutionDecision {
  strategy: ExecutionStrategy;
  requiresConfirmation: boolean;
  confirmationMessage?: string;
  shouldWarn: boolean;
  warningMessage?: string;
}

export function routeExecution(assessment: RiskAssessment): ExecutionDecision {
  const { overallRisk, dimensions, reasoning } = assessment;
  
  switch (overallRisk) {
    case 'trivial':
      return {
        strategy: { type: 'fast-path' },
        requiresConfirmation: false,
        shouldWarn: false,
      };
    
    case 'normal':
      return {
        strategy: { type: 'preview', preview: '' },  // Filled by caller
        requiresConfirmation: dimensions.environment === 'prod',
        shouldWarn: false,
      };
    
    case 'elevated':
      return {
        strategy: { type: 'iterate', maxRetries: 3 },
        requiresConfirmation: true,
        confirmationMessage: `This action has elevated risk. ${reasoning}`,
        shouldWarn: true,
        warningMessage: `⚠️ Elevated risk: ${reasoning}`,
      };
    
    case 'critical':
      return {
        strategy: { type: 'plan-snapshot', plan: '' },
        requiresConfirmation: true,
        confirmationMessage: buildCriticalConfirmation(dimensions, reasoning),
        shouldWarn: true,
        warningMessage: `🔴 CRITICAL: ${reasoning}`,
      };
  }
}

function buildCriticalConfirmation(
  dimensions: RiskDimensions,
  reasoning: string
): string {
  const lines = [
    '⚠️  CRITICAL OPERATION',
    '',
    `Risk Assessment: ${reasoning}`,
    '',
    '📊 Dimension Scores:',
    `  • Irreversibility: ${dimensions.irreversibility}%`,
    `  • Consequences: ${dimensions.consequences}%`,
    `  • Confidence: ${dimensions.confidence}%`,
    '',
  ];
  
  if (dimensions.irreversibility > 80) {
    lines.push('❌ This action may NOT be reversible.');
  }
  if (dimensions.consequences > 70) {
    lines.push('⚡ This action may affect system stability.');
  }
  if (dimensions.confidence < 60) {
    lines.push('❓ The agent is uncertain about this approach.');
  }
  
  lines.push('', 'Proceed? [y/N]');
  
  return lines.join('\n');
}
```

**Verification:**

```bash
npx vitest run packages/core/src/brain/__tests__/executionRouter.test.ts
```

---

## Theme D: Epistemic Humility

> **Goal:** Make the agent aware of its own uncertainty.

### Task D.1: Confidence-Triggered Behaviors

**Status:** 🔲 Not Started
**Priority:** P0
**Effort:** Medium (3-4 hours)

**Description:**
When confidence is low, the agent should ask clarifying questions or run diagnostics before acting.

**Files to Create:**

| Action | File | Changes |
|--------|------|---------|
| CREATE | `packages/core/src/brain/confidenceHandler.ts` | Confidence-based routing |

**Implementation Details:**

```typescript
// packages/core/src/brain/confidenceHandler.ts
export interface ConfidenceAction {
  type: 'proceed' | 'narrate-uncertainty' | 'diagnostic-first' | 'ask-clarification';
  message?: string;
  diagnosticCommand?: string;
  clarificationQuestion?: string;
}

export function handleConfidence(confidence: number, context: string): ConfidenceAction {
  if (confidence >= 90) {
    return { type: 'proceed' };
  }
  
  if (confidence >= 70) {
    return {
      type: 'narrate-uncertainty',
      message: "I'm fairly confident this is the right approach, but let me verify as we go...",
    };
  }
  
  if (confidence >= 50) {
    // Generate a diagnostic command based on context
    const diagnostic = suggestDiagnostic(context);
    return {
      type: 'diagnostic-first',
      message: "Before proceeding, let me gather more information.",
      diagnosticCommand: diagnostic,
    };
  }
  
  // Low confidence: ask for help
  return {
    type: 'ask-clarification',
    clarificationQuestion: generateClarifyingQuestion(context),
  };
}

function suggestDiagnostic(context: string): string {
  // Simple heuristics for common diagnostics
  if (context.includes('network') || context.includes('wifi')) {
    return 'ip addr && ping -c 1 8.8.8.8';
  }
  if (context.includes('disk') || context.includes('storage')) {
    return 'df -h && du -sh /* 2>/dev/null | sort -hr | head -10';
  }
  if (context.includes('memory') || context.includes('ram')) {
    return 'free -h && ps aux --sort=-%mem | head -10';
  }
  if (context.includes('process') || context.includes('cpu')) {
    return 'top -bn1 | head -15';
  }
  return 'echo "System context needed"';
}

function generateClarifyingQuestion(context: string): string {
  // LLM could generate this, but for now use templates
  return `I'm not sure I understand completely. Could you clarify what you mean by "${context.slice(0, 50)}..."?`;
}
```

**Verification:**

```bash
npx vitest run packages/core/src/brain/__tests__/confidenceHandler.test.ts
```

---

## Theme E: Environment Detection

> **Goal:** Detect if this is a dev laptop or production server.

### Task E.1: Environment Classifier

**Status:** 🔲 Not Started
**Priority:** P1
**Effort:** Easy (2-3 hours)

**Description:**
Probe the system to classify environment as dev/staging/prod.

**Files to Create:**

| Action | File | Changes |
|--------|------|---------|
| CREATE | `packages/core/src/brain/environmentDetector.ts` | Environment detection |

**Implementation Details:**

```typescript
// packages/core/src/brain/environmentDetector.ts
import { execSync } from 'child_process';
import * as os from 'os';
import * as fs from 'fs';

export type Environment = 'dev' | 'staging' | 'prod' | 'unknown';

interface EnvironmentSignals {
  hostname: string;
  hasDocker: boolean;
  dockerContainers: string[];
  hasNginx: boolean;
  hasSystemd: boolean;
  nodeEnv: string | undefined;
  user: string;
}

function gatherSignals(): EnvironmentSignals {
  const hostname = os.hostname().toLowerCase();
  const hasDocker = fs.existsSync('/var/run/docker.sock');
  
  let dockerContainers: string[] = [];
  if (hasDocker) {
    try {
      const output = execSync('docker ps --format "{{.Names}}"', { timeout: 5000 }).toString();
      dockerContainers = output.split('\n').filter(Boolean);
    } catch {
      // Docker might be stopped or inaccessible
    }
  }
  
  return {
    hostname,
    hasDocker,
    dockerContainers,
    hasNginx: fs.existsSync('/etc/nginx/sites-enabled'),
    hasSystemd: fs.existsSync('/run/systemd/system'),
    nodeEnv: process.env.NODE_ENV,
    user: os.userInfo().username,
  };
}

export function detectEnvironment(): Environment {
  const signals = gatherSignals();
  
  // Strong prod signals
  if (signals.hostname.includes('prod') || signals.hostname.includes('prd')) return 'prod';
  if (signals.dockerContainers.some(c => c.includes('prod'))) return 'prod';
  if (signals.nodeEnv === 'production') return 'prod';
  if (signals.user === 'www-data' || signals.user === 'nginx') return 'prod';
  
  // Strong dev signals
  if (signals.hostname.includes('dev') || signals.hostname.includes('local')) return 'dev';
  if (signals.hostname.includes('laptop') || signals.hostname.includes('macbook')) return 'dev';
  if (signals.nodeEnv === 'development') return 'dev';
  if (process.env.HOME?.includes('/Users/')) return 'dev'; // macOS user
  
  // Staging signals
  if (signals.hostname.includes('staging') || signals.hostname.includes('stg')) return 'staging';
  
  // Server-like but not explicitly prod
  if (signals.hasNginx && signals.hasSystemd && !signals.hostname.includes('dev')) {
    return 'prod'; // Assume prod if it looks like a server
  }
  
  return 'unknown';
}

export function getCeremonyMultiplier(env: Environment): number {
  switch (env) {
    case 'dev': return 1.0;
    case 'staging': return 1.3;
    case 'prod': return 1.8;
    case 'unknown': return 1.5; // Be cautious
  }
}
```

**Verification:**

```bash
npx vitest run packages/core/src/brain/__tests__/environmentDetector.test.ts
```

---

## Theme F: Historical Learning

> **Goal:** Learn from past outcomes to adjust future confidence.

### Task F.1: Outcome Logger

**Status:** 🔲 Not Started
**Priority:** P1
**Effort:** Easy (2-3 hours)

**Description:**
Log the outcome of each action to `~/.termai/history.jsonl`.

**Files to Create:**

| Action | File | Changes |
|--------|------|---------|
| CREATE | `packages/core/src/brain/historyTracker.ts` | Outcome logging |

**Implementation Details:**

```typescript
// packages/core/src/brain/historyTracker.ts
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

export interface ActionOutcome {
  timestamp: string;
  request: string;
  command?: string;
  assessedRisk: string;
  actualOutcome: 'success' | 'failure' | 'cancelled';
  userApproved: boolean;
  errorMessage?: string;
}

const HISTORY_FILE = path.join(os.homedir(), '.termai', 'history.jsonl');

export function logOutcome(outcome: ActionOutcome): void {
  const dir = path.dirname(HISTORY_FILE);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  
  fs.appendFileSync(HISTORY_FILE, JSON.stringify(outcome) + '\n');
  
  // Keep last 1000 entries
  pruneHistory(1000);
}

function pruneHistory(maxEntries: number): void {
  if (!fs.existsSync(HISTORY_FILE)) return;
  
  const lines = fs.readFileSync(HISTORY_FILE, 'utf-8').split('\n').filter(Boolean);
  if (lines.length > maxEntries) {
    const trimmed = lines.slice(-maxEntries);
    fs.writeFileSync(HISTORY_FILE, trimmed.join('\n') + '\n');
  }
}

export function getRecentOutcomes(count: number = 50): ActionOutcome[] {
  if (!fs.existsSync(HISTORY_FILE)) return [];
  
  const lines = fs.readFileSync(HISTORY_FILE, 'utf-8').split('\n').filter(Boolean);
  return lines.slice(-count).map(line => JSON.parse(line));
}
```

**Verification:**

```bash
npx vitest run packages/core/src/brain/__tests__/historyTracker.test.ts
```

---

### Task F.2: Confidence Adjustment

**Status:** 🔲 Not Started
**Priority:** P2
**Effort:** Medium (3-4 hours)

**Description:**
Adjust confidence based on past outcomes for similar actions.

**Files to Modify:**

| Action | File | Changes |
|--------|------|---------|
| MODIFY | `packages/core/src/brain/historyTracker.ts` | Add pattern matching |
| MODIFY | `packages/core/src/brain/riskAssessor.ts` | Incorporate history |

**Implementation Details:**

```typescript
// packages/core/src/brain/historyTracker.ts (addition)
export interface HistoricalContext {
  similarSuccesses: number;
  similarFailures: number;
  confidenceAdjustment: number;  // -20 to +20
  reasoning: string;
}

export function getHistoricalContext(command: string): HistoricalContext {
  const outcomes = getRecentOutcomes(100);
  
  // Find similar commands (simple prefix matching)
  const commandPrefix = command.split(' ').slice(0, 2).join(' ');
  const similar = outcomes.filter(o => 
    o.command?.startsWith(commandPrefix)
  );
  
  const successes = similar.filter(o => o.actualOutcome === 'success').length;
  const failures = similar.filter(o => o.actualOutcome === 'failure').length;
  
  let adjustment = 0;
  let reasoning = '';
  
  if (similar.length >= 3) {
    const successRate = successes / similar.length;
    if (successRate > 0.8) {
      adjustment = 15;
      reasoning = `Similar command succeeded ${successes}/${similar.length} times recently`;
    } else if (successRate < 0.5) {
      adjustment = -15;
      reasoning = `Similar command failed ${failures}/${similar.length} times recently`;
    }
  }
  
  return {
    similarSuccesses: successes,
    similarFailures: failures,
    confidenceAdjustment: adjustment,
    reasoning,
  };
}
```

**Verification:**

```bash
# Test: After 3 successful "docker prune" runs, confidence should increase
```

---

## Theme G: Integration

> **Goal:** Wire the brain into the existing tool execution flow.

### Task G.1: Hook into Shell Tool

**Status:** 🔲 Not Started
**Priority:** P0
**Effort:** Medium (4-6 hours)

**Description:**
Modify the shell tool to run commands through the brain's assessment.

**Files to Modify:**

| Action | File | Changes |
|--------|------|---------|
| MODIFY | `packages/core/src/tools/shell.ts` | Add brain integration |
| CREATE | `packages/core/src/brain/index.ts` | Public API |

**Implementation Details:**

```typescript
// packages/core/src/brain/index.ts
export { assessRisk, RiskAssessment, RiskDimensions } from './riskAssessor.js';
export { decomposeTask, assessDecomposedTask } from './taskDecomposer.js';
export { routeExecution, ExecutionDecision } from './executionRouter.js';
export { handleConfidence } from './confidenceHandler.js';
export { detectEnvironment, getCeremonyMultiplier } from './environmentDetector.js';
export { logOutcome, getHistoricalContext } from './historyTracker.js';
```

```typescript
// packages/core/src/tools/shell.ts (modification sketch)
import { assessRisk, routeExecution, handleConfidence, logOutcome } from '../brain/index.js';

// Before executing command:
const assessment = await assessRisk(userRequest, command, systemContext, model);
const decision = routeExecution(assessment);
const confidenceAction = handleConfidence(assessment.dimensions.confidence, userRequest);

if (confidenceAction.type === 'ask-clarification') {
  // Return early, ask user
  return { needsClarification: true, question: confidenceAction.clarificationQuestion };
}

if (decision.requiresConfirmation) {
  // Show confirmation with decision.confirmationMessage
}

// After execution:
logOutcome({
  timestamp: new Date().toISOString(),
  request: userRequest,
  command,
  assessedRisk: assessment.overallRisk,
  actualOutcome: exitCode === 0 ? 'success' : 'failure',
  userApproved: true,
  errorMessage: exitCode !== 0 ? stderr : undefined,
});
```

**Verification:**

```bash
npm run preflight
# Manual test: run "rm -rf /tmp/test" and verify confirmation appears
```

---

## Task Priority Matrix

| Priority | Task | Effort | Dependencies |
|----------|------|--------|--------------|
| P0 | A.1 Dimension Scorer (Heuristic) | Medium | None |
| P0 | A.2 LLM-Based Assessment | Medium | A.1 |
| P0 | B.1 Step Parser | Medium | None |
| P0 | C.1 Strategy Router | Medium | A.1 |
| P0 | D.1 Confidence Handler | Medium | A.1 |
| P0 | G.1 Shell Tool Integration | Medium | All above |
| P1 | B.2 Per-Step Risk Propagation | Easy | B.1 |
| P1 | E.1 Environment Classifier | Easy | None |
| P1 | F.1 Outcome Logger | Easy | None |
| P2 | F.2 Confidence Adjustment | Medium | F.1 |

---

## Success Criteria

- [ ] Trivial commands (ls, pwd, free) execute immediately without confirmation
- [ ] Normal commands show brief preview before execution
- [ ] Critical commands show full risk assessment and require explicit approval
- [ ] Low-confidence situations trigger clarifying questions
- [ ] Environment detection correctly identifies dev vs prod
- [ ] Action outcomes are logged to history
- [ ] Past outcomes influence future confidence scores
- [ ] Multi-step tasks are decomposed and assessed per-step
- [ ] Production environments trigger elevated ceremony

---

*Last Updated: December 2025*
*Version: 1.0*
