/**
 * @license
 * Copyright 2025 Google LLC
 * Portions Copyright 2025 TerminaI Authors
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, expect, it } from 'vitest';
import { classifyRisk } from './risk-classifier.js';

describe('risk-classifier', () => {
  it('classifies dangerous patterns', () => {
    expect(classifyRisk('rm -rf /')).toBe('dangerous');
    expect(classifyRisk('mkfs /dev/sda')).toBe('dangerous');
  });

  it('classifies privileged commands', () => {
    expect(classifyRisk('sudo ls')).toBe('privileged');
  });

  it('classifies deletes', () => {
    expect(classifyRisk('rm temp.txt')).toBe('delete');
  });

  it('classifies writes', () => {
    expect(classifyRisk('touch file.txt')).toBe('write');
    expect(classifyRisk('echo hi > file.txt')).toBe('write');
  });

  it('defaults to read', () => {
    expect(classifyRisk('ls -la')).toBe('read');
  });
});
