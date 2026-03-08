/**
 * Imgflip GIF API - Free alternative, no API key required
 * Docs: https://imgflip.com/api
 */

export interface ImgflipGif {
  id: string;
  url: string;
  previewUrl: string;
}

export interface ImgflipSearchResult {
  results: ImgflipGif[];
  next: string | null;
}

const IMGFLIP_BASE = "https://api.imgflip.com";

export async function searchImgflipGifs(
  query: string,
  limit = 12
): Promise<ImgflipSearchResult> {
  try {
    // Imgflip doesn't have a direct GIF search API, but we can use their meme API
    // For actual GIFs, we'll use a different approach - using a public GIF search service
    // Let's use the Imgur API which has GIF search (no key needed for basic usage)
    const response = await fetch(
      `https://api.imgur.com/3/gallery/search/top/all/0?q_type=gif&q=${encodeURIComponent(query)}`,
      {
        headers: {
          Authorization: "Client-ID 546c25a59c58ad7", // Public client ID
        },
      }
    );

    if (!response.ok) {
      console.error("Imgur API error:", response.status, response.statusText);
      return { results: [], next: null };
    }

    const data = await response.json();
    const results: ImgflipGif[] = (data.data || [])
      .slice(0, limit)
      .map((item: any) => ({
        id: item.id || String(Math.random()),
        url: item.images?.[0]?.link || item.link || "",
        previewUrl: item.images?.[0]?.link || item.link || "",
      }))
      .filter((g: ImgflipGif) => g.url);

    return { results, next: null };
  } catch (error) {
    console.error("GIF API fetch error:", error);
    return { results: [], next: null };
  }
}

export async function getTrendingImgflipGifs(
  limit = 12
): Promise<ImgflipSearchResult> {
  try {
    const response = await fetch(
      `https://api.imgur.com/3/gallery/hot/viral/0?q_type=gif`,
      {
        headers: {
          Authorization: "Client-ID 546c25a59c58ad7",
        },
      }
    );

    if (!response.ok) {
      console.error("Imgur API error:", response.status, response.statusText);
      return { results: [], next: null };
    }

    const data = await response.json();
    const results: ImgflipGif[] = (data.data || [])
      .slice(0, limit)
      .map((item: any) => ({
        id: item.id || String(Math.random()),
        url: item.images?.[0]?.link || item.link || "",
        previewUrl: item.images?.[0]?.link || item.link || "",
      }))
      .filter((g: ImgflipGif) => g.url);

    return { results, next: null };
  } catch (error) {
    console.error("GIF API fetch error:", error);
    return { results: [], next: null };
  }
}
