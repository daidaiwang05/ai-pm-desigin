"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50">
      <div className="text-center">
        <div className="text-6xl font-bold text-gray-300 mb-4">404</div>
        <h1 className="text-2xl font-semibold text-gray-700 mb-2">
          页面未找到
        </h1>
        <p className="text-gray-500 mb-8">
          抱歉，您访问的页面不存在或已被移除
        </p>
        <div className="space-x-4">
          <Link href="/">
            <Button>返回首页</Button>
          </Link>
          <Link href="/login">
            <Button variant="outline">登录</Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
