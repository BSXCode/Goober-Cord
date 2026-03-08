"use client";

import { create } from "zustand";

export interface Toast {
  id: string;
  message: string;
  type: "info" | "success" | "error" | "reconnect";
  duration?: number;
  createdAt: number;
}

interface ToastState {
  toasts: Toast[];
  add: (message: string, type?: Toast["type"], duration?: number) => void;
  remove: (id: string) => void;
}

let toastId = 0;
function nextId() {
  return String(++toastId);
}

export const useToastStore = create<ToastState>()((set) => ({
  toasts: [],
  add(message, type = "info", duration = 4000) {
    const toast: Toast = {
      id: nextId(),
      message,
      type,
      duration,
      createdAt: Date.now(),
    };
    set((s) => ({ toasts: [...s.toasts, toast] }));
    if (duration > 0) {
      setTimeout(() => {
        set((s) => ({ toasts: s.toasts.filter((t) => t.id !== toast.id) }));
      }, duration);
    }
  },
  remove(id) {
    set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) }));
  },
}));
