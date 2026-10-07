/*
 * OfflineBanner — CivicPulse
 * Displays offline field mode status and triggers automatic sync on reconnect.
 */

import { WifiOff, RefreshCw, CheckCircle2 } from "lucide-react";
import { useOfflineQueue } from "@/lib/offlineSync";

export default function OfflineBanner() {
  const { isOnline, isSimulatedOffline, toggleSimulatedOffline, queueCount, isSyncing, triggerSync } = useOfflineQueue();

  if (isOnline && queueCount === 0) {
    return null;
  }

  return (
    <aside aria-label="Offline Mode Status" className="bg-gradient-to-r from-amber-950/90 via-amber-900/90 to-amber-950/90 text-amber-200 border-b border-amber-600/40 px-4 py-2 text-xs flex flex-wrap items-center justify-between gap-2 shadow-md z-50">
      <div className="flex items-center gap-2 font-medium">
        {!isOnline ? (
          <>
            <WifiOff className="w-4 h-4 text-amber-400 animate-pulse" />
            <span className="font-bold uppercase tracking-wider text-amber-300">
              Rural Offline Field Mode {isSimulatedOffline ? "(Simulated)" : "Active"}:
            </span>
            <span>Photos and GPS logs are being saved securely in local offline storage.</span>
          </>
        ) : (
          <>
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span className="font-bold text-emerald-300">Connection Restored:</span>
            <span>{queueCount} inspection(s) ready for synchronization to CivicPulse cloud.</span>
          </>
        )}
      </div>

      <div className="flex items-center gap-3">
        <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-amber-500/20 border border-amber-500/40 font-bold">
          {queueCount} Queued Locally
        </span>
        {isSimulatedOffline && (
          <button
            onClick={toggleSimulatedOffline}
            className="px-2.5 py-1 rounded bg-amber-500/20 hover:bg-amber-500/30 text-amber-200 border border-amber-500/40 font-semibold text-[11px] transition cursor-pointer"
          >
            End Offline Sim
          </button>
        )}
        {isOnline && (
          <button
            onClick={triggerSync}
            disabled={isSyncing}
            className="px-3 py-1 rounded bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-slate-950 font-bold text-[11px] flex items-center gap-1.5 shadow transition cursor-pointer"
          >
            <RefreshCw className={`w-3 h-3 ${isSyncing ? "animate-spin" : ""}`} />
            <span>{isSyncing ? "Syncing..." : "Sync Now"}</span>
          </button>
        )}
      </div>
    </aside>
  );
}
