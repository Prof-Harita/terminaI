/**
 * @license
 * Copyright 2025 Google LLC
 * Portions Copyright 2025 TerminaI Authors
 * SPDX-License-Identifier: Apache-2.0
 */

import type { spawn } from 'node:child_process';

/**
 * Task categories for synthetic scenario generation.
 */
export type TaskCategory =
  | 'system_admin'
  | 'networking'
  | 'gui_automation'
  | 'email'
  | 'file_management'
  | 'web_automation'
  | 'coding';

/**
 * Difficulty levels for tasks.
 */
export type TaskDifficulty = 'easy' | 'medium' | 'hard';

/**
 * A synthetic task to be executed by TerminaI.
 */
export interface EvolutionTask {
  taskId: string;
  category: TaskCategory;
  prompt: string;
  expectedOutcome: string;
  difficulty: TaskDifficulty;
  timeout?: number; // seconds
}

/**
 * Result of a single task execution.
 */
export interface TaskResult {
  taskId: string;
  sessionId: string;
  success: boolean;
  exitCode: number;
  duration: number; // ms
  stdout: string;
  stderr: string;
  logPath: string;
}

/**
 * Sandbox types.
 */
export type SandboxType = 'docker' | 'desktop' | 'full-vm' | 'host';

/**
 * Sandbox configuration.
 */
export interface SandboxConfig {
  type: SandboxType;
  image: string;
  timeout: number; // seconds
  diskQuota?: number; // MB
  memoryLimit?: number; // MB
  cpuLimit?: number; // cores
  networkDisabled?: boolean;
  outputLimitBytes?: number;
  pidsLimit?: number;
  allowUnsafeHost?: boolean;
  spawnFn?: typeof spawn;
}

/**
 * A cluster of similar failures.
 */
export interface FailureCluster {
  clusterId: string;
  errorType: string;
  component: string;
  affectedSessions: number;
  representativeTaskIds: string[];
  hypothesis: string;
  suggestedFix: string;
}

/**
 * Evolution Lab configuration.
 */
export interface EvolutionLabConfig {
  parallelism: number;
  tasksPerRun: number;
  taskTimeout: number;
  sandbox: SandboxConfig;
  quotaLimit: {
    dailyTasks: number;
    monthlyTasks: number;
  };
  categories: Record<TaskCategory, number>; // Distribution weights
  approvalMode?: string;
}

/**
 * Default configuration.
 */
export const DEFAULT_CONFIG: EvolutionLabConfig = {
  parallelism: 4,
  tasksPerRun: 100,
  taskTimeout: 300,
  sandbox: {
    type: 'docker',
    image: 'terminai/evolution-sandbox:latest',
    timeout: 600,
    memoryLimit: 512,
    cpuLimit: 1,
    networkDisabled: true,
    outputLimitBytes: 512 * 1024,
    pidsLimit: 256,
  },
  quotaLimit: {
    dailyTasks: 1000,
    monthlyTasks: 20000,
  },
  categories: {
    system_admin: 0.2,
    networking: 0.1,
    gui_automation: 0.15,
    email: 0.05,
    file_management: 0.15,
    web_automation: 0.15,
    coding: 0.2,
  },
  approvalMode: 'default',
};
