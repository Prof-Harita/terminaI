/**
 * @license
 * Copyright 2025 Google LLC
 * Portions Copyright 2025 TerminaI Authors
 * SPDX-License-Identifier: Apache-2.0
 */

import type {
  ActionClassification,
  ActionContext,
  ApprovalLevel,
  HardStopConfig,
  RiskFactor,
} from './PolicyTypes.js';

export class BrokerPolicyEngine {
  private readonly hardStops: HardStopConfig;

  constructor(hardStops: HardStopConfig) {
    this.hardStops = hardStops;
  }

  classifyAction(context: ActionContext): ActionClassification {
    const riskFactors: RiskFactor[] = [];
    const command = context.command.toLowerCase();
    const args = (context.args ?? []).map((arg) => arg.toLowerCase());

    const hardStopMatch =
      this.hardStops.commands.some((c) => command === c) ||
      (command === 'vssadmin' &&
        args.includes('delete') &&
        args.includes('shadows'));

    if (hardStopMatch) {
      return {
        level: 'DENY',
        reason: 'Command is blocked by hard-stop policy',
        approved: false,
        riskFactors: [
          {
            factor: 'hard_stop',
            severity: 'critical',
            description: 'Irreversible system modification command',
          },
        ],
      };
    }

    let level: ApprovalLevel = 'B';
    if (context.mode === 'shell') {
      riskFactors.push({
        factor: 'shell_mode',
        severity: 'high',
        description: 'Shell parsing with metacharacters',
      });
      level = 'C';
    }

    if (context.zone === 'workspace') {
      level = 'A';
    } else if (context.zone === 'userHome' || context.zone === 'config') {
      level = level === 'C' ? 'C' : 'B';
    } else if (context.zone === 'system') {
      level = 'C';
      riskFactors.push({
        factor: 'system_path',
        severity: 'high',
        description: 'Operation targets system directories',
      });
    } else if (context.zone === 'secrets') {
      return {
        level: 'DENY',
        reason: 'Secrets zone access is blocked',
        approved: false,
        riskFactors: [
          {
            factor: 'secrets_zone',
            severity: 'critical',
            description: 'Secrets zone access denied',
          },
        ],
      };
    }

    const riskyCommands = new Set([
      'powershell',
      'pwsh',
      'cmd',
      'reg',
      'sc',
      'net',
      'icacls',
      'takeown',
      'shutdown',
      'taskkill',
      'wmic',
      'bcdedit',
    ]);

    if (riskyCommands.has(command)) {
      level = 'C';
      riskFactors.push({
        factor: 'risky_command',
        severity: 'high',
        description: 'High-risk system command',
      });
    }

    const approved = level === 'A';
    const reason =
      level === 'A'
        ? 'Safe zone auto-approved'
        : level === 'B'
          ? 'User approval required'
          : 'High-risk operation requires explicit approval';

    const prompt =
      level === 'A'
        ? undefined
        : `Approve ${context.command} in ${context.zone} with mode ${context.mode}?`;

    return {
      level,
      reason,
      approved,
      prompt,
      riskFactors,
    };
  }
}
