# StreamX — Netflix-Style Streaming Platform

A full-featured, self-hosted streaming platform built with **Next.js 16**, **React 19**, **Bun**, **SQLite**, and **shadcn/ui**. Powered by TMDB metadata and 8 video embed servers with automatic fallback.

![StreamX](public/logo.svg)

---

## ✨ Features

### 🎬 Core Streaming
- **8 Video Servers** — NexStream (default), VidAPI, VidSrc, VidSrc PM, VidSrc SU, 2Embed, 2Embed Org, 2Embed Skin
- **Server Auto-Fallback** — Seamless switching when a server is unavailable
- **TV Show Support** — Season & episode selector with TMDB integration
- **Continue Watching** — Resume playback where you left off
- **Watch History** — Full watch history tracking
- **Watchlist** — Save content to your personal list

### 🔍 Discovery
- **TMDB Integration** — Trending, popular, top rated, now playing, upcoming
- **AI Recommendations** — Behavior-based personalized suggestions
- **Advanced Search** — Suggestions, trending searches, voice search, search history
- **Content Rows** — Horizontal scrollable rows by genre/category

### 👤 User System
- **Authentication** — NextAuth.js with credentials provider
- **User Profiles** — Avatar, preferences, language, autoplay settings
- **Ratings & Reviews** — 1-5 star ratings + written reviews
- **Notifications** — System and user notifications
- **Data Export** — GDPR-compliant data export & account deletion

### 🛡️ Admin Dashboard
- **Content Management** — Upload, edit, schedule, and manage movies/TV shows
- **Episode Management** — Full CRUD for TV episodes
- **User Management** — View, edit, ban users
- **Analytics** — DAU/WAU/MAU, content heatmaps, revenue charts
- **Collections** — Create and manage curated content collections
- **Homepage Builder** — Configure homepage sections and layout
- **Security** — Rate limiting, device tracking, audit logs
- **Error Monitoring** — Centralized error log viewer
- **Backup** — Database backup management
- **Email Logs** — Track email delivery
- **Support Tickets** — Manage user support requests

### 🔧 Technical
- **HLS Video Upload** — Upload and stream your own content
- **WebSocket Sync** — Real-time progress & notification sync via Socket.IO
- **Rate Limiting** — Built-in API rate limiting
- **Dark/Light Theme** — Toggle via next-themes
- **Responsive Design** — Mobile-first, works on all devices
- **SEO Ready** — Proper meta tags and semantic HTML

---

## 🏗️ Tech Stack

| Layer | Technology |
|-------|-----------|
| **Framework** | Next.js 16 (App Router) |
| **Language** | TypeScript 5 |
| **Runtime** | Bun |
| **Database** | SQLite via Prisma ORM |
| **Authentication** | NextAuth.js v4 |
| **UI Components** | shadcn/ui (New York style) |
| **Styling** | Tailwind CSS 4 |
| **Icons** | Lucide React |
| **Animations** | Framer Motion |
| **State Management** | Zustand + TanStack Query |
| **Charts** | Recharts |
| **Forms** | React Hook Form + Zod |
| **Realtime** | Socket.IO |
| **AI SDK** | z-ai-web-dev-sdk |
| **Theming** | next-themes |

---

## 📁 Project Structure

```
src/
├── app/
│   ├── layout.tsx              # Root layout with providers
│   ├── page.tsx                # Main SPA entry point
│   ├── globals.css             # Global styles
│   └── api/                    # 40+ API route handlers
│       ├── auth/               # NextAuth endpoints
│       ├── tmdb/               # TMDB proxy routes
│       ├── admin/              # Admin dashboard APIs
│       ├── content/            # Content management
│       ├── watchlist/          # Watchlist CRUD
│       ├── progress/           # Playback progress
│       ├── recommendations/    # AI recommendations
│       ├── behavior/           # User behavior tracking
│       ├── search/             # Search & suggestions
│       ├── ratings/            # Ratings system
│       ├── reviews/            # Reviews system
│       ├── support/            # Helpdesk tickets
│       ├── reports/            # Content reports
│       ├── notifications/      # Notifications
│       ├── profile/            # User profile APIs
│       ├── session/            # Session info
│       ├── device/             # Device tracking
│       ├── health/             # Health check
│       └── ...
├── components/
│   ├── streamx/               # 25 custom app components
│   │   ├── HomePage.tsx
│   │   ├── HeroSection.tsx
│   │   ├── ContentDetail.tsx
│   │   ├── StreamPlayer.tsx
│   │   ├── SeasonEpisodeSelector.tsx
│   │   ├── SearchPage.tsx
│   │   ├── AdminDashboard.tsx
│   │   └── ...
│   └── ui/                    # shadcn/ui primitives (40+)
├── hooks/                     # Custom React hooks
├── lib/
│   ├── db.ts                  # Prisma client instance
│   ├── auth.ts                # NextAuth configuration
│   ├── tmdb.ts                # TMDB API helpers
│   ├── types.ts               # TypeScript type definitions
│   ├── store.ts               # Zustand global store
│   ├── video-servers.ts       # 8 video server configs
│   ├── rate-limit.ts          # Rate limiting utility
│   └── utils.ts               # Shared utilities
prisma/
├── schema.prisma              # 20+ database models
mini-services/
└── sync-service/              # WebSocket sync microservice
```

---

## 🚀 Getting Started

### Prerequisites

- [Bun](https://bun.sh/) runtime
- TMDB API key ([Get one here](https://www.themoviedb.org/settings/api))
- NexStream API key ([Get one here](https://api.codespecters.com))

### 1. Clone & Install

```bash
git clone <repo-url>
cd streamx
bun install
```

### 2. Configure Environment

```bash
cp .env.example .env
```

Edit `.env` with your API keys:

```env
# Database
DATABASE_URL=file:./db/custom.db

# NextAuth.js
NEXTAUTH_SECRET=your-random-secret-here
NEXTAUTH_URL=http://localhost:3000

# TMDB API
TMDB_API_KEY=your-tmdb-api-key-here
TMDB_BASE_URL=https://api.themoviedb.org/3

# NexStream Video Embed API
NEXT_PUBLIC_NEXSTREAM_API_KEY=your-nexstream-api-key-here
NEXSTREAM_BASE_URL=https://api.codespecters.com
```

### 3. Setup Database

```bash
bun run db:push
```

### 4. Start Development

```bash
bun run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 🎥 Video Servers

StreamX supports 8 embed video servers with automatic fallback:

| # | Server | Domain | Status | Default |
|---|--------|--------|--------|---------|
| 1 | **NexStream** | api.codespecters.com | ✅ Stable | ⭐ Yes |
| 2 | VidAPI | vidapi.xyz | ✅ Stable | |
| 3 | VidSrc | vidsrc.to | ✅ Stable | |
| 4 | VidSrc PM | vidsrc.pm | ✅ Stable | |
| 5 | VidSrc SU | vidsrc.su | ✅ Stable | |
| 6 | 2Embed | www.2embed.cc | ✅ Stable | |
| 7 | 2Embed Org | 2embed.org | ✅ Stable | |
| 8 | 2Embed Skin | 2embed.skin | 🟡 Beta | |

All servers use **TMDB IDs** for content lookup. Server preference is persisted to `localStorage` and survives page reloads. Users can switch servers from the player dropdown at any time.

### URL Patterns

**Movies:**
```
NexStream:  https://api.codespecters.com/embed/movie/{tmdbId}?apikey={key}
VidAPI:     https://vidapi.xyz/embed/movie/{tmdbId}
VidSrc:     https://vidsrc.to/embed/movie/{tmdbId}
2Embed:     https://www.2embed.cc/embed/{tmdbId}
```

**TV Shows:**
```
NexStream:  https://api.codespecters.com/embed/tv/{tmdbId}?apikey={key}&s={season}&e={episode}
VidAPI:     https://vidapi.xyz/embed/tv/{tmdbId}&s={season}&e={episode}
VidSrc:     https://vidsrc.to/embed/tv/{tmdbId}/{season}/{episode}
2Embed:     https://www.2embed.cc/embedtv/{tmdbId}&s={season}&e={episode}
```

---

## 🗄️ Database Models

20+ Prisma models powering the platform:

| Model | Purpose |
|-------|---------|
| `User` | Authentication, profile, preferences |
| `WatchlistItem` | Personal watchlists |
| `PlaybackProgress` | Resume-watching state |
| `WatchHistory` | Watch history log |
| `Rating` / `Review` | Content ratings & reviews |
| `Collection` / `CollectionItem` | Curated content collections |
| `UploadedContent` / `Episode` | User-uploaded movies & TV |
| `Subtitle` | VTT/SRT subtitle tracks |
| `UserBehavior` | AI recommendation tracking |
| `SearchHistory` / `TrendingSearch` | Search analytics |
| `Notification` | User notifications |
| `ContentReport` | Content moderation reports |
| `SupportTicket` / `SupportMessage` | Helpdesk system |
| `AuditLog` / `ErrorLog` | Admin audit & error tracking |
| `PlatformSettings` | Key-value platform config |
| `HomepageSection` / `HomepageSectionItem` | Homepage layout builder |
| `ContentSchedule` | Scheduled publish/archive |
| `ContentAnalytics` | View/play/complete events |
| `RateLimitLog` / `UserDevice` | Security & device tracking |
| `Backup` / `EmailLog` | Operations tracking |

---

## 📡 API Routes

### Public
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/tmdb/[...path]` | GET | TMDB API proxy |
| `/api/content/published` | GET | Published content |
| `/api/homepage` | GET | Homepage configuration |
| `/api/search/suggestions` | GET | Search suggestions |
| `/api/search/trending` | GET | Trending searches |
| `/api/health` | GET | Health check |

### Authenticated
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/watchlist` | GET/POST/DELETE | Watchlist management |
| `/api/progress` | GET/POST | Playback progress |
| `/api/history` | GET/POST | Watch history |
| `/api/ratings` | GET/POST | Content ratings |
| `/api/reviews` | GET/POST | Content reviews |
| `/api/recommendations` | GET | AI recommendations |
| `/api/behavior` | POST | Behavior tracking |
| `/api/notifications` | GET | User notifications |
| `/api/profile` | GET/PATCH | Profile management |
| `/api/support/tickets` | GET/POST | Support tickets |
| `/api/reports` | POST | Content reports |

### Admin
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/admin/stats` | GET | Dashboard statistics |
| `/api/admin/users` | GET/PATCH | User management |
| `/api/admin/content` | GET/POST/PATCH/DELETE | Content CRUD |
| `/api/admin/analytics` | GET | Platform analytics |
| `/api/admin/settings` | GET/PATCH | Platform settings |
| `/api/admin/audit-logs` | GET | Audit trail |
| `/api/admin/backup` | POST | Database backup |
| `/api/admin/errors` | GET | Error monitoring |
| `/api/admin/security` | GET | Security overview |

---

## 🧩 Available Scripts

| Script | Command | Description |
|--------|---------|-------------|
| `dev` | `next dev -p 3000` | Start development server |
| `build` | `next build` | Production build (standalone) |
| `start` | `bun .next/standalone/server.js` | Start production server |
| `lint` | `eslint .` | Run ESLint |
| `db:push` | `prisma db push` | Push schema to database |
| `db:generate` | `prisma generate` | Generate Prisma client |
| `db:migrate` | `prisma migrate dev` | Run migrations |
| `db:reset` | `prisma migrate reset` | Reset database |

---

## 🌐 Realtime Sync

The project includes a WebSocket sync microservice at `mini-services/sync-service/`:

- Built with **Socket.IO** on a separate port
- Syncs playback progress across devices
- Delivers real-time notifications
- Connected via gateway proxy with `XTransformPort` query param

---

## 📄 License

This project is for educational and personal use only. Content streamed through third-party embed servers is subject to their respective terms of service.
