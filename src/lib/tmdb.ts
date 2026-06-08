const TMDB_IMAGE_BASE = 'https://image.tmdb.org/t/p';

export function getImageUrl(path: string | null, size: string = 'w500'): string {
  if (!path) return '/placeholder-poster.svg';
  return `${TMDB_IMAGE_BASE}/${size}${path}`;
}

export function getBackdropUrl(path: string | null): string {
  if (!path) return '/placeholder-backdrop.svg';
  return `${TMDB_IMAGE_BASE}/original${path}`;
}

export function getProfileUrl(path: string | null): string {
  if (!path) return '/placeholder-avatar.svg';
  return `${TMDB_IMAGE_BASE}/w185${path}`;
}

async function tmdbFetch(path: string, params: Record<string, string> = {}): Promise<any> {
  const searchParams = new URLSearchParams(params);
  const url = `/api/tmdb${path}?${searchParams.toString()}`;
  
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`TMDB API error: ${response.status}`);
  }
  return response.json();
}

export async function getTrending(mediaType: string = 'all', timeWindow: string = 'week', page: number = 1) {
  return tmdbFetch(`/trending/${mediaType}/${timeWindow}`, { page: String(page) });
}

export async function getPopular(mediaType: string = 'movie', page: number = 1) {
  return tmdbFetch(`/${mediaType}/popular`, { page: String(page) });
}

export async function getTopRated(mediaType: string = 'movie', page: number = 1) {
  return tmdbFetch(`/${mediaType}/top_rated`, { page: String(page) });
}

export async function getNowPlaying(page: number = 1) {
  return tmdbFetch('/movie/now_playing', { page: String(page) });
}

export async function getOnTheAir(page: number = 1) {
  return tmdbFetch('/tv/on_the_air', { page: String(page) });
}

export async function getUpcoming(page: number = 1) {
  return tmdbFetch('/movie/upcoming', { page: String(page) });
}

export async function getDetails(mediaType: string, id: string | number) {
  return tmdbFetch(`/${mediaType}/${id}`, { append_to_response: 'credits,videos,similar,recommendations' });
}

export async function searchContent(query: string, mediaType: string = 'multi', page: number = 1) {
  return tmdbFetch(`/search/${mediaType}`, { query, page: String(page) });
}

export async function getGenres(mediaType: string = 'movie') {
  return tmdbFetch(`/genre/${mediaType}/list`);
}

export async function discoverContent(mediaType: string, params: Record<string, string> = {}) {
  return tmdbFetch(`/discover/${mediaType}`, params);
}

export function getContentTitle(item: any): string {
  return item.title || item.name || 'Unknown';
}

export function getContentDate(item: any): string {
  return item.release_date || item.first_air_date || '';
}

export function getMediaType(item: any): string {
  if (item.media_type) return item.media_type;
  if (item.title) return 'movie';
  if (item.name) return 'tv';
  return 'movie';
}
