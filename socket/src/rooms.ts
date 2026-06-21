import { Server, Socket } from 'socket.io';

interface User {
  id: string;
  name: string;
  avatarUrl?: string;
}

interface RoomState {
  users: Map<string, User>;
  cursors: Map<string, { x: number; y: number }>;
  scrollPositions: Map<string, { x: number; y: number }>;
  currentPageId: string | null;
  syncMode: 'presenter' | 'independent';
  presenterId: string | null;
}

export class RoomManager {
  private rooms: Map<string, RoomState> = new Map();
  private io: Server;

  constructor(io: Server) {
    this.io = io;
  }

  /**
   * 用户加入房间
   */
  joinRoom(socket: Socket, roomId: string, user: User) {
    // 获取或创建房间状态
    let room = this.rooms.get(roomId);
    if (!room) {
      room = {
        users: new Map(),
        cursors: new Map(),
        scrollPositions: new Map(),
        currentPageId: null,
        syncMode: 'independent',
        presenterId: null,
      };
      this.rooms.set(roomId, room);
    }

    // 添加用户
    room.users.set(socket.id, user);
    socket.join(roomId);

    // 通知房间内其他用户
    this.io.to(roomId).emit('user:joined', {
      userId: user.id,
      userName: user.name,
      users: Array.from(room.users.values()),
    });

    // 发送当前房间状态给新用户
    socket.emit('room:state', {
      users: Array.from(room.users.values()),
      cursors: Object.fromEntries(room.cursors),
      scrollPositions: Object.fromEntries(room.scrollPositions),
      currentPageId: room.currentPageId,
      syncMode: room.syncMode,
      presenterId: room.presenterId,
    });

    return room;
  }

  /**
   * 用户离开房间
   */
  leaveRoom(socket: Socket, roomId: string) {
    const room = this.rooms.get(roomId);
    if (!room) return;

    const user = room.users.get(socket.id);
    if (!user) return;

    // 移除用户
    room.users.delete(socket.id);
    room.cursors.delete(socket.id);
    room.scrollPositions.delete(socket.id);
    socket.leave(roomId);

    // 如果是主持人离开，转移主持人
    if (room.presenterId === socket.id) {
      const nextPresenter = room.users.keys().next().value;
      if (nextPresenter) {
        room.presenterId = nextPresenter;
        this.io.to(roomId).emit('presenter:changed', {
          presenterId: nextPresenter,
        });
      } else {
        room.presenterId = null;
        room.syncMode = 'independent';
      }
    }

    // 通知房间内其他用户
    this.io.to(roomId).emit('user:left', {
      userId: user.id,
      userName: user.name,
      users: Array.from(room.users.values()),
    });

    // 如果房间为空，清理房间
    if (room.users.size === 0) {
      this.rooms.delete(roomId);
    }
  }

  /**
   * 更新光标位置
   */
  updateCursor(socket: Socket, roomId: string, x: number, y: number) {
    const room = this.rooms.get(roomId);
    if (!room) return;

    room.cursors.set(socket.id, { x, y });

    // 广播给其他用户
    socket.to(roomId).emit('cursor:moved', {
      socketId: socket.id,
      x,
      y,
    });
  }

  /**
   * 更新滚动位置
   */
  updateScroll(socket: Socket, roomId: string, x: number, y: number) {
    const room = this.rooms.get(roomId);
    if (!room) return;

    room.scrollPositions.set(socket.id, { x, y });

    // 如果是同步模式且是主持人，同步给其他用户
    if (room.syncMode === 'presenter' && room.presenterId === socket.id) {
      socket.to(roomId).emit('scroll:synced', {
        x,
        y,
        presenterId: socket.id,
      });
    }
  }

  /**
   * 切换页面
   */
  switchPage(socket: Socket, roomId: string, pageId: string) {
    const room = this.rooms.get(roomId);
    if (!room) return;

    room.currentPageId = pageId;

    // 如果是同步模式且是主持人，同步给其他用户
    if (room.syncMode === 'presenter' && room.presenterId === socket.id) {
      socket.to(roomId).emit('page:switched', {
        pageId,
        presenterId: socket.id,
      });
    }
  }

  /**
   * 切换同步模式
   */
  switchSyncMode(socket: Socket, roomId: string, mode: 'presenter' | 'independent') {
    const room = this.rooms.get(roomId);
    if (!room) return;

    room.syncMode = mode;

    if (mode === 'presenter') {
      room.presenterId = socket.id;
    }

    this.io.to(roomId).emit('sync:mode:changed', {
      mode,
      presenterId: mode === 'presenter' ? socket.id : null,
    });
  }

  /**
   * 转让主持人
   */
  transferPresenter(socket: Socket, roomId: string, targetSocketId: string) {
    const room = this.rooms.get(roomId);
    if (!room) return;

    if (room.presenterId !== socket.id) return;

    room.presenterId = targetSocketId;

    this.io.to(roomId).emit('presenter:changed', {
      presenterId: targetSocketId,
    });
  }

  /**
   * 获取房间信息
   */
  getRoomInfo(roomId: string) {
    const room = this.rooms.get(roomId);
    if (!room) return null;

    return {
      users: Array.from(room.users.values()),
      userCount: room.users.size,
      syncMode: room.syncMode,
      presenterId: room.presenterId,
      currentPageId: room.currentPageId,
    };
  }

  /**
   * 获取所有房间
   */
  getAllRooms() {
    const result: Array<{ roomId: string; userCount: number }> = [];
    this.rooms.forEach((room, roomId) => {
      result.push({
        roomId,
        userCount: room.users.size,
      });
    });
    return result;
  }
}
