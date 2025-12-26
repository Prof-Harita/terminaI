/**
 * @license
 * Copyright 2025 Google LLC
 * Portions Copyright 2025 TerminaI Authors
 * SPDX-License-Identifier: Apache-2.0
 */

export {
  assessRisk,
  assessRiskHeuristic,
  assessRiskWithLLM,
  calculateOverallRisk,
  selectStrategy,
  type GenerativeModelAdapter,
  type RiskAssessment,
  type RiskDimensions,
} from './riskAssessor.js';
export {
  decomposeTask,
  assessDecomposedTask,
  type AssessedStep,
  type AssessedTask,
  type DecomposedTask,
  type TaskStep,
} from './taskDecomposer.js';
export {
  routeExecution,
  type ExecutionDecision,
  type ExecutionStrategy,
} from './executionRouter.js';
export {
  handleConfidence,
  type ConfidenceAction,
} from './confidenceHandler.js';
export {
  detectEnvironment,
  getCeremonyMultiplier,
  type Environment,
} from './environmentDetector.js';
export {
  logOutcome,
  getHistoricalContext,
  getRecentOutcomes,
  logApproachOutcome,
  getApproachContext,
  type ActionOutcome,
  type HistoricalContext,
  type ApproachOutcome,
} from './historyTracker.js';

// Cognitive Architecture Exports
export {
  scanSystem,
  scanSystemSync,
  saveSystemSpec,
  loadSystemSpec,
  isSpecStale,
  type SystemSpec,
  type RuntimeInfo,
  type BinaryInfo,
} from './systemSpec.js';
export { formatSystemSpecForPrompt } from './systemSpecPrompt.js';
export {
  selectFrameworkHeuristic,
  selectFrameworkWithLLM,
  type FrameworkId,
  type FrameworkSelection,
} from './frameworkSelector.js';
export { ConsensusOrchestrator } from './consensus.js';
export { PACLoop, type PACResult, type ToolExecutor } from './pacLoop.js';
export { StepBackEvaluator } from './stepBackEvaluator.js';
export { SequentialThinking } from './sequentialThinking.js';
export { ReflectiveCritique } from './reflectiveCritique.js';
export { CodeThinker } from './codeThinker.js';
export { REPLManager } from './replManager.js';
export {
  ThinkingOrchestrator,
  type BrainExecutionPlan,
} from './thinkingOrchestrator.js';
export { BrainModelAdapter } from './modelAdapter.js';
export { DepScannerAdvisor } from './advisors/depScanner.js';
export { EnumeratorAdvisor } from './advisors/enumerator.js';
export { PatternMatcherAdvisor } from './advisors/patternMatcher.js';
export { FallbackChainAdvisor } from './advisors/fallbackChain.js';
export { CodeGeneratorAdvisor } from './advisors/codeGenerator.js';
export { type Advisor, type AdvisorProposal } from './advisors/types.js';
