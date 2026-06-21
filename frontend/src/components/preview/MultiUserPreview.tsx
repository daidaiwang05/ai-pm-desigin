"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { io, Socket } from "socket.io-client";
import { Button } from "@/components/ui/button";

interface User {
  id: string;
  name: string;
  avatarUrl?: string;
}

interface MultiUserPreviewProps {
  roomId: string;
  token?: string;
  userName?: string;
  pages: Array<{
    id: string;
    name: string;
    components: any[];
  }>;
  onPageChange?: (pageId: string) => void;
}

export function MultiUserPreview({
  roomId,
  token,
  userName = "Anonymous",
  pages,
  onPageChange,
}: MultiUserPreviewProps) {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [cursors, setCursors] = useState<
    Map<string, { x: number; y: number; name: string }>
  >(new Map());
  const [syncMode, setSyncMode] = useState<"presenter" | "independent">(
    "independent"
  );
  const [presenterId, setPresenterId] = useState<string | null>(null);
  const [currentPageId, setCurrentPageId] = useState<string>(
    pages[0]?.id || ""
  );
  const containerRef = useRef<HTMLDivElement>(null);

  // 连接 Socket
  useEffect(() => {
    const socketUrl =
      process.env.NEXT_PUBLIC_WS_URL || "ws://localhost:4001";
    const newSocket = io(socketUrl, {
      auth: {
        token,
        userName,
      },
    });

    newSocket.on("connect", () => {
      console.log("Connected to socket server");
      newSocket.emit("preview:join", { roomId });
    });

    newSocket.on("room:state", (state) => {
      setUsers(state.users);
      setSyncMode(state.syncMode);
      setPresenterId(state.presenterId);
      if (state.currentPageId) {
        setCurrentPageId(state.currentPageId);
      }
    });

    newSocket.on("user:joined", (data) => {
      setUsers(data.users);
    });

    newSocket.on("user:left", (data) => {
      setUsers(data.users);
      // 移除离开用户的光标
      setCursors((prev) => {
        const next = new Map(prev);
        next.delete(data.userId);
        return next;
      });
    });

    newSocket.on("cursor:moved", (data) => {
      setCursors((prev) => {
        const next = new Map(prev);
        next.set(data.socketId, {
          x: data.x,
          y: data.y,
          name: data.userName || "User",
        });
        return next;
      });
    });

    newSocket.on("page:switched", (data) => {
      if (syncMode === "presenter") {
        setCurrentPageId(data.pageId);
        onPageChange?.(data.pageId);
      }
    });

    newSocket.on("sync:mode:changed", (data) => {
      setSyncMode(data.mode);
      setPresenterId(data.presenterId);
    });

    newSocket.on("presenter:changed", (data) => {
      setPresenterId(data.presenterId);
    });

    newSocket.on("scroll:synced", (data) => {
      if (syncMode === "presenter" && containerRef.current) {
        containerRef.current.scrollTo(data.x, data.y);
      }
    });

    setSocket(newSocket);

    return () => {
      newSocket.emit("preview:leave", { roomId });
      newSocket.disconnect();
    };
  }, [roomId, token, userName]);

  // 发送光标位置
  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (!socket || !containerRef.current) return;

      const rect = containerRef.current.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      socket.emit("preview:cursor", { roomId, x, y });
    },
    [socket, roomId]
  );

  // 发送滚动位置
  const handleScroll = useCallback(() => {
    if (!socket || !containerRef.current) return;

    socket.emit("preview:scroll", {
      roomId,
      x: containerRef.current.scrollLeft,
      y: containerRef.current.scrollTop,
    });
  }, [socket, roomId]);

  // 切换页面
  const handlePageSwitch = useCallback(
    (pageId: string) => {
      setCurrentPageId(pageId);
      onPageChange?.(pageId);

      if (socket) {
        socket.emit("preview:page", { roomId, pageId });
      }
    },
    [socket, roomId, onPageChange]
  );

  // 切换同步模式
  const handleSyncModeChange = useCallback(
    (mode: "presenter" | "independent") => {
      if (socket) {
        socket.emit("preview:sync-mode", { roomId, mode });
      }
    },
    [socket, roomId]
  );

  const currentPage = pages.find((p) => p.id === currentPageId);

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="h-12 bg-white border-b flex items-center px-4 justify-between">
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <div className="w-2 h-2 bg-green-500 rounded-full" />
            <span className="text-sm font-medium">
              {users.length} 人在线
            </span>
          </div>
          <div className="flex -space-x-2">
            {users.slice(0, 5).map((user, index) => (
              <div
                key={user.id}
                className="w-8 h-8 rounded-full bg-gray-200 border-2 border-white flex items-center justify-center text-xs font-medium"
                title={user.name}
              >
                {user.name[0]}
              </div>
            ))}
            {users.length > 5 && (
              <div className="w-8 h-8 rounded-full bg-gray-100 border-2 border-white flex items-center justify-center text-xs">
                +{users.length - 5}
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <Button
            variant={syncMode === "presenter" ? "default" : "outline"}
            size="sm"
            onClick={() => handleSyncModeChange("presenter")}
          >
            同步模式
          </Button>
          <Button
            variant={syncMode === "independent" ? "default" : "outline"}
            size="sm"
            onClick={() => handleSyncModeChange("independent")}
          >
            独立模式
          </Button>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* Page List */}
        {pages.length > 1 && (
          <nav className="w-48 bg-white border-r overflow-y-auto p-2">
            {pages.map((page) => (
              <button
                key={page.id}
                onClick={() => handlePageSwitch(page.id)}
                className={`w-full text-left px-3 py-2 rounded text-sm mb-1 ${
                  currentPageId === page.id
                    ? "bg-blue-100 text-blue-700"
                    : "hover:bg-gray-100"
                }`}
              >
                {page.name}
              </button>
            ))}
          </nav>
        )}

        {/* Preview Area */}
        <div
          ref={containerRef}
          className="flex-1 overflow-auto bg-gray-100 relative"
          onMouseMove={handleMouseMove}
          onScroll={handleScroll}
        >
          {currentPage && (
            <div className="p-8 flex justify-center">
              <div className="relative bg-white shadow-lg">
                {/* Render components */}
                {currentPage.components.map((comp) => (
                  <div
                    key={comp.id}
                    className="absolute"
                    style={{
                      left: comp.layout.x,
                      top: comp.layout.y,
                      width: comp.layout.w,
                      height: comp.layout.h,
                    }}
                  >
                    <PreviewComponent component={comp} />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Remote Cursors */}
          {Array.from(cursors.entries()).map(
            ([socketId, { x, y, name }]) => (
              <div
                key={socketId}
                className="absolute pointer-events-none"
                style={{
                  left: x,
                  top: y,
                  transform: "translate(-50%, -50%)",
                }}
              >
                <svg
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  fill="none"
                >
                  <path
                    d="M5 3L19 12L12 13L9 20L5 3Z"
                    fill="#3b82f6"
                    stroke="white"
                    strokeWidth="1"
                  />
                </svg>
                <div className="absolute left-6 top-4 bg-blue-500 text-white text-xs px-1.5 py-0.5 rounded whitespace-nowrap">
                  {name}
                </div>
              </div>
            )
          )}
        </div>
      </div>
    </div>
  );
}

function PreviewComponent({ component }: { component: any }) {
  const { componentType, props } = component;

  switch (componentType) {
    case "Text":
      return (
        <div
          style={{
            fontSize: props.fontSize || 14,
            fontWeight: props.fontWeight || "normal",
            color: props.color || "#000",
          }}
        >
          {props.content || "文本"}
        </div>
      );

    case "Button":
      return (
        <button className="w-full h-full bg-blue-600 text-white rounded">
          {props.text || "按钮"}
        </button>
      );

    case "Input":
      return (
        <div className="w-full h-full border rounded px-3 py-2 bg-gray-50 text-gray-400">
          {props.placeholder || "输入框"}
        </div>
      );

    case "Card":
      return (
        <div className="w-full h-full border rounded-lg p-4 bg-white shadow-sm">
          {props.title && <h3 className="font-medium mb-2">{props.title}</h3>}
          {props.content && (
            <p className="text-sm text-gray-600">{props.content}</p>
          )}
        </div>
      );

    default:
      return (
        <div className="w-full h-full bg-gray-100 border border-dashed border-gray-300 rounded flex items-center justify-center text-xs text-gray-400">
          {componentType}
        </div>
      );
  }
}
