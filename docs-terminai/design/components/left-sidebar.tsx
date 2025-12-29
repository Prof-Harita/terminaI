"use client"

import { useState } from "react"
import { ChevronDown, ChevronRight, File, Folder } from "lucide-react"
import { cn } from "@/lib/utils"
import { Input } from "./ui/input"
import { Label } from "./ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select"
import { Checkbox } from "./ui/checkbox"
import { Slider } from "./ui/slider"

interface FileNode {
  name: string
  type: "file" | "folder"
  children?: FileNode[]
}

const mockFileTree: FileNode[] = [
  {
    name: "terminal-website",
    type: "folder",
    children: [
      { name: "Architectural Deep Dive P...", type: "file" },
      { name: "Debugging Deployment F...", type: "file" },
      { name: "Commit and Push Changes", type: "file" },
      { name: "See all (10)", type: "file" },
    ],
  },
  {
    name: "terminal",
    type: "folder",
    children: [
      { name: "Debug Terminal GUI Au...", type: "file" },
      { name: "Enhancing User Journe...", type: "file" },
      { name: "Fix Antigravity Markdown ...", type: "file" },
      { name: "See all (49)", type: "file" },
    ],
  },
  {
    name: "MediatorAI",
    type: "folder",
    children: [
      { name: "Deploying Video Avatar Fix", type: "file" },
      { name: "Video Avatar Diagnostic ...", type: "file" },
      { name: "Debugging Video Avatar F...", type: "file" },
      { name: "See all (15)", type: "file" },
    ],
  },
]

interface FolderItemProps {
  node: FileNode
}

function FolderItem({ node }: FolderItemProps) {
  const [isOpen, setIsOpen] = useState(true)

  if (node.type === "file") {
    return (
      <div className="flex items-center gap-2 py-1.5 px-3 hover:bg-sidebar-accent rounded-md cursor-pointer text-base">
        <File className="h-4 w-4 text-muted-foreground flex-shrink-0" />
        <span className="truncate">{node.name}</span>
      </div>
    )
  }

  return (
    <div>
      <div
        className="flex items-center gap-2 py-1.5 px-2 hover:bg-sidebar-accent rounded-md cursor-pointer text-base font-medium"
        onClick={() => setIsOpen(!isOpen)}
      >
        {isOpen ? (
          <ChevronDown className="h-4 w-4 flex-shrink-0" />
        ) : (
          <ChevronRight className="h-4 w-4 flex-shrink-0" />
        )}
        <Folder className="h-4 w-4 flex-shrink-0" />
        <span className="truncate">{node.name}</span>
      </div>
      {isOpen && node.children && (
        <div className="ml-4 mt-1">
          {node.children.map((child, idx) => (
            <FolderItem key={idx} node={child} />
          ))}
        </div>
      )}
    </div>
  )
}

function CommandItem({
  command,
  description,
  category,
  highlighted = false,
}: {
  command: string
  description: string
  category: string
  highlighted?: boolean
}) {
  return (
    <div
      className={cn(
        "flex items-start justify-between p-2.5 rounded-md cursor-pointer transition-colors",
        highlighted ? "bg-destructive text-destructive-foreground" : "hover:bg-sidebar-accent",
      )}
    >
      <div className="flex-1 min-w-0">
        <div className="font-mono text-sm font-medium">{command}</div>
        <div className={cn("text-xs mt-0.5", highlighted ? "text-destructive-foreground/90" : "text-muted-foreground")}>
          {description}
        </div>
      </div>
      <div
        className={cn(
          "text-xs ml-2 flex-shrink-0",
          highlighted ? "text-destructive-foreground/80" : "text-muted-foreground",
        )}
      >
        {category}
      </div>
    </div>
  )
}

export function LeftSidebar() {
  const [activeTab, setActiveTab] = useState<"settings" | "history">("settings")
  const [settingsCategory, setSettingsCategory] = useState<"app" | "cli">("app")

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
                    <Input id="agent-url" type="text" defaultValue="http://localhost:41242" className="h-9 text-sm" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="agent-token" className="text-sm">
                      Agent Token
                    </Label>
                    <Input id="agent-token" type="password" defaultValue="••••••••" className="h-9 text-sm" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="workspace-path" className="text-sm">
                      Workspace Path
                    </Label>
                    <Input id="workspace-path" type="text" defaultValue="/tmp" className="h-9 text-sm" />
                  </div>
                </div>

                {/* SECURITY section */}
                <div className="space-y-3">
                  <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Security</h3>
                  <div className="space-y-2">
                    <Label htmlFor="approval-mode" className="text-sm">
                      Approval Mode
                    </Label>
                    <Select defaultValue="auto">
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
                    <Checkbox id="preview-mode" />
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
                    <Checkbox id="enable-voice" />
                    <Label htmlFor="enable-voice" className="text-sm cursor-pointer">
                      Enable Voice
                    </Label>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="ptt-key" className="text-sm">
                      Push-to-Talk Key
                    </Label>
                    <div className="h-9 px-3 rounded-md border border-input bg-background flex items-center justify-between text-sm text-muted-foreground">
                      <span>Space</span>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="volume" className="text-sm">
                      Volume
                    </Label>
                    <Slider id="volume" defaultValue={[80]} max={100} step={1} className="py-2" />
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
                  />
                  <CommandItem command="/clear" description="Clear chat history" category="Conversation" />
                  <CommandItem command="/checkpoint" description="Save conversation state" category="Conversation" />
                </div>

                {/* Security commands */}
                <div className="space-y-1 mt-3">
                  <CommandItem command="/trust" description="Trust current folder" category="Security" />
                  <CommandItem command="/untrust" description="Revoke folder trust" category="Security" />
                </div>

                {/* Sessions commands */}
                <div className="space-y-1 mt-3">
                  <CommandItem command="/sessions list" description="Show running sessions" category="Sessions" />
                  <CommandItem command="/sessions stop" description="Stop a session" category="Sessions" />
                </div>

                {/* Help commands */}
                <div className="space-y-1 mt-3">
                  <CommandItem command="/help" description="Show all commands" category="Help" />
                  <CommandItem command="/bug" description="Report an issue" category="Help" />
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
          <div className="text-base text-muted-foreground p-4">Session history will appear here</div>
        )}
      </div>
    </div>
  )
}
