

import { useSettingsStore } from '../../stores/settingsStore';
import { Section } from '../settings/Shared';

interface Props {
  sendMessage: (text: string) => void;
}

export function ConnectivityView({ sendMessage }: Props) {
  const settings = useSettingsStore();

  return (
    <div className="h-full overflow-y-auto p-6">
      <Section title="MCP Servers">
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

        <Section title="Remote Relay">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
            <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', marginBottom: 'var(--space-2)' }}>
              Enable others to view and interact with this session via web relay.
            </p>
            <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
              <button 
                className="btn btn-primary"
                style={{ flex: 1, fontSize: 'var(--text-xs)', padding: 'var(--space-2)' }}
                onClick={() => {
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
                    sendMessage('/relay reset');
                  }
                }}
              >
                Disconnect All
              </button>
            </div>
          </div>
        </Section>
    </div>
  );
}
