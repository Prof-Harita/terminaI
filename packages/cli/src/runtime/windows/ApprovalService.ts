/**
 * @license
 * Copyright 2025 Google LLC
 * Portions Copyright 2025 TerminaI Authors
 * SPDX-License-Identifier: Apache-2.0
 */

import { createInterface } from 'node:readline';
import { ApprovalMode } from '@terminai/core';
import type { ActionClassification, ActionContext } from './PolicyTypes.js';

export interface ApprovalPrompt {
  confirm(message: string): Promise<boolean>;
  requestPin(message: string): Promise<string>;
}

export interface ApprovalServiceConfig {
  approvalMode: ApprovalMode;
  approvalPin: string;
  isInteractive: boolean;
  prompt?: ApprovalPrompt;
}

export class ApprovalService {
  private readonly approvalMode: ApprovalMode;
  private readonly approvalPin: string;
  private readonly isInteractive: boolean;
  private readonly prompt?: ApprovalPrompt;

  constructor(config: ApprovalServiceConfig) {
    this.approvalMode = config.approvalMode;
    this.approvalPin = config.approvalPin;
    this.isInteractive = config.isInteractive;
    this.prompt = config.prompt;
  }

  async requestApproval(
    classification: ActionClassification,
    context: ActionContext,
  ): Promise<boolean> {
    if (classification.level === 'A') {
      return true;
    }

    if (this.approvalMode === ApprovalMode.YOLO) {
      return true;
    }

    if (!this.isInteractive) {
      return false;
    }

    const prompt = this.prompt ?? this.createDefaultPrompt();
    const message =
      classification.prompt ??
      `Approve ${context.command} (${context.mode}) in ${context.zone}?`;

    const approved = await prompt.confirm(message);
    if (!approved) {
      return false;
    }

    if (classification.level === 'C') {
      const pin = await prompt.requestPin('Enter 6-digit approval PIN: ');
      return pin.trim() === this.approvalPin;
    }

    return true;
  }

  private createDefaultPrompt(): ApprovalPrompt {
    return {
      confirm: (message: string) =>
        new Promise((resolve) => {
          const rl = createInterface({
            input: process.stdin,
            output: process.stdout,
          });
          rl.question(`${message} [y/N] `, (answer) => {
            rl.close();
            resolve(answer.trim().toLowerCase() === 'y');
          });
        }),
      requestPin: (message: string) =>
        new Promise((resolve) => {
          const rl = createInterface({
            input: process.stdin,
            output: process.stdout,
          });
          rl.question(message, (answer) => {
            rl.close();
            resolve(answer);
          });
        }),
    };
  }
}
