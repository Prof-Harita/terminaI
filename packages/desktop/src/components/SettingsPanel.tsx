import { useSettingsStore } from '../stores/settingsStore';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export function SettingsPanel({ isOpen, onClose }: Props) {
  const settings = useSettingsStore();

  if (!isOpen) return null;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 50,
        display: 'flex',
      }}
    >
      {/* Backdrop */}
      <div
        style={{
          flex: 1,
          background: 'rgba(0, 0, 0, 0.5)',
          backdropFilter: 'blur(2px)',
        }}
        onClick={onClose}
      />

      {/* Panel */}
      <div
        style={{
          width: '340px',
          background: 'var(--bg-secondary)',
          borderLeft: '1px solid var(--border)',
          padding: 'var(--space-6)',
          overflowY: 'auto',
        }}
      >
        {/* Header */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: 'var(--space-8)',
          }}
        >
          <h2
            style={{
              margin: 0,
              fontSize: 'var(--text-xl)',
              fontWeight: 600,
              color: 'var(--text-primary)',
            }}
          >
            Settings
          </h2>
          <button
            onClick={onClose}
            className="btn btn-ghost"
            style={{ padding: 'var(--space-2)', fontSize: 'var(--text-lg)' }}
          >
            ✕
          </button>
        </div>

        {/* Account Section */}
        <Section title="Account">
          <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-primary)', margin: 0 }}>
            {settings.email || 'Not signed in'}
          </p>
          {settings.email && (
            <button
              className="btn btn-ghost"
              onClick={settings.signOut}
              style={{
                marginTop: 'var(--space-2)',
                padding: 'var(--space-2) 0',
                fontSize: 'var(--text-sm)',
                color: 'var(--accent)',
              }}
            >
              Sign Out
            </button>
          )}
        </Section>

        {/* Security Section */}
        <Section title="Security">
          <SettingRow label="Approval Mode">
            <select
              value={settings.approvalMode}
              onChange={(e) =>
                settings.setApprovalMode(e.target.value as 'safe' | 'prompt' | 'yolo')
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
          <SettingRow label="Preview Mode">
            <input
              type="checkbox"
              checked={settings.previewMode}
              onChange={(e) => settings.setPreviewMode(e.target.checked)}
              style={{ width: '18px', height: '18px', accentColor: 'var(--accent)' }}
            />
          </SettingRow>
        </Section>

        {/* Model Section */}
        <Section title="Model">
          <SettingRow label="Provider">
            <select
              value={settings.provider}
              onChange={(e) => settings.setProvider(e.target.value as 'gemini' | 'ollama')}
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

        {/* Voice Section */}
        <Section title="Voice">
          <SettingRow label="Push-to-Talk Key">
            <span style={{ fontSize: 'var(--text-sm)', color: 'var(--text-muted)' }}>Space</span>
          </SettingRow>
          <SettingRow label="Volume">
            <input
              type="range"
              min="0"
              max="100"
              value={settings.voiceVolume}
              onChange={(e) => settings.setVoiceVolume(Number(e.target.value))}
              style={{ width: '120px', accentColor: 'var(--accent)' }}
            />
          </SettingRow>
        </Section>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
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
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
        {children}
      </div>
    </section>
  );
}

function SettingRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
      }}
    >
      <span style={{ fontSize: 'var(--text-sm)', color: 'var(--text-primary)' }}>{label}</span>
      {children}
    </div>
  );
}
