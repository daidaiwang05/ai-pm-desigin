"use client";

import { useEffect, useState, useRef } from "react";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api/v1";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const verifyAuth = async () => {
      const token = localStorage.getItem("auth_token");

      if (!token) {
        setIsLoading(false);
        return;
      }

      try {
        // 验证 token 是否有效
        const response = await fetch(`${API_BASE}/auth/me`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (response.ok) {
          const result = await response.json();
          if (result.success && result.data) {
            setUser(result.data);
            setIsAuthenticated(true);
            // 更新本地缓存的用户信息
            localStorage.setItem("user", JSON.stringify(result.data));
          } else {
            // Token 无效，清除
            localStorage.removeItem("auth_token");
            localStorage.removeItem("user");
          }
        } else if (response.status === 401) {
          // Token 过期或无效
          localStorage.removeItem("auth_token");
          localStorage.removeItem("user");
        } else {
          // 其他错误，尝试使用本地缓存
          const userStr = localStorage.getItem("user");
          if (userStr) {
            try {
              setUser(JSON.parse(userStr));
              setIsAuthenticated(true);
            } catch {
              localStorage.removeItem("user");
            }
          }
        }
      } catch {
        // 网络错误，使用本地缓存
        const userStr = localStorage.getItem("user");
        if (userStr) {
          try {
            setUser(JSON.parse(userStr));
            setIsAuthenticated(true);
          } catch {
            localStorage.removeItem("user");
          }
        }
      } finally {
        setIsLoading(false);
      }
    };

    verifyAuth();
  }, []);

  // 点击外部关闭菜单
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowUserMenu(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleLogout = () => {
    localStorage.removeItem("auth_token");
    localStorage.removeItem("user");
    window.location.href = "/login";
  };

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-muted-foreground">加载中...</div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <p className="mb-4">请先登录</p>
          <a href="/login" className="text-primary hover:underline">
            前往登录
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Top Navigation */}
      <header className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between">
            <div className="flex items-center space-x-4">
              <a href="/" className="flex items-center space-x-2">
                <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center">
                  <span className="text-primary-foreground font-bold text-sm">
                    P
                  </span>
                </div>
                <h1 className="text-lg font-semibold">AI Prototype</h1>
              </a>
            </div>
            <nav className="flex items-center space-x-4">
              <a
                href="/prd"
                className="text-sm text-muted-foreground hover:text-foreground"
                title="PRD 生成"
              >
                📄 PRD
              </a>
              <a
                href="/design-system"
                className="text-sm text-muted-foreground hover:text-foreground"
                title="设计规范"
              >
                🎨 设计规范
              </a>
              <a
                href="/trash"
                className="text-sm text-muted-foreground hover:text-foreground"
                title="回收站"
              >
                🗑 回收站
              </a>

              {/* 用户菜单 */}
              <div className="relative" ref={menuRef}>
                <button
                  onClick={() => setShowUserMenu(!showUserMenu)}
                  className="flex items-center space-x-2 text-sm text-muted-foreground hover:text-foreground focus:outline-none"
                >
                  <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                    <span className="text-primary font-medium">
                      {user?.name?.charAt(0) || user?.email?.charAt(0) || "U"}
                    </span>
                  </div>
                  <span>{user?.name || user?.email || "用户"}</span>
                  <svg
                    className={`h-4 w-4 transition-transform ${showUserMenu ? "rotate-180" : ""}`}
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>

                {/* 下拉菜单 */}
                {showUserMenu && (
                  <div className="absolute right-0 mt-2 w-56 bg-white rounded-md shadow-lg border border-gray-200 py-1 z-50">
                    <div className="px-4 py-3 border-b">
                      <p className="text-sm font-medium text-gray-900">{user?.name || "用户"}</p>
                      <p className="text-sm text-gray-500">{user?.email}</p>
                    </div>
                    <a
                      href="/profile"
                      className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                      onClick={() => setShowUserMenu(false)}
                    >
                      👤 个人设置
                    </a>
                    <a
                      href="/trash"
                      className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                      onClick={() => setShowUserMenu(false)}
                    >
                      🗑 回收站
                    </a>
                    <div className="border-t"></div>
                    <button
                      onClick={handleLogout}
                      className="block w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50"
                    >
                      🚪 退出登录
                    </button>
                  </div>
                )}
              </div>
            </nav>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {children}
      </main>
    </div>
  );
}
