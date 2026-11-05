import React from 'react';
import { useOnlineStatus } from '../hooks/useOnlineStatus';
import { WifiOff, Database } from 'lucide-react';

export const OfflineBanner: React.FC = () => {
  const isOnline = useOnlineStatus();

  if (isOnline) return null;

  return (
    <aside aria-label="Offline status" className="sticky top-0 z-50 bg-amber-600 text-white px-4 py-2 text-xs font-medium shadow-md flex items-center justify-between animate-fadeIn">
      <div className="flex items-center gap-2 max-w-7xl mx-auto w-full">
        <WifiOff className="w-4 h-4 shrink-0 text-amber-200" />
        <span className="font-semibold">You're currently offline.</span>
        <span className="text-amber-100 hidden sm:inline">
          Drafts are saved locally in localStorage and will sync once reconnected.
        </span>
        <span className="ml-auto flex items-center gap-1.5 bg-amber-700/60 px-2 py-0.5 rounded text-[11px]">
          <Database className="w-3 h-3" /> Offline Cache
        </span>
      </div>
    </aside>
  );
};
