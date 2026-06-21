"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api/v1";

interface ProjectData {
  id: string;
  name: string;
  currentIteration?: {
    id: string;
    name: string;
    version: string;
  };
}

export default function ProjectLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const params = useParams();
  const router = useRouter();
  const [project, setProject] = useState<ProjectData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem("auth_token");
    if (!token) {
      router.push("/login");
      return;
    }
    setIsAuthenticated(true);
    loadProject();
  }, [params.id]);

  const loadProject = async () => {
    try {
      const token = localStorage.getItem("auth_token");
      const response = await fetch(`${API_BASE}/projects/${params.id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const result = await response.json();
      if (result.success && result.data) {
        setProject(result.data);
      } else {
        router.push("/");
      }
    } catch (error) {
      console.error("Failed to load project:", error);
      router.push("/");
    } finally {
      setIsLoading(false);
    }
  };

  if (!isAuthenticated || isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-muted-foreground">加载中...</div>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <p className="mb-4">项目不存在</p>
          <a href="/" className="text-primary hover:underline">
            返回首页
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col">
      {/* Top Navigation */}
      <header className="bg-white border-b h-14 flex items-center px-4 shrink-0">
        <div className="flex items-center space-x-4 flex-1">
          <a href="/" className="text-muted-foreground hover:text-foreground">
            ← 返回
          </a>
          <div className="h-6 w-px bg-border" />
          <h1 className="font-semibold">{project.name}</h1>
          {project.currentIteration && (
            <span className="text-sm text-muted-foreground">
              {project.currentIteration.name}
            </span>
          )}
        </div>
        <div className="flex items-center space-x-2">
          <button className="px-3 py-1.5 text-sm border rounded hover:bg-gray-50">
            预览
          </button>
          <button className="px-3 py-1.5 text-sm bg-primary text-primary-foreground rounded hover:bg-primary/90">
            发布
          </button>
        </div>
      </header>

      {/* Main Editor Area */}
      <div className="flex-1 overflow-hidden">{children}</div>
    </div>
  );
}
