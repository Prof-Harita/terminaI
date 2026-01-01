/**
 * @license
 * Copyright 2025 Google LLC
 * Portions Copyright 2025 TerminaI Authors
 * SPDX-License-Identifier: Apache-2.0
 */

import { useSettingsStore } from '../../stores/settingsStore';
import { Section, SettingRow } from '../settings/Shared';

export function TerminalView() {
  const settings = useSettingsStore();

  return (
    <div className="h-full overflow-y-auto p-6">
      <Section title="Shell & Editor">
        <SettingRow 
            label="Preferred Editor"
             onReset={() => settings.setPreferredEditor('')}
        >
            <input
                className="input"
                value={settings.preferredEditor}
                onChange={(e) => settings.setPreferredEditor(e.target.value)}
                placeholder="e.g. code, vim, nano"
                style={{ width: '100%' }}
            />
        </SettingRow>
      </Section>

      <Section title="Output">
        <SettingRow label="Output Format">
            <select
              value={settings.outputFormat}
              onChange={(e) =>
                settings.setOutputFormat(e.target.value as 'text' | 'json')
              }
              style={{
                background: 'var(--bg-tertiary)',
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius-md)',
                padding: 'var(--space-2) var(--space-3)',
                color: 'var(--text-primary)',
                fontSize: 'var(--text-sm)',
              }}
            >
              <option value="text">Text (Human)</option>
              <option value="json">JSON (Machine)</option>
            </select>
        </SettingRow>
         <div className="text-xs text-muted-foreground mt-2">
            JSON format is useful for programmatic access but harder to read.
        </div>
      </Section>
    </div>
  );
}
