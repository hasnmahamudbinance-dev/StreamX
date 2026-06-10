# Task 8b - Homepage + Realtime Agent

## Task
Add AI recommendations to homepage, create realtime hook, update behavior tracking

## Work Completed

### 1. useRealtime Hook (`/src/hooks/use-realtime.ts`)
- Created Socket.IO client hook connecting to sync service on port 3003
- Connects via `io('/?XTransformPort=3003')` for Caddy gateway compatibility
- Handles real-time events: progress:update, watchlist:add, watchlist:remove, notification:new, admin:broadcast
- Exposes emit functions: emitProgress, emitWatchlistAdd, emitWatchlistRemove
- Auto-connects/disconnects based on authentication state
- Uses dynamic import for socket.io-client to avoid SSR issues

### 2. HomePage Enhancement (`/src/components/streamx/HomePage.tsx`)
- Integrated useRealtime hook
- Added AI recommendations fetch from /api/recommendations
- Shows loading skeletons (ContentRowSkeleton x2) while recommendations load
- Renders recommendation categories as ContentRow components
- Emits real-time events on watchlist add/remove
- Fixed lint error: replaced synchronous setState in effect with derived state pattern (recsFetched)

### 3. ContentDetail Behavior Tracking (`/src/components/streamx/ContentDetail.tsx`)
- Added "view" behavior tracking effect (fires when detail loads + user authenticated)
- Added "play" behavior tracking in handlePlayClick callback
- Both POST to /api/behavior with contentId, contentType, action, genres, title

## Dependencies Added
- socket.io-client@4.8.3

## Lint Status
- Clean pass (0 errors, 0 warnings)
