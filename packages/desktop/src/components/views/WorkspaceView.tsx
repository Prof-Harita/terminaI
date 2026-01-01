/**
 * @license
 * Copyright 2025 Google LLC
 * Portions Copyright 2025 TerminaI Authors
 * SPDX-License-Identifier: Apache-2.0
 */

import { useSettingsStore } from '../../stores/settingsStore';
import { Section, SettingRow } from '../settings/Shared';

export function WorkspaceView() {
  const settings = useSettingsStore();

  return (
    <div className="h-full overflow-y-auto p-6">
      <Section title="Security & Trust">
          <SettingRow label="Approval Mode">
            <select
              value={settings.approvalMode}
              onChange={(e) =>
                settings.setApprovalMode(
                  e.target.value as 'safe' | 'prompt' | 'yolo',
                )
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
              <option value="safe">Safe (confirm all)</option>
              <option value="prompt">Smart (confirm risky)</option>
              <option value="yolo">YOLO (no confirm)</option>
            </select>
          </SettingRow>
          <div className="text-xs text-muted-foreground mt-2 p-3 bg-white/5 rounded">
            <h4 className="font-semibold mb-1">Current Workspace</h4>
            <code className="block break-all">{settings.agentWorkspacePath}</code>
          </div>
      </Section>
    </div>
  );
}
