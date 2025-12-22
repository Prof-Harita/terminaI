/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState } from 'react';
import { RiskBadge } from './RiskBadge';
import type { PendingConfirmation } from '../types/cli';

interface Props {
  confirmation: PendingConfirmation;
  onRespond: (approved: boolean, pin?: string) => void;
}

export function ConfirmationCard({ confirmation, onRespond }: Props) {
  const [pin, setPin] = useState('');
  const requiresPin = confirmation.requiresPin === true;
  const pinLength = confirmation.pinLength ?? 6;

  return (
    <div
      style={{
        background: 'var(--bg-tertiary)',
        border: '1px solid #f59e0b33',
        borderRadius: 'var(--radius-lg)',
        padding: 'var(--space-5)',
      }}
    >
      {/* Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 'var(--space-3)',
          marginBottom: 'var(--space-4)',
        }}
      >
        <span style={{ fontSize: 'var(--text-lg)' }}>⚠️</span>
        <span
          style={{
            fontWeight: 600,
            fontSize: 'var(--text-sm)',
            color: 'var(--text-primary)',
          }}
        >
          Confirmation Required
        </span>
        <RiskBadge level={confirmation.riskLevel} />
      </div>

      {/* Description */}
      <p
        style={{
          margin: '0 0 var(--space-4) 0',
          fontSize: 'var(--text-sm)',
          color: 'var(--text-secondary)',
          lineHeight: 1.5,
        }}
      >
        {confirmation.description}
      </p>

      {/* Command preview */}
      <details style={{ marginBottom: 'var(--space-5)' }}>
        <summary
          style={{
            cursor: 'pointer',
            fontSize: 'var(--text-sm)',
            color: 'var(--text-muted)',
          }}
        >
          Show command
        </summary>
        <pre
          style={{
            marginTop: 'var(--space-3)',
            padding: 'var(--space-4)',
            background: 'var(--bg-primary)',
            borderRadius: 'var(--radius-md)',
            fontSize: 'var(--text-sm)',
            color: 'var(--text-secondary)',
            overflow: 'auto',
            fontFamily: 'monospace',
          }}
        >
          {confirmation.command}
        </pre>
      </details>

      {requiresPin && (
        <div style={{ marginBottom: 'var(--space-5)' }}>
          <label
            style={{
              display: 'block',
              marginBottom: 'var(--space-2)',
              fontSize: 'var(--text-sm)',
              color: 'var(--text-muted)',
            }}
          >
            Enter PIN ({pinLength} digits)
          </label>
          <input
            className="input"
            inputMode="numeric"
            pattern="\\d*"
            value={pin}
            onChange={(e) =>
              setPin(e.target.value.replace(/\\D/g, '').slice(0, pinLength))
            }
            placeholder={'•'.repeat(pinLength)}
            style={{ width: '100%' }}
          />
        </div>
      )}

      {/* Actions */}
      <div style={{ display: 'flex', gap: 'var(--space-3)' }}>
        <button
          className="btn"
          onClick={() => onRespond(true, requiresPin ? pin : undefined)}
          disabled={requiresPin && pin.length !== pinLength}
          style={{
            flex: 1,
            background: '#22c55e',
            color: 'white',
          }}
        >
          Yes, proceed
        </button>
        <button
          className="btn btn-secondary"
          onClick={() => onRespond(false, requiresPin ? pin : undefined)}
          style={{ flex: 1 }}
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
