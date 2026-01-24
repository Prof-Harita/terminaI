/**
 * @license
 * Copyright 2025 Google LLC
 * Portions Copyright 2025 TerminaI Authors
 * SPDX-License-Identifier: Apache-2.0
 */

export type Zone =
  | 'workspace'
  | 'userHome'
  | 'config'
  | 'system'
  | 'secrets'
  | 'unknown';

export type ApprovalLevel = 'A' | 'B' | 'C' | 'DENY';

export interface RiskFactor {
  factor: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
}

export interface ActionClassification {
  level: ApprovalLevel;
  reason: string;
  approved: boolean;
  prompt?: string;
  riskFactors: RiskFactor[];
}

export interface ActionContext {
  command: string;
  args?: string[];
  mode: 'exec' | 'shell';
  cwd: string;
  zone: Zone;
  targetPaths?: string[];
}

export interface SafeZoneConfig {
  workspacePath: string;
  userHome: string;
  configPath: string;
  systemPaths: string[];
  secretsPaths: string[];
}

export interface HardStopConfig {
  commands: string[];
}
