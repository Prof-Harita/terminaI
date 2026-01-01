/**
 * @license
 * Copyright 2025 Google LLC
 * Portions Copyright 2025 TerminaI Authors
 * SPDX-License-Identifier: Apache-2.0
 */

import type React from 'react';
import { RotateCcw } from 'lucide-react';

export function Section({
  title,
  show = true,
  children,
}: {
  title: string;
  show?: boolean;
  children: React.ReactNode;
}) {
  if (!show) return null;
  return (
    <section style={{ marginBottom: 'var(--space-8)' }}>
      <h3
        style={{
          margin: '0 0 var(--space-4) 0',
          fontSize: 'var(--text-xs)',
          fontWeight: 600,
          textTransform: 'uppercase',
          letterSpacing: '0.05em',
          color: 'var(--text-muted)',
        }}
      >
        {title}
      </h3>
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: 'var(--space-4)',
        }}
      >
        {children}
      </div>
    </section>
  );
}

export function SettingRow({
  label,
  show = true,
  children,
  onReset,
}: {
  label: string;
  show?: boolean;
  children: React.ReactNode;
  onReset?: () => void;
}) {
  if (!show) return null;
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 'var(--space-4)',
        minHeight: '32px',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
        <span
          style={{ 
            fontSize: 'var(--text-sm)', 
            color: 'var(--text-primary)',
          }}
        >
          {label}
        </span>
        {onReset && (
          <button
            onClick={onReset}
            style={{
              padding: '2px',
              color: 'var(--text-muted)',
              cursor: 'pointer',
              background: 'none',
              border: 'none',
            }}
            title="Reset to default"
          >
            <RotateCcw size={12} />
          </button>
        )}
      </div>
      <div style={{ flex: 1, display: 'flex', justifyContent: 'flex-end' }}>
        {children}
      </div>
    </div>
  );
}
