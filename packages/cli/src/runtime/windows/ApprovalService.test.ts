/**
 * @license
 * Copyright 2025 Google LLC
 * Portions Copyright 2025 TerminaI Authors
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, it, expect, vi } from 'vitest';
import { ApprovalMode } from '@terminai/core';
import { ApprovalService } from './ApprovalService.js';
import type { ActionClassification, ActionContext } from './PolicyTypes.js';

const baseContext: ActionContext = {
  command: 'echo',
  args: ['hi'],
  mode: 'exec',
  cwd: 'C:\\workspace',
  zone: 'workspace',
};

function classificationFor(level: ActionClassification['level']): ActionClassification {
  return {
    level,
    reason: 'test',
    approved: level === 'A',
    riskFactors: [],
    prompt: 'Approve?',
  };
}

describe('ApprovalService', () => {
  it('auto-approves in YOLO mode without prompting', async () => {
    const prompt = {
      confirm: vi.fn().mockResolvedValue(false),
      requestPin: vi.fn().mockResolvedValue('000000'),
    };
    const service = new ApprovalService({
      approvalMode: ApprovalMode.YOLO,
      approvalPin: '000000',
      isInteractive: true,
      prompt,
    });
    const approved = await service.requestApproval(
      classificationFor('B'),
      baseContext,
    );
    expect(approved).toBe(true);
    expect(prompt.confirm).not.toHaveBeenCalled();
  });

  it('denies when non-interactive and approval required', async () => {
    const service = new ApprovalService({
      approvalMode: ApprovalMode.DEFAULT,
      approvalPin: '000000',
      isInteractive: false,
    });
    const approved = await service.requestApproval(
      classificationFor('B'),
      baseContext,
    );
    expect(approved).toBe(false);
  });

  it('requires confirmation for level B', async () => {
    const prompt = {
      confirm: vi.fn().mockResolvedValue(true),
      requestPin: vi.fn().mockResolvedValue('000000'),
    };
    const service = new ApprovalService({
      approvalMode: ApprovalMode.DEFAULT,
      approvalPin: '000000',
      isInteractive: true,
      prompt,
    });
    const approved = await service.requestApproval(
      classificationFor('B'),
      baseContext,
    );
    expect(approved).toBe(true);
    expect(prompt.confirm).toHaveBeenCalledOnce();
    expect(prompt.requestPin).not.toHaveBeenCalled();
  });

  it('requires confirmation and matching pin for level C', async () => {
    const prompt = {
      confirm: vi.fn().mockResolvedValue(true),
      requestPin: vi.fn().mockResolvedValue('123456'),
    };
    const service = new ApprovalService({
      approvalMode: ApprovalMode.DEFAULT,
      approvalPin: '123456',
      isInteractive: true,
      prompt,
    });
    const approved = await service.requestApproval(
      classificationFor('C'),
      baseContext,
    );
    expect(approved).toBe(true);
    expect(prompt.confirm).toHaveBeenCalledOnce();
    expect(prompt.requestPin).toHaveBeenCalledOnce();
  });
});
