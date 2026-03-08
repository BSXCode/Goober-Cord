"use client";

/**
 * PWA install helpers.
 * - Registers the service worker
 * - Captures the `beforeinstallprompt` event so we can trigger it later
 * - Exposes install state and trigger function
 */

let deferredPrompt: any = null;
let installed = false;

const listeners = new Set<() => void>();

function notify() {
  listeners.forEach((fn) => fn());
}

export function onPwaChange(fn: () => void) {
  listeners.add(fn);
  return () => { listeners.delete(fn); };
}

export function isInstallable(): boolean {
  return deferredPrompt !== null && !installed;
}

export function isInstalled(): boolean {
  if (typeof window === "undefined") return false;
  return (
    installed ||
    window.matchMedia("(display-mode: standalone)").matches ||
    (window.navigator as any).standalone === true
  );
}

export async function promptInstall(): Promise<boolean> {
  if (!deferredPrompt) return false;
  deferredPrompt.prompt();
  const { outcome } = await deferredPrompt.userChoice;
  if (outcome === "accepted") {
    installed = true;
    deferredPrompt = null;
    notify();
  }
  return outcome === "accepted";
}

export function initPwa() {
  if (typeof window === "undefined") return;

  // Register service worker
  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.register("/sw.js").catch((err) => {
      console.warn("[PWA] SW registration failed:", err);
    });
  }

  // Capture install prompt
  window.addEventListener("beforeinstallprompt", (e: Event) => {
    e.preventDefault();
    deferredPrompt = e;
    notify();
  });

  // Detect successful install
  window.addEventListener("appinstalled", () => {
    installed = true;
    deferredPrompt = null;
    notify();
  });
}
