import React from 'react';
import { useSidecarStore } from '../stores/sidecarStore';
import { useSettingsStore } from '../stores/settingsStore';
import { useBridgeStore } from '../bridge/store';
import { Button } from './ui/button';

export const ConnectivityIndicator: React.FC = () => {
  const bootStatus = useSidecarStore((s) => s.bootStatus);
  const hasToken = useSettingsStore((s) => !!s.agentToken);
  // BM-4 FIX: Use real bridge connection status, not just token presence
  const bridgeConnected = useBridgeStore((s) => s.isConnected());
  const sidecarReady = bootStatus === 'ready';
  
  // True connectivity requires: token exists AND (bridge connected OR sidecar ready)
  const isConnected = hasToken && (bridgeConnected || sidecarReady);
  const isBooting = bootStatus === 'booting';
  const isError = bootStatus === 'error';
  const relayClientCount = useSettingsStore((s) => s.relayClientCount);

  // Restart Handler (Task 4.4 Prep)
  const handleRestart = async () => {
      // For now, reload window or logic?
      // window.location.reload(); 
      // Or call restart_sidecar command if implemented (Phase 4).
      // For Phase 3, just show error.
      window.location.reload();
  };

  return (
    <div className="flex items-center gap-1.5 text-xs ml-4">
      {/* Status Dot */}
      <div
        className={`w-2 h-2 rounded-full ${
          isBooting
            ? 'bg-yellow-500 animate-pulse'
            : isConnected
              ? 'bg-green-500'
              : 'bg-red-500'
        }`}
        style={{
          boxShadow: isBooting
            ? '0 0 6px rgba(234, 179, 8, 0.6)'
            : isConnected
              ? '0 0 6px rgba(34, 197, 94, 0.6)'
              : '0 0 6px rgba(239, 68, 68, 0.6)'
        }}
      />
      
      {/* Text Label */}
      <span className="text-muted-foreground hidden sm:inline">
        {isBooting ? 'Starting Engine...' : isConnected ? 'Connected' : isError ? 'Engine Failed' : 'Disconnected'}
      </span>

      {/* Error Action */}
      {isError && (
          <Button variant="ghost" size="sm" className="h-6 text-xs text-red-500 px-1 ml-1" onClick={handleRestart}>
              Restart
          </Button>
      )}

      {/* Relay Count */}
      {isConnected && relayClientCount > 0 && (
        <span className="px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-500 font-bold ml-1 animate-in fade-in zoom-in duration-300">
          {relayClientCount} Clients
        </span>
      )}
    </div>
  );
};
