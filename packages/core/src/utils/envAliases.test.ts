/**
 * @license
 * Copyright 2025 Google LLC
 * Portions Copyright 2025 TerminaI Authors
 * SPDX-License-Identifier: Apache-2.0
 */

import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { applyTerminaiEnvAliases } from './envAliases.js';

const originalEnv = { ...process.env };

const resetEnv = () => {
  for (const key of Object.keys(process.env)) {
    delete process.env[key];
  }
  Object.assign(process.env, originalEnv);
};

describe('applyTerminaiEnvAliases', () => {
  beforeEach(() => {
    resetEnv();
  });

  afterEach(() => {
    resetEnv();
  });

  it('mirrors GEMINI_* to TERMINAI_* when missing', () => {
    process.env['GEMINI_API_KEY'] = 'gemini-key';
    delete process.env['TERMINAI_API_KEY'];

    applyTerminaiEnvAliases();

    expect(process.env['TERMINAI_API_KEY']).toBe('gemini-key');
  });

  it('prefers TERMINAI_* when both are set', () => {
    process.env['GEMINI_API_KEY'] = 'gemini-key';
    process.env['TERMINAI_API_KEY'] = 'terminai-key';

    applyTerminaiEnvAliases();

    expect(process.env['TERMINAI_API_KEY']).toBe('terminai-key');
    expect(process.env['GEMINI_API_KEY']).toBe('terminai-key');
  });

  it('mirrors TERMINAI_* back to GEMINI_* for compatibility', () => {
    process.env['TERMINAI_API_KEY'] = 'terminai-key';
    delete process.env['GEMINI_API_KEY'];

    applyTerminaiEnvAliases();

    expect(process.env['GEMINI_API_KEY']).toBe('terminai-key');
  });
});
