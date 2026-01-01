/**
 * @license
 * Copyright 2025 Google LLC
 * Portions Copyright 2025 TerminaI Authors
 * SPDX-License-Identifier: Apache-2.0
 */

"use client"


export function Waveform({ active }: { active: boolean }) {
  return (
    <div className={`flex items-center gap-0.5 h-4 ${active ? 'opacity-100' : 'opacity-0'} transition-opacity`}>
      {[1, 2, 3, 4, 5].map((i) => (
        <div
          key={i}
          className="w-0.5 bg-primary animate-[waveform_1.2s_ease-in-out_infinite]"
          style={{ 
            animationDelay: `${i * 0.15}s`,
            height: '100%'
          }}
        />
      ))}
    </div>
  );
}
