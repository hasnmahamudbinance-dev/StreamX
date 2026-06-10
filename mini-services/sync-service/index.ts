import { createServer } from 'http';
import { Server, Socket } from 'socket.io';

const PORT = 3003;

const httpServer = createServer();
const io = new Server(httpServer, {
  // DO NOT change the path - it is used by Caddy to forward requests to the correct port
  path: '/',
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
  },
  pingTimeout: 60000,
  pingInterval: 25000,
});

// ============================================================
// Types
// ============================================================

interface ProgressUpdateData {
  userId: string;
  contentId: string;
  contentType: 'movie' | 'tv';
  position: number;
  duration: number;
  seasonNumber?: number;
  episodeNumber?: number;
}

interface WatchlistAddData {
  userId: string;
  contentId: string;
  contentType: 'movie' | 'tv';
  title: string;
  posterPath?: string;
}

interface WatchlistRemoveData {
  userId: string;
  contentId: string;
  contentType: 'movie' | 'tv';
}

interface NotificationData {
  userId: string;
  id: string;
  title: string;
  message: string;
  type: string;
  createdAt: string;
}

interface NotificationReadData {
  userId: string;
  notificationId: string;
}

interface AdminBroadcastData {
  title: string;
  message: string;
  type: 'info' | 'warning' | 'success' | 'error';
}

// ============================================================
// State Management
// ============================================================

// Track connected users: Map<userId, Set<socketId>>
const connectedUsers = new Map<string, Set<string>>();

// ============================================================
// Helper Functions
// ============================================================

function getOnlineUserIds(): string[] {
  return Array.from(connectedUsers.keys());
}

// ============================================================
// Socket Event Handlers
// ============================================================

io.on('connection', (socket: Socket) => {
  console.log(`[Sync] Socket connected: ${socket.id}`);

  // ----------------------------------------------------------
  // 1. Connection Management: user:join
  // ----------------------------------------------------------
  socket.on('user:join', (userId: string) => {
    if (!userId || typeof userId !== 'string') {
      console.warn(`[Sync] Invalid userId from socket ${socket.id}`);
      return;
    }

    socket.data.userId = userId;
    socket.join(`user:${userId}`);

    if (!connectedUsers.has(userId)) {
      connectedUsers.set(userId, new Set());
    }
    connectedUsers.get(userId)!.add(socket.id);

    // Notify all clients this user is online
    io.emit('presence:online', { userId });

    // Send the newly connected user the list of currently online users
    socket.emit('presence:list', { users: getOnlineUserIds() });

    console.log(
      `[Sync] User ${userId} joined (${connectedUsers.get(userId)!.size} connections, ${connectedUsers.size} users online)`
    );
  });

  // ----------------------------------------------------------
  // 2. Watch Progress Sync: progress:update
  // ----------------------------------------------------------
  socket.on('progress:update', (data: ProgressUpdateData) => {
    const { userId, contentId, contentType, position, duration } = data;

    if (!userId || !contentId || !contentType) {
      console.warn(`[Sync] Invalid progress:update data from socket ${socket.id}`);
      return;
    }

    // Broadcast to all connections of the same user EXCEPT the sender
    socket.to(`user:${userId}`).emit('progress:update', {
      userId,
      contentId,
      contentType,
      position,
      duration,
      seasonNumber: data.seasonNumber,
      episodeNumber: data.episodeNumber,
      timestamp: new Date().toISOString(),
    });

    console.log(
      `[Sync] Progress update: user=${userId} content=${contentId} position=${position}/${duration}`
    );
  });

  // ----------------------------------------------------------
  // 3. Watchlist Sync: watchlist:add
  // ----------------------------------------------------------
  socket.on('watchlist:add', (data: WatchlistAddData) => {
    const { userId, contentId, contentType, title, posterPath } = data;

    if (!userId || !contentId || !contentType) {
      console.warn(`[Sync] Invalid watchlist:add data from socket ${socket.id}`);
      return;
    }

    // Broadcast to same user's other devices
    socket.to(`user:${userId}`).emit('watchlist:add', {
      userId,
      contentId,
      contentType,
      title,
      posterPath,
      timestamp: new Date().toISOString(),
    });

    console.log(`[Sync] Watchlist add: user=${userId} content=${contentId} "${title}"`);
  });

  // ----------------------------------------------------------
  // 3. Watchlist Sync: watchlist:remove
  // ----------------------------------------------------------
  socket.on('watchlist:remove', (data: WatchlistRemoveData) => {
    const { userId, contentId, contentType } = data;

    if (!userId || !contentId || !contentType) {
      console.warn(`[Sync] Invalid watchlist:remove data from socket ${socket.id}`);
      return;
    }

    // Broadcast to same user's other devices
    socket.to(`user:${userId}`).emit('watchlist:remove', {
      userId,
      contentId,
      contentType,
      timestamp: new Date().toISOString(),
    });

    console.log(`[Sync] Watchlist remove: user=${userId} content=${contentId}`);
  });

  // ----------------------------------------------------------
  // 4. Notification Delivery: notification:new
  // ----------------------------------------------------------
  socket.on('notification:new', (data: NotificationData) => {
    const { userId, id, title, message, type } = data;

    if (!userId || !id) {
      console.warn(`[Sync] Invalid notification:new data from socket ${socket.id}`);
      return;
    }

    // Target specific user by userId - emit to their room
    io.to(`user:${userId}`).emit('notification:new', {
      userId,
      id,
      title,
      message,
      type,
      createdAt: data.createdAt || new Date().toISOString(),
    });

    console.log(`[Sync] Notification sent: user=${userId} id=${id} "${title}"`);
  });

  // ----------------------------------------------------------
  // 4. Notification Delivery: notification:read
  // ----------------------------------------------------------
  socket.on('notification:read', (data: NotificationReadData) => {
    const { userId, notificationId } = data;

    if (!userId || !notificationId) {
      console.warn(`[Sync] Invalid notification:read data from socket ${socket.id}`);
      return;
    }

    // Broadcast to same user's other devices so they also mark it as read
    socket.to(`user:${userId}`).emit('notification:read', {
      userId,
      notificationId,
      timestamp: new Date().toISOString(),
    });

    console.log(`[Sync] Notification read: user=${userId} id=${notificationId}`);
  });

  // ----------------------------------------------------------
  // 5. Admin Broadcast: admin:broadcast
  // ----------------------------------------------------------
  socket.on('admin:broadcast', (data: AdminBroadcastData) => {
    const { title, message, type } = data;

    if (!title || !message) {
      console.warn(`[Sync] Invalid admin:broadcast data from socket ${socket.id}`);
      return;
    }

    // Broadcast to ALL connected users
    io.emit('admin:broadcast', {
      title,
      message,
      type: type || 'info',
      timestamp: new Date().toISOString(),
    });

    console.log(`[Sync] Admin broadcast: "${title}" (${type || 'info'})`);
  });

  // ----------------------------------------------------------
  // Disconnect Handling
  // ----------------------------------------------------------
  socket.on('disconnect', (reason) => {
    const userId = socket.data.userId as string | undefined;

    if (userId && connectedUsers.has(userId)) {
      const userSockets = connectedUsers.get(userId)!;
      userSockets.delete(socket.id);

      if (userSockets.size === 0) {
        connectedUsers.delete(userId);
        // User fully offline - notify everyone
        io.emit('presence:offline', { userId });
        console.log(`[Sync] User ${userId} went offline`);
      } else {
        console.log(
          `[Sync] User ${userId} socket disconnected (${userSockets.size} connections remaining)`
        );
      }
    }

    console.log(`[Sync] Socket disconnected: ${socket.id} (reason: ${reason})`);
  });

  // ----------------------------------------------------------
  // Error Handling
  // ----------------------------------------------------------
  socket.on('error', (error: Error) => {
    console.error(`[Sync] Socket error (${socket.id}):`, error.message);
  });
});

// ============================================================
// Start Server
// ============================================================

httpServer.listen(PORT, () => {
  console.log(`StreamX Sync Service running on port ${PORT}`);
  console.log(`[Sync] Features enabled:`);
  console.log(`  - Connection Management (user:join)`);
  console.log(`  - Watch Progress Sync (progress:update)`);
  console.log(`  - Watchlist Sync (watchlist:add, watchlist:remove)`);
  console.log(`  - Notification Delivery (notification:new, notification:read)`);
  console.log(`  - Admin Broadcast (admin:broadcast)`);
  console.log(`  - Presence (presence:online, presence:offline, presence:list)`);
});

// ============================================================
// Graceful Shutdown
// ============================================================

const gracefulShutdown = (signal: string) => {
  console.log(`[Sync] Received ${signal}, shutting down...`);
  io.disconnectSockets(true);
  httpServer.close(() => {
    console.log('[Sync] Server closed');
    process.exit(0);
  });

  // Force exit after 10s if graceful shutdown hangs
  setTimeout(() => {
    console.error('[Sync] Forced shutdown after timeout');
    process.exit(1);
  }, 10000);
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));
