/**
 * @license
 * Copyright 2025 Google LLC
 * Portions Copyright 2025 TerminaI Authors
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useCallback } from 'react';
import { invoke } from '@tauri-apps/api/core';

export interface FileEntry {
  name: string;
  is_dir: boolean;
  path: string;
}

export function useFileTree() {
  const [loading, setLoading] = useState<Record<string, boolean>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [cache, setCache] = useState<Record<string, FileEntry[]>>({});

  const fetchDirectory = useCallback(
    async (path: string) => {
      if (cache[path]) return cache[path];

      setLoading((prev) => ({ ...prev, [path]: true }));
      setErrors((prev) => {
        const next = { ...prev };
        delete next[path];
        return next;
      });

      try {
        const entries = await invoke<FileEntry[]>('read_directory', { path });
        setCache((prev) => ({ ...prev, [path]: entries }));
        return entries;
      } catch (err: any) {
        setErrors((prev) => ({ ...prev, [path]: err.toString() }));
        return [];
      } finally {
        setLoading((prev) => ({ ...prev, [path]: false }));
      }
    },
    [cache],
  );

  return {
    fetchDirectory,
    cache,
    loading,
    errors,
  };
}
