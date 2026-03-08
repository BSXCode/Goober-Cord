"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { createPortal } from "react-dom";
import { useAuthStore } from "@/lib/auth-store";
import { useAppStore } from "@/lib/app-store";
import { searchGifs, trendingGifs, type KlipyGif } from "@/lib/klipy";
import { cn } from "@/lib/cn";
import { X, Heart, Search, Loader2 } from "lucide-react";

interface GifPickerProps {
  onSelect: (gif: { id: string; url: string }) => void;
  onClose: () => void;
  anchorRef: React.RefObject<HTMLElement | null>;
}

export function GifPicker({ onSelect, onClose, anchorRef }: GifPickerProps) {
  const currentUserId = useAuthStore((s) => s.currentUserId);
  const users = useAppStore((s) => s.users);
  const toggleFavoriteGif = useAppStore((s) => s.toggleFavoriteGif);

  const panelRef = useRef<HTMLDivElement>(null);
  const [coords, setCoords] = useState({ top: 0, left: 0 });
  const [tab, setTab] = useState<"search" | "favorites">("search");
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<KlipyGif[]>([]);
  const [page, setPage] = useState(1);
  const [hasNext, setHasNext] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const user = currentUserId ? users[currentUserId] : null;
  const favorites = user?.favoriteGifs ?? [];

  const load = useCallback(async (q: string, p: number, append: boolean) => {
    setLoading(true);
    setError(null);
    try {
      const res = q.trim()
        ? await searchGifs(q.trim(), 12, p)
        : await trendingGifs(12, p);

      setResults((prev) => (append ? [...prev, ...res.gifs] : res.gifs));
      setHasNext(res.hasNext);
      setPage(res.currentPage);

      if (res.gifs.length === 0 && p === 1) {
        setError(q.trim() ? "No results found." : "Could not load GIFs. Check your API key in Settings > GIF / Stickers.");
      }
    } catch {
      setError("Failed to load GIFs.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load(query, 1, false);
  }, [query, load]);

  // Position the panel above the anchor button
  useEffect(() => {
    const recalc = () => {
      const anchor = anchorRef.current;
      if (!anchor) return;
      const r = anchor.getBoundingClientRect();
      const pw = 340, ph = 400, gap = 8;
      const left = Math.min(Math.max(gap, r.left - pw / 2 + r.width / 2), window.innerWidth - pw - gap);
      const top = r.top >= ph + gap ? r.top - ph - gap : r.bottom + gap;
      setCoords({ top: Math.max(gap, top), left });
    };
    recalc();
    window.addEventListener("resize", recalc);
    window.addEventListener("scroll", recalc, true);
    return () => {
      window.removeEventListener("resize", recalc);
      window.removeEventListener("scroll", recalc, true);
    };
  }, [anchorRef]);

  // Close on outside click or Escape
  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      if (
        panelRef.current && !panelRef.current.contains(e.target as Node) &&
        anchorRef.current && !anchorRef.current.contains(e.target as Node)
      ) onClose();
    };
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [onClose, anchorRef]);

  const isFav = (id: string) => favorites.some((f) => f.id === id);

  const content = (
    <div
      ref={panelRef}
      className="fixed w-[340px] rounded-xl bg-[var(--glass-bg)] backdrop-blur-md border border-[var(--glass-border)] shadow-2xl overflow-hidden z-[120] flex flex-col"
      style={{ top: coords.top, left: coords.left, maxHeight: 400 }}
    >
      {/* Tabs */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-[var(--glass-border)]">
        <div className="flex gap-1">
          <button type="button" onClick={() => setTab("search")}
            className={cn("px-3 py-1 rounded-lg text-sm font-medium transition-colors", tab === "search" ? "bg-[var(--accent)] text-white" : "text-[var(--text-muted)] hover:text-[var(--text)]")}>
            Search
          </button>
          <button type="button" onClick={() => setTab("favorites")}
            className={cn("px-3 py-1 rounded-lg text-sm font-medium flex items-center gap-1 transition-colors", tab === "favorites" ? "bg-[var(--accent)] text-white" : "text-[var(--text-muted)] hover:text-[var(--text)]")}>
            <Heart className="w-3.5 h-3.5" /> Favorites
          </button>
        </div>
        <button type="button" onClick={onClose} className="p-1 rounded text-[var(--text-muted)] hover:text-[var(--text)] hover:bg-[var(--channel-hover)]" aria-label="Close">
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Search bar */}
      {tab === "search" && (
        <div className="px-3 py-2 border-b border-[var(--glass-border)]">
          <div className="relative">
            <Search className="w-4 h-4 text-[var(--text-muted)] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search GIFs..."
              className="w-full pl-9 pr-3 py-1.5 rounded-lg bg-[var(--surface-elevated)] border border-[var(--glass-border)] text-[var(--text)] placeholder-[var(--text-muted)] text-sm focus:border-[var(--accent)] focus:outline-none"
            />
          </div>
        </div>
      )}

      {/* Content */}
      <div className="flex-1 overflow-y-auto scroll-thin p-2" style={{ maxHeight: 300 }}>
        {tab === "favorites" && (
          <div className="grid grid-cols-3 gap-1.5">
            {favorites.length === 0 ? (
              <p className="col-span-3 text-sm text-[var(--text-muted)] py-6 text-center">No favorites yet. Search and heart a GIF to save it.</p>
            ) : (
              favorites.map((g) => (
                <GifTile key={g.id} gif={g} isFav onSelect={onSelect} onToggleFav={() => currentUserId && toggleFavoriteGif(currentUserId, g)} />
              ))
            )}
          </div>
        )}

        {tab === "search" && (
          <>
            {loading && results.length === 0 ? (
              <div className="flex items-center justify-center py-10">
                <Loader2 className="w-7 h-7 animate-spin text-[var(--accent)]" />
              </div>
            ) : error && results.length === 0 ? (
              <p className="text-sm text-[var(--text-muted)] py-6 text-center">{error}</p>
            ) : (
              <div className="grid grid-cols-3 gap-1.5">
                {results.map((g) => (
                  <GifTile
                    key={g.id}
                    gif={g}
                    isFav={isFav(g.id)}
                    onSelect={onSelect}
                    onToggleFav={() => currentUserId && toggleFavoriteGif(currentUserId, g)}
                  />
                ))}
              </div>
            )}
            {hasNext && results.length > 0 && (
              <div className="flex justify-center py-2">
                <button
                  type="button"
                  onClick={() => load(query, page + 1, true)}
                  disabled={loading}
                  className="text-sm text-[var(--accent)] hover:underline disabled:opacity-50"
                >
                  {loading ? "Loading..." : "Load more"}
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );

  if (typeof document === "undefined") return null;
  return createPortal(content, document.body);
}

function GifTile({ gif, isFav, onSelect, onToggleFav }: {
  gif: { id: string; url: string; previewUrl?: string };
  isFav: boolean;
  onSelect: (g: { id: string; url: string }) => void;
  onToggleFav: () => void;
}) {
  return (
    <div className="relative group aspect-square rounded-lg overflow-hidden bg-[var(--surface-elevated)]">
      <img
        src={(gif as any).previewUrl || gif.url}
        alt=""
        className="w-full h-full object-cover"
        loading="lazy"
      />
      <div className="absolute inset-0 flex items-center justify-center gap-1.5 opacity-0 group-hover:opacity-100 bg-black/50 transition-opacity">
        <button type="button" onClick={() => onSelect(gif)} className="px-2.5 py-1 rounded-md bg-[var(--accent)] text-white text-xs font-medium">
          Send
        </button>
        <button
          type="button"
          onClick={onToggleFav}
          className={cn("p-1 rounded-md bg-black/40", isFav ? "text-red-400" : "text-white/70 hover:text-red-400")}
          aria-label={isFav ? "Remove from favorites" : "Add to favorites"}
        >
          <Heart className={cn("w-4 h-4", isFav && "fill-current")} />
        </button>
      </div>
    </div>
  );
}
