// Video Server Configuration for StreamX
// Each server provides embed URLs using TMDB IDs for movies and TV shows
// Updated 2025-03: All domains verified - HTTP 200 with browser UA
// Note: 403 from curl without UA is Cloudflare bot protection — these work in browser iframes

export interface VideoServer {
  id: string;
  name: string;
  quality: string;
  status: 'stable' | 'beta' | 'unstable';
  getUrl(tmdbId: number, mediaType: 'movie' | 'tv', season?: number, episode?: number): string;
}

export const VIDEO_SERVERS: VideoServer[] = [
  {
    id: 'nexstream',
    name: 'NexStream',
    quality: 'HD',
    status: 'stable',
    getUrl(tmdbId, mediaType, season, episode) {
      const apiKey = process.env.NEXT_PUBLIC_NEXSTREAM_API_KEY || '';
      if (mediaType === 'movie') {
        return `https://api.codespecters.com/embed/movie/${tmdbId}?apikey=${apiKey}`;
      }
      return `https://api.codespecters.com/embed/tv/${tmdbId}?apikey=${apiKey}&s=${season || 1}&e=${episode || 1}`;
    },
  },
  {
    id: 'vidapi',
    name: 'VidAPI',
    quality: 'HD',
    status: 'stable',
    getUrl(tmdbId, mediaType, season, episode) {
      if (mediaType === 'movie') {
        return `https://vidapi.xyz/embed/movie/${tmdbId}`;
      }
      return `https://vidapi.xyz/embed/tv/${tmdbId}&s=${season || 1}&e=${episode || 1}`;
    },
  },
  {
    id: 'vidsrc-to',
    name: 'VidSrc',
    quality: 'HD',
    status: 'stable',
    getUrl(tmdbId, mediaType, season, episode) {
      if (mediaType === 'movie') {
        return `https://vidsrc.to/embed/movie/${tmdbId}`;
      }
      return `https://vidsrc.to/embed/tv/${tmdbId}/${season || 1}/${episode || 1}`;
    },
  },
  {
    id: 'vidsrc-pm',
    name: 'VidSrc PM',
    quality: 'HD',
    status: 'stable',
    getUrl(tmdbId, mediaType, season, episode) {
      if (mediaType === 'movie') {
        return `https://vidsrc.pm/embed/movie/${tmdbId}`;
      }
      return `https://vidsrc.pm/embed/tv/${tmdbId}/${season || 1}/${episode || 1}`;
    },
  },
  {
    id: 'vidsrc-su',
    name: 'VidSrc SU',
    quality: 'HD',
    status: 'stable',
    getUrl(tmdbId, mediaType, season, episode) {
      if (mediaType === 'movie') {
        return `https://vidsrc.su/embed/movie/${tmdbId}`;
      }
      return `https://vidsrc.su/embed/tv/${tmdbId}/${season || 1}/${episode || 1}`;
    },
  },
  {
    id: '2embed-cc',
    name: '2Embed',
    quality: 'HD',
    status: 'stable',
    getUrl(tmdbId, mediaType, season, episode) {
      if (mediaType === 'movie') {
        return `https://www.2embed.cc/embed/${tmdbId}`;
      }
      return `https://www.2embed.cc/embedtv/${tmdbId}&s=${season || 1}&e=${episode || 1}`;
    },
  },
  {
    id: '2embed-org',
    name: '2Embed Org',
    quality: 'HD',
    status: 'stable',
    getUrl(tmdbId, mediaType, season, episode) {
      if (mediaType === 'movie') {
        return `https://2embed.org/embed/${tmdbId}`;
      }
      return `https://2embed.org/embedtv/${tmdbId}&s=${season || 1}&e=${episode || 1}`;
    },
  },
  {
    id: '2embed-skin',
    name: '2Embed Skin',
    quality: 'HD',
    status: 'beta',
    getUrl(tmdbId, mediaType, season, episode) {
      if (mediaType === 'movie') {
        return `https://2embed.skin/embed/${tmdbId}`;
      }
      return `https://2embed.skin/embedtv/${tmdbId}&s=${season || 1}&e=${episode || 1}`;
    },
  },
];

export const DEFAULT_SERVER_ID = 'nexstream';

export function getServerById(id: string): VideoServer | undefined {
  return VIDEO_SERVERS.find(s => s.id === id);
}

export function getServerUrl(
  serverId: string,
  tmdbId: number,
  mediaType: 'movie' | 'tv',
  season?: number,
  episode?: number
): string {
  const server = getServerById(serverId);
  if (!server) return VIDEO_SERVERS[0].getUrl(tmdbId, mediaType, season, episode);
  return server.getUrl(tmdbId, mediaType, season, episode);
}

// Get preferred server from localStorage
export function getPreferredServer(): string {
  if (typeof window === 'undefined') return DEFAULT_SERVER_ID;
  try {
    const saved = localStorage.getItem('streamx-preferred-server');
    // Validate saved server still exists
    if (saved && VIDEO_SERVERS.find(s => s.id === saved)) return saved;
    return DEFAULT_SERVER_ID;
  } catch {
    return DEFAULT_SERVER_ID;
  }
}

export function setPreferredServer(serverId: string): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem('streamx-preferred-server', serverId);
  } catch {
    // ignore
  }
}
