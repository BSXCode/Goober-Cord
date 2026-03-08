/**
 * Klipy GIF API client.
 * Docs: https://docs.klipy.com
 *
 * Response shape (verified against live API):
 *   { result: true, data: { data: [...items], current_page, per_page, has_next } }
 *
 * Each item:
 *   { id, slug, title, file: { hd: { gif: {url}, webp: {url} }, md: {...}, sm: {...} } }
 */

import { getKlipyApiKey } from "./client-settings";

export interface KlipyGif {
  id: string;
  url: string;
  previewUrl: string;
  title: string;
}

export interface KlipyResult {
  gifs: KlipyGif[];
  hasNext: boolean;
  currentPage: number;
}

function getApiKey(): string {
  if (typeof window !== "undefined") {
    const fromStorage = getKlipyApiKey();
    if (fromStorage) return fromStorage;
  }
  return process.env.NEXT_PUBLIC_KLIPY_API_KEY ?? "";
}

function parseItem(item: any): KlipyGif | null {
  if (!item?.file) return null;
  const url =
    item.file.md?.gif?.url ||
    item.file.hd?.gif?.url ||
    item.file.sm?.gif?.url ||
    "";
  const previewUrl =
    item.file.sm?.webp?.url ||
    item.file.sm?.gif?.url ||
    item.file.md?.webp?.url ||
    url;
  if (!url) return null;
  return {
    id: String(item.id ?? item.slug ?? Math.random()),
    url,
    previewUrl,
    title: item.title ?? "GIF",
  };
}

async function request(
  mode: "search" | "trending",
  query: string,
  limit: number,
  page: number,
): Promise<KlipyResult> {
  const apiKey = getApiKey();
  if (!apiKey) {
    return { gifs: [], hasNext: false, currentPage: 1 };
  }

  const res = await fetch("/api/klipy", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ apiKey, mode, query, limit, page }),
  });

  if (!res.ok) {
    console.error("Klipy proxy error", res.status, await res.text());
    return { gifs: [], hasNext: false, currentPage: page };
  }

  const json = await res.json();

  const items: any[] = json?.data?.data ?? [];
  const gifs = items.map(parseItem).filter(Boolean) as KlipyGif[];
  const hasNext = json?.data?.has_next === true;
  const currentPage = json?.data?.current_page ?? page;

  return { gifs, hasNext, currentPage };
}

export function searchGifs(query: string, limit = 12, page = 1) {
  return request("search", query, limit, page);
}

export function trendingGifs(limit = 12, page = 1) {
  return request("trending", "", limit, page);
}
