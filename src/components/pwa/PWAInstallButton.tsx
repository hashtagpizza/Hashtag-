import React, { useState } from 'react';
import { usePWAInstall } from '../../hooks/usePWAInstall';
import { Smartphone, Download, Share, PlusSquare, CheckCircle, X, Sparkles } from 'lucide-react';

interface PWAInstallButtonProps {
  variant?: 'header' | 'banner' | 'floating' | 'compact';
  className?: string;
}

export const PWAInstallButton: React.FC<PWAInstallButtonProps> = ({
  variant = 'header',
  className = '',
}) => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showIOSModal, setShowIOSModal] = useState(false);
  const [showAndroidInstructions, setShowAndroidInstructions] = useState(false);

  // If app is already installed and running standalone, do not render install prompt
  if (isInstalled) {
    return null;
  }

  const handleInstallClick = async () => {
    if (isInstallable) {
      await install();
    } else if (isIOS) {
      setShowIOSModal(true);
    } else {
      setShowAndroidInstructions(true);
    }
  };

  // Render variant styles
  if (variant === 'compact') {
    return (
      <>
        <button
          onClick={handleInstallClick}
          type="button"
          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-[#164699] text-white hover:bg-[#12397c] shadow-sm transition-all duration-200 active:scale-95 ${className}`}
          title="Install Hashtag Pizza App"
        >
          <Smartphone className="w-3.5 h-3.5 text-amber-300" />
          <span>Install App</span>
        </button>
        {renderModals()}
      </>
    );
  }

  if (variant === 'banner') {
    return (
      <>
        <div className={`bg-gradient-to-r from-[#164699] via-[#1d57ba] to-[#164699] text-white px-4 py-2.5 shadow-md ${className}`}>
          <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3 text-sm">
            <div className="flex items-center gap-3 text-center sm:text-left">
              <div className="w-9 h-9 rounded-xl bg-white/15 p-1.5 flex items-center justify-center shrink-0 border border-white/20">
                <img
                  src="/pwa-192x192.png"
                  alt="Hashtag App Icon"
                  className="w-full h-full object-contain rounded-lg"
                  onError={(e) => {
                    (e.currentTarget as HTMLElement).style.display = 'none';
                  }}
                />
              </div>
              <div>
                <div className="flex items-center justify-center sm:justify-start gap-2 font-bold tracking-tight">
                  <span>Install Hashtag Pizza App</span>
                  <span className="bg-amber-400 text-stone-900 text-[10px] font-extrabold uppercase px-1.5 py-0.5 rounded tracking-wider flex items-center gap-1">
                    <Sparkles className="w-2.5 h-2.5" /> 1-Click
                  </span>
                </div>
                <p className="text-xs text-blue-100 hidden sm:block">
                  Instant offline menu, fast WhatsApp checkout & VIP loyalty points from your phone's home screen.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={handleInstallClick}
                type="button"
                className="flex items-center gap-2 bg-amber-400 hover:bg-amber-300 text-stone-900 font-bold px-4 py-1.5 rounded-full text-xs shadow transition-all duration-200 active:scale-95 cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                <span>{isIOS ? 'Add to iPhone' : 'Install on Android / Phone'}</span>
              </button>
            </div>
          </div>
        </div>
        {renderModals()}
      </>
    );
  }

  // Default 'header' button
  return (
    <>
      <button
        onClick={handleInstallClick}
        type="button"
        className={`group relative inline-flex items-center gap-2 px-3 py-1.5 sm:px-4 sm:py-2 rounded-xl text-xs sm:text-sm font-bold bg-[#164699] text-white hover:bg-[#12397c] shadow-sm hover:shadow transition-all duration-200 active:scale-95 border border-white/20 ${className}`}
      >
        <span className="flex h-2 w-2 relative">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-400"></span>
        </span>
        <Download className="w-4 h-4 text-amber-300 group-hover:-translate-y-0.5 transition-transform" />
        <span className="hidden sm:inline">Install App</span>
        <span className="sm:hidden">Install</span>
      </button>
      {renderModals()}
    </>
  );

  function renderModals() {
    return (
      <>
        {/* iOS Safari Guided Install Sheet */}
        {showIOSModal && (
          <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-200">
            <div className="relative w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl text-stone-900 border border-stone-100">
              <button
                onClick={() => setShowIOSModal(false)}
                className="absolute top-4 right-4 p-1.5 text-stone-400 hover:text-stone-700 rounded-full hover:bg-stone-100 transition-colors"
                aria-label="Close"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="flex items-center gap-3 mb-4">
                <img
                  src="/pwa-192x192.png"
                  alt="Hashtag Pizza Logo"
                  className="w-12 h-12 rounded-xl object-contain shadow-sm border border-stone-200 p-0.5"
                />
                <div>
                  <h3 className="text-base font-bold text-stone-900 leading-tight">
                    Install Hashtag Pizza on iOS
                  </h3>
                  <p className="text-xs text-stone-500">
                    Add to iPhone or iPad Home Screen
                  </p>
                </div>
              </div>

              <div className="space-y-3.5 text-xs sm:text-sm text-stone-600 bg-stone-50 p-4 rounded-xl border border-stone-200/70 mb-5">
                <div className="flex items-start gap-3">
                  <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-blue-100 text-[#164699] font-bold text-xs">
                    1
                  </div>
                  <div>
                    In Safari, tap the <strong className="text-stone-900 inline-flex items-center gap-1 font-semibold"><Share className="w-3.5 h-3.5 text-blue-600 inline" /> Share</strong> button in the browser toolbar (bottom on iPhone, top on iPad).
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-blue-100 text-[#164699] font-bold text-xs">
                    2
                  </div>
                  <div>
                    Scroll down and tap <strong className="text-stone-900 inline-flex items-center gap-1 font-semibold"><PlusSquare className="w-3.5 h-3.5 text-stone-800 inline" /> Add to Home Screen</strong>.
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-blue-100 text-[#164699] font-bold text-xs">
                    3
                  </div>
                  <div>
                    Tap <strong className="text-stone-900 font-semibold">Add</strong> in the top right. You now have the full-screen Hashtag Pizza app with offline menu!
                  </div>
                </div>
              </div>

              <button
                onClick={() => setShowIOSModal(false)}
                type="button"
                className="w-full py-2.5 rounded-xl bg-[#164699] text-white font-bold text-sm shadow hover:bg-[#12397c] transition-colors"
              >
                Got It!
              </button>
            </div>
          </div>
        )}

        {/* General / Android Browser fallback if prompt hasn't loaded yet */}
        {showAndroidInstructions && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-200">
            <div className="relative w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl text-stone-900 border border-stone-100">
              <button
                onClick={() => setShowAndroidInstructions(false)}
                className="absolute top-4 right-4 p-1.5 text-stone-400 hover:text-stone-700 rounded-full hover:bg-stone-100 transition-colors"
                aria-label="Close"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="flex items-center gap-3 mb-4">
                <img
                  src="/pwa-192x192.png"
                  alt="Hashtag Pizza Logo"
                  className="w-12 h-12 rounded-xl object-contain shadow-sm border border-stone-200 p-0.5"
                />
                <div>
                  <h3 className="text-base font-bold text-stone-900 leading-tight">
                    Install Hashtag Pizza App
                  </h3>
                  <p className="text-xs text-stone-500">
                    Fast 1-click home screen app
                  </p>
                </div>
              </div>

              <div className="space-y-3 text-xs sm:text-sm text-stone-600 bg-stone-50 p-4 rounded-xl border border-stone-200/70 mb-5">
                <p>
                  To install Hashtag Pizza on your phone or computer:
                </p>
                <div className="flex items-start gap-2.5">
                  <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <span>
                    Tap your browser menu (<strong>3 dots ⋮</strong> in Chrome / Edge).
                  </span>
                </div>
                <div className="flex items-start gap-2.5">
                  <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <span>
                    Select <strong>"Install app"</strong> or <strong>"Add to Home screen"</strong>.
                  </span>
                </div>
              </div>

              <button
                onClick={() => setShowAndroidInstructions(false)}
                type="button"
                className="w-full py-2.5 rounded-xl bg-[#164699] text-white font-bold text-sm shadow hover:bg-[#12397c] transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        )}
      </>
    );
  }
};
