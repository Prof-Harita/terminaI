"use client"

import { useState } from "react"
import { cn } from "../lib/utils"
import { Input } from "./ui/input"
import { Label } from "./ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select"
import { Checkbox } from "./ui/checkbox"
import { Slider } from "./ui/slider"
import { useSettingsStore } from "../stores/settingsStore"

function CommandItem({
  command,
  description,
  category,
  highlighted = false,
  onClick,
}: {
  command: string
  description: string
  category: string
  highlighted?: boolean
  onClick?: () => void
}) {
  return (
    <div
      className={cn(
        "flex items-start justify-between p-2.5 rounded-md cursor-pointer transition-colors",
        highlighted ? "bg-primary/10 border border-primary/20" : "hover:bg-sidebar-accent",
      )}
      onClick={onClick}
    >
      <div className="flex-1 min-w-0">
        <div className="font-mono text-sm font-medium">{command}</div>
        <div className={cn("text-xs mt-0.5", "text-muted-foreground")}>
          {description}
        </div>
      </div>
      <div className="text-xs ml-2 flex-shrink-0 text-muted-foreground">
        {category}
      </div>
    </div>
  )
}

interface LeftSidebarProps {
  onCommandSelect?: (command: string) => void
}

export function LeftSidebar({ onCommandSelect }: LeftSidebarProps) {
  const [activeTab, setActiveTab] = useState<"settings" | "history">("settings")
  const [settingsCategory, setSettingsCategory] = useState<"app" | "cli">("app")
  
  const agentUrl = useSettingsStore(s => s.agentUrl)
  const setAgentUrl = useSettingsStore(s => s.setAgentUrl)
  const agentToken = useSettingsStore(s => s.agentToken)
  const setAgentToken = useSettingsStore(s => s.setAgentToken)
  const agentWorkspacePath = useSettingsStore(s => s.agentWorkspacePath)
  const setAgentWorkspacePath = useSettingsStore(s => s.setAgentWorkspacePath)
  const approvalMode = useSettingsStore(s => s.approvalMode)
  const setApprovalMode = useSettingsStore(s => s.setApprovalMode)
  const previewMode = useSettingsStore(s => s.previewMode)
  const setPreviewMode = useSettingsStore(s => s.setPreviewMode)
  const voiceEnabled = useSettingsStore(s => s.voiceEnabled)
  const setVoiceEnabled = useSettingsStore(s => s.setVoiceEnabled)
  const voiceVolume = useSettingsStore(s => s.voiceVolume)
  const setVoiceVolume = useSettingsStore(s => s.setVoiceVolume)

  const approvalModeUiValue =
    approvalMode === 'safe' ? 'auto' : approvalMode === 'prompt' ? 'manual' : 'disabled'

  return (
    <div className="h-full flex flex-col">
      {/* Tabs */}
      <div className="flex border-b border-sidebar-border">
        <button
          className={cn(
            "flex-1 py-2 text-base font-medium transition-colors",
            activeTab === "settings"
              ? "border-b-2 border-sidebar-primary text-sidebar-foreground"
              : "text-muted-foreground hover:text-sidebar-foreground",
          )}
          onClick={() => setActiveTab("settings")}
        >
          Settings
        </button>
        <button
          className={cn(
            "flex-1 py-2 text-base font-medium transition-colors",
            activeTab === "history"
              ? "border-b-2 border-sidebar-primary text-sidebar-foreground"
              : "text-muted-foreground hover:text-sidebar-foreground",
          )}
          onClick={() => setActiveTab("history")}
        >
          History
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {activeTab === "settings" ? (
          <div className="flex flex-col h-full">
            {/* App/CLI category tabs within Settings */}
            <div className="flex border-b border-sidebar-border">
              <button
                className={cn(
                  "flex-1 py-2 text-sm font-medium transition-colors",
                  settingsCategory === "app"
                    ? "border-b-2 border-sidebar-primary text-sidebar-foreground"
                    : "text-muted-foreground hover:text-sidebar-foreground",
                )}
                onClick={() => setSettingsCategory("app")}
              >
                App
              </button>
              <button
                className={cn(
                  "flex-1 py-2 text-sm font-medium transition-colors",
                  settingsCategory === "cli"
                    ? "border-b-2 border-sidebar-primary text-sidebar-foreground"
                    : "text-muted-foreground hover:text-sidebar-foreground",
                )}
                onClick={() => setSettingsCategory("cli")}
              >
                CLI
              </button>
            </div>

            {settingsCategory === "app" && (
              <div className="p-4 space-y-6">
                {/* AGENT section */}
                <div className="space-y-3">
                  <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Agent</h3>
                  <div className="space-y-2">
                    <Label htmlFor="agent-url" className="text-sm">
                      Agent URL
                    </Label>
                    <Input 
                      id="agent-url" 
                      type="text" 
                      value={agentUrl}
                      onChange={(e) => setAgentUrl(e.target.value)}
                      className="h-9 text-sm" 
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="agent-token" className="text-sm">
                      Agent Token
                    </Label>
                    <Input 
                      id="agent-token" 
                      type="password" 
                      value={agentToken}
                      onChange={(e) => setAgentToken(e.target.value)}
                      className="h-9 text-sm" 
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="workspace-path" className="text-sm">
                      Workspace Path
                    </Label>
                    <Input 
                      id="workspace-path" 
                      type="text" 
                      value={agentWorkspacePath}
                      onChange={(e) => setAgentWorkspacePath(e.target.value)}
                      className="h-9 text-sm" 
                    />
                  </div>
                </div>

                {/* SECURITY section */}
                <div className="space-y-3">
                  <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Security</h3>
                  <div className="space-y-2">
                    <Label htmlFor="approval-mode" className="text-sm">
                      Approval Mode
                    </Label>
                    <Select
                      value={approvalModeUiValue}
                      onValueChange={(value) => {
                        setApprovalMode(
                          value === 'auto'
                            ? 'safe'
                            : value === 'manual'
                              ? 'prompt'
                              : 'yolo',
                        )
                      }}
                    >
                      <SelectTrigger id="approval-mode" className="h-9">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="auto">Auto</SelectItem>
                        <SelectItem value="manual">Manual</SelectItem>
                        <SelectItem value="disabled">Disabled</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="preview-mode"
                      checked={previewMode}
                      onCheckedChange={(checked) => setPreviewMode(checked === true)}
                    />
                    <Label htmlFor="preview-mode" className="text-sm cursor-pointer">
                      Preview Mode
                    </Label>
                  </div>
                </div>

                {/* MODEL section */}
                <div className="space-y-3">
                  <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Model</h3>
                  <div className="space-y-2">
                    <Label htmlFor="provider" className="text-sm">
                      Provider
                    </Label>
                    <Select defaultValue="openai">
                      <SelectTrigger id="provider" className="h-9">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="openai">OpenAI</SelectItem>
                        <SelectItem value="anthropic">Anthropic</SelectItem>
                        <SelectItem value="google">Google</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* VOICE section */}
                <div className="space-y-3">
                  <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Voice</h3>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="enable-voice"
                      checked={voiceEnabled}
                      onCheckedChange={(checked) => setVoiceEnabled(checked === true)}
                    />
                    <Label htmlFor="enable-voice" className="text-sm cursor-pointer">
                      Enable Voice
                    </Label>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="ptt-key" className="text-sm">
                      Push-to-Talk Key
                    </Label>
                    <div className="h-9 px-3 rounded-md border border-border bg-background flex items-center justify-between text-sm text-muted-foreground">
                      <span>Space</span>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="volume" className="text-sm">
                      Volume
                    </Label>
                    <Slider
                      id="volume"
                      value={[voiceVolume]}
                      max={100}
                      step={1}
                      className="py-2"
                      onValueChange={(value) => {
                        const next = value[0]
                        if (typeof next === 'number') {
                          setVoiceVolume(next)
                        }
                      }}
                    />
                  </div>
                </div>
              </div>
            )}

            {settingsCategory === "cli" && (
              <div className="p-3 space-y-2">
                <Input type="text" placeholder="Search commands..." className="h-9 mb-3 text-sm" />

                {/* Conversation commands */}
                <div className="space-y-1">
                  <CommandItem
                    command="/restore"
                    description="Resume previous session"
                    category="Conversation"
                    highlighted
                    onClick={() => onCommandSelect?.('/restore')}
                  />
                  <CommandItem command="/clear" description="Clear chat history" category="Conversation" onClick={() => onCommandSelect?.('/clear')} />
                  <CommandItem command="/checkpoint" description="Save conversation state" category="Conversation" onClick={() => onCommandSelect?.('/checkpoint')} />
                </div>

                {/* Security commands */}
                <div className="space-y-1 mt-3">
                  <CommandItem command="/trust" description="Trust current folder" category="Security" onClick={() => onCommandSelect?.('/trust')} />
                  <CommandItem command="/untrust" description="Revoke folder trust" category="Security" onClick={() => onCommandSelect?.('/untrust')} />
                </div>

                {/* Sessions commands */}
                <div className="space-y-1 mt-3">
                  <CommandItem command="/sessions list" description="Show running sessions" category="Sessions" onClick={() => onCommandSelect?.('/sessions list')} />
                  <CommandItem command="/sessions stop" description="Stop a session" category="Sessions" onClick={() => onCommandSelect?.('/sessions stop')} />
                </div>

                {/* Help commands */}
                <div className="space-y-1 mt-3">
                  <CommandItem command="/help" description="Show all commands" category="Help" onClick={() => onCommandSelect?.('/help')} />
                  <CommandItem command="/bug" description="Report an issue" category="Help" onClick={() => onCommandSelect?.('/bug')} />
                </div>

                <div className="text-xs text-muted-foreground pt-3 border-t border-border flex items-center gap-3">
                  <span>↑↓ navigate</span>
                  <span>Enter select</span>
                  <span>Esc close</span>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="p-4 space-y-4">
            <div className="text-center py-8">
              <div className="text-muted-foreground text-sm">No session history yet</div>
              <div className="text-muted-foreground/60 text-xs mt-1">
                Start a conversation to see history
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
