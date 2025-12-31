
import { HistoryView } from './views/HistoryView'
import { ActivityView } from './ActivityBar'
import { AssistantView } from './views/AssistantView'
import { ConnectivityView } from './views/ConnectivityView'
import { WorkspaceView } from './views/WorkspaceView'
import { LibraryView } from './views/LibraryView'
import { PreferenceView } from './views/PreferenceView'
import { AccountView } from './views/AccountView'
import { TerminalView } from './views/TerminalView'

interface SidePanelProps {
  activeView: ActivityView | null
  sendMessage: (text: string) => void
}

export function SidePanel({ activeView, sendMessage }: SidePanelProps) {
  
  if (!activeView) return null

  const renderContent = () => {
    switch (activeView) {
      case 'history':
        return <HistoryView onSelectSession={(id) => console.log('[TODO] Session restore:', id)} />
      
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
