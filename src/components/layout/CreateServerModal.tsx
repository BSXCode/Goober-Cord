"use client";

import { useState, useRef } from "react";
import { createPortal } from "react-dom";
import { useAppStore } from "@/lib/app-store";
import { useAuthStore } from "@/lib/auth-store";
import { X, Upload, Image } from "lucide-react";

interface CreateServerModalProps {
  open: boolean;
  onClose: () => void;
}

const ACCEPT_IMAGE = "image/png,image/jpeg,image/gif,image/webp";

export function CreateServerModal({ open, onClose }: CreateServerModalProps) {
  const currentUserId = useAuthStore((s) => s.currentUserId);
  const createServer = useAppStore((s) => s.createServer);
  const setSelectedServer = useAppStore((s) => s.setSelectedServer);
  const [name, setName] = useState("");
  const [icon, setIcon] = useState<string | undefined>();
  const [banner, setBanner] = useState<string | undefined>();
  const iconRef = useRef<HTMLInputElement>(null);
  const bannerRef = useRef<HTMLInputElement>(null);

  if (!open || typeof document === "undefined") return null;

  const readFile = (file: File, cb: (url: string) => void) => {
    const reader = new FileReader();
    reader.onload = () => cb(reader.result as string);
    reader.readAsDataURL(file);
  };

  const handleCreate = () => {
    if (!name.trim() || !currentUserId) return;
    const serverId = createServer(name.trim(), currentUserId, icon, banner);
    setSelectedServer(serverId);
    setName("");
    setIcon(undefined);
    setBanner(undefined);
    onClose();
  };

  return createPortal(
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60" onClick={onClose}>
      <div className="bg-[#313338] rounded-xl shadow-2xl w-full max-w-md overflow-hidden" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#3f4147]">
          <h2 className="text-lg font-bold text-white">Create a Server</h2>
          <button onClick={onClose} className="p-1 rounded text-[#b5bac1] hover:text-white hover:bg-[#3f4147]">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          {/* Banner */}
          <div>
            <label className="block text-xs font-semibold text-[#b5bac1] uppercase tracking-wide mb-1.5">Server Banner</label>
            <div className="relative h-28 rounded-lg bg-[#2b2d31] overflow-hidden border border-[#3f4147]">
              {banner ? (
                <img src={banner} alt="" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center text-[#4e5058] gap-1">
                  <Image className="w-6 h-6" />
                  <span className="text-xs">Click to upload</span>
                </div>
              )}
              <input ref={bannerRef} type="file" accept={ACCEPT_IMAGE} className="hidden" onChange={(e) => {
                const f = e.target.files?.[0]; if (f) readFile(f, setBanner); e.target.value = "";
              }} />
              <button type="button" onClick={() => bannerRef.current?.click()}
                className="absolute inset-0 bg-black/30 opacity-0 hover:opacity-100 transition-opacity flex items-center justify-center text-white text-sm font-medium">
                <Upload className="w-4 h-4 mr-1" /> Upload Banner
              </button>
            </div>
          </div>

          {/* Icon */}
          <div>
            <label className="block text-xs font-semibold text-[#b5bac1] uppercase tracking-wide mb-1.5">Server Icon</label>
            <div className="flex items-center gap-3">
              <div className="w-16 h-16 rounded-full bg-[#2b2d31] border border-[#3f4147] overflow-hidden flex items-center justify-center relative">
                {icon ? (
                  <img src={icon} alt="" className="w-full h-full object-cover" />
                ) : (
                  <span className="text-2xl text-[#4e5058]">{name.slice(0, 2).toUpperCase() || "?"}</span>
                )}
              </div>
              <input ref={iconRef} type="file" accept={ACCEPT_IMAGE} className="hidden" onChange={(e) => {
                const f = e.target.files?.[0]; if (f) readFile(f, setIcon); e.target.value = "";
              }} />
              <button type="button" onClick={() => iconRef.current?.click()}
                className="px-3 py-1.5 rounded-md bg-[#3f4147] text-[#dbdee1] hover:bg-[#4e5058] text-sm">
                Upload Icon
              </button>
              {icon && (
                <button type="button" onClick={() => setIcon(undefined)} className="text-xs text-red-400 hover:underline">Remove</button>
              )}
            </div>
          </div>

          {/* Name */}
          <div>
            <label className="block text-xs font-semibold text-[#b5bac1] uppercase tracking-wide mb-1.5">Server Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="My Awesome Server"
              maxLength={64}
              className="w-full px-3 py-2 rounded-md bg-[#1e1f22] border border-[#3f4147] text-white placeholder-[#4e5058] focus:border-[#5865f2] focus:outline-none"
              autoFocus
              onKeyDown={(e) => { if (e.key === "Enter") handleCreate(); }}
            />
          </div>
        </div>

        <div className="flex justify-end gap-2 px-5 py-4 border-t border-[#3f4147] bg-[#2b2d31]">
          <button onClick={onClose} className="px-4 py-2 rounded-md text-[#b5bac1] hover:text-white hover:bg-[#3f4147]">Cancel</button>
          <button onClick={handleCreate} disabled={!name.trim()} className="px-4 py-2 rounded-md bg-[#5865f2] hover:bg-[#4752c4] text-white font-medium disabled:opacity-50 disabled:cursor-not-allowed">
            Create Server
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
