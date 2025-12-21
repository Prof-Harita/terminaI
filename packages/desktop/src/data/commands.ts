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
];
