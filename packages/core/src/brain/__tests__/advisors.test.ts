/**
 * @license
 * Copyright 2025 Google LLC
 * Portions Copyright 2025 TerminaI Authors
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, it, expect, vi } from 'vitest';
import type { GenerativeModelAdapter } from '../riskAssessor.js';
import type { SystemSpec } from '../systemSpec.js';

// Static fixture to avoid slow execSync calls on Windows CI
const mockSystemSpec: SystemSpec = {
  os: { name: 'linux', version: '5.15.0', arch: 'x64' },
  shell: { type: 'bash', version: '5.0.0' },
  runtimes: { node: { version: 'v20.0.0', npm: '10.0.0' } },
  binaries: { git: { path: '/usr/bin/git', version: '2.40.0' } },
  packageManagers: ['npm'],
  sudoAvailable: false,
  network: { hasInternet: true },
  timestamp: Date.now(),
};

// Mock scanSystemSync on Windows to avoid slow execSync calls
vi.mock('../systemSpec.js', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../systemSpec.js')>();

  // Only mock on Windows - Linux CI uses real system scan
  if (process.platform === 'win32') {
    return {
      ...actual,
      scanSystemSync: vi.fn(() => mockSystemSpec),
      saveSystemSpec: vi.fn(),
    };
  }
  return actual;
});

import {
  DepScannerAdvisor,
  EnumeratorAdvisor,
  PatternMatcherAdvisor,
  FallbackChainAdvisor,
  CodeGeneratorAdvisor,
  scanSystemSync,
} from '../index.js';

describe('Individual Advisors', () => {
  const mockSystemSpec = scanSystemSync();

  const mockProposal = {
    approach: 'Test Approach',
    reasoning: 'Test Reasoning',
    estimatedTime: 'fast',
    requiredDeps: [],
    confidence: 90,
  };

  const createMockModel = (responseText: string) =>
    ({
      generateContent: vi.fn().mockResolvedValue({
        response: {
          text: () => responseText,
        },
      }),
    }) as unknown as GenerativeModelAdapter;

  describe('DepScannerAdvisor', () => {
    it('should propose based on system binaries', async () => {
      const mockModel = createMockModel(JSON.stringify(mockProposal));
      const advisor = new DepScannerAdvisor(mockModel);
      const proposal = await advisor.propose('test task', mockSystemSpec);
      expect(proposal.approach).toBe('Test Approach');
    });

    it('should fallback on parsing error', async () => {
      const mockModel = createMockModel('invalid json');
      const advisor = new DepScannerAdvisor(mockModel);
      const proposal = await advisor.propose('test task', mockSystemSpec);
      expect(proposal.reasoning).toContain('Fallback heuristic');
    });
  });

  describe('EnumeratorAdvisor', () => {
    it('should list multiple approaches via LLM', async () => {
      const mockModel = createMockModel(JSON.stringify(mockProposal));
      const advisor = new EnumeratorAdvisor(mockModel);
      const proposal = await advisor.propose('test task', mockSystemSpec);
      expect(proposal.approach).toBe('Test Approach');
    });
  });

  describe('PatternMatcherAdvisor', () => {
    it('should identify best practices', async () => {
      const mockModel = createMockModel(JSON.stringify(mockProposal));
      const advisor = new PatternMatcherAdvisor(mockModel);
      const proposal = await advisor.propose('test task', mockSystemSpec);
      expect(proposal.approach).toBe('Test Approach');
    });
  });

  describe('FallbackChainAdvisor', () => {
    it('should propose a chain of attempts', async () => {
      const mockModel = createMockModel(JSON.stringify(mockProposal));
      const advisor = new FallbackChainAdvisor(mockModel);
      const proposal = await advisor.propose('test task', mockSystemSpec);
      expect(proposal.approach).toBe('Test Approach');
    });
  });

  describe('CodeGeneratorAdvisor', () => {
    it('should evaluate if a script is better', async () => {
      const mockModel = createMockModel(JSON.stringify(mockProposal));
      const advisor = new CodeGeneratorAdvisor(mockModel);
      const proposal = await advisor.propose('test task', mockSystemSpec);
      expect(proposal.approach).toBe('Test Approach');
    });
  });
});
