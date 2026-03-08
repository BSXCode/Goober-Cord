"use client";

import { useState, useEffect, useCallback } from "react";
import { initPwa, isInstallable, isInstalled, promptInstall, onPwaChange } from "@/lib/pwa";
import { Monitor, Globe, Download, X, Check } from "lucide-react";

const DISMISSED_KEY = "gc-install-dismissed";

export function InstallPrompt() {
  const [visible, setVisible] = useState(false);
  const [canInstall, setCanInstall] = useState(false);
  const [alreadyInstalled, setAlreadyInstalled] = useState(false);
  const [installing, setInstalling] = useState(false);

  useEffect(() => {
    initPwa();

    if (isInstalled()) {
      setAlreadyInstalled(true);
      return;
    }

    const dismissed = localStorage.getItem(DISMISSED_KEY);
    if (dismissed) return;

    setVisible(true);
    setCanInstall(isInstallable());

    const unsub = onPwaChange(() => {
      setCanInstall(isInstallable());
      if (isInstalled()) {
        setAlreadyInstalled(true);
        setVisible(false);
      }
    });

    return unsub;
  }, []);

  const handleDismiss = useCallback(() => {
    localStorage.setItem(DISMISSED_KEY, "1");
    setVisible(false);
  }, []);

  const handleInstall = useCallback(async () => {
    if (!canInstall) return;
    setInstalling(true);
    const accepted = await promptInstall();
    setInstalling(false);
    if (accepted) {
      setVisible(false);
    }
  }, [canInstall]);

  if (!visible || alreadyInstalled) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in">
      <div className="relative w-full max-w-md mx-4 rounded-2xl bg-[#2b2d31] border border-[#3f4147] shadow-2xl overflow-hidden">
        {/* Header gradient */}
        <div className="h-24 bg-gradient-to-br from-[#5865f2] via-[#7289da] to-[#5865f2] flex items-center justify-center">
          <div className="w-16 h-16 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center shadow-lg">
            <img src="/icon-192.png" alt="Goober-Cord" className="w-12 h-12 rounded-xl" />
          </div>
        </div>

        <button
          onClick={handleDismiss}
          className="absolute top-3 right-3 p-1.5 rounded-full bg-black/30 hover:bg-black/50 text-white/80 hover:text-white transition-colors"
          aria-label="Close"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Content */}
        <div className="px-6 pt-5 pb-6">
          <h2 className="text-xl font-bold text-white text-center mb-1">
            Welcome to Goober-Cord
          </h2>
          <p className="text-sm text-[#b5bac1] text-center mb-6">
            How would you like to use Goober-Cord?
          </p>

          <div className="flex flex-col gap-3">
            {/* Install as App */}
            {canInstall && (
              <button
                onClick={handleInstall}
                disabled={installing}
                className="flex items-center gap-4 w-full px-4 py-3.5 rounded-xl bg-[#5865f2] hover:bg-[#4752c4] text-white transition-colors disabled:opacity-60"
              >
                <div className="w-10 h-10 rounded-lg bg-white/20 flex items-center justify-center flex-shrink-0">
                  <Download className="w-5 h-5" />
                </div>
                <div className="text-left flex-1">
                  <div className="font-semibold text-sm">
                    {installing ? "Installing..." : "Install App"}
                  </div>
                  <div className="text-xs text-white/70">
                    Runs in its own window with a taskbar icon
                  </div>
                </div>
                <Monitor className="w-5 h-5 text-white/50 flex-shrink-0" />
              </button>
            )}

            {/* Browser fallback when install not available yet */}
            {!canInstall && (
              <div className="flex items-center gap-4 w-full px-4 py-3.5 rounded-xl bg-[#5865f2]/20 border border-[#5865f2]/30 text-[#b5bac1]">
                <div className="w-10 h-10 rounded-lg bg-[#5865f2]/20 flex items-center justify-center flex-shrink-0">
                  <Download className="w-5 h-5 text-[#5865f2]" />
                </div>
                <div className="text-left flex-1">
                  <div className="font-semibold text-sm text-white">Install App</div>
                  <div className="text-xs">
                    Use Chrome or Edge to install as a desktop app
                  </div>
                </div>
              </div>
            )}

            {/* Continue in Browser */}
            <button
              onClick={handleDismiss}
              className="flex items-center gap-4 w-full px-4 py-3.5 rounded-xl bg-[#1e1f22] hover:bg-[#383a40] border border-[#3f4147] text-white transition-colors"
            >
              <div className="w-10 h-10 rounded-lg bg-[#3f4147] flex items-center justify-center flex-shrink-0">
                <Globe className="w-5 h-5 text-[#b5bac1]" />
              </div>
              <div className="text-left flex-1">
                <div className="font-semibold text-sm">Continue in Browser</div>
                <div className="text-xs text-[#949ba4]">
                  Use Goober-Cord right here in your browser
                </div>
              </div>
            </button>
          </div>

          <p className="text-[11px] text-[#949ba4] text-center mt-4">
            You can always install later from your browser menu
          </p>
        </div>
      </div>
    </div>
  );
}
