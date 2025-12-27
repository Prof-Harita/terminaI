/**
 * @license
 * Copyright 2025 Google LLC
 * Portions Copyright 2025 TerminaI Authors
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, it, expect, afterEach } from 'vitest';
import { buildUiConfirmationDetails } from '../ui-tool-utils.js';
import { UI_CLICK_TOOL_NAME } from '../tool-names.js';
import {
  configureGuiAutomation,
  resetGuiAutomationConfig,
} from '../../gui/config.js';

describe('UI tool utils', () => {
  afterEach(() => {
    resetGuiAutomationConfig();
  });

  it('applies configured review floors for UI tools', () => {
    configureGuiAutomation({ clickMinReviewLevel: 'C' });

    const details = buildUiConfirmationDetails({
      toolName: UI_CLICK_TOOL_NAME,
      description: 'Click target',
      onConfirm: async () => {},
    });

    expect(details).not.toBe(false);
    if (details && details !== false) {
      expect(details.reviewLevel).toBe('C');
      expect(details.requiresPin).toBe(true);
      expect(details.explanation).toContain('Minimum review level C');
    }
  });
});
