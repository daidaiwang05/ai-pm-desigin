"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api/v1";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      const response = await fetch(`${API_BASE}/auth/forgot-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      if (response.ok) {
        setIsSubmitted(true);
      } else {
        const result = await response.json().catch(() => ({}));
        setError(result.error?.message || "发送失败，请重试");
      }
    } catch (error) {
      setError("网络错误，请检查连接");
    } finally {
      setIsLoading(false);
    }
  };

  if (isSubmitted) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 h-12 w-12 rounded-full bg-green-100 flex items-center justify-center">
              <span className="text-2xl">✉️</span>
            </div>
            <CardTitle className="text-2xl">邮件已发送</CardTitle>
            <CardDescription>
              我们已向 <strong>{email}</strong> 发送了密码重置链接，请查收邮件。
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center text-sm text-gray-500">
            <p>没有收到邮件？请检查垃圾邮件文件夹，或</p>
            <button
              onClick={() => {
                setIsSubmitted(false);
                setEmail("");
              }}
              className="text-primary hover:underline"
            >
              重新发送
            </button>
          </CardContent>
          <CardFooter className="justify-center">
            <Link href="/login" className="text-sm text-primary hover:underline">
              返回登录
            </Link>
          </CardFooter>
        </Card>
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
          <CardTitle className="text-2xl text-center">忘记密码</CardTitle>
          <CardDescription className="text-center">
            输入您的注册邮箱，我们将发送密码重置链接
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
              <Label htmlFor="email">邮箱地址</Label>
              <Input
                id="email"
                type="email"
                placeholder="your@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
          </CardContent>

          <CardContent className="pt-0 space-y-4">
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? "发送中..." : "发送重置链接"}
            </Button>

            <div className="text-center">
              <Link href="/login" className="text-sm text-primary hover:underline">
                返回登录
              </Link>
            </div>
          </CardContent>
        </form>
      </Card>
    </div>
  );
}
