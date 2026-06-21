"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Application error:", error);
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50">
      <div className="text-center">
        <div className="text-6xl mb-4">⚠️</div>
        <h1 className="text-2xl font-semibold text-gray-700 mb-2">
          出错了
        </h1>
        <p className="text-gray-500 mb-4">
          抱歉，发生了意外错误
        </p>
        <p className="text-sm text-gray-400 mb-8 max-w-md mx-auto">
          {error.message || "未知错误"}
        </p>
        <div className="space-x-4">
          <Button onClick={reset}>重试</Button>
          <Button variant="outline" onClick={() => window.location.href = "/"}>
            返回首页
          </Button>
        </div>
      </div>
    </div>
  );
}
