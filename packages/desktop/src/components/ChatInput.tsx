/**
 * @license
 * Copyright 2025 Google LLC
 * Portions Copyright 2025 TerminaI Authors
 * SPDX-License-Identifier: Apache-2.0
 */

import type { KeyboardEvent, RefObject } from 'react';
import { useState } from 'react';
import { VoiceOrb } from './VoiceOrb';
import { useSettingsStore } from '../stores/settingsStore';

interface Props {
  onSend: (text: string) => void;
  disabled: boolean;
  inputRef?: RefObject<HTMLTextAreaElement | null>;
}

export function ChatInput({ onSend, disabled, inputRef }: Props) {
  const [input, setInput] = useState('');
  const voiceEnabled = useSettingsStore((s) => s.voiceEnabled);

  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (input.trim()) {
        onSend(input.trim());
        setInput('');
      }
    }
  };

  const handleSend = () => {
    if (input.trim()) {
      onSend(input.trim());
      setInput('');
    }
  };

  const handleVoiceTranscript = (text: string) => {
    if (text.trim()) {
      if (voiceEnabled && !input.trim()) {
        onSend(text.trim());
        setInput('');
        return;
      }
      setInput((prev) => (prev ? `${prev} ${text}` : text));
    }
  };

  return (
    <div
      style={{
        padding: 'var(--space-4) var(--space-6)',
        borderTop: '1px solid var(--border)',
        background: 'var(--bg-secondary)',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'flex-end',
          gap: 'var(--space-3)',
        }}
      >
        <VoiceOrb onTranscript={handleVoiceTranscript} disabled={disabled} />
        <textarea
          ref={inputRef}
          className="input"
          placeholder="Message TermAI..."
          rows={1}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={disabled}
          style={{
            flex: 1,
            minHeight: '48px',
            maxHeight: '200px',
            resize: 'none',
          }}
        />
        <button
          className="btn btn-primary"
          onClick={handleSend}
          disabled={disabled || !input.trim()}
          style={{
            height: '48px',
            minWidth: '80px',
          }}
        >
          Send
        </button>
      </div>
    </div>
  );
}
