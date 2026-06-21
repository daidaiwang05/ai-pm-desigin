"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDate, getApiBase } from "@/lib/utils";

const API_BASE = getApiBase();

interface DeletedProject {
  id: string;
  name: string;
  description?: string;
  deletedAt: string;
  organization: { name: string };
  _count: { iterations: number };
}

interface DeletedPage {
  id: string;
  name: string;
  deletedAt: string;
  iteration: { name: string; version: string };
  _count: { components: number };
}

export default function TrashPage() {
  const router = useRouter();
  const [projects, setProjects] = useState<DeletedProject[]>([]);
  const [pages, setPages] = useState<DeletedPage[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"projects" | "pages">("projects");
  const [selectedProject, setSelectedProject] = useState<string | null>(null);

  useEffect(() => {
    loadDeletedProjects();
  }, []);

  const getToken = () => localStorage.getItem("auth_token");

  const loadDeletedProjects = async () => {
    try {
      const token = getToken();
      const response = await fetch(`${API_BASE}/trash/projects`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const result = await response.json();
      if (result.success) {
        setProjects(result.data);
      }
    } catch (error) {
      console.error("Failed to load deleted projects:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadDeletedPages = async (projectId: string) => {
    try {
      const token = getToken();
      const response = await fetch(`${API_BASE}/trash/projects/${projectId}/pages`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const result = await response.json();
      if (result.success) {
        setPages(result.data);
        setSelectedProject(projectId);
        setActiveTab("pages");
      }
    } catch (error) {
      console.error("Failed to load deleted pages:", error);
    }
  };

  const handleRestoreProject = async (id: string) => {
    try {
      const token = getToken();
      const response = await fetch(`${API_BASE}/trash/projects/${id}/restore`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      const result = await response.json();
      if (result.success) {
        setProjects(projects.filter((p) => p.id !== id));
      }
    } catch (error) {
      console.error("Failed to restore project:", error);
    }
  };

  const handleRestorePage = async (id: string) => {
    try {
      const token = getToken();
      const response = await fetch(`${API_BASE}/trash/pages/${id}/restore`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      const result = await response.json();
      if (result.success) {
        setPages(pages.filter((p) => p.id !== id));
      }
    } catch (error) {
      console.error("Failed to restore page:", error);
    }
  };

  const handlePermanentDeleteProject = async (id: string) => {
    if (!confirm("确定要永久删除此项目吗？此操作不可恢复！")) return;

    try {
      const token = getToken();
      const response = await fetch(`${API_BASE}/trash/projects/${id}/permanent`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      const result = await response.json();
      if (result.success) {
        setProjects(projects.filter((p) => p.id !== id));
      }
    } catch (error) {
      console.error("Failed to permanently delete project:", error);
    }
  };

  const handlePermanentDeletePage = async (id: string) => {
    if (!confirm("确定要永久删除此页面吗？此操作不可恢复！")) return;

    try {
      const token = getToken();
      const response = await fetch(`${API_BASE}/trash/pages/${id}/permanent`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      const result = await response.json();
      if (result.success) {
        setPages(pages.filter((p) => p.id !== id));
      }
    } catch (error) {
      console.error("Failed to permanently delete page:", error);
    }
  };

  const getDaysRemaining = (deletedAt: string) => {
    const deleted = new Date(deletedAt);
    const expireDate = new Date(deleted);
    expireDate.setDate(expireDate.getDate() + 30);
    const now = new Date();
    const remaining = Math.ceil((expireDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    return Math.max(0, remaining);
  };

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold">回收站</h2>
          <p className="text-muted-foreground mt-1">
            已删除的项目和页面将在 30 天后自动清除
          </p>
        </div>
        <Button variant="outline" onClick={() => router.push("/")}>
          返回工作台
        </Button>
      </div>

      {/* Tabs */}
      <div className="flex space-x-4 mb-6 border-b">
        <button
          onClick={() => setActiveTab("projects")}
          className={`pb-3 px-1 text-sm font-medium border-b-2 transition-colors ${
            activeTab === "projects"
              ? "border-primary text-primary"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          已删除项目 ({projects.length})
        </button>
        <button
          onClick={() => setActiveTab("pages")}
          className={`pb-3 px-1 text-sm font-medium border-b-2 transition-colors ${
            activeTab === "pages"
              ? "border-primary text-primary"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          已删除页面 {selectedProject ? `(${pages.length})` : ""}
        </button>
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="text-center py-12 text-muted-foreground">加载中...</div>
      ) : activeTab === "projects" ? (
        /* Deleted Projects */
        projects.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-4xl mb-4">🗑</div>
            <p className="text-muted-foreground">回收站是空的</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {projects.map((project) => (
              <Card key={project.id} className="relative">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">{project.name}</CardTitle>
                  <CardDescription className="line-clamp-2">
                    {project.description || "暂无描述"}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-xs text-muted-foreground space-y-1 mb-4">
                    <div>删除于 {formatDate(project.deletedAt)}</div>
                    <div>{project._count.iterations} 个迭代版本</div>
                    <div className="text-orange-600">
                      剩余 {getDaysRemaining(project.deletedAt)} 天自动清除
                    </div>
                  </div>
                  <div className="flex space-x-2">
                    <Button
                      size="sm"
                      className="flex-1"
                      onClick={() => handleRestoreProject(project.id)}
                    >
                      恢复
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="flex-1"
                      onClick={() => loadDeletedPages(project.id)}
                    >
                      查看页面
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => handlePermanentDeleteProject(project.id)}
                    >
                      永久删除
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )
      ) : (
        /* Deleted Pages */
        !selectedProject ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground">请先选择一个项目查看已删除的页面</p>
          </div>
        ) : pages.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-4xl mb-4">📄</div>
            <p className="text-muted-foreground">该项目没有已删除的页面</p>
          </div>
        ) : (
          <div className="space-y-3">
            {pages.map((page) => (
              <Card key={page.id}>
                <CardContent className="p-4 flex items-center justify-between">
                  <div>
                    <div className="font-medium">{page.name}</div>
                    <div className="text-sm text-muted-foreground">
                      {page.iteration.name} (v{page.iteration.version}) ·{" "}
                      {page._count.components} 个组件 · 删除于 {formatDate(page.deletedAt)}
                    </div>
                    <div className="text-xs text-orange-600 mt-1">
                      剩余 {getDaysRemaining(page.deletedAt)} 天自动清除
                    </div>
                  </div>
                  <div className="flex space-x-2">
                    <Button size="sm" onClick={() => handleRestorePage(page.id)}>
                      恢复
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => handlePermanentDeletePage(page.id)}
                    >
                      永久删除
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )
      )}
    </div>
  );
}
