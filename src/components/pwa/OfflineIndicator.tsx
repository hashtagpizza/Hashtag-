import React from 'react';
import { useOnlineStatus } from '../../hooks/useOnlineStatus';
import { WifiOff, PhoneCall } from 'lucide-react';
import { CONTACT_INFO } from '../../constants';

export const OfflineIndicator: React.FC = () => {
  const isOnline = useOnlineStatus();

  if (isOnline) return null;

  return (
    <div className="fixed bottom-20 left-4 right-4 sm:left-6 sm:right-auto sm:max-w-md z-50 animate-in slide-in-from-bottom duration-300">
      <div className="flex items-center justify-between gap-3 rounded-2xl bg-stone-900/95 text-white px-4 py-3 shadow-2xl border border-stone-700/80 backdrop-blur-md">
        <div className="flex items-center gap-2.5">
          <span className="flex h-3 w-3 relative shrink-0">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-3 w-3 bg-amber-400"></span>
          </span>
          <WifiOff className="w-4 h-4 text-amber-400 shrink-0" />
          <div className="text-xs">
            <p className="font-bold text-stone-100">Offline Mode Active</p>
            <p className="text-stone-300 text-[11px]">
              Full menu is cached. Phone line is open!
            </p>
          </div>
        </div>

        <a
          href={`tel:${CONTACT_INFO.primaryPhone}`}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-400 text-stone-900 font-bold text-xs hover:bg-amber-300 transition-colors shadow-sm shrink-0"
        >
          <PhoneCall className="w-3.5 h-3.5" />
          <span>Call Now</span>
        </a>
      </div>
    </div>
  );
};
