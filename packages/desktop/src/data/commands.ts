/**
 * @license
 * Copyright 2025 Google LLC
 * Portions Copyright 2025 TerminaI Authors
 * SPDX-License-Identifier: Apache-2.0
 */

export interface Command {
  id: string;
  name: string;
  description: string;
  category: string;
  action: string; // CLI command to send
  shortcut?: string;
}

export const COMMANDS: Command[] = [
  // Sessions
  {
    id: 'sessions-list',
    name: '/sessions list',
    description: 'Show running sessions',
    category: 'Sessions',
    action: '/sessions list',
  },
  {
    id: 'sessions-stop',
    name: '/sessions stop',
    description: 'Stop a session',
    category: 'Sessions',
    action: '/sessions stop ',
  },

  // Conversation
  {
    id: 'clear',
    name: '/clear',
    description: 'Clear chat history',
    category: 'Conversation',
    action: '/clear',
  },
  {
    id: 'checkpoint',
    name: '/checkpoint',
    description: 'Save conversation state',
    category: 'Conversation',
    action: '/checkpoint',
  },
  {
    id: 'restore',
    name: '/restore',
    description: 'Resume previous session',
    category: 'Conversation',
    action: '/restore',
  },

  // Security
  {
    id: 'trust',
    name: '/trust',
    description: 'Trust current folder',
    category: 'Security',
    action: '/trust',
  },
  {
    id: 'untrust',
    name: '/untrust',
    description: 'Revoke folder trust',
    category: 'Security',
    action: '/untrust',
  },

  // Help
  {
    id: 'help',
    name: '/help',
    description: 'Show all commands',
    category: 'Help',
    action: '/help',
  },
  {
    id: 'bug',
    name: '/bug',
    description: 'Report an issue',
    category: 'Help',
    action: '/bug',
  },

  // System (Task 32)
  {
    id: 'settings',
    name: 'Open Settings',
    description: 'Manage app configuration',
    category: 'System',
    action: 'frontend:settings',
    shortcut: 'Ctrl+,',
  },
  {
    id: 'palette',
    name: 'Command Palette',
    description: 'Find and run commands',
    category: 'System',
    action: 'frontend:palette',
    shortcut: 'Ctrl+K',
  },
  {
    id: 'new-chat',
    name: 'New Conversation',
    description: 'Start a fresh chat',
    category: 'System',
    action: 'frontend:new-chat',
    shortcut: 'Ctrl+N',
  },
  {
    id: 'shortcuts',
    name: 'Keyboard Shortcuts',
    description: 'View all shortcuts',
    category: 'System',
    action: 'frontend:shortcuts',
    shortcut: 'Ctrl+/',
  },
];
