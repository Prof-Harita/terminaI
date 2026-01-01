/**
 * @license
 * Copyright 2025 Google LLC
 * Portions Copyright 2025 TerminaI Authors
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState } from 'react';
import { RiskBadge } from './RiskBadge';
import type { PendingConfirmation } from '../types/cli';
import { Button } from './ui/button';
import { cn } from '../lib/utils';
import { Check, X, ChevronRight, ChevronDown, Lock } from 'lucide-react';

interface Props {
  confirmation: PendingConfirmation;
  onRespond: (approved: boolean, pin?: string) => void;
}

export function ConfirmationCard({ confirmation, onRespond }: Props) {
  const [pin, setPin] = useState('');
  const [showCommand, setShowCommand] = useState(false);
  const requiresPin = confirmation.requiresPin === true;
  const pinLength = confirmation.pinLength ?? 6;

  return (
    <div className="bg-card border border-amber-500/30 rounded-lg p-5 shadow-sm animate-in fade-in slide-in-from-bottom-2">
      {/* Header */}
      <div className="flex items-center gap-3 mb-4">
        <div className="h-8 w-8 rounded-full bg-amber-500/10 flex items-center justify-center text-amber-500">
          ⚠️
        </div>
        <div className="flex-1">
            <div className="flex items-center gap-2">
                <span className="font-semibold text-sm text-foreground">Confirmation Required</span>
                <RiskBadge level={confirmation.riskLevel} />
            </div>
        </div>
      </div>

      {/* Description */}
      <p className="text-sm text-muted-foreground leading-relaxed mb-4">
        {confirmation.description}
      </p>

      {/* Command preview */}
      <div className="mb-5">
        <button 
            onClick={() => setShowCommand(!showCommand)}
            className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors font-medium mb-2"
        >
            {showCommand ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
            {showCommand ? 'Hide command' : 'Show command'}
        </button>
        {showCommand && (
            <pre className="p-3 bg-muted/50 rounded-md text-xs text-muted-foreground overflow-x-auto font-mono border border-border/50">
            {confirmation.command}
            </pre>
        )}
      </div>

      {requiresPin && (
        <div className="mb-5 p-3 bg-background/50 rounded-md border border-border/50">
          <label className="block mb-2 text-xs font-medium text-muted-foreground flex items-center gap-1.5">
            <Lock className="h-3 w-3" />
            Enter PIN ({pinLength} digits)
          </label>
          <input
            className="w-full bg-background border border-border rounded px-3 py-2 text-sm focus:ring-1 focus:ring-primary focus:border-primary outline-none tracking-widest font-mono text-center"
            inputMode="numeric"
            pattern="\\d*"
            value={pin}
            onChange={(e) =>
              setPin(e.target.value.replace(/\\D/g, '').slice(0, pinLength))
            }
            placeholder={'•'.repeat(pinLength)}
            autoFocus
          />
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-3">
        <Button
          onClick={() => onRespond(true, requiresPin ? pin : undefined)}
          disabled={requiresPin && pin.length !== pinLength}
          className={cn(
            "flex-1 gap-2",
            requiresPin && pin.length !== pinLength ? "opacity-50 cursor-not-allowed" : "hover:bg-green-600"
          )}
          variant="default" // Use default variant but override color logic via className if needed, or stick to primary
          style={{ backgroundColor: 'var(--green-600)' }} // Tailwind 'bg-green-600' might not map to primary
        >
          <Check className="h-4 w-4" />
          Yes, proceed
          <span className="ml-1 text-[10px] opacity-70 bg-black/20 px-1.5 py-0.5 rounded border border-white/10 hidden sm:inline-block">Ctrl+↵</span>
        </Button>
        <Button
          variant="secondary"
          onClick={() => onRespond(false, requiresPin ? pin : undefined)}
          className="flex-1 gap-2 hover:bg-destructive/10 hover:text-destructive"
        >
          <X className="h-4 w-4" />
          Cancel
          <span className="ml-1 text-[10px] opacity-70 bg-black/5 px-1.5 py-0.5 rounded border border-black/10 hidden sm:inline-block dark:bg-white/10 dark:border-white/10">Esc</span>
        </Button>
      </div>
    </div>
  );
}
