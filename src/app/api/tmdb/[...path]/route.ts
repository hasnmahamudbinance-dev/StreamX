import { NextRequest, NextResponse } from "next/server";
import { getMockData } from "@/lib/mock-data";

const TMDB_API_KEY = process.env.TMDB_API_KEY;
const TMDB_BASE_URL = process.env.TMDB_BASE_URL || "https://api.themoviedb.org/3";

async function tmdbFetch(endpoint: string, params: Record<string, string> = {}) {
  const url = new URL(`${TMDB_BASE_URL}${endpoint}`);
  url.searchParams.set("api_key", TMDB_API_KEY || "");
  Object.entries(params).forEach(([key, value]) => {
    url.searchParams.set(key, value);
  });

  const response = await fetch(url.toString(), {
    next: { revalidate: 3600 },
  });

  if (!response.ok) {
    throw new Error(`TMDB API error: ${response.status}`);
  }

  return response.json();
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  try {
    const { path } = await params;
    const endpoint = "/" + path.join("/");
    const searchParams = req.nextUrl.searchParams;
    const paramsObj: Record<string, string> = {};
    searchParams.forEach((value, key) => {
      paramsObj[key] = value;
    });

    // Try TMDB API first
    try {
      const data = await tmdbFetch(endpoint, paramsObj);
      return NextResponse.json(data);
    } catch (tmdbError: unknown) {
      // Fall back to mock data
      const message = tmdbError instanceof Error ? tmdbError.message : String(tmdbError);
      console.warn(`TMDB API failed (${message}), using mock data for: ${endpoint}`);
      const mockData = getMockData(endpoint, paramsObj);
      return NextResponse.json(mockData);
    }
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("TMDB proxy error:", message);
    return NextResponse.json(
      { error: "Failed to fetch content", details: message },
      { status: 500 }
    );
  }
}
