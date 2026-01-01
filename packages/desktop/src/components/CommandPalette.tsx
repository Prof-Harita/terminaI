/**
 * @license
 * Copyright 2025 Google LLC
 * Portions Copyright 2025 TerminaI Authors
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useMemo } from 'react';
import type { Command } from '../data/commands';
import { COMMANDS } from '../data/commands';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (command: Command) => void;
}

export function CommandPalette({ isOpen, onClose, onSelect }: Props) {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);

  const filtered = useMemo(() => {
    const list = [...COMMANDS];
    if (!query) return list;

    const lower = query.toLowerCase();
    const weights = { 
      'Conversation': 10, 
      'Sessions': 8, 
      'System': 7,
      'Security': 5, 
      'Help': 1 
    };

    return list
      .filter(
        (cmd) =>
          cmd.name.toLowerCase().includes(lower) ||
          cmd.description.toLowerCase().includes(lower),
      )
      .sort((a, b) => {
        // Priority by category weight
        const weightA = weights[a.category as keyof typeof weights] || 0;
        const weightB = weights[b.category as keyof typeof weights] || 0;
        if (weightA !== weightB) return weightB - weightA;

        // Exact match boost
        if (a.name.toLowerCase() === lower) return -1;
        if (b.name.toLowerCase() === lower) return 1;

        return a.name.localeCompare(b.name);
      });
  }, [query]);

  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  useEffect(() => {
    if (!isOpen) {
      setQuery('');
      setSelectedIndex(0);
      return;
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex((i) => Math.min(i + 1, filtered.length - 1));
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex((i) => Math.max(i - 1, 0));
      }
      if (e.key === 'Enter' && filtered[selectedIndex]) {
        e.preventDefault();
        onSelect(filtered[selectedIndex]);
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, filtered, selectedIndex, onClose, onSelect]);

  if (!isOpen) return null;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 50,
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'center',
        paddingTop: 'var(--space-24)',
      }}
    >
      {/* Backdrop */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: 'rgba(0, 0, 0, 0.6)',
          backdropFilter: 'blur(4px)',
        }}
        onClick={onClose}
      />

      {/* Modal */}
      <div
        style={{
          position: 'relative',
          width: '100%',
          maxWidth: '560px',
          margin: '0 var(--space-4)',
          background: 'var(--bg-secondary)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius-xl)',
          boxShadow: 'var(--shadow-xl)',
          overflow: 'hidden',
        }}
      >
        {/* Search input */}
        <input
          type="text"
          placeholder="Search commands..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          autoFocus
          style={{
            width: '100%',
            padding: 'var(--space-5)',
            background: 'transparent',
            border: 'none',
            borderBottom: '1px solid var(--border)',
            color: 'var(--text-primary)',
            fontSize: 'var(--text-base)',
            outline: 'none',
          }}
        />

        {/* Results */}
        <div style={{ maxHeight: '360px', overflowY: 'auto' }}>
          {filtered.length === 0 && (
            <div
              style={{
                padding: 'var(--space-8)',
                textAlign: 'center',
                color: 'var(--text-muted)',
                fontSize: 'var(--text-sm)',
              }}
            >
              No commands found
            </div>
          )}
          {filtered.map((cmd, i) => (
            <div
              key={cmd.id}
              onClick={() => {
                onSelect(cmd);
                onClose();
              }}
              style={{
                padding: 'var(--space-4) var(--space-5)',
                cursor: 'pointer',
                background:
                  i === selectedIndex ? 'var(--accent)' : 'transparent',
                transition: 'background var(--transition-fast)',
              }}
              onMouseEnter={() => setSelectedIndex(i)}
            >
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: 'var(--space-1)',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                  <span
                    style={{
                      fontFamily: 'monospace',
                      fontSize: 'var(--text-sm)',
                      fontWeight: 600,
                      color:
                        i === selectedIndex ? 'white' : 'var(--text-primary)',
                    }}
                  >
                    {cmd.name}
                  </span>
                  {cmd.shortcut && (
                    <kbd
                      style={{
                        padding: '1px 4px',
                        background: i === selectedIndex ? 'rgba(255,255,255,0.2)' : 'var(--bg-tertiary)',
                        border: i === selectedIndex ? '1px solid rgba(255,255,255,0.3)' : '1px solid var(--border)',
                        borderRadius: '3px',
                        fontSize: '10px',
                        color: i === selectedIndex ? 'white' : 'var(--text-muted)',
                        fontFamily: 'monospace',
                      }}
                    >
                      {cmd.shortcut}
                    </kbd>
                  )}
                </div>
                <span
                  style={{
                    fontSize: 'var(--text-xs)',
                    color:
                      i === selectedIndex
                        ? 'rgba(255,255,255,0.7)'
                        : 'var(--text-muted)',
                  }}
                >
                  {cmd.category}
                </span>
              </div>
              <p
                style={{
                  margin: 0,
                  fontSize: 'var(--text-sm)',
                  color:
                    i === selectedIndex
                      ? 'rgba(255,255,255,0.85)'
                      : 'var(--text-secondary)',
                }}
              >
                {cmd.description}
              </p>
            </div>
          ))}
        </div>

        {/* Footer hints */}
        <div
          style={{
            padding: 'var(--space-3) var(--space-5)',
            borderTop: '1px solid var(--border)',
            display: 'flex',
            gap: 'var(--space-4)',
            fontSize: 'var(--text-xs)',
            color: 'var(--text-muted)',
          }}
        >
          <span>
            <kbd
              style={{
                background: 'var(--bg-tertiary)',
                padding: '2px 6px',
                borderRadius: '4px',
              }}
            >
              ↑↓
            </kbd>{' '}
            navigate
          </span>
          <span>
            <kbd
              style={{
                background: 'var(--bg-tertiary)',
                padding: '2px 6px',
                borderRadius: '4px',
              }}
            >
              Enter
            </kbd>{' '}
            select
          </span>
          <span>
            <kbd
              style={{
                background: 'var(--bg-tertiary)',
                padding: '2px 6px',
                borderRadius: '4px',
              }}
            >
              Esc
            </kbd>{' '}
            close
          </span>
        </div>
      </div>
    </div>
  );
}
