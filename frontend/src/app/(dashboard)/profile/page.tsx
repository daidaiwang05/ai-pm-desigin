"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api/v1";

export default function ProfilePage() {
  const [user, setUser] = useState<any>(null);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [message, setMessage] = useState({ type: "", text: "" });

  useEffect(() => {
    const userStr = localStorage.getItem("user");
    if (userStr) {
      try {
        const userData = JSON.parse(userStr);
        setUser(userData);
        setName(userData.name || "");
        setEmail(userData.email || "");
      } catch {}
    }
  }, []);

  const getToken = () => localStorage.getItem("auth_token");

  const handleUpdateProfile = async () => {
    setIsSaving(true);
    setMessage({ type: "", text: "" });

    try {
      const token = getToken();
      const response = await fetch(`${API_BASE}/auth/me`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ name }),
      });

      if (response.ok) {
        const result = await response.json();
        if (result.success) {
          const updatedUser = { ...user, name };
          localStorage.setItem("user", JSON.stringify(updatedUser));
          setUser(updatedUser);
          setMessage({ type: "success", text: "个人信息更新成功" });
        }
      } else {
        setMessage({ type: "error", text: "更新失败，请重试" });
      }
    } catch (error) {
      setMessage({ type: "error", text: "网络错误，请检查连接" });
    } finally {
      setIsSaving(false);
    }
  };

  const handleChangePassword = async () => {
    if (newPassword !== confirmPassword) {
      setMessage({ type: "error", text: "两次输入的密码不一致" });
      return;
    }

    if (newPassword.length < 6) {
      setMessage({ type: "error", text: "密码长度至少 6 位" });
      return;
    }

    setIsChangingPassword(true);
    setMessage({ type: "", text: "" });

    try {
      const token = getToken();
      const response = await fetch(`${API_BASE}/auth/change-password`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ currentPassword, newPassword }),
      });

      if (response.ok) {
        setMessage({ type: "success", text: "密码修改成功" });
        setCurrentPassword("");
        setNewPassword("");
        setConfirmPassword("");
      } else {
        const result = await response.json().catch(() => ({}));
        setMessage({ type: "error", text: result.error?.message || "密码修改失败" });
      }
    } catch (error) {
      setMessage({ type: "error", text: "网络错误，请检查连接" });
    } finally {
      setIsChangingPassword(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold">个人设置</h1>

      {message.text && (
        <div
          className={`p-4 rounded-md ${
            message.type === "success"
              ? "bg-green-50 text-green-700"
              : "bg-red-50 text-red-700"
          }`}
        >
          {message.text}
        </div>
      )}

      {/* 基本信息 */}
      <Card>
        <CardHeader>
          <CardTitle>基本信息</CardTitle>
          <CardDescription>更新您的个人信息</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">姓名</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="输入您的姓名"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">邮箱</Label>
            <Input
              id="email"
              value={email}
              disabled
              className="bg-gray-50"
            />
            <p className="text-sm text-gray-500">邮箱地址不可修改</p>
          </div>
          <Button onClick={handleUpdateProfile} disabled={isSaving}>
            {isSaving ? "保存中..." : "保存修改"}
          </Button>
        </CardContent>
      </Card>

      {/* 修改密码 */}
      <Card>
        <CardHeader>
          <CardTitle>修改密码</CardTitle>
          <CardDescription>更新您的登录密码</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="currentPassword">当前密码</Label>
            <Input
              id="currentPassword"
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              placeholder="输入当前密码"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="newPassword">新密码</Label>
            <Input
              id="newPassword"
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="输入新密码（至少 6 位）"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="confirmPassword">确认新密码</Label>
            <Input
              id="confirmPassword"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="再次输入新密码"
            />
          </div>
          <Button onClick={handleChangePassword} disabled={isChangingPassword}>
            {isChangingPassword ? "修改中..." : "修改密码"}
          </Button>
        </CardContent>
      </Card>

      {/* 账号信息 */}
      <Card>
        <CardHeader>
          <CardTitle>账号信息</CardTitle>
          <CardDescription>您的账号详细信息</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-500">用户 ID</span>
              <span className="font-mono">{user?.id || "-"}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">注册时间</span>
              <span>{user?.createdAt ? new Date(user.createdAt).toLocaleDateString("zh-CN") : "-"}</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
