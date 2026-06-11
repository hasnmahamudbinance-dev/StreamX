// Bangla Entertainment Hub — Constants, OTT Badges, Curated Collections
// This module powers the Hoichoi + Chorki + Bangla Originals integration

import { discoverContent, getTrending, searchContent } from './tmdb';

// ─── OTT Platform Definitions ──────────────────────────────────

export interface OTTPlatform {
  id: string;
  name: string;
  shortName: string;
  color: string;          // Tailwind bg class
  textColor: string;      // Tailwind text class
  borderColor: string;    // Tailwind border class
  icon?: string;          // Emoji fallback
}

export const OTT_PLATFORMS: OTTPlatform[] = [
  {
    id: 'hoichoi',
    name: 'Hoichoi',
    shortName: 'HOICHOI',
    color: 'bg-red-600',
    textColor: 'text-red-400',
    borderColor: 'border-red-500/30',
    icon: '🎬',
  },
  {
    id: 'chorki',
    name: 'Chorki',
    shortName: 'CHORKI',
    color: 'bg-emerald-600',
    textColor: 'text-emerald-400',
    borderColor: 'border-emerald-500/30',
    icon: '📺',
  },
  {
    id: 'zee5',
    name: 'ZEE5',
    shortName: 'ZEE5',
    color: 'bg-blue-600',
    textColor: 'text-blue-400',
    borderColor: 'border-blue-500/30',
    icon: '🔵',
  },
  {
    id: 'sonyliv',
    name: 'Sony LIV',
    shortName: 'SONY LIV',
    color: 'bg-indigo-600',
    textColor: 'text-indigo-400',
    borderColor: 'border-indigo-500/30',
    icon: '🟣',
  },
  {
    id: 'bongo',
    name: 'Bongo',
    shortName: 'BONGO',
    color: 'bg-orange-600',
    textColor: 'text-orange-400',
    borderColor: 'border-orange-500/30',
    icon: '🟠',
  },
  {
    id: 'bioscope',
    name: 'Bioscope',
    shortName: 'BIOSCOPE',
    color: 'bg-teal-600',
    textColor: 'text-teal-400',
    borderColor: 'border-teal-500/30',
    icon: '🎥',
  },
  {
    id: 'toffee',
    name: 'Toffee',
    shortName: 'TOFFEE',
    color: 'bg-amber-600',
    textColor: 'text-amber-400',
    borderColor: 'border-amber-500/30',
    icon: '🍬',
  },
];

export function getOTTById(id: string): OTTPlatform | undefined {
  return OTT_PLATFORMS.find(p => p.id === id);
}

// ─── Bangla Content Discovery via TMDB ─────────────────────────

export async function getBanglaTrending(page = 1) {
  return getTrending('all', 'week', page);
}

export async function getBanglaPopularMovies(page = 1) {
  return discoverContent('movie', {
    with_original_language: 'bn',
    sort_by: 'popularity.desc',
    page: String(page),
    'vote_count.gte': '10',
  });
}

export async function getBanglaPopularTV(page = 1) {
  return discoverContent('tv', {
    with_original_language: 'bn',
    sort_by: 'popularity.desc',
    page: String(page),
    'vote_count.gte': '5',
  });
}

export async function getBanglaTopRatedMovies(page = 1) {
  return discoverContent('movie', {
    with_original_language: 'bn',
    sort_by: 'vote_average.desc',
    page: String(page),
    'vote_count.gte': '50',
  });
}

export async function getBanglaTopRatedTV(page = 1) {
  return discoverContent('tv', {
    with_original_language: 'bn',
    sort_by: 'vote_average.desc',
    page: String(page),
    'vote_count.gte': '20',
  });
}

export async function getBanglaDramaMovies(page = 1) {
  return discoverContent('movie', {
    with_original_language: 'bn',
    with_genres: '18', // Drama
    sort_by: 'popularity.desc',
    page: String(page),
  });
}

export async function getBanglaThrillerMovies(page = 1) {
  return discoverContent('movie', {
    with_original_language: 'bn',
    with_genres: '53', // Thriller
    sort_by: 'popularity.desc',
    page: String(page),
  });
}

export async function getBanglaCrimeTV(page = 1) {
  return discoverContent('tv', {
    with_original_language: 'bn',
    with_genres: '80', // Crime
    sort_by: 'popularity.desc',
    page: String(page),
  });
}

export async function getBanglaComedyMovies(page = 1) {
  return discoverContent('movie', {
    with_original_language: 'bn',
    with_genres: '35', // Comedy
    sort_by: 'popularity.desc',
    page: String(page),
  });
}

// Bangladesh-specific: region=BD
export async function getBangladeshMovies(page = 1) {
  return discoverContent('movie', {
    with_original_language: 'bn',
    region: 'BD',
    sort_by: 'popularity.desc',
    page: String(page),
  });
}

// Kolkata / West Bengal movies
export async function getKolkataMovies(page = 1) {
  return discoverContent('movie', {
    with_original_language: 'bn',
    region: 'IN',
    sort_by: 'popularity.desc',
    page: String(page),
    with_release_type: '3',
  });
}

// Search Bangla content
export async function searchBanglaContent(query: string, page = 1) {
  return searchContent(query, 'multi', page);
}

// ─── Curated Collections ───────────────────────────────────────

export interface BanglaCollection {
  id: string;
  title: string;
  description: string;
  icon: string;
  gradient: string;       // Tailwind gradient classes
  fetchFn: () => Promise<{ results: any[] }>;
}

export const BANGLA_COLLECTIONS: BanglaCollection[] = [
  {
    id: 'bangladesh-cinema',
    title: 'Bangladesh Cinema',
    description: 'Dhaka-based productions & Bangladeshi films',
    icon: '🇧🇩',
    gradient: 'from-green-600/20 to-red-600/20',
    fetchFn: () => getBangladeshMovies(),
  },
  {
    id: 'kolkata-cinema',
    title: 'Kolkata Cinema',
    description: 'Tollywood productions & West Bengal films',
    icon: '🎭',
    gradient: 'from-amber-600/20 to-orange-600/20',
    fetchFn: () => getKolkataMovies(),
  },
  {
    id: 'bangla-crime-thrillers',
    title: 'Bangla Crime Thrillers',
    description: 'Detective, Crime & Mystery series',
    icon: '🔍',
    gradient: 'from-red-600/20 to-gray-800/20',
    fetchFn: () => getBanglaCrimeTV(),
  },
  {
    id: 'bangla-family-dramas',
    title: 'Bangla Family Dramas',
    description: 'Family, Romance & Drama',
    icon: '👨‍👩‍👧‍👦',
    gradient: 'from-pink-600/20 to-purple-600/20',
    fetchFn: () => getBanglaDramaMovies(),
  },
  {
    id: 'bangla-comedy',
    title: 'Bangla Comedy',
    description: 'Light-hearted Bengali comedies',
    icon: '😂',
    gradient: 'from-yellow-600/20 to-green-600/20',
    fetchFn: () => getBanglaComedyMovies(),
  },
  {
    id: 'bangla-thrillers',
    title: 'Bangla Thrillers',
    description: 'Edge-of-your-seat Bengali thrillers',
    icon: '⚡',
    gradient: 'from-gray-700/20 to-red-900/20',
    fetchFn: () => getBanglaThrillerMovies(),
  },
];

// ─── Featured Bangla Actors ────────────────────────────────────

export interface FeaturedActor {
  name: string;
  tmdbQuery: string;  // Search query for TMDB person search
  knownFor: string;
}

export const FEATURED_BANGLA_ACTORS: FeaturedActor[] = [
  { name: 'Chanchal Chowdhury', tmdbQuery: 'Chanchal Chowdhury', knownFor: 'Monpura, Aynabaji' },
  { name: 'Mosharraf Karim', tmdbQuery: 'Mosharraf Karim', knownFor: 'Television Drama, Comedy' },
  { name: 'Jaya Ahsan', tmdbQuery: 'Jaya Ahsan', knownFor: 'Debi, Robindronath Ekhane' },
  { name: 'Anirban Bhattacharya', tmdbQuery: 'Anirban Bhattacharya', knownFor: 'Mandaar, Eken Babu' },
  { name: 'Parambrata Chattopadhyay', tmdbQuery: 'Parambrata Chattopadhyay', knownFor: 'Kahaani, Baishe Srabon' },
  { name: 'Shakib Khan', tmdbQuery: 'Shakib Khan', knownFor: 'Priya Amar Priya, Bhalobasha' },
  { name: 'Chayanika Chowdhury', tmdbQuery: 'Chayanika Chowdhury', knownFor: 'Bangla TV Drama' },
  { name: 'Ritwick Chakraborty', tmdbQuery: 'Ritwick Chakraborty', knownFor: 'Baishe Srabon, Vinci Da' },
  { name: 'Mahiya Mahi', tmdbQuery: 'Mahiya Mahi', knownFor: 'Bangla Cinema' },
  { name: 'Afran Nisho', tmdbQuery: 'Afran Nisho', knownFor: 'Karagar, Mohanagar' },
];

// ─── OTT Badge Content Mapping ─────────────────────────────────
// Maps known Bangla titles to their OTT platforms
// This is a curated mapping — in production this would come from a DB or API

export const OTT_CONTENT_MAP: Record<string, string[]> = {
  // Hoichoi Originals (by TMDB title or known name)
  'Karagar': ['hoichoi'],
  'Mohanagar': ['hoichoi'],
  'Indubala Bhaater Hotel': ['hoichoi'],
  'Mandaar': ['hoichoi'],
  'Eken Babu': ['hoichoi'],
  'Byomkesh': ['hoichoi'],
  'Feluda': ['hoichoi'],
  'Robindronath Ekhane Kokhono Khete Aashenni': ['hoichoi'],
  'Hello': ['hoichoi'],
  'Dhanbad Blues': ['hoichoi'],
  'Paap': ['hoichoi'],
  'Doppo': ['hoichoi'],

  // Chorki Originals
  'Taqdeer': ['chorki'],
  'Boli': ['chorki'],
  'Kaiser': ['chorki'],
  'Syndicate': ['chorki'],
  'Morichika': ['chorki'],
  'University': ['chorki'],
  'Dugdugi': ['chorki'],
  'Amanush': ['chorki'],

  // Multi-platform
  'Debi': ['hoichoi', 'zee5'],
  'Monpura': ['bongo', 'zee5'],
  'Aynabaji': ['bongo', 'hoichoi'],
  'Hawa': ['bongo', 'chorki'],
  'Poramon': ['bongo', 'toffee'],
  'Rehana Maryam Noor': ['bioscope'],
  'Aynabaji 2': ['zee5', 'bongo'],
};

// Get OTT platforms for a given title
export function getOTTForTitle(title: string): OTTPlatform[] {
  const platforms = OTT_CONTENT_MAP[title];
  if (!platforms) return [];
  return platforms
    .map(id => getOTTById(id))
    .filter((p): p is OTTPlatform => !!p);
}

// Smart OTT detection based on content metadata
export function detectOTTPlatforms(item: {
  title?: string;
  name?: string;
  overview?: string;
  production_companies?: { name: string }[];
  network?: { name: string }[];
}): OTTPlatform[] {
  const title = item.title || item.name || '';
  const overview = item.overview || '';
  
  // Direct title match
  const directMatch = getOTTForTitle(title);
  if (directMatch.length > 0) return directMatch;

  // Heuristic detection from overview/production
  const detected: OTTPlatform[] = [];
  const text = `${title} ${overview}`.toLowerCase();
  
  if (text.includes('hoichoi') || text.includes('hoichoi original')) {
    const platform = getOTTById('hoichoi');
    if (platform) detected.push(platform);
  }
  if (text.includes('chorki') || text.includes('chorki original')) {
    const platform = getOTTById('chorki');
    if (platform) detected.push(platform);
  }
  if (text.includes('zee5') || text.includes('zee5 original')) {
    const platform = getOTTById('zee5');
    if (platform) detected.push(platform);
  }
  if (text.includes('bongo')) {
    const platform = getOTTById('bongo');
    if (platform) detected.push(platform);
  }
  if (text.includes('bioscope')) {
    const platform = getOTTById('bioscope');
    if (platform) detected.push(platform);
  }
  if (text.includes('toffee')) {
    const platform = getOTTById('toffee');
    if (platform) detected.push(platform);
  }
  if (text.includes('sony liv') || text.includes('sonyliv')) {
    const platform = getOTTById('sonyliv');
    if (platform) detected.push(platform);
  }

  return detected;
}

// ─── Bangla Search Filters ─────────────────────────────────────

export type BanglaSearchFilter = 'all' | 'bangla' | 'hoichoi' | 'chorki' | 'movies' | 'tv' | 'actors';

export const BANGLA_SEARCH_FILTERS: { value: BanglaSearchFilter; label: string; icon: string }[] = [
  { value: 'all', label: 'All', icon: '🔍' },
  { value: 'bangla', label: 'Bangla Only', icon: '🇧🇩' },
  { value: 'hoichoi', label: 'Hoichoi', icon: '🎬' },
  { value: 'chorki', label: 'Chorki', icon: '📺' },
  { value: 'movies', label: 'Movies', icon: '🎥' },
  { value: 'tv', label: 'TV Shows', icon: '📺' },
  { value: 'actors', label: 'Actors', icon: '🎭' },
];
