/**
 * @license
 * Copyright 2025 Google LLC
 * Portions Copyright 2025 TerminaI Authors
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  Clock,
  Sparkles,
  Link,
  Library,
  Briefcase,
  Terminal,
  Settings2,
  User,
  Plus,
} from 'lucide-react';
import { cn } from '../lib/utils';
import { Button } from './ui/button';

export type ActivityView =
  | 'history'
  | 'assistant'
  | 'connectivity'
  | 'library'
  | 'workspace'
  | 'terminal'
  | 'preference'
  | 'account';

interface ActivityBarProps {
  activeView: ActivityView | null;
  onViewChange: (view: ActivityView | null) => void;
  onNewChat?: () => void;
}

interface ActivityItemProps {
  icon: React.ElementType;
  label: string;
  isActive: boolean;
  onClick: () => void;
  isBottom?: boolean;
}

function ActivityItem({
  icon: Icon,
  label,
  isActive,
  onClick,
  isBottom,
}: ActivityItemProps) {
  return (
    <div
      className={cn(
        'relative flex justify-center py-3',
        isBottom && 'mt-auto pb-4',
      )}
    >
      {isActive && (
        <div className="absolute left-0 top-3 bottom-3 w-0.5 bg-black dark:bg-white rounded-r-full" />
      )}
      <Button
        variant="ghost"
        size="icon"
        onClick={onClick}
        className={cn(
          'h-10 w-10 text-muted-foreground transition-all hover:text-foreground relative group',
          isActive && 'text-black dark:text-white',
        )}
        title={label}
      >
        <Icon
          className={cn(
            'h-6 w-6 stroke-[1.5] stroke-[#555] dark:stroke-[#999] transition-colors',
            isActive && 'stroke-black dark:stroke-white stroke-[2]',
          )}
        />
      </Button>
    </div>
  );
}

export function ActivityBar({
  activeView,
  onViewChange,
  onNewChat,
}: ActivityBarProps) {
  const toggleView = (view: ActivityView) => {
    if (activeView === view) {
      onViewChange(null);
    } else {
      onViewChange(view);
    }
  };

  return (
    <div className="w-[48px] bg-zinc-100 dark:bg-zinc-900 border-r border-border flex flex-col h-full flex-shrink-0 z-30">
      {onNewChat && (
        <div className="flex justify-center py-3 pb-1">
          <Button
            size="icon"
            onClick={onNewChat}
            className="h-9 w-9 bg-red-600 hover:bg-red-500 text-white rounded-full shadow-md group transition-all hover:scale-105"
            title="New Chat"
          >
            <Plus className="h-6 w-6 stroke-[2.5]" />
          </Button>
        </div>
      )}

      <ActivityItem
        icon={Clock}
        label="History"
        isActive={activeView === 'history'}
        onClick={() => toggleView('history')}
      />
      <ActivityItem
        icon={Sparkles}
        label="Assistant"
        isActive={activeView === 'assistant'}
        onClick={() => toggleView('assistant')}
      />
      <ActivityItem
        icon={Link}
        label="Connectivity"
        isActive={activeView === 'connectivity'}
        onClick={() => toggleView('connectivity')}
      />
      <ActivityItem
        icon={Library}
        label="Library"
        isActive={activeView === 'library'}
        onClick={() => toggleView('library')}
      />
      <ActivityItem
        icon={Briefcase}
        label="Workspace"
        isActive={activeView === 'workspace'}
        onClick={() => toggleView('workspace')}
      />
      <ActivityItem
        icon={Terminal}
        label="Terminal"
        isActive={activeView === 'terminal'}
        onClick={() => toggleView('terminal')}
      />
      <ActivityItem
        icon={Settings2}
        label="Preferences"
        isActive={activeView === 'preference'}
        onClick={() => toggleView('preference')}
      />

      <div className="flex-1" />

      <ActivityItem
        icon={User}
        label="Account"
        isActive={activeView === 'account'}
        onClick={() => toggleView('account')}
        isBottom
      />
    </div>
  );
}
