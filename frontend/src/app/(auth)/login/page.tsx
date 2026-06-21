"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { SSOButtons } from "@/components/auth/SSOButtons";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api/v1";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem("auth_token");
    if (token) {
      router.push("/");
    } else {
      setIsChecking(false);
    }
  }, [router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      const response = await fetch(`${API_BASE}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      // 先检查响应状态
      if (!response.ok) {
        if (response.status >= 500) {
          setError(`服务器错误 (${response.status})，请稍后重试`);
        } else if (response.status === 401) {
          setError("邮箱或密码错误");
        } else if (response.status === 404) {
          setError("登录服务不可用");
        } else {
          setError(`请求失败 (${response.status})`);
        }
        return;
      }

      const data = await response.json();

      if (data.success && data.data) {
        localStorage.setItem("auth_token", data.data.token);
        localStorage.setItem("user", JSON.stringify(data.data.user));
        router.push("/");
      } else {
        setError(data.error?.message || "登录失败");
      }
    } catch (err) {
      console.error("Login error:", err);
      if (err instanceof SyntaxError) {
        setError("服务器返回了无效的响应");
      } else {
        setError("网络错误，请检查后端服务是否启动");
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleSSOSuccess = (provider: string, token: string, user: any) => {
    localStorage.setItem("auth_token", token);
    localStorage.setItem("user", JSON.stringify(user));
    router.push("/");
  };

  const handleSSOError = (error: string) => {
    setError(error);
  };

  if (isChecking) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-muted-foreground">检查登录状态...</div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <div className="flex items-center justify-center mb-4">
            <div className="h-10 w-10 rounded-lg bg-primary flex items-center justify-center">
              <span className="text-primary-foreground font-bold text-xl">P</span>
            </div>
          </div>
          <CardTitle className="text-2xl text-center">登录</CardTitle>
          <CardDescription className="text-center">
            登录到 AI Prototype 原型交付平台
          </CardDescription>
        </CardHeader>

        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-4">
            {error && (
              <div className="rounded-md bg-red-50 p-3 text-sm text-red-600">
                {error}
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="email">邮箱</Label>
              <Input
                id="email"
                type="email"
                placeholder="your@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="password">密码</Label>
                <Link href="/forgot-password" className="text-xs text-primary hover:underline">
                  忘记密码？
                </Link>
              </div>
              <Input
                id="password"
                type="password"
                placeholder="输入密码"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>

            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? "登录中..." : "登录"}
            </Button>
          </CardContent>
        </form>

        <CardContent className="pt-0">
          <SSOButtons onLogin={handleSSOSuccess} onError={handleSSOError} />
        </CardContent>

        <CardFooter>
          <p className="text-sm text-center text-muted-foreground w-full">
            还没有账号？{" "}
            <Link href="/register" className="text-primary hover:underline">
              注册
            </Link>
          </p>
        </CardFooter>
      </Card>
    </div>
  );
}
