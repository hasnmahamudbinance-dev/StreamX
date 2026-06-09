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

export type PageRoute = 
  | 'home' 
  | 'search' 
  | 'movie' 
  | 'tv' 
  | 'watchlist' 
  | 'favorites'
  | 'history'
  | 'profile' 
  | 'login' 
  | 'register'
  | 'verify-email'
  | 'forgot-password'
  | 'reset-password'
  | 'admin'
  | 'player'
  | 'security'
  | 'devices'
  | 'profiles'
  | 'pricing'
  | 'billing'
  | 'downloads'
  | 'notifications';

export interface FavoriteItem {
  id: string;
  userId: string;
  contentId: string;
  contentType: string;
  createdAt: string;
}

export interface RecommendationSection {
  title: string;
  items: TMDBContent[];
}

export interface DeviceSession {
  id: string;
  userId: string;
  token: string;
  deviceName: string | null;
  platform: string | null;
  browser: string | null;
  ipAddress: string | null;
  lastActiveAt: string;
  createdAt: string;
}

export interface UserProfile {
  id: string;
  userId: string;
  profileName: string;
  avatar: string | null;
  isKids: boolean;
  isDefault: boolean;
  pin: string | null;
  maxRating: string | null;
  allowedGenres: string | null;
  restrictedGenres: string | null;
  searchRestricted: boolean;
  playbackRestricted: boolean;
  profileLocked: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface SubscriptionPlan {
  id: string;
  name: string;
  displayName: string;
  description: string | null;
  price: number;
  currency: string;
  interval: string;
  trialDays: number;
  maxResolution: string;
  maxDevices: number;
  maxProfiles: number;
  allowDownloads: boolean;
  allowOffline: boolean;
  features: string | null;
  active: boolean;
  order: number;
}

export interface UserSubscription {
  id: string;
  userId: string;
  planId: string;
  status: string;
  currentPeriodStart: string;
  currentPeriodEnd: string;
  trialEnd: string | null;
  cancelledAt: string | null;
  cancelAtPeriodEnd: boolean;
  plan: SubscriptionPlan;
}

export interface PaymentRecord {
  id: string;
  userId: string;
  subscriptionId: string | null;
  amount: number;
  currency: string;
  status: string;
  provider: string;
  description: string | null;
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

export interface EmailCampaignItem {
  id: string;
  name: string;
  subject: string;
  type: string;
  targetAudience: string;
  status: string;
  scheduledAt: string | null;
  sentAt: string | null;
  recipientCount: number;
  openCount: number;
  clickCount: number;
  createdAt: string;
}

export interface CouponItem {
  id: string;
  code: string;
  description: string | null;
  discountType: string;
  discountValue: number;
  maxUses: number;
  usedCount: number;
  validFrom: string;
  validUntil: string | null;
  planId: string | null;
  active: boolean;
}

export interface AnalyticsData {
  dau: number;
  mau: number;
  totalUsers: number;
  totalWatchTime: number;
  avgCompletionRate: number;
  retentionRate: number;
  churnRate: number;
  newUsersToday: number;
  newUsersThisWeek: number;
  newUsersThisMonth: number;
  activeSubscriptions: number;
  revenue: number;
}

export interface ContentAnalyticsData {
  mostWatchedMovies: Array<{ id: string; title: string; views: number; watchTime: number }>;
  mostWatchedTV: Array<{ id: string; title: string; views: number; watchTime: number }>;
  topGenres: Array<{ genre: string; count: number }>;
  searchTrends: Array<{ query: string; count: number }>;
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

export interface AppState {
  currentPage: PageRoute;
  currentParams: Record<string, string>;
  user: UserSession | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  notifications: NotificationItem[];
  unreadCount: number;
  activeProfile: UserProfile | null;
  
  navigate: (page: PageRoute, params?: Record<string, string>) => void;
  setUser: (user: UserSession | null) => void;
  setLoading: (loading: boolean) => void;
  setActiveProfile: (profile: UserProfile | null) => void;
  setNotifications: (notifications: NotificationItem[]) => void;
  markNotificationRead: (id: string) => void;
  markAllNotificationsRead: () => void;
  logout: () => void;
}
