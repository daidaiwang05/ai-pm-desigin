"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { downloadFile, getApiBase } from "@/lib/utils";

const API_BASE = getApiBase();

interface DesignToken {
  name: string;
  value: string;
  type: "color" | "font" | "spacing" | "borderRadius" | "shadow" | "other";
  description?: string;
}

interface DesignSystem {
  name: string;
  description?: string;
  tokens: DesignToken[];
  brandColors?: {
    primary: string;
    secondary?: string;
    accent?: string;
  };
}

interface Project {
  id: string;
  name: string;
}

export default function DesignSystemPage() {
  const router = useRouter();
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProject, setSelectedProject] = useState<string>("");
  const [designSystem, setDesignSystem] = useState<DesignSystem | null>(null);
  const [tokens, setTokens] = useState<DesignToken[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [newToken, setNewToken] = useState<DesignToken>({
    name: "",
    value: "",
    type: "color",
    description: "",
  });

  useEffect(() => {
    loadProjects();
  }, []);

  useEffect(() => {
    if (selectedProject) {
      loadDesignSystem(selectedProject);
    }
  }, [selectedProject]);

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
        if (result.data.length > 0) {
          setSelectedProject(result.data[0].id);
        }
      }
    } catch (error) {
      console.error("Failed to load projects:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadDesignSystem = async (projectId: string) => {
    try {
      const token = getToken();
      const response = await fetch(`${API_BASE}/projects/${projectId}/design-system`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const result = await response.json();
      if (result.success && result.data) {
        setDesignSystem(result.data);
        setTokens(result.data.tokens || []);
      } else {
        setDesignSystem(null);
        setTokens([]);
      }
    } catch (error) {
      console.error("Failed to load design system:", error);
    }
  };

  const handleSave = async () => {
    if (!selectedProject) return;

    setIsSaving(true);
    try {
      const token = getToken();
      const response = await fetch(`${API_BASE}/projects/${selectedProject}/design-system`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: designSystem?.name || "设计规范",
          description: designSystem?.description,
          tokens: tokens,
          brandColors: designSystem?.brandColors,
        }),
      });
      const result = await response.json();
      if (result.success) {
        alert("设计规范已保存");
      }
    } catch (error) {
      console.error("Failed to save design system:", error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleAddToken = () => {
    if (!newToken.name || !newToken.value) return;

    setTokens([...tokens, { ...newToken }]);
    setNewToken({ name: "", value: "", type: "color", description: "" });
  };

  const handleRemoveToken = (index: number) => {
    setTokens(tokens.filter((_, i) => i !== index));
  };

  const handleUpdateToken = (index: number, field: keyof DesignToken, value: string) => {
    const updated = [...tokens];
    updated[index] = { ...updated[index], [field]: value };
    setTokens(updated);
  };

  const handleApplyTemplate = (template: any) => {
    if (confirm(`确定要应用 "${template.name}" 模板吗？这将覆盖当前的设计规范。`)) {
      setTokens(template.tokens);
      setDesignSystem({
        name: template.name,
        description: template.description,
        tokens: template.tokens,
      });
    }
  };

  const handleExportCss = async () => {
    if (!selectedProject) return;

    try {
      const token = getToken();
      const response = await fetch(`${API_BASE}/projects/${selectedProject}/design-system/css`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const css = await response.text();

      downloadFile(css, "design-tokens.css", "text/css");
    } catch (error) {
      console.error("Failed to export CSS:", error);
    }
  };

  const tokenTypes = [
    { value: "color", label: "颜色" },
    { value: "font", label: "字体" },
    { value: "spacing", label: "间距" },
    { value: "borderRadius", label: "圆角" },
    { value: "shadow", label: "阴影" },
    { value: "other", label: "其他" },
  ];

  const templates = [
    { name: "Material Design", description: "Google Material Design 风格", tokens: [] },
    { name: "Ant Design", description: "蚂蚁金服 Ant Design 风格", tokens: [] },
    { name: "iOS Human Interface", description: "Apple iOS 风格", tokens: [] },
  ];

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold">设计规范</h2>
          <p className="text-muted-foreground mt-1">
            管理项目的 Design Token、品牌色彩和设计变量
          </p>
        </div>
        <div className="flex space-x-2">
          <Button variant="outline" onClick={handleExportCss}>
            📥 导出 CSS
          </Button>
          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving ? "保存中..." : "💾 保存"}
          </Button>
          <Button variant="outline" onClick={() => router.push("/")}>
            返回工作台
          </Button>
        </div>
      </div>

      {/* Project Selector */}
      <Card className="mb-6">
        <CardContent className="p-4">
          <div className="flex items-center space-x-4">
            <Label>选择项目：</Label>
            <select
              value={selectedProject}
              onChange={(e) => setSelectedProject(e.target.value)}
              className="p-2 border rounded-md"
            >
              {projects.map((project) => (
                <option key={project.id} value={project.id}>
                  {project.name}
                </option>
              ))}
            </select>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Token List */}
        <div className="lg:col-span-2 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Design Token</CardTitle>
              <CardDescription>
                定义设计系统的基础变量，如颜色、字体、间距等
              </CardDescription>
            </CardHeader>
            <CardContent>
              {/* Add Token Form */}
              <div className="grid grid-cols-5 gap-2 mb-4 p-4 bg-gray-50 rounded-lg">
                <Input
                  placeholder="Token 名称"
                  value={newToken.name}
                  onChange={(e) => setNewToken({ ...newToken, name: e.target.value })}
                />
                <div className="flex items-center space-x-2">
                  {newToken.type === "color" && (
                    <input
                      type="color"
                      value={newToken.value || "#000000"}
                      onChange={(e) => setNewToken({ ...newToken, value: e.target.value })}
                      className="w-10 h-10 cursor-pointer"
                    />
                  )}
                  <Input
                    placeholder="值"
                    value={newToken.value}
                    onChange={(e) => setNewToken({ ...newToken, value: e.target.value })}
                  />
                </div>
                <select
                  value={newToken.type}
                  onChange={(e) => setNewToken({ ...newToken, type: e.target.value as any })}
                  className="p-2 border rounded-md"
                >
                  {tokenTypes.map((type) => (
                    <option key={type.value} value={type.value}>
                      {type.label}
                    </option>
                  ))}
                </select>
                <Input
                  placeholder="描述（可选）"
                  value={newToken.description || ""}
                  onChange={(e) => setNewToken({ ...newToken, description: e.target.value })}
                />
                <Button onClick={handleAddToken}>添加</Button>
              </div>

              {/* Token Table */}
              {tokens.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  暂无 Design Token，点击上方添加或应用模板
                </div>
              ) : (
                <div className="border rounded-lg overflow-hidden">
                  <table className="w-full">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-2 text-left text-sm font-medium">预览</th>
                        <th className="px-4 py-2 text-left text-sm font-medium">名称</th>
                        <th className="px-4 py-2 text-left text-sm font-medium">值</th>
                        <th className="px-4 py-2 text-left text-sm font-medium">类型</th>
                        <th className="px-4 py-2 text-left text-sm font-medium">描述</th>
                        <th className="px-4 py-2 text-left text-sm font-medium">操作</th>
                      </tr>
                    </thead>
                    <tbody>
                      {tokens.map((token, index) => (
                        <tr key={index} className="border-t">
                          <td className="px-4 py-2">
                            {token.type === "color" ? (
                              <div
                                className="w-8 h-8 rounded border"
                                style={{ backgroundColor: token.value }}
                              />
                            ) : (
                              <span className="text-xs text-muted-foreground">-</span>
                            )}
                          </td>
                          <td className="px-4 py-2">
                            <Input
                              value={token.name}
                              onChange={(e) => handleUpdateToken(index, "name", e.target.value)}
                              className="h-8 text-sm"
                            />
                          </td>
                          <td className="px-4 py-2">
                            <div className="flex items-center space-x-2">
                              {token.type === "color" && (
                                <input
                                  type="color"
                                  value={token.value}
                                  onChange={(e) => handleUpdateToken(index, "value", e.target.value)}
                                  className="w-8 h-8 cursor-pointer"
                                />
                              )}
                              <Input
                                value={token.value}
                                onChange={(e) => handleUpdateToken(index, "value", e.target.value)}
                                className="h-8 text-sm"
                              />
                            </div>
                          </td>
                          <td className="px-4 py-2">
                            <select
                              value={token.type}
                              onChange={(e) => handleUpdateToken(index, "type", e.target.value)}
                              className="p-1 border rounded text-sm"
                            >
                              {tokenTypes.map((type) => (
                                <option key={type.value} value={type.value}>
                                  {type.label}
                                </option>
                              ))}
                            </select>
                          </td>
                          <td className="px-4 py-2">
                            <Input
                              value={token.description || ""}
                              onChange={(e) => handleUpdateToken(index, "description", e.target.value)}
                              className="h-8 text-sm"
                            />
                          </td>
                          <td className="px-4 py-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleRemoveToken(index)}
                              className="text-red-500 hover:text-red-700"
                            >
                              删除
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Sidebar - Templates */}
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>预设模板</CardTitle>
              <CardDescription>快速应用行业标准设计规范</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {templates.map((template, i) => (
                <div key={i} className="p-3 border rounded-lg">
                  <div className="font-medium">{template.name}</div>
                  <div className="text-sm text-muted-foreground mb-2">
                    {template.description}
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full"
                    onClick={() => handleApplyTemplate(template)}
                  >
                    应用模板
                  </Button>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>使用说明</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground space-y-2">
              <p>Design Token 是设计系统的基础变量：</p>
              <ul className="list-disc list-inside space-y-1">
                <li><strong>颜色</strong>：品牌色、背景色、文本色等</li>
                <li><strong>字体</strong>：字体族、字号、字重</li>
                <li><strong>间距</strong>：元素间距、内边距</li>
                <li><strong>圆角</strong>：按钮、卡片圆角</li>
                <li><strong>阴影</strong>：层级阴影</li>
              </ul>
              <p className="mt-4">保存后可导出为 CSS 变量文件，用于开发。</p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
