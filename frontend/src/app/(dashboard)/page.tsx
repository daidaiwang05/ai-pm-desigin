"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { formatDate, getApiBase } from "@/lib/utils";

const API_BASE = getApiBase();

interface Project {
  id: string;
  name: string;
  description?: string;
  createdAt: string;
  updatedAt: string;
  currentIteration?: {
    id: string;
    version: string;
    name: string;
  };
  _count: {
    iterations: number;
    members: number;
  };
}

type SortBy = "updatedAt" | "createdAt" | "name";

export default function DashboardPage() {
  const router = useRouter();
  const [projects, setProjects] = useState<Project[]>([]);
  const [filteredProjects, setFilteredProjects] = useState<Project[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newProjectName, setNewProjectName] = useState("");
  const [newProjectDesc, setNewProjectDesc] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [user, setUser] = useState<{ name?: string; email?: string } | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<SortBy>("updatedAt");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");

  useEffect(() => {
    const userStr = localStorage.getItem("user");
    if (userStr) {
      try {
        setUser(JSON.parse(userStr));
      } catch {}
    }
    loadProjects();
  }, []);

  useEffect(() => {
    filterAndSortProjects();
  }, [projects, searchQuery, sortBy]);

  const getToken = () => localStorage.getItem("auth_token");

  const loadProjects = async () => {
    try {
      const token = getToken();
      const response = await fetch(`${API_BASE}/projects?page=1&pageSize=100`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const result = await response.json();
      if (result.success && result.data) {
        setProjects(result.data);
      }
    } catch (error) {
      console.error("Failed to load projects:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const filterAndSortProjects = () => {
    let filtered = [...projects];

    // 搜索过滤
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (p) =>
          p.name.toLowerCase().includes(query) ||
          (p.description && p.description.toLowerCase().includes(query))
      );
    }

    // 排序
    filtered.sort((a, b) => {
      switch (sortBy) {
        case "updatedAt":
          return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
        case "createdAt":
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        case "name":
          return a.name.localeCompare(b.name);
        default:
          return 0;
      }
    });

    setFilteredProjects(filtered);
  };

  const handleCreateProject = async () => {
    if (!newProjectName.trim()) return;

    setIsCreating(true);
    try {
      const token = getToken();
      const response = await fetch(`${API_BASE}/projects`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: newProjectName,
          description: newProjectDesc,
        }),
      });
      const result = await response.json();
      if (result.success && result.data) {
        setShowCreateModal(false);
        setNewProjectName("");
        setNewProjectDesc("");
        router.push(`/project/${result.data.id}`);
      }
    } catch (error) {
      console.error("Failed to create project:", error);
    } finally {
      setIsCreating(false);
    }
  };

  const quickActions = [
    { icon: "📄", label: "PRD 生成", href: "/prd", description: "AI 生成产品需求文档" },
    { icon: "🎨", label: "设计规范", href: "/design-system", description: "管理 Design Token" },
    { icon: "🗑", label: "回收站", href: "/trash", description: "查看已删除内容" },
  ];

  return (
    <div>
      {/* Welcome Section */}
      <div className="mb-8">
        <h2 className="text-2xl font-bold">工作台</h2>
        <p className="text-muted-foreground mt-1">
          欢迎回来，{user?.name || user?.email || "用户"}
        </p>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        {quickActions.map((action) => (
          <Card
            key={action.href}
            className="cursor-pointer hover:shadow-md transition-shadow"
            onClick={() => router.push(action.href)}
          >
            <CardContent className="p-4 flex items-center space-x-4">
              <div className="text-3xl">{action.icon}</div>
              <div>
                <div className="font-medium">{action.label}</div>
                <div className="text-sm text-muted-foreground">
                  {action.description}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Projects Section */}
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold">我的项目</h3>
        <Button onClick={() => setShowCreateModal(true)}>+ 新建项目</Button>
      </div>

      {/* Filters */}
      <div className="flex items-center space-x-4 mb-6">
        <div className="flex-1">
          <Input
            placeholder="搜索项目..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="max-w-sm"
          />
        </div>
        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value as SortBy)}
          className="p-2 border rounded-md text-sm"
        >
          <option value="updatedAt">最近更新</option>
          <option value="createdAt">创建时间</option>
          <option value="name">名称排序</option>
        </select>
        <div className="flex border rounded-md">
          <button
            onClick={() => setViewMode("grid")}
            className={`px-3 py-2 text-sm ${
              viewMode === "grid" ? "bg-primary text-primary-foreground" : "hover:bg-gray-50"
            }`}
          >
            网格
          </button>
          <button
            onClick={() => setViewMode("list")}
            className={`px-3 py-2 text-sm ${
              viewMode === "list" ? "bg-primary text-primary-foreground" : "hover:bg-gray-50"
            }`}
          >
            列表
          </button>
        </div>
      </div>

      {/* Projects Grid/List */}
      {isLoading ? (
        <div className="text-center py-12 text-muted-foreground">加载中...</div>
      ) : filteredProjects.length === 0 ? (
        <div className="text-center py-12">
          {searchQuery ? (
            <div>
              <div className="text-4xl mb-4">🔍</div>
              <p className="text-muted-foreground">没有找到匹配的项目</p>
              <Button variant="link" onClick={() => setSearchQuery("")}>
                清除搜索
              </Button>
            </div>
          ) : (
            <div>
              <div className="text-muted-foreground mb-4">
                还没有项目，创建第一个吧！
              </div>
              <Button onClick={() => setShowCreateModal(true)}>+ 新建项目</Button>
            </div>
          )}
        </div>
      ) : viewMode === "grid" ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredProjects.map((project) => (
            <Card
              key={project.id}
              className="cursor-pointer hover:shadow-md transition-shadow"
              onClick={() => router.push(`/project/${project.id}`)}
            >
              <CardHeader>
                <CardTitle className="text-lg">{project.name}</CardTitle>
                <CardDescription className="line-clamp-2">
                  {project.description || "暂无描述"}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between text-sm text-muted-foreground">
                  <span>
                    {project.currentIteration
                      ? `当前: ${project.currentIteration.name}`
                      : "暂无迭代"}
                  </span>
                  <span>{project._count.iterations} 个迭代</span>
                </div>
                <div className="mt-2 text-xs text-muted-foreground">
                  更新于 {formatDate(project.updatedAt)}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="space-y-3">
          {filteredProjects.map((project) => (
            <Card
              key={project.id}
              className="cursor-pointer hover:shadow-md transition-shadow"
              onClick={() => router.push(`/project/${project.id}`)}
            >
              <CardContent className="p-4 flex items-center justify-between">
                <div className="flex-1">
                  <div className="font-medium">{project.name}</div>
                  <div className="text-sm text-muted-foreground">
                    {project.description || "暂无描述"}
                  </div>
                </div>
                <div className="text-right text-sm text-muted-foreground">
                  <div>
                    {project.currentIteration
                      ? `当前: ${project.currentIteration.name}`
                      : "暂无迭代"}
                  </div>
                  <div className="text-xs">
                    {project._count.iterations} 个迭代 · 更新于 {formatDate(project.updatedAt)}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Stats */}
      <div className="mt-8 text-center text-sm text-muted-foreground">
        共 {filteredProjects.length} 个项目
        {searchQuery && ` (搜索: "${searchQuery}")`}
      </div>

      {/* Create Project Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <Card className="w-full max-w-md mx-4">
            <CardHeader>
              <CardTitle>新建项目</CardTitle>
              <CardDescription>创建一个新的原型项目</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">项目名称</label>
                <Input
                  placeholder="输入项目名称"
                  value={newProjectName}
                  onChange={(e) => setNewProjectName(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleCreateProject()}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">项目描述（可选）</label>
                <Input
                  placeholder="简短描述项目"
                  value={newProjectDesc}
                  onChange={(e) => setNewProjectDesc(e.target.value)}
                />
              </div>
            </CardContent>
            <div className="flex justify-end space-x-2 p-6 pt-0">
              <Button variant="outline" onClick={() => setShowCreateModal(false)}>
                取消
              </Button>
              <Button
                onClick={handleCreateProject}
                disabled={!newProjectName.trim() || isCreating}
              >
                {isCreating ? "创建中..." : "创建"}
              </Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
