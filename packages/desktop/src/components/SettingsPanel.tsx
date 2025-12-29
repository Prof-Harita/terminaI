/**
 * @license
 * Copyright 2025 Google LLC
 * Portions Copyright 2025 TerminaI Authors
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState } from 'react';
import { useSettingsStore } from '../stores/settingsStore';
import { RotateCcw } from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  sendMessage: (text: string) => void;
}

export function SettingsPanel({ isOpen, onClose, sendMessage }: Props) {
  const settings = useSettingsStore();
  const [search, setSearch] = useState('');

  if (!isOpen) return null;

  const matchesSearch = (text: string) => 
    text.toLowerCase().includes(search.toLowerCase());

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
          width: '380px',
          background: 'var(--bg-secondary)',
          borderLeft: '1px solid var(--border)',
          padding: 'var(--space-6)',
          overflowY: 'auto',
          boxShadow: '-4px 0 20px rgba(0,0,0,0.3)',
        }}
      >
        {/* Header */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: 'var(--space-4)',
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

        {/* Task 25: Search Box */}
        <div style={{ marginBottom: 'var(--space-6)' }}>
          <input
            className="input"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search settings..."
            style={{ width: '100%', background: 'var(--bg-tertiary)' }}
          />
        </div>

        {/* Account Section */}
        <Section title="Account" show={matchesSearch('Account') || matchesSearch('email') || matchesSearch('sign out')}>
          <p
            style={{
              fontSize: 'var(--text-sm)',
              color: 'var(--text-primary)',
              margin: 0,
            }}
          >
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

        {/* Agent Section */}
        <Section title="Agent" show={matchesSearch('Agent') || matchesSearch('URL') || matchesSearch('Token') || matchesSearch('Workspace')}>
          <SettingRow 
            label="Agent URL" 
            show={matchesSearch('Agent URL')}
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
            show={matchesSearch('Agent Token')}
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
            show={matchesSearch('Workspace Path')}
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
        </Section>

        {/* Security Section */}
        <Section title="Security" show={matchesSearch('Security') || matchesSearch('Approval') || matchesSearch('Preview')}>
          <SettingRow label="Approval Mode" show={matchesSearch('Approval Mode')}>
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
        </Section>

        {/* MCP Servers Section */}
        <Section title="MCP Servers" show={matchesSearch('MCP') || matchesSearch('model context protocol') || settings.mcpServers.length > 0}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
            {settings.mcpServers.map((server) => (
              <div 
                key={server.id} 
                style={{ 
                  background: 'var(--bg-tertiary)', 
                  padding: 'var(--space-3)', 
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--border)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 'var(--space-2)'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                    <div 
                      style={{ 
                        width: '8px', 
                        height: '8px', 
                        borderRadius: '50%', 
                        background: server.enabled ? '#22c55e' : '#6b7280',
                        boxShadow: server.enabled ? '0 0 8px rgba(34, 197, 94, 0.4)' : 'none'
                      }} 
                    />
                    <span style={{ fontWeight: 600, fontSize: 'var(--text-sm)' }}>{server.name}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                    <button 
                      onClick={() => {
                        onClose();
                        sendMessage(`/mcp logs ${server.name}`);
                      }}
                      className="text-muted-foreground hover:text-foreground text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded border border-border/50 hover:bg-white/5"
                    >
                      Logs
                    </button>
                    <input
                      type="checkbox"
                      checked={server.enabled}
                      onChange={() => settings.toggleMcpServer(server.id)}
                      style={{ accentColor: 'var(--accent)', marginLeft: '4px' }}
                    />
                    <button 
                      onClick={() => settings.removeMcpServer(server.id)}
                      className="text-red-500 hover:text-red-600 text-xs font-semibold ml-2"
                    >
                      Remove
                    </button>
                  </div>
                </div>
                <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', overflowX: 'auto' }}>
                  {server.command} {server.args.join(' ')}
                </div>
              </div>
            ))}
            
            <button 
              className="btn btn-ghost" 
              style={{ 
                border: '1px dashed var(--border)', 
                fontSize: 'var(--text-xs)', 
                padding: 'var(--space-2)',
                color: 'var(--text-muted)'
              }}
              onClick={() => {
                const name = prompt('Server Name:');
                if (!name) return;
                const command = prompt('Command:');
                if (!command) return;
                const args = prompt('Args (JSON array, e.g. ["--arg1"]):');
                try {
                  settings.addMcpServer({ 
                    name, 
                    command, 
                    args: args ? JSON.parse(args) : [] 
                  });
                } catch (e) {
                  alert('Invalid args JSON');
                }
              }}
            >
              + Add MCP Server
            </button>
          </div>
        </Section>

        {/* Remote Relay Section */}
        <Section title="Remote Relay" show={matchesSearch('Remote') || matchesSearch('Relay')}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
            <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', marginBottom: 'var(--space-2)' }}>
              Enable others to view and interact with this session via web relay.
            </p>
            <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
              <button 
                className="btn btn-primary"
                style={{ flex: 1, fontSize: 'var(--text-xs)', padding: 'var(--space-2)' }}
                onClick={() => {
                  onClose();
                  sendMessage('/relay broadcast');
                }}
              >
                Start Broadcast
              </button>
              <button 
                className="btn btn-ghost"
                style={{ 
                  flex: 1, 
                  fontSize: 'var(--text-xs)', 
                  padding: 'var(--space-2)',
                  color: 'var(--text-muted)',
                  border: '1px solid var(--border)'
                }}
                onClick={() => {
                  if (confirm('Disconnect all relay clients?')) {
                    onClose();
                    sendMessage('/relay reset');
                  }
                }}
              >
                Disconnect All
              </button>
            </div>
          </div>
        </Section>

        {/* Notifications Section */}
        <Section title="Notifications" show={matchesSearch('Notifications') || matchesSearch('Sound')}>
          <SettingRow label="Enable Notifications" show={matchesSearch('Enable Notifications')}>
            <input
              type="checkbox"
              className="checkbox"
              checked={settings.enableNotifications}
              onChange={(e) => settings.setEnableNotifications(e.target.checked)}
            />
          </SettingRow>
          <SettingRow label="Notification Sound" show={matchesSearch('Notification Sound')}>
            <input
              type="checkbox"
              className="checkbox"
              checked={settings.notificationSound}
              onChange={(e) => settings.setNotificationSound(e.target.checked)}
            />
          </SettingRow>
        </Section>

        {/* Capabilities Section */}
        <Section title="Capabilities" show={matchesSearch('Capabilities') || matchesSearch('Voice') || matchesSearch('Model')}>
          <SettingRow label="Provider" show={matchesSearch('Provider')}>
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
          <SettingRow label="Enable Voice" show={matchesSearch('Enable Voice')}>
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
          <SettingRow label="Voice Volume" show={matchesSearch('Voice Volume')}>
            <input
              type="range"
              min="0"
              max="100"
              value={settings.voiceVolume}
              onChange={(e) => settings.setVoiceVolume(Number(e.target.value))}
              style={{ width: '120px', accentColor: 'var(--accent)' }}
            />
          </SettingRow>
          <SettingRow label="PTT Key" show={matchesSearch('PTT') || matchesSearch('Push-to-Talk')}>
            <span style={{ fontSize: 'var(--text-sm)', color: 'var(--text-muted)' }}>Space</span>
          </SettingRow>
        </Section>

        {/* Import/Export Settings */}
        <div style={{ marginTop: 'var(--space-8)', paddingTop: 'var(--space-4)', borderTop: '1px solid var(--border)', display: 'flex', gap: 'var(--space-2)' }}>
          <button
            className="btn btn-ghost"
            onClick={() => {
              const data = JSON.stringify(settings, null, 2);
              const blob = new Blob([data], { type: 'application/json' });
              const url = URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = url;
              a.download = `terminai-settings-${new Date().toISOString().split('T')[0]}.json`;
              a.click();
              URL.revokeObjectURL(url);
            }}
            style={{ flex: 1, fontSize: 'var(--text-xs)' }}
          >
            Export Settings
          </button>
          <button
            className="btn btn-ghost"
            onClick={() => {
              const input = document.createElement('input');
              input.type = 'file';
              input.accept = '.json';
              input.onchange = (e: any) => {
                const file = e.target.files[0];
                if (!file) return;
                const reader = new FileReader();
                reader.onload = (e) => {
                  try {
                    const imported = JSON.parse(e.target?.result as string);
                    Object.keys(imported).forEach(key => {
                      if (typeof (settings as any)[`set${key.charAt(0).toUpperCase() + key.slice(1)}`] === 'function') {
                        (settings as any)[`set${key.charAt(0).toUpperCase() + key.slice(1)}`](imported[key]);
                      }
                    });
                    alert('Settings imported successfully!');
                  } catch (err) {
                    alert('Failed to import settings: Invalid JSON file');
                  }
                };
                reader.readAsText(file);
              };
              input.click();
            }}
            style={{ flex: 1, fontSize: 'var(--text-xs)' }}
          >
            Import Settings
          </button>
        </div>
      </div>
    </div>
  );
}

function Section({
  title,
  show = true,
  children,
}: {
  title: string;
  show?: boolean;
  children: React.ReactNode;
}) {
  if (!show) return null;
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
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: 'var(--space-4)',
        }}
      >
        {children}
      </div>
    </section>
  );
}

function SettingRow({
  label,
  show = true,
  children,
  onReset,
}: {
  label: string;
  show?: boolean;
  children: React.ReactNode;
  onReset?: () => void;
}) {
  if (!show) return null;
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 'var(--space-4)',
        minHeight: '32px',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
        <span
          style={{ 
            fontSize: 'var(--text-sm)', 
            color: 'var(--text-primary)',
          }}
        >
          {label}
        </span>
        {onReset && (
          <button
            onClick={onReset}
            style={{
              padding: '2px',
              color: 'var(--text-muted)',
              cursor: 'pointer',
              background: 'none',
              border: 'none',
            }}
            title="Reset to default"
          >
            <RotateCcw size={12} />
          </button>
        )}
      </div>
      <div style={{ flex: 1, display: 'flex', justifyContent: 'flex-end' }}>
        {children}
      </div>
    </div>
  );
}
