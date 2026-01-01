/**
 * @license
 * Copyright 2025 Google LLC
 * Portions Copyright 2025 TerminaI Authors
 * SPDX-License-Identifier: Apache-2.0
 */

import { useSettingsStore } from '../../stores/settingsStore';
import { Section, SettingRow } from '../settings/Shared';
import { User, Shield } from 'lucide-react';

export function AccountView() {
  const settings = useSettingsStore();

  return (
    <div className="h-full overflow-y-auto p-6">
      <Section title="Profile">
        <div className="flex items-center gap-4 mb-6 p-4 bg-sidebar-accent/50 rounded-lg border border-border">
            <div className="h-12 w-12 rounded-full bg-primary/20 flex items-center justify-center text-primary">
                <User className="h-6 w-6" />
            </div>
            <div>
                <h3 className="font-semibold text-foreground">{settings.email || 'Guest User'}</h3>
                 <div className="text-xs text-muted-foreground flex items-center gap-2 mt-1">
                    <span className="flex items-center gap-1 text-green-500">
                        <Shield className="h-3 w-3" />
                        Verified
                    </span>
                    <span>•</span>
                    <span>Free Plan</span>
                </div>
            </div>
        </div>
        
        <SettingRow label="Email">
             <div className="text-sm text-muted-foreground">{settings.email || 'Not signed in'}</div>
        </SettingRow>

        {settings.email && (
            <button
              className="btn btn-outline w-full mt-4 text-red-400 hover:text-red-500 hover:bg-red-500/10 hover:border-red-500/20"
              onClick={settings.signOut}
            >
              Sign Out
            </button>
        )}
      </Section>

      <Section title="Usage">
        <div className="grid grid-cols-2 gap-4">
            <div className="p-3 bg-card rounded-md border border-border">
                <div className="text-xs text-muted-foreground mb-1">Current Session</div>
                <div className="text-xl font-bold">Active</div>
            </div>
        </div>
      </Section>
    </div>
  );
}
