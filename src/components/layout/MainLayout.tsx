"use client";

import { useEffect, useState, lazy, Suspense, useCallback } from "react";
import { useAppStore } from "@/lib/app-store";
import { ServerList } from "./ServerList";
import { ChannelSidebar } from "./ChannelSidebar";
import { ChatView } from "../chat/ChatView";
import { MemberList } from "./MemberList";
import { CommandPalette } from "./CommandPalette";
import { ToastContainer } from "../ui/ToastContainer";
import { NotificationToasts } from "../ui/NotificationToasts";
import { Menu, X } from "lucide-react";

const SettingsModal = lazy(() => import("./SettingsModal").then((m) => ({ default: m.SettingsModal })));
const VoiceWidget = lazy(() => import("../voice/VoiceWidget").then((m) => ({ default: m.VoiceWidget })));

function applyBgOnMount() {
  if (typeof window !== "undefined") {
    const { applyBackgroundImage, getBgMusic, getBgMusicVolume, getBgMusicLoop, getBgMusicAutoplay } = require("@/lib/client-settings");
    applyBackgroundImage();
    if (getBgMusicAutoplay()) {
      const url = getBgMusic();
      if (url) {
        const audio = new Audio(url);
        audio.volume = getBgMusicVolume() / 100;
        audio.loop = getBgMusicLoop();
        (window as any).__gc_bg_music = audio;
        audio.play().catch(() => {});
      }
    }
  }
}

export function MainLayout() {
  const theme = useAppStore((s) => s.theme);
  const memberListOpen = useAppStore((s) => s.memberListOpen);
  const selectedServerId = useAppStore((s) => s.selectedServerId);
  const selectedChannelId = useAppStore((s) => s.selectedChannelId);
  const selectedDMId = useAppStore((s) => s.selectedDMId);
  const settingsOpen = useAppStore((s) => s.settingsOpen);
  const setSettingsOpen = useAppStore((s) => s.setSettingsOpen);
  const accentColor = useAppStore((s) => s.accentColor);

  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  useEffect(() => {
    if (selectedChannelId || selectedDMId) {
      setMobileSidebarOpen(false);
    }
  }, [selectedChannelId, selectedDMId]);

  useEffect(() => {
    if (typeof document !== "undefined") {
      const root = document.documentElement;
      root.classList.remove("dark", "light");
      root.classList.add(theme);
      root.style.setProperty("--accent", accentColor);
      const { getFont, getFontFile, applyUiScale } = require("@/lib/client-settings");
      const savedFont = getFont();
      const savedFontFile = getFontFile();
      if (savedFont) {
        root.style.setProperty("--font-family", savedFont);
        document.body.style.fontFamily = savedFont;
      }
      if (savedFontFile) {
        let style = document.getElementById("custom-font-face");
        if (!style) {
          style = document.createElement("style");
          style.id = "custom-font-face";
          document.head.appendChild(style);
        }
        style.textContent = savedFontFile;
      }
      applyUiScale();
      applyBgOnMount();
      void root.offsetHeight;
    }
  }, [theme, accentColor]);

  const closeMobileSidebar = useCallback(() => setMobileSidebarOpen(false), []);
  const hasChannel = !!(selectedChannelId || selectedDMId);

  return (
    <div className="flex h-screen h-[100dvh] min-h-0 overflow-hidden bg-transparent text-[var(--text)]">
      {/* Mobile hamburger */}
      {isMobile && !mobileSidebarOpen && (
        <button
          onClick={() => setMobileSidebarOpen(true)}
          className="fixed top-2 left-2 z-[60] p-2 rounded-xl bg-[var(--glass-bg)] backdrop-blur-md border border-[var(--glass-border)] text-[var(--text)] shadow-lg active:scale-95 transition-transform"
          aria-label="Open sidebar"
        >
          <Menu className="w-5 h-5" />
        </button>
      )}

      {/* Mobile sidebar overlay */}
      {isMobile && mobileSidebarOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 animate-fade-in" onClick={closeMobileSidebar}>
          <div
            className="flex h-full w-[calc(72px+240px)] max-w-[85vw] animate-slide-in-left"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-[72px] flex flex-col flex-shrink-0 min-h-0 bg-[var(--glass-bg)] backdrop-blur-md border-r border-[var(--glass-border)] shadow-[var(--shadow-cozy)] z-20">
              <ServerList />
            </div>
            <div className="flex-1 min-w-0">
              <ChannelSidebar />
            </div>
            <button
              onClick={closeMobileSidebar}
              className="absolute top-2 right-2 p-1.5 rounded-lg bg-black/30 text-white z-[60]"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Desktop sidebar */}
      {!isMobile && (
        <>
          <div className="w-[72px] flex flex-col flex-shrink-0 min-h-0 bg-[var(--glass-bg)] backdrop-blur-md border-r border-[var(--glass-border)] shadow-[var(--shadow-cozy)] z-20">
            <ServerList />
          </div>
          <ChannelSidebar />
        </>
      )}

      <main className="flex-1 flex flex-col min-w-0 min-h-0 overflow-hidden bg-transparent">
        {hasChannel ? (
          <div className="flex flex-1 min-w-0 min-h-0 overflow-hidden">
            <ChatView />
            {memberListOpen && !isMobile && <MemberList />}
          </div>
        ) : (
          <EmptyState />
        )}
      </main>
      <CommandPalette />
      <ToastContainer />
      <NotificationToasts />
      <Suspense fallback={null}>
        {settingsOpen && <SettingsModal open={settingsOpen} onClose={() => setSettingsOpen(false)} />}
      </Suspense>
      <Suspense fallback={null}>
        <VoiceWidget />
      </Suspense>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="flex-1 flex min-h-0 items-center justify-center bg-transparent p-4">
      <div className="text-center max-w-md px-6 sm:px-8 py-10 sm:py-12 rounded-3xl bg-[var(--glass-bg)] backdrop-blur-md border border-[var(--glass-border)] shadow-[var(--shadow-cozy)]">
        <div className="w-20 h-20 sm:w-24 sm:h-24 mx-auto mb-5 sm:mb-6 rounded-full bg-[var(--surface-elevated)] flex items-center justify-center text-3xl sm:text-4xl shadow-lg animate-bounce-gentle">
          💬
        </div>
        <h2 className="text-2xl sm:text-3xl font-bold text-[var(--text)] mb-3">Goober-Cord</h2>
        <p className="text-[var(--text-muted)] mb-6 sm:mb-8 text-base sm:text-lg">
          Pick a server and channel, or use <kbd className="px-2 py-1 rounded-lg bg-[var(--surface)] border border-[var(--border)] text-sm font-mono">Ctrl+K</kbd> to jump anywhere.
        </p>
        <p className="text-sm text-[var(--text-muted)] opacity-80">
          Chat, voice, and hang out — data stored in your browser.
        </p>
      </div>
    </div>
  );
}
