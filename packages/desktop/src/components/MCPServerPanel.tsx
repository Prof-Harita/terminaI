/**
 * @license
 * Copyright 2025 TerminaI Authors
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState } from 'react';
import { useMCPStore } from '../stores/mcpStore';
import { Shield, Trash2, Settings, Plus, Server, AlertCircle } from 'lucide-react';
import { Button } from './ui/button';
import { cn } from '../lib/utils';

export function MCPServerPanel() {
  const servers = useMCPStore((s) => s.servers);
  const updateServer = useMCPStore((s) => s.updateServer);
  const removeServer = useMCPStore((s) => s.removeServer);
  const addServer = useMCPStore((s) => s.addServer);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newServerName, setNewServerName] = useState('');

  const handleAddServer = () => {
    if (newServerName.trim()) {
      addServer({
        name: newServerName.trim(),
        status: 'disconnected',
        toolCount: 0,
        trusted: false,
        timeout: 30,
        includedTools: [],
        excludedTools: [],
      });
      setNewServerName('');
      setShowAddForm(false);
    }
  };

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
          <Server size={14} />
          MCP Servers
        </h3>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setShowAddForm(!showAddForm)}
          className="h-7 px-2"
        >
          <Plus size={14} />
        </Button>
      </div>

      {/* Add Server Form */}
      {showAddForm && (
        <div className="p-3 bg-muted/50 border rounded-lg space-y-2 animate-in slide-in-from-top-2">
          <input
            type="text"
            value={newServerName}
            onChange={(e) => setNewServerName(e.target.value)}
            placeholder="Server name or URL..."
            className="w-full bg-input border border-border rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            onKeyDown={(e) => e.key === 'Enter' && handleAddServer()}
            autoFocus
          />
          <div className="flex gap-2">
            <Button size="sm" onClick={handleAddServer} className="flex-1">
              Add Server
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => {
                setShowAddForm(false);
                setNewServerName('');
              }}
            >
              Cancel
            </Button>
          </div>
        </div>
      )}

      {/* Server List */}
      {servers.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          <Server className="h-8 w-8 mx-auto mb-2 opacity-50" />
          <p className="text-sm">No MCP servers configured</p>
          <p className="text-xs mt-1">Add a server to extend agent capabilities</p>
        </div>
      ) : (
        <div className="space-y-2">
          {servers.map((server) => (
            <div
              key={server.id}
              className={cn(
                'p-3 bg-card border rounded-lg transition-all duration-200',
                expandedId === server.id && 'ring-1 ring-ring'
              )}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  {/* Status indicator */}
                  <div
                    className={cn(
                      'w-2 h-2 rounded-full flex-shrink-0',
                      server.status === 'connected' && 'bg-green-500',
                      server.status === 'disconnected' && 'bg-gray-500',
                      server.status === 'error' && 'bg-red-500'
                    )}
                    title={server.status}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-sm truncate">
                      {server.name}
                    </div>
                    <div className="text-xs text-muted-foreground flex items-center gap-2">
                      <span>{server.toolCount} tools</span>
                      <span className="opacity-50">•</span>
                      <span>{server.timeout}s timeout</span>
                      {server.status === 'error' && (
                        <>
                          <span className="opacity-50">•</span>
                          <span className="text-red-500 flex items-center gap-1">
                            <AlertCircle size={10} />
                            Error
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  {server.trusted && (
                    <span title="Trusted server">
                      <Shield size={14} className="text-green-500" />
                    </span>
                  )}
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    onClick={() =>
                      setExpandedId(expandedId === server.id ? null : server.id)
                    }
                  >
                    <Settings size={14} />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-muted-foreground hover:text-red-500"
                    onClick={() => {
                      if (confirm(`Remove server "${server.name}"?`)) {
                        removeServer(server.id);
                      }
                    }}
                  >
                    <Trash2 size={14} />
                  </Button>
                </div>
              </div>

              {/* Expanded Settings */}
              {expandedId === server.id && (
                <div className="mt-3 pt-3 border-t border-border/50 space-y-3 animate-in slide-in-from-top-2">
                  <label className="flex items-center gap-2 text-xs cursor-pointer group">
                    <input
                      type="checkbox"
                      checked={server.trusted}
                      onChange={(e) =>
                        updateServer(server.id, { trusted: e.target.checked })
                      }
                      className="rounded border-border"
                    />
                    <span className="group-hover:text-foreground transition-colors">
                      Trust this server
                    </span>
                    <span className="text-muted-foreground ml-auto">
                      (auto-approve tools)
                    </span>
                  </label>

                  <div className="space-y-1">
                    <label className="text-xs text-muted-foreground">
                      Timeout
                    </label>
                    <select
                      value={server.timeout}
                      onChange={(e) =>
                        updateServer(server.id, { timeout: +e.target.value })
                      }
                      className="w-full text-xs bg-muted border border-border rounded px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-ring"
                    >
                      <option value={10}>10 seconds</option>
                      <option value={30}>30 seconds</option>
                      <option value={60}>1 minute</option>
                      <option value={120}>2 minutes</option>
                      <option value={300}>5 minutes</option>
                    </select>
                  </div>

                  <div className="flex gap-2 pt-2">
                    <Button
                      size="sm"
                      variant="outline"
                      className="flex-1 text-xs"
                      onClick={() => {
                        updateServer(server.id, { status: 'disconnected' });
                        // TODO: Trigger actual reconnect via backend
                        setTimeout(() => {
                          updateServer(server.id, { status: 'connected' });
                        }, 1000);
                      }}
                    >
                      Reconnect
                    </Button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
