/**
 * @license
 * Copyright 2025 Google LLC
 * Portions Copyright 2025 TerminaI Authors
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, it, expect } from 'vitest';
import { BrokerPolicyEngine } from './BrokerPolicyEngine.js';
import type { ActionContext } from './PolicyTypes.js';

const engine = new BrokerPolicyEngine({
  commands: ['diskpart', 'format', 'dd', 'vssadmin', 'bcdedit'],
});

const baseContext: ActionContext = {
  command: 'echo',
  args: [],
  mode: 'exec',
  cwd: 'C:\\workspace',
  zone: 'workspace',
};

describe('BrokerPolicyEngine', () => {
  it('auto-approves workspace exec operations', () => {
    const result = engine.classifyAction(baseContext);
    expect(result.level).toBe('A');
    expect(result.approved).toBe(true);
  });

  it('requires level C for shell mode', () => {
    const result = engine.classifyAction({
      ...baseContext,
      mode: 'shell',
    });
    expect(result.level).toBe('C');
  });

  it('denies secrets zone access', () => {
    const result = engine.classifyAction({
      ...baseContext,
      zone: 'secrets',
    });
    expect(result.level).toBe('DENY');
  });

  it('denies hard stop commands', () => {
    const result = engine.classifyAction({
      ...baseContext,
      command: 'diskpart',
    });
    expect(result.level).toBe('DENY');
  });

  it('elevates system zone to level C', () => {
    const result = engine.classifyAction({
      ...baseContext,
      zone: 'system',
    });
    expect(result.level).toBe('C');
  });
});
