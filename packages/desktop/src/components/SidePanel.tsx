/**
 * @license
 * Copyright 2025 Google LLC
 * Portions Copyright 2025 TerminaI Authors
 * SPDX-License-Identifier: Apache-2.0
 */

import { HistoryView } from './views/HistoryView'
import type { ActivityView } from './ActivityBar'
import { AssistantView } from './views/AssistantView'
import { ConnectivityView } from './views/ConnectivityView'
import { WorkspaceView } from './views/WorkspaceView'
import { LibraryView } from './views/LibraryView'
import { PreferenceView } from './views/PreferenceView'
import { AccountView } from './views/AccountView'
import { TerminalView } from './views/TerminalView'
import { useBridgeStore } from '../bridge/store'

interface SidePanelProps {
  activeView: ActivityView | null
  sendMessage: (text: string) => void
}

export function SidePanel({ activeView, sendMessage }: SidePanelProps) {
  // BM-2 FIX: Wire session restore
  const setCurrentConversationId = useBridgeStore((s) => s.setCurrentConversationId);
  
  const handleSessionRestore = (sessionId: string) => {
    // Set the conversation ID so subsequent messages continue this conversation
    setCurrentConversationId(sessionId);
    console.log('[Session] Restored conversation:', sessionId);
  };
  
  if (!activeView) return null

  const renderContent = () => {
    switch (activeView) {
      case 'history':
        return <HistoryView onSelectSession={handleSessionRestore} />
      
      case 'assistant':
        return <AssistantView />

      case 'connectivity':
        return <ConnectivityView sendMessage={sendMessage} />

      case 'library':
        return <LibraryView sendMessage={sendMessage} />

      case 'workspace':
        return <WorkspaceView />

      case 'terminal':
        return <TerminalView />

      case 'preference':
        return <PreferenceView />

      case 'account':
        return <AccountView />
        
      default:
        return null
    }
  }

  return (
    <div className="w-[380px] h-full border-r border-border bg-sidebar bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 flex flex-col transition-all duration-300 ease-in-out">
      {renderContent()}
    </div>
  )
}
