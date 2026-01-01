/**
 * @license
 * Copyright 2025 TerminaI Authors
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from 'react';
import { useFileTree, FileEntry } from '../hooks/useFileTree';

interface FileTreeProps {
  rootPath: string;
}

export function FileTree({ rootPath }: FileTreeProps) {
  const { fetchDirectory, cache, loading, errors } = useFileTree();
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (rootPath) {
      fetchDirectory(rootPath);
      setExpanded(prev => ({ ...prev, [rootPath]: true }));
    }
  }, [rootPath, fetchDirectory]);

  const toggleExpand = (path: string) => {
    const isExpanded = !!expanded[path];
    setExpanded(prev => ({ ...prev, [path]: !isExpanded }));
    if (!isExpanded) {
      fetchDirectory(path);
    }
  };

  const renderEntry = (entry: FileEntry, depth: number) => {
    const isExpanded = !!expanded[entry.path];
    const isLoading = !!loading[entry.path];
    const error = errors[entry.path];
    const children = cache[entry.path];

    return (
      <div key={entry.path} className="flex flex-col">
        <div 
          className="flex items-center gap-2 px-2 py-1 cursor-pointer hover:bg-[var(--bg-elevated)] rounded-sm group transition-colors"
          style={{ paddingLeft: `${depth * 12 + 8}px` }}
          onClick={() => entry.is_dir && toggleExpand(entry.path)}
        >
          <span className="text-xs text-[var(--text-muted)] group-hover:text-[var(--text-primary)]">
            {entry.is_dir ? (isExpanded ? '▼' : '▶') : '•'}
          </span>
          <span className={`text-sm truncate ${entry.is_dir ? 'font-medium text-[var(--text-secondary)]' : 'text-[var(--text-muted)]'}`}>
            {entry.name}
          </span>
          {isLoading && <span className="animate-pulse text-[var(--accent)] text-[8px]">...</span>}
        </div>

        {entry.is_dir && isExpanded && (
          <div className="flex flex-col">
            {error ? (
              <div 
                className="text-xs text-red-500 italic py-1" 
                style={{ paddingLeft: `${(depth + 1) * 12 + 8}px` }}
              >
                Error: {error}
              </div>
            ) : children?.length === 0 ? (
              <div 
                className="text-xs text-[var(--text-muted)] italic py-1" 
                style={{ paddingLeft: `${(depth + 1) * 12 + 8}px` }}
              >
                Empty
              </div>
            ) : (
              children?.map(child => renderEntry(child, depth + 1))
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="flex flex-col py-1 overflow-x-hidden">
      {!rootPath ? (
        <div className="px-5 py-4 text-sm italic text-[var(--text-muted)]">
          No workspace path configured
        </div>
      ) : (
        renderEntry({ name: 'Root', is_dir: true, path: rootPath }, 0)
      )}
    </div>
  );
}
