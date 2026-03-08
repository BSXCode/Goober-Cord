"use client";

import { useEffect, useState } from "react";
import { useAuthStore } from "@/lib/auth-store";
import { useAppStore } from "@/lib/app-store";
import { AuthPage } from "@/components/auth/AuthPage";
import { MainLayout } from "@/components/layout/MainLayout";
import { initPwa } from "@/lib/pwa";

export default function Home() {
  const currentUserId = useAuthStore((s) => s.currentUserId);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const reconnect = useAuthStore((s) => s.reconnect);
  const synced = useAppStore((s) => s.synced);
  const init = useAppStore((s) => s.init);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    initPwa();
    if (typeof window !== "undefined" && !localStorage.getItem("gc-migrated-ws")) {
      localStorage.removeItem("discord-clone-data");
      localStorage.setItem("gc-migrated-ws", "1");
    }
  }, []);

  useEffect(() => {
    if (!mounted) return;
    init();
  }, [mounted, init]);

  useEffect(() => {
    if (!mounted || !isAuthenticated || !currentUserId) return;
    reconnect(currentUserId);
  }, [mounted, isAuthenticated, currentUserId, reconnect]);

  useEffect(() => {
    if (!mounted) return;
    if (typeof window !== "undefined") {
      const { applyUiScale } = require("@/lib/client-settings");
      applyUiScale();
    }
  }, [mounted]);

  if (!mounted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#313338]">
        <div className="text-[#b5bac1]">Loading...</div>
      </div>
    );
  }

  if (!isAuthenticated || !currentUserId) {
    return <AuthPage />;
  }

  if (!synced) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#313338]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-[#5865f2] border-t-transparent rounded-full animate-spin" />
          <div className="text-[#b5bac1] text-sm">Connecting to Goober-Cord...</div>
        </div>
      </div>
    );
  }

  return <MainLayout />;
}
