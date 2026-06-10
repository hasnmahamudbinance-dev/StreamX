# Task 5: Socket.IO Sync Service Agent

## Task
Create Socket.IO mini-service for real-time synchronization at `/home/z/my-project/mini-services/sync-service/`

## Work Completed

### Files Created
1. `/home/z/my-project/mini-services/sync-service/package.json` - Independent bun project config
   - Name: "streamx-sync-service"
   - Port: 3003
   - Dev command: `bun --hot index.ts`
   - Dependencies: socket.io ^4.8.1

2. `/home/z/my-project/mini-services/sync-service/index.ts` - Socket.IO server implementation

### Implemented Events

| Event | Direction | Description |
|-------|-----------|-------------|
| `user:join` | Client → Server | User connects with userId, joins personal room, triggers presence:online |
| `progress:update` | Client → Server → Same user's other devices | Multi-device watch progress sync |
| `watchlist:add` | Client → Server → Same user's other devices | Watchlist item added notification |
| `watchlist:remove` | Client → Server → Same user's other devices | Watchlist item removed notification |
| `notification:new` | Client → Server → Target user | New notification delivery |
| `notification:read` | Client → Server → Same user's other devices | Notification read status sync |
| `admin:broadcast` | Client → Server → All connected users | Admin announcement broadcast |
| `presence:online` | Server → All clients | User came online |
| `presence:offline` | Server → All clients | User went offline |
| `presence:list` | Server → Newly connected user | List of currently online users |

### Key Implementation Details
- Uses `path: '/'` for Caddy gateway compatibility (XTransformPort routing)
- Tracks connected users in `Map<userId, Set<socketId>>` for multi-device support
- User joins personal room `user:${userId}` for targeted broadcasting
- Progress/watchlist sync broadcasts to sender's user room EXCLUDING the sender (socket.to)
- Admin broadcast goes to ALL connected sockets via io.emit
- Online/offline status tracks when a user's LAST socket disconnects
- Graceful shutdown with SIGTERM/SIGINT handlers and 10s force timeout
- CORS set to '*' for development

### Verification
- Service starts successfully on port 3003
- bun install completed (socket.io 4.8.3)
- Port confirmed listening via lsof

### Frontend Connection Pattern
```typescript
import { io } from 'socket.io-client';
const socket = io('/?XTransformPort=3003', {
  transports: ['websocket', 'polling'],
  forceNew: true,
  reconnection: true,
});
```
