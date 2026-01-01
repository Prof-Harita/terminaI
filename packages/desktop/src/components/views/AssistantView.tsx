/**
 * @license
 * Copyright 2025 Google LLC
 * Portions Copyright 2025 TerminaI Authors
 * SPDX-License-Identifier: Apache-2.0
 */

import { useSettingsStore } from '../../stores/settingsStore';
import { Section, SettingRow } from '../settings/Shared';

export function AssistantView() {
  const settings = useSettingsStore();

  return (
    <div className="h-full overflow-y-auto p-6">
      <Section title="Agent Configuration">
        <SettingRow 
          label="Agent URL" 
          onReset={() => settings.setAgentUrl('http://127.0.0.1:41242')}
        >
          <input
            className="input"
            value={settings.agentUrl}
            onChange={(e) => settings.setAgentUrl(e.target.value)}
            placeholder="http://127.0.0.1:41242"
            style={{ width: '100%' }}
          />
        </SettingRow>
        <SettingRow 
          label="Agent Token" 
          onReset={() => settings.setAgentToken('')}
        >
          <input
            className="input"
            value={settings.agentToken}
            onChange={(e) => settings.setAgentToken(e.target.value)}
            placeholder="paste token"
            type="password"
            style={{ width: '100%' }}
          />
        </SettingRow>
        <SettingRow 
          label="Workspace Path" 
          onReset={() => settings.setAgentWorkspacePath('/tmp')}
        >
          <input
            className="input"
            value={settings.agentWorkspacePath}
            onChange={(e) => settings.setAgentWorkspacePath(e.target.value)}
            placeholder="/tmp"
            style={{ width: '100%' }}
          />
        </SettingRow>
        <SettingRow label="Provider">
            <select
              value={settings.provider}
              onChange={(e) =>
                settings.setProvider(e.target.value as 'gemini' | 'ollama')
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
              <option value="gemini">Gemini</option>
              <option value="ollama">Ollama (Local)</option>
            </select>
          </SettingRow>
      </Section>

      <Section title="Voice Interaction">
        <SettingRow label="Enable Voice">
          <input
            type="checkbox"
            checked={settings.voiceEnabled}
            onChange={(e) => settings.setVoiceEnabled(e.target.checked)}
            style={{
              width: '18px',
              height: '18px',
              accentColor: 'var(--accent)',
            }}
          />
        </SettingRow>
        <SettingRow label="Voice Volume">
          <input
            type="range"
            min="0"
            max="100"
            value={settings.voiceVolume}
            onChange={(e) => settings.setVoiceVolume(Number(e.target.value))}
            style={{ width: '120px', accentColor: 'var(--accent)' }}
          />
        </SettingRow>
        <SettingRow label="PTT Key">
          <span style={{ fontSize: 'var(--text-sm)', color: 'var(--text-muted)' }}>Space</span>
        </SettingRow>
      </Section>
    </div>
  );
}
