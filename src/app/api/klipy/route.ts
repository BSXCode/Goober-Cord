import { NextResponse } from "next/server";

const KLIPY_BASE = "https://api.klipy.com/api/v1";

export async function POST(req: Request) {
  try {
    const { apiKey, mode, query, limit, page } = await req.json();

    if (!apiKey || typeof apiKey !== "string") {
      return NextResponse.json({ error: "Missing API key" }, { status: 400 });
    }

    const endpoint = mode === "search" ? "search" : "trending";
    const url = new URL(`${KLIPY_BASE}/${apiKey}/gifs/${endpoint}`);
    url.searchParams.set("page", String(page || 1));
    url.searchParams.set("per_page", String(limit || 12));
    if (mode === "search" && query) {
      url.searchParams.set("q", query);
    }

    const res = await fetch(url.toString(), {
      headers: { Accept: "application/json" },
      cache: "no-store",
    });

    if (!res.ok) {
      const text = await res.text();
      return NextResponse.json(
        { error: "Klipy upstream error", status: res.status, body: text.slice(0, 500) },
        { status: res.status }
      );
    }

    const json = await res.json();
    return NextResponse.json(json);
  } catch (err) {
    return NextResponse.json(
      { error: "Proxy error", detail: String(err) },
      { status: 500 }
    );
  }
}
