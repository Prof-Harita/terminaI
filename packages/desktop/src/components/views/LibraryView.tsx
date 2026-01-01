/**
 * @license
 * Copyright 2025 Google LLC
 * Portions Copyright 2025 TerminaI Authors
 * SPDX-License-Identifier: Apache-2.0
 */

import { Section } from '../settings/Shared';
import { FileCode, Wrench, FolderOpen } from 'lucide-react';

interface Props {
    sendMessage: (text: string) => void;
  }

export function LibraryView({ sendMessage }: Props) {
  

  return (
    <div className="h-full overflow-y-auto p-6">
       <Section title="Recipes">
        <p className="text-xs text-muted-foreground mb-4">
            Recipes are predefined prompts and workflows. 
        </p>
        <div className="space-y-2">
             <button 
                className="w-full flex items-center gap-3 p-3 rounded-md border border-border bg-card hover:bg-accent hover:text-accent-foreground transition-all text-left"
                onClick={() => sendMessage('/recipes list')}
            >
                <div className="p-2 rounded bg-primary/10 text-primary">
                    <FileCode className="h-4 w-4" />
                </div>
                <div>
                    <div className="font-medium text-sm">View All Recipes</div>
                    <div className="text-xs text-muted-foreground">List all available recipes in chat</div>
                </div>
            </button>
            <button 
                 className="w-full flex items-center gap-3 p-3 rounded-md border border-border bg-card hover:bg-accent hover:text-accent-foreground transition-all text-left opacity-50 cursor-not-allowed hidden" 
                 title="Coming soon"
            >
                <div className="p-2 rounded bg-muted text-muted-foreground">
                    <FolderOpen className="h-4 w-4" />
                </div>
                 <div>
                    <div className="font-medium text-sm">Open Recipes Folder</div>
                    <div className="text-xs text-muted-foreground">Edit .md files directly</div>
                </div>
            </button>
        </div>
       </Section>

       <Section title="Tools">
         <p className="text-xs text-muted-foreground mb-4">
            Tools allow the agent to interact with your system.
        </p>
        <div className="space-y-2">
            <button 
                className="w-full flex items-center gap-3 p-3 rounded-md border border-border bg-card hover:bg-accent hover:text-accent-foreground transition-all text-left"
                 onClick={() => sendMessage('/tools list')}
            >
                 <div className="p-2 rounded bg-blue-500/10 text-blue-500">
                    <Wrench className="h-4 w-4" />
                </div>
                <div>
                    <div className="font-medium text-sm">Inspect Active Tools</div>
                    <div className="text-xs text-muted-foreground">See registered tools and status</div>
                </div>
            </button>
        </div>
       </Section>
    </div>
  );
}
