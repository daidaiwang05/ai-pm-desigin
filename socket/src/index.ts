import { Server } from 'socket.io';
import { createClient } from 'redis';
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
import { RoomManager } from './rooms';

dotenv.config();

const PORT = parseInt(process.env.SOCKET_PORT || '4001', 10);
const JWT_SECRET = process.env.JWT_SECRET;
const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';

if (!JWT_SECRET) {
  console.error('WARNING: JWT_SECRET is not set! Socket authentication will reject all tokens.');
}

// Redis client for pub/sub
const redisClient = createClient({ url: REDIS_URL });
const redisSub = redisClient.duplicate();

async function startServer() {
  // Connect to Redis
  await redisClient.connect();
  await redisSub.connect();

  // Socket.io server
  const ALLOWED_ORIGINS = (process.env.CORS_ORIGINS || 'http://localhost:3000,http://localhost:4000')
    .split(',')
    .map(o => o.trim())
    .filter(Boolean);

  const io = new Server(PORT, {
    cors: {
      origin: ALLOWED_ORIGINS,
      methods: ['GET', 'POST'],
    },
  });

  // Room manager
  const roomManager = new RoomManager(io);

  // Authentication middleware
  io.use((socket, next) => {
    const token = socket.handshake.auth.token;
    const userName = socket.handshake.auth.userName || 'Anonymous';
    const userAvatar = socket.handshake.auth.userAvatar;

    if (!token) {
      // Allow anonymous for preview mode (no token = anonymous viewer)
      (socket as any).userId = `anonymous-${socket.id}`;
      (socket as any).userName = userName;
      (socket as any).userAvatar = userAvatar;
      (socket as any).isAnonymous = true;
      next();
      return;
    }

    if (!JWT_SECRET) {
      next(new Error('服务器配置错误：JWT_SECRET 未设置'));
      return;
    }

    try {
      const decoded = jwt.verify(token, JWT_SECRET) as { userId: string };
      (socket as any).userId = decoded.userId;
      (socket as any).userName = userName;
      (socket as any).userAvatar = userAvatar;
      (socket as any).isAnonymous = false;
      next();
    } catch (err) {
      // Invalid token = reject connection
      next(new Error('认证失败：无效的令牌'));
    }
  });

  // Connection handler
  io.on('connection', (socket) => {
    const userId = (socket as any).userId;
    const userName = (socket as any).userName;
    const userAvatar = (socket as any).userAvatar;
    console.log(`User connected: ${userId} (${userName})`);

    // ==================== Preview Room ====================

    // Join preview room
    socket.on('preview:join', (data: { roomId: string }) => {
      roomManager.joinRoom(socket, data.roomId, {
        id: userId,
        name: userName,
        avatarUrl: userAvatar,
      });
      console.log(`User ${userName} joined preview room ${data.roomId}`);
    });

    // Leave preview room
    socket.on('preview:leave', (data: { roomId: string }) => {
      roomManager.leaveRoom(socket, data.roomId);
      console.log(`User ${userName} left preview room ${data.roomId}`);
    });

    // Cursor move (for preview collaboration)
    socket.on('preview:cursor', (data: {
      roomId: string;
      x: number;
      y: number;
    }) => {
      roomManager.updateCursor(socket, data.roomId, data.x, data.y);
    });

    // Scroll sync (for presenter mode)
    socket.on('preview:scroll', (data: {
      roomId: string;
      x: number;
      y: number;
    }) => {
      roomManager.updateScroll(socket, data.roomId, data.x, data.y);
    });

    // Page switch
    socket.on('preview:page', (data: {
      roomId: string;
      pageId: string;
    }) => {
      roomManager.switchPage(socket, data.roomId, data.pageId);
    });

    // Switch sync mode
    socket.on('preview:sync-mode', (data: {
      roomId: string;
      mode: 'presenter' | 'independent';
    }) => {
      roomManager.switchSyncMode(socket, data.roomId, data.mode);
    });

    // Transfer presenter
    socket.on('preview:transfer', (data: {
      roomId: string;
      targetSocketId: string;
    }) => {
      roomManager.transferPresenter(socket, data.roomId, data.targetSocketId);
    });

    // ==================== Project Editing ====================

    // Join project room
    socket.on('join:project', (projectId: string) => {
      socket.join(`project:${projectId}`);
      console.log(`User ${userName} joined project ${projectId}`);

      // Notify others
      socket.to(`project:${projectId}`).emit('user:joined', {
        userId,
        userName,
        timestamp: new Date().toISOString(),
      });
    });

    // Leave project room
    socket.on('leave:project', (projectId: string) => {
      socket.leave(`project:${projectId}`);
      socket.to(`project:${projectId}`).emit('user:left', {
        userId,
        userName,
        timestamp: new Date().toISOString(),
      });
    });

    // Component update
    socket.on('component:update', (data: {
      projectId: string;
      pageId: string;
      componentId: string;
      patch: any;
    }) => {
      const eventData = {
        ...data,
        userId,
        userName,
        timestamp: new Date().toISOString(),
      };
      socket.to(`project:${data.projectId}`).emit('component:updated', eventData);
      // Publish to Redis for cross-server sync
      redisClient.publish('component:update', JSON.stringify(eventData));
    });

    // Component add
    socket.on('component:add', (data: {
      projectId: string;
      pageId: string;
      component: any;
    }) => {
      const eventData = {
        ...data,
        userId,
        userName,
        timestamp: new Date().toISOString(),
      };
      socket.to(`project:${data.projectId}`).emit('component:added', eventData);
      redisClient.publish('component:add', JSON.stringify(eventData));
    });

    // Component delete
    socket.on('component:delete', (data: {
      projectId: string;
      pageId: string;
      componentId: string;
    }) => {
      const eventData = {
        ...data,
        userId,
        userName,
        timestamp: new Date().toISOString(),
      };
      socket.to(`project:${data.projectId}`).emit('component:deleted', eventData);
      redisClient.publish('component:delete', JSON.stringify(eventData));
    });

    // Cursor move (for project collaboration)
    socket.on('cursor:move', (data: {
      projectId: string;
      x: number;
      y: number;
    }) => {
      const eventData = {
        userId,
        userName,
        x: data.x,
        y: data.y,
        timestamp: new Date().toISOString(),
      };
      socket.to(`project:${data.projectId}`).emit('cursor:moved', eventData);
      redisClient.publish('cursor:move', JSON.stringify({ ...eventData, projectId: data.projectId }));
    });

    // ==================== Disconnect ====================

    socket.on('disconnect', () => {
      console.log(`User disconnected: ${userId} (${userName})`);

      // Leave all preview rooms
      const rooms = roomManager.getAllRooms();
      rooms.forEach(({ roomId }) => {
        roomManager.leaveRoom(socket, roomId);
      });
    });
  });

  // Subscribe to Redis channels for cross-server communication
  const redisChannels = [
    'component:update',
    'component:add',
    'component:delete',
    'cursor:move',
  ];

  for (const channel of redisChannels) {
    await redisSub.subscribe(channel, (message) => {
      try {
        const data = JSON.parse(message);
        const eventName = channel.replace(':', ':') + 'd'; // e.g., component:update -> component:updated
        const mappedEvents: Record<string, string> = {
          'component:update': 'component:updated',
          'component:add': 'component:added',
          'component:delete': 'component:deleted',
          'cursor:move': 'cursor:moved',
        };
        const emitEvent = mappedEvents[channel] || channel;
        io.to(`project:${data.projectId}`).emit(emitEvent, data);
      } catch (err) {
        console.error(`Redis message parse error on ${channel}:`, err);
      }
    });
  }

  console.log(`
  ============================================
  🔌 Socket Server
  ============================================
  Port: ${PORT}
  Redis: ${REDIS_URL}
  Features:
    - Real-time collaboration
    - Multi-user preview
    - Presenter/Independent modes
    - Cursor tracking
    - Scroll sync
  ============================================
  `);
}

startServer().catch(console.error);
