

import { useSettingsStore } from '../../stores/settingsStore';
import { Section, SettingRow } from '../settings/Shared';

export function PreferenceView() {
  const settings = useSettingsStore();

  return (
    <div className="h-full overflow-y-auto p-6">
      <Section title="Appearance">
        <SettingRow label="Theme">
            <select
              value={settings.theme}
              onChange={(e) =>
                settings.setTheme(e.target.value as 'light' | 'dark' | 'system')
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
              <option value="system">System</option>
              <option value="light">Light</option>
              <option value="dark">Dark</option>
            </select>
        </SettingRow>
      </Section>

      <Section title="Notifications">
        <SettingRow label="Enable Notifications">
          <input
            type="checkbox"
            className="checkbox"
            checked={settings.enableNotifications}
            onChange={(e) => settings.setEnableNotifications(e.target.checked)}
          />
        </SettingRow>
        <SettingRow label="Notification Sound">
          <input
            type="checkbox"
            className="checkbox"
            checked={settings.notificationSound}
            onChange={(e) => settings.setNotificationSound(e.target.checked)}
          />
        </SettingRow>
      </Section>
      
      <Section title="Experimental">
        <SettingRow label="Preview Features">
           <input
            type="checkbox"
            className="checkbox"
            checked={settings.previewFeatures}
            onChange={(e) => settings.setPreviewFeatures(e.target.checked)}
          />
        </SettingRow>
        <div className="text-xs text-muted-foreground mt-2">
            Enables early access features like new models and tools.
        </div>
      </Section>
    </div>
  );
}
