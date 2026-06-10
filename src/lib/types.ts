export interface TMDBMovie {
  id: number;
  title: string;
  overview: string;
  poster_path: string | null;
  backdrop_path: string | null;
  release_date: string;
  vote_average: number;
  vote_count: number;
  genre_ids: number[];
  popularity: number;
  adult: boolean;
  original_language: string;
  media_type?: string;
}

export interface TMDBTVShow {
  id: number;
  name: string;
  overview: string;
  poster_path: string | null;
  backdrop_path: string | null;
  first_air_date: string;
  vote_average: number;
  vote_count: number;
  genre_ids: number[];
  popularity: number;
  origin_country: string[];
  original_language: string;
  media_type?: string;
}

export type TMDBContent = TMDBMovie | TMDBTVShow;

export interface TMDBMovieDetail extends TMDBMovie {
  runtime: number;
  genres: TMDBGenre[];
  tagline: string;
  status: string;
  budget: number;
  revenue: number;
  production_companies: { id: number; name: string; logo_path: string | null }[];
  credits?: TMDBCredits;
  videos?: TMDBVideos;
  similar?: { results: TMDBMovie[] };
  recommendations?: { results: TMDBMovie[] };
}

export interface TMDBTVDetail extends TMDBTVShow {
  number_of_seasons: number;
  number_of_episodes: number;
  genres: TMDBGenre[];
  status: string;
  created_by: { id: number; name: string; profile_path: string | null }[];
  seasons: TMDBSeason[];
  credits?: TMDBCredits;
  videos?: TMDBVideos;
  similar?: { results: TMDBTVShow[] };
  recommendations?: { results: TMDBTVShow[] };
}

export interface TMDBSeason {
  id: number;
  name: string;
  season_number: number;
  episode_count: number;
  poster_path: string | null;
  overview: string;
  air_date: string;
}

export interface TMDBEpisode {
  id: number;
  name: string;
  overview: string;
  episode_number: number;
  season_number: number;
  still_path: string | null;
  air_date: string;
  runtime: number;
  vote_average: number;
}

export interface TMDBSeasonDetail {
  id: number;
  name: string;
  season_number: number;
  overview: string;
  air_date: string;
  poster_path: string | null;
  episodes: TMDBEpisode[];
}

export interface TMDBGenre {
  id: number;
  name: string;
}

export interface TMDBCredits {
  cast: TMDBCast[];
  crew: TMDBCrew[];
}

export interface TMDBCast {
  id: number;
  name: string;
  character: string;
  profile_path: string | null;
  order: number;
}

export interface TMDBCrew {
  id: number;
  name: string;
  job: string;
  department: string;
  profile_path: string | null;
}

export interface TMDBVideos {
  results: TMDBVideo[];
}

export interface TMDBVideo {
  id: string;
  key: string;
  name: string;
  site: string;
  type: string;
  official: boolean;
}

export interface TMDBSearchResponse {
  page: number;
  results: TMDBContent[];
  total_pages: number;
  total_results: number;
}

export interface WatchlistItem {
  id: string;
  contentId: string;
  contentType: string;
  title: string;
  posterPath: string | null;
  overview: string | null;
  rating: number | null;
  releaseDate: string | null;
  addedAt: string;
}

export interface ProgressItem {
  id: string;
  contentId: string;
  contentType: string;
  title: string;
  posterPath: string | null;
  seasonNumber: number | null;
  episodeNumber: number | null;
  position: number;
  duration: number;
  updatedAt: string;
}

export interface WatchHistoryItem {
  id: string;
  contentId: string;
  contentType: string;
  title: string;
  posterPath: string | null;
  overview: string | null;
  rating: number | null;
  releaseDate: string | null;
  progress: number;
  duration: number;
  watchedAt: string;
}

export interface NotificationItem {
  id: string;
  title: string;
  message: string;
  type: string;
  read: boolean;
  createdAt: string;
}

export interface UserSession {
  id: string;
  email: string;
  name: string;
  role: string;
  image?: string | null;
  avatar?: string | null;
  language?: string;
  autoplay?: boolean;
  emailNotify?: boolean;
  emailVerified?: boolean;
  status?: string;
}

export interface RatingData {
  average: number;
  count: number;
  distribution: number[];
  userRating: number | null;
}

export interface ReviewItem {
  id: string;
  userId: string;
  contentId: string;
  contentType: string;
  title: string;
  content: string;
  createdAt: string;
  updatedAt: string;
  user: {
    name: string;
    avatar: string | null;
  };
}

export interface ContentScheduleItem {
  id: string;
  contentId: string;
  action: string;
  scheduledAt: string;
  executed: boolean;
  executedAt: string | null;
  createdAt: string;
  content: {
    title: string;
    type: string;
    status: string;
  };
}

export interface HomepageSectionData {
  id: string;
  title: string;
  type: string;
  order: number;
  visible: boolean;
  items: HomepageSectionItemData[];
}

export interface HomepageSectionItemData {
  id: string;
  sectionId: string;
  contentId: string | null;
  contentType: string | null;
  uploadedId: string | null;
  order: number;
  uploaded?: {
    id: string;
    title: string;
    posterUrl: string | null;
    type: string;
  } | null;
}

export interface SystemSettings {
  [key: string]: {
    value: string;
    description?: string;
  };
}

export interface StorageStats {
  totalStorage: number;
  videoStorage: number;
  imageStorage: number;
  fileCount: number;
  breakdown: {
    videos: number;
    images: number;
    avatars: number;
    other: number;
  };
}

export interface ErrorLogItem {
  id: string;
  type: string;
  message: string;
  stack: string | null;
  endpoint: string | null;
  userId: string | null;
  metadata: string | null;
  resolved: boolean;
  createdAt: string;
}

export interface BackupItem {
  id: string;
  filename: string;
  size: number;
  type: string;
  status: string;
  createdAt: string;
}

export interface EmailLogItem {
  id: string;
  to: string;
  subject: string;
  type: string;
  status: string;
  error: string | null;
  createdAt: string;
}

export interface ContentReportItem {
  id: string;
  userId: string;
  contentId: string;
  contentType: string;
  reason: string;
  description: string | null;
  status: string;
  adminNote: string | null;
  reviewedBy: string | null;
  reviewedAt: string | null;
  createdAt: string;
  user: { name: string; email: string };
  reviewer?: { name: string } | null;
}

export interface SupportTicketItem {
  id: string;
  userId: string;
  subject: string;
  description: string;
  category: string;
  priority: string;
  status: string;
  createdAt: string;
  updatedAt: string;
  user: { name: string; email: string };
  messages: SupportMessageItem[];
}

export interface SupportMessageItem {
  id: string;
  userId: string;
  message: string;
  isAdmin: boolean;
  createdAt: string;
  user: { name: string; avatar: string | null };
}

export interface AuditLogItem {
  id: string;
  userId: string | null;
  action: string;
  details: string | null;
  createdAt: string;
  user?: { name: string; email: string } | null;
}

export interface HealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  version: string;
  uptime: number;
  checks: {
    db: { status: string; responseTime: number; details?: string };
    tmdb: { status: string; responseTime: number; details?: string };
  };
  system: {
    memory: { heapUsed: number; heapTotal: number; rss: number };
    nodeVersion: string;
    environment: string;
  };
}

export interface PlatformMetrics {
  totalUsers: number;
  activeUsers: number;
  recentSignups: number;
  totalWatchlist: number;
  totalRatings: number;
  totalReviews: number;
  totalViews: number;
  averageRating: number;
  topGenres: { genre: string; count: number }[];
  storage: { totalStorage: number; videoStorage: number; imageStorage: number };
  unresolvedErrors: number;
}

export type PageRoute = 
  | 'home' 
  | 'search' 
  | 'movie' 
  | 'tv' 
  | 'watchlist' 
  | 'history'
  | 'profile' 
  | 'login' 
  | 'register'
  | 'verify-email'
  | 'forgot-password'
  | 'reset-password'
  | 'profiles'
  | 'admin'
  | 'player'
  | 'support'
  | 'privacy'
  | 'bangla'
  | 'billing'
  | 'pricing'
  | 'favorites';

export interface AppState {
  currentPage: PageRoute;
  currentParams: Record<string, string>;
  user: UserSession | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  notifications: NotificationItem[];
  unreadCount: number;
  activeProfile: any | null;
  
  navigate: (page: PageRoute, params?: Record<string, string>) => void;
  setUser: (user: UserSession | null) => void;
  setLoading: (loading: boolean) => void;
  setNotifications: (notifications: NotificationItem[]) => void;
  markNotificationRead: (id: string) => void;
  markAllNotificationsRead: () => void;
  setActiveProfile: (profile: any) => void;
  logout: () => void;
}

// ─── AI Recommendation Types ──────────────────────────────────

export interface RecommendationCategory {
  id: string;
  title: string;
  items: TMDBContent[];
}

export interface SearchSuggestion {
  text: string;
  type: 'history' | 'trending' | 'popular';
}

export interface TrendingSearchItem {
  query: string;
  count: number;
}

export interface SearchHistoryItem {
  id: string;
  query: string;
  type: string;
  results: number;
  createdAt: string;
}

// ─── Enhanced Analytics Types ─────────────────────────────────

export interface EnhancedAnalytics {
  dau: number;
  wau: number;
  mau: number;
  retentionRate: number;
  newUsersToday: number;
  newUsersThisWeek: number;
  newUsersThisMonth: number;
  topWatchedContent: Array<{
    contentId: string;
    contentType: string;
    title: string;
    viewCount: number;
    avgCompletion: number;
  }>;
  topGenres: Array<{ genre: string; count: number }>;
  averageCompletionRate: number;
  totalPlayEvents: number;
  totalCompleteEvents: number;
  averageWatchDuration: number;
  peakHours: Array<{ hour: number; count: number }>;
  topSearches: Array<{ query: string; count: number }>;
  zeroResultSearches: Array<{ query: string; count: number }>;
  searchToPlayRate: number;
  deviceBreakdown: { desktop: number; mobile: number; tablet: number };
  browserBreakdown: Array<{ browser: string; count: number }>;
}

// ─── Security Types ───────────────────────────────────────────

export interface UserDeviceInfo {
  id: string;
  userId: string;
  browser: string | null;
  os: string | null;
  device: string | null;
  ipAddress: string | null;
  lastActive: string;
  createdAt: string;
  user: { name: string; email: string };
}

export interface SecurityOverview {
  activeDevices: number;
  rateLimitViolations: number;
  recentViolations: number;
  topIps: Array<{ ipAddress: string; requests: number; blocked: number }>;
  recentEvents: Array<{ type: string; description: string; timestamp: string }>;
}

// ─── Subscription & Billing Types ──────────────────────────────

export interface SubscriptionPlan {
  id: string;
  name: string;
  displayName: string;
  description: string | null;
  price: number;
  currency: string;
  interval: string;
  maxResolution: string;
  maxDevices: number;
  maxProfiles: number;
  allowDownloads: boolean;
  allowOffline: boolean;
  trialDays: number;
  features: string | null;
  active: boolean;
  order: number;
  createdAt: string;
  updatedAt: string;
}

export interface UserSubscription {
  id: string;
  userId: string;
  planId: string;
  status: string;
  currentPeriodStart: string;
  currentPeriodEnd: string;
  cancelAtPeriodEnd: boolean;
  cancelledAt: string | null;
  trialStart: string | null;
  trialEnd: string | null;
  createdAt: string;
  updatedAt: string;
  plan?: SubscriptionPlan;
}

export interface PaymentRecord {
  id: string;
  userId: string;
  subscriptionId: string;
  amount: number;
  currency: string;
  status: string;
  description: string | null;
  invoiceUrl: string | null;
  createdAt: string;
}

export interface FavoriteItem {
  id: string;
  userId: string;
  contentId: string;
  contentType: string;
  title: string | null;
  posterPath: string | null;
  addedAt: string;
}

// ─── TMDB Person Type ─────────────────────────────────────────

export interface TMDBPerson {
  id: number;
  name: string;
  profile_path: string | null;
  known_for_department: string;
  known_for: TMDBContent[];
  popularity: number;
  media_type: 'person';
}

export interface TMDBPersonSearchResult {
  page: number;
  results: TMDBPerson[];
  total_pages: number;
  total_results: number;
}

// ─── Missing Client-Side Types ──────────────────────────────────────

export interface DeviceSession {
  id: string;
  deviceName?: string | null;
  platform?: string | null;
  browser?: string | null;
  ipAddress?: string | null;
  lastActiveAt: string;
  createdAt: string;
}

export interface DownloadItem {
  id: string;
  userId: string;
  contentId: string;
  contentType: string;
  title: string;
  posterPath: string | null;
  seasonNumber: number | null;
  episodeNumber: number | null;
  quality: string;
  fileSize: number;
  status: string;
  expiresAt: string | null;
  createdAt: string;
}

export interface AudioTrackItem {
  id: string;
  contentId: string;
  episodeId: string | null;
  language: string;
  label: string;
  url: string | null;
  isDefault: boolean;
}

export interface UserProfile {
  id: string;
  userId: string;
  profileName: string;
  avatar: string | null;
  isKids: boolean;
  isDefault: boolean;
  pin: string | null;
  language: string;
  autoplay: boolean;
  createdAt: string;
  updatedAt: string;
}
