/**
 * @license
 * Copyright 2025 Google LLC
 * Portions Copyright 2025 TerminaI Authors
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ContextManager } from './contextManager.js';
import * as memoryDiscovery from '../utils/memoryDiscovery.js';
import type { Config } from '../config/config.js';
import { coreEvents, CoreEvent } from '../utils/events.js';

// Mock memoryDiscovery module
vi.mock('../utils/memoryDiscovery.js', async (importOriginal) => {
  const actual =
    await importOriginal<typeof import('../utils/memoryDiscovery.js')>();
  return {
    ...actual,
    loadGlobalMemory: vi.fn(),
    loadEnvironmentMemory: vi.fn(),
    loadJitSubdirectoryMemory: vi.fn(),
    concatenateInstructions: vi
      .fn()
      .mockImplementation(actual.concatenateInstructions),
  };
});

describe('ContextManager', () => {
  let contextManager: ContextManager;
  let mockConfig: Config;

  beforeEach(() => {
    mockConfig = {
      getDebugMode: vi.fn().mockReturnValue(false),
      getWorkingDir: vi.fn().mockReturnValue('/app'),
      getWorkspaceContext: vi.fn().mockReturnValue({
        getDirectories: vi.fn().mockReturnValue(['/app']),
      }),
      getExtensionLoader: vi.fn().mockReturnValue({}),
      getMcpClientManager: vi.fn().mockReturnValue({
        getMcpInstructions: vi.fn().mockReturnValue('MCP Instructions'),
      }),
    } as unknown as Config;

    contextManager = new ContextManager(mockConfig);
    vi.clearAllMocks();
    vi.spyOn(coreEvents, 'emit');
  });

  describe('refresh', () => {
    it('should load and format global and environment memory', async () => {
      const mockGlobalResult: memoryDiscovery.MemoryLoadResult = {
        files: [
          { path: '/home/user/.gemini/terminaI.md', content: 'Global Content' },
        ],
      };
      vi.mocked(memoryDiscovery.loadGlobalMemory).mockResolvedValue(
        mockGlobalResult,
      );

      const mockEnvResult: memoryDiscovery.MemoryLoadResult = {
        files: [{ path: '/app/terminaI.md', content: 'Env Content' }],
      };
      vi.mocked(memoryDiscovery.loadEnvironmentMemory).mockResolvedValue(
        mockEnvResult,
      );

      await contextManager.refresh();

      expect(memoryDiscovery.loadGlobalMemory).toHaveBeenCalledWith(false);
      expect(contextManager.getGlobalMemory()).toMatch(
        /--- Context from: .*terminaI.md ---/,
      );
      expect(contextManager.getGlobalMemory()).toContain('Global Content');

      expect(memoryDiscovery.loadEnvironmentMemory).toHaveBeenCalledWith(
        ['/app'],
        expect.anything(),
        false,
      );
      expect(contextManager.getEnvironmentMemory()).toContain(
        '--- Context from: terminaI.md ---',
      );
      expect(contextManager.getEnvironmentMemory()).toContain('Env Content');
      expect(contextManager.getEnvironmentMemory()).toContain(
        'MCP Instructions',
      );

      expect(contextManager.getLoadedPaths()).toContain(
        '/home/user/.gemini/terminaI.md',
      );
      expect(contextManager.getLoadedPaths()).toContain('/app/terminaI.md');
    });

    it('should emit MemoryChanged event when memory is refreshed', async () => {
      const mockGlobalResult = {
        files: [{ path: '/app/terminaI.md', content: 'content' }],
      };
      const mockEnvResult = {
        files: [{ path: '/app/src/terminaI.md', content: 'env content' }],
      };
      vi.mocked(memoryDiscovery.loadGlobalMemory).mockResolvedValue(
        mockGlobalResult,
      );
      vi.mocked(memoryDiscovery.loadEnvironmentMemory).mockResolvedValue(
        mockEnvResult,
      );

      await contextManager.refresh();

      expect(coreEvents.emit).toHaveBeenCalledWith(CoreEvent.MemoryChanged, {
        fileCount: 2,
      });
    });
  });

  describe('discoverContext', () => {
    it('should discover and load new context', async () => {
      const mockResult: memoryDiscovery.MemoryLoadResult = {
        files: [{ path: '/app/src/terminaI.md', content: 'Src Content' }],
      };
      vi.mocked(memoryDiscovery.loadJitSubdirectoryMemory).mockResolvedValue(
        mockResult,
      );

      const result = await contextManager.discoverContext('/app/src/file.ts', [
        '/app',
      ]);

      expect(memoryDiscovery.loadJitSubdirectoryMemory).toHaveBeenCalledWith(
        '/app/src/file.ts',
        ['/app'],
        expect.any(Set),
        false,
      );
      expect(result).toMatch(/--- Context from: src[\\/]terminaI\.md ---/);
      expect(result).toContain('Src Content');
      expect(contextManager.getLoadedPaths()).toContain('/app/src/terminaI.md');
    });

    it('should return empty string if no new files found', async () => {
      const mockResult: memoryDiscovery.MemoryLoadResult = { files: [] };
      vi.mocked(memoryDiscovery.loadJitSubdirectoryMemory).mockResolvedValue(
        mockResult,
      );

      const result = await contextManager.discoverContext('/app/src/file.ts', [
        '/app',
      ]);

      expect(result).toBe('');
    });
  });
});
