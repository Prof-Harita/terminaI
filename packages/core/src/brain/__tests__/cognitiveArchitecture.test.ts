/**
 * @license
 * Copyright 2025 Google LLC
 * Portions Copyright 2025 TerminaI Authors
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, it, expect, vi } from 'vitest';
import type { GenerativeModelAdapter } from '../riskAssessor.js';
import {
  scanSystemSync,
  selectFrameworkHeuristic,
  ConsensusOrchestrator,
  formatSystemSpecForPrompt,
} from '../index.js';

describe('Cognitive Architecture Integration', () => {
  describe('SystemSpec', () => {
    it('should scan system synchronously', () => {
      const spec = scanSystemSync();
      expect(spec.os).toBeDefined();
      expect(spec.shell).toBeDefined();
      expect(spec.timestamp).toBeGreaterThan(0);
    });

    it('should format spec for prompt', () => {
      const spec = scanSystemSync();
      const prompt = formatSystemSpecForPrompt(spec);
      expect(prompt).toContain('## System Capabilities');
      expect(prompt).toContain('OS:');
    });
  });

  describe('FrameworkSelector', () => {
    it('should select FW_DIRECT for trivial tasks', () => {
      const selection = selectFrameworkHeuristic('what is my ip');
      expect(selection?.frameworkId).toBe('FW_DIRECT');
    });

    it('should select FW_SEQUENTIAL for debugging tasks', () => {
      const selection = selectFrameworkHeuristic('why is my build failing');
      expect(selection?.frameworkId).toBe('FW_SEQUENTIAL');
    });

    it('should select FW_DECOMPOSE for large feature requests', () => {
      const selection = selectFrameworkHeuristic(
        'implement a new authentication service with JWT and database integration',
      );
      expect(selection?.frameworkId).toBe('FW_DECOMPOSE');
    });
  });

  describe('Consensus Framework', () => {
    it('should run advisors and select an approach', async () => {
      const mockModel = {
        generateContent: vi.fn().mockResolvedValue({
          response: {
            text: () =>
              JSON.stringify({
                approach: 'Test Approach',
                reasoning: 'Test Reasoning',
                estimatedTime: 'fast',
                requiredDeps: [],
                confidence: 90,
              }),
          },
        }),
      };

      const orchestrator = new ConsensusOrchestrator(
        mockModel as unknown as GenerativeModelAdapter,
      );
      const spec = scanSystemSync();
      const approach = await orchestrator.selectApproach(
        'convert docx to pdf',
        spec,
      );

      expect(approach.approach).toBeDefined();
      expect(approach.confidence).toBeGreaterThan(0);
    });
  });
});
