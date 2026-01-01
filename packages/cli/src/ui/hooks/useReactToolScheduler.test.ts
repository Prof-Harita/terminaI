/**
 * @license
 * Copyright 2025 Google LLC
 * Portions Copyright 2025 TerminaI Authors
 * SPDX-License-Identifier: Apache-2.0
 */

import { CoreToolScheduler } from '@terminai/core';
import type { Config } from '@terminai/core';
import { renderHook } from '../../test-utils/render.js';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { useReactToolScheduler } from './useReactToolScheduler.js';

vi.mock('@terminai/core', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@terminai/core')>();
  return {
    ...actual,
    CoreToolScheduler: vi.fn(),
  };
});

const mockCoreToolScheduler = vi.mocked(CoreToolScheduler);

describe('useReactToolScheduler', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('only creates one instance of CoreToolScheduler even if props change', () => {
    const onComplete = vi.fn();
    const getPreferredEditor = vi.fn();
    const config = {} as Config;

    const { rerender } = renderHook(
      (props) =>
        useReactToolScheduler(
          props.onComplete,
          props.config,
          props.getPreferredEditor,
        ),
      {
        initialProps: {
          onComplete,
          config,
          getPreferredEditor,
        },
      },
    );

    expect(mockCoreToolScheduler).toHaveBeenCalledTimes(1);

    // Rerender with a new onComplete function
    const newOnComplete = vi.fn();
    rerender({
      onComplete: newOnComplete,
      config,
      getPreferredEditor,
    });
    expect(mockCoreToolScheduler).toHaveBeenCalledTimes(1);

    // Rerender with a new getPreferredEditor function
    const newGetPreferredEditor = vi.fn();
    rerender({
      onComplete: newOnComplete,
      config,
      getPreferredEditor: newGetPreferredEditor,
    });
    expect(mockCoreToolScheduler).toHaveBeenCalledTimes(1);

    rerender({
      onComplete: newOnComplete,
      config,
      getPreferredEditor: newGetPreferredEditor,
    });
    expect(mockCoreToolScheduler).toHaveBeenCalledTimes(1);
  });
});
