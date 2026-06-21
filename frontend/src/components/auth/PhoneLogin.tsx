"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface PhoneLoginProps {
  onLogin: (token: string, user: any) => void;
  onError: (error: string) => void;
}

export function PhoneLogin({ onLogin, onError }: PhoneLoginProps) {
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [isCodeSent, setIsCodeSent] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const [isSending, setIsSending] = useState(false);
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (countdown > 0) {
      timer = setTimeout(() => setCountdown(countdown - 1), 1000);
    }
    return () => clearTimeout(timer);
  }, [countdown]);

  const handleSendCode = async () => {
    if (!phone || !/^1[3-9]\d{9}$/.test(phone)) {
      onError("请输入正确的手机号");
      return;
    }

    setIsSending(true);
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api/v1"}/verification/send-code`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ phone, purpose: "login" }),
        }
      );

      const result = await response.json();

      if (result.success) {
        setIsCodeSent(true);
        setCountdown(60);
      } else {
        throw new Error(result.error?.message || "发送失败");
      }
    } catch (error: any) {
      onError(error.message);
    } finally {
      setIsSending(false);
    }
  };

  const handleLogin = async () => {
    if (!phone || !code) {
      onError("请输入手机号和验证码");
      return;
    }

    setIsLoggingIn(true);
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api/v1"}/auth/phone-login`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ phone, code }),
        }
      );

      const result = await response.json();

      if (result.success) {
        onLogin(result.data.token, result.data.user);
      } else {
        throw new Error(result.error?.message || "登录失败");
      }
    } catch (error: any) {
      onError(error.message);
    } finally {
      setIsLoggingIn(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="phone">手机号</Label>
        <div className="flex space-x-2">
          <Input
            id="phone"
            type="tel"
            placeholder="请输入手机号"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            maxLength={11}
            className="flex-1"
          />
          <Button
            variant="outline"
            onClick={handleSendCode}
            disabled={isSending || countdown > 0}
            className="shrink-0"
          >
            {isSending
              ? "发送中..."
              : countdown > 0
              ? `${countdown}秒`
              : "获取验证码"}
          </Button>
        </div>
      </div>

      {isCodeSent && (
        <div className="space-y-2">
          <Label htmlFor="code">验证码</Label>
          <Input
            id="code"
            type="text"
            placeholder="请输入6位验证码"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            maxLength={6}
          />
        </div>
      )}

      {isCodeSent && (
        <Button
          onClick={handleLogin}
          disabled={isLoggingIn || !code}
          className="w-full"
        >
          {isLoggingIn ? "登录中..." : "登录"}
        </Button>
      )}
    </div>
  );
}
