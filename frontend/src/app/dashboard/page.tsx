"use client";

import { useEffect } from "react";

export default function DashboardRedirect() {
  useEffect(() => {
    // /dashboard 重定向到 /（Dashboard 实际所在位置）
    window.location.href = "/";
  }, []);

  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="text-muted-foreground">跳转中...</div>
    </div>
  );
}
