/**
 * @license
 * Copyright 2025 Google LLC
 * Portions Copyright 2025 TerminaI Authors
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, type KeyboardEvent } from 'react';

interface Props {
  prompt: string;
  onSubmit: (password: string) => void;
  onCancel: () => void;
}

export function SudoPrompt({ prompt, onSubmit, onCancel }: Props) {
  const [password, setPassword] = useState('');

  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      onSubmit(password + '\n');
    }
    if (e.key === 'Escape') {
      e.preventDefault();
      onCancel();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
      <div className="bg-gray-900 border border-yellow-500/50 rounded-xl p-6 w-96">
        <div className="flex items-center gap-3 mb-4">
          <span className="text-2xl">🔐</span>
          <h2 className="font-semibold text-white">Authentication Required</h2>
        </div>

        <p className="text-sm text-gray-400 mb-4">{prompt}</p>

        <input
          type="password"
          className="w-full bg-gray-800 rounded-lg px-4 py-3 mb-4 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-cyan-500"
          placeholder="Enter password..."
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          onKeyDown={handleKeyDown}
          autoFocus
        />

        <div className="flex gap-3">
          <button
            className="flex-1 bg-cyan-600 hover:bg-cyan-700 py-2.5 rounded-lg text-white font-medium"
            onClick={() => onSubmit(password + '\n')}
          >
            Authenticate
          </button>
          <button
            className="flex-1 bg-gray-700 hover:bg-gray-600 py-2.5 rounded-lg text-white font-medium"
            onClick={onCancel}
          >
            Cancel
          </button>
        </div>

        <p className="text-xs text-gray-500 mt-4 text-center">
          🔒 Password sent directly to terminal, not stored
        </p>
      </div>
    </div>
  );
}
