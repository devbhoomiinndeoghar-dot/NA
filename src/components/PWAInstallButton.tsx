import React, { useState } from 'react';
import { usePWAInstall } from './usePWAInstall';
import { Download, X, Smartphone } from 'lucide-react';

export const PWAInstallButton: React.FC = () => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showIOSGuide, setShowIOSGuide] = useState(false);

  // If already running as an installed PWA, hide the button
  if (isInstalled) {
    return null;
  }

  // Chromium / Android / Desktop flow
  if (isInstallable) {
    return (
      <button
        onClick={install}
        className="flex items-center gap-1.5 px-3 py-1.5 bg-[#1A1A1A] text-[#FF6B35] font-black text-xs uppercase tracking-wider hover:bg-[#FF6B35] hover:text-[#1A1A1A] border-2 border-[#1A1A1A] transition shadow-[3px_3px_0px_0px_rgba(26,26,26,1)] hover:shadow-none hover:translate-y-0.5"
      >
        <Download className="w-3.5 h-3.5" />
        <span>Install App</span>
      </button>
    );
  }

  // iOS Safari flow (beforeinstallprompt is not supported by WebKit)
  if (isIOS) {
    return (
      <>
        <button
          onClick={() => setShowIOSGuide(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-[#1A1A1A] text-[#FF6B35] font-black text-xs uppercase tracking-wider hover:bg-[#FF6B35] hover:text-[#1A1A1A] border-2 border-[#1A1A1A] transition shadow-[3px_3px_0px_0px_rgba(26,26,26,1)] hover:shadow-none hover:translate-y-0.5"
        >
          <Smartphone className="w-3.5 h-3.5" />
          <span>Install App</span>
        </button>

        {showIOSGuide && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
            <div className="w-full max-w-sm rounded-none border-4 border-[#1A1A1A] bg-white p-6 shadow-[8px_8px_0px_0px_rgba(26,26,26,1)] text-[#1A1A1A] font-bold uppercase text-xs">
              <div className="flex justify-between items-center border-b-2 border-stone-200 pb-2 mb-4">
                <h3 className="text-sm font-black text-[#1A1A1A]">Install on iOS Safari</h3>
                <button onClick={() => setShowIOSGuide(false)} className="p-1 hover:bg-stone-100">
                  <X className="w-4 h-4 text-[#1A1A1A]" />
                </button>
              </div>
              <p className="mt-2 text-stone-600 leading-relaxed font-semibold normal-case">
                1. Tap the <strong>Share</strong> icon in the Safari navigation bar at the bottom.<br />
                2. Scroll down the sharing panel and select <strong>Add to Home Screen</strong>.
              </p>
              <button
                onClick={() => setShowIOSGuide(false)}
                className="mt-6 w-full py-2.5 bg-[#1A1A1A] text-white hover:bg-[#FF6B35] hover:text-[#1A1A1A] border-2 border-[#1A1A1A] font-black text-xs tracking-wider transition uppercase"
              >
                Got it
              </button>
            </div>
          </div>
        )}
      </>
    );
  }

  // Always render a subtle simulated button for desktop browsers that don't trigger deferred prompts automatically
  // so the user can easily see that an install option is available, with info!
  return (
    <>
      <button
        onClick={() => setShowIOSGuide(true)}
        className="flex items-center gap-1.5 px-3 py-1.5 bg-[#1A1A1A] text-[#FF6B35] font-black text-xs uppercase tracking-wider hover:bg-[#FF6B35] hover:text-[#1A1A1A] border-2 border-[#1A1A1A] transition shadow-[3px_3px_0px_0px_rgba(26,26,26,1)] hover:shadow-none hover:translate-y-0.5"
      >
        <Download className="w-3.5 h-3.5" />
        <span>Install App</span>
      </button>

      {showIOSGuide && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="w-full max-w-sm rounded-none border-4 border-[#1A1A1A] bg-white p-6 shadow-[8px_8px_0px_0px_rgba(26,26,26,1)] text-[#1A1A1A] font-bold uppercase text-xs">
            <div className="flex justify-between items-center border-b-2 border-stone-200 pb-2 mb-4">
              <h3 className="text-sm font-black text-[#1A1A1A]">PWA Installation Guide</h3>
              <button onClick={() => setShowIOSGuide(false)} className="p-1 hover:bg-stone-100">
                <X className="w-4 h-4 text-[#1A1A1A]" />
              </button>
            </div>
            <p className="mt-2 text-stone-600 leading-relaxed font-semibold normal-case">
              <strong>MASALA EXPRESS</strong> can be installed as an offline-capable App on your device:<br /><br />
              • <strong>On Android / Chrome</strong>: Click the install option inside your browser address bar.<br />
              • <strong>On iOS Safari</strong>: Tap Share, then select <strong>Add to Home Screen</strong>.
            </p>
            <button
              onClick={() => setShowIOSGuide(false)}
              className="mt-6 w-full py-2.5 bg-[#1A1A1A] text-white hover:bg-[#FF6B35] hover:text-[#1A1A1A] border-2 border-[#1A1A1A] font-black text-xs tracking-wider transition uppercase"
            >
              Okay
            </button>
          </div>
        </div>
      )}
    </>
  );
};
