"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import { connectSocket, disconnectSocket } from "./socket";
import { bindSocketEmitter, useAppStore } from "./app-store";

const AUTH_STORAGE = "discord-clone-auth";

export interface AuthState {
  currentUserId: string | null;
  sessionToken: string | null;
  isAuthenticated: boolean;
  signUp: (username: string, password: string) => Promise<{ ok: boolean; error?: string }>;
  login: (username: string, password: string) => Promise<{ ok: boolean; error?: string }>;
  logout: () => void;
  reconnect: (userId: string) => void;
  setCurrentUser: (userId: string | null) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      currentUserId: null,
      sessionToken: null,
      isAuthenticated: false,

      async signUp(username: string, password: string) {
        const trimmed = username.trim();
        if (trimmed.length < 2) return { ok: false, error: "Username must be at least 2 characters" };
        if (password.length < 4) return { ok: false, error: "Password must be at least 4 characters" };

        const sock = connectSocket();
        bindSocketEmitter((event, ...args) => sock.emit(event, ...args));

        return new Promise<{ ok: boolean; error?: string }>((resolve) => {
          const timer = setTimeout(() => resolve({ ok: false, error: "Connection timed out" }), 10000);
          sock.emit("auth:signup", { username: trimmed, password }, (result: any) => {
            clearTimeout(timer);
            if (result?.ok) {
              set({ currentUserId: result.userId, sessionToken: result.token ?? null, isAuthenticated: true });
              resolve({ ok: true });
            } else {
              resolve({ ok: false, error: result?.error ?? "Signup failed" });
            }
          });
        });
      },

      async login(username: string, password: string) {
        const trimmed = username.trim();
        if (!trimmed) return { ok: false, error: "Username is required" };
        if (!password) return { ok: false, error: "Password is required" };

        const sock = connectSocket();
        bindSocketEmitter((event, ...args) => sock.emit(event, ...args));

        return new Promise<{ ok: boolean; error?: string }>((resolve) => {
          const timer = setTimeout(() => resolve({ ok: false, error: "Connection timed out" }), 10000);
          sock.emit("auth:login", { username: trimmed, password }, (result: any) => {
            clearTimeout(timer);
            if (result?.ok) {
              set({ currentUserId: result.userId, sessionToken: result.token ?? null, isAuthenticated: true });
              resolve({ ok: true });
            } else {
              resolve({ ok: false, error: result?.error ?? "Login failed" });
            }
          });
        });
      },

      reconnect(userId: string) {
        const sock = connectSocket();
        bindSocketEmitter((event, ...args) => sock.emit(event, ...args));
      },

      logout() {
        disconnectSocket();
        useAppStore.setState({ synced: false });
        set({ currentUserId: null, sessionToken: null, isAuthenticated: false });
      },

      setCurrentUser(userId: string | null) {
        set({ currentUserId: userId, isAuthenticated: !!userId });
      },
    }),
    { name: AUTH_STORAGE }
  )
);
