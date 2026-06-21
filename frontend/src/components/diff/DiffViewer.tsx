"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";

interface DiffViewerProps {
  iterationId: string;
  snapshotId1?: string;
  snapshotId2?: string;
  onClose: () => void;
}

interface Snapshot {
  id: string;
  name: string;
  version: string;
  pageCount: number;
  componentCount: number;
  createdAt: string;
}

interface DiffResult {
  pages: {
    added: Array<{ id: string; name: string }>;
    removed: Array<{ id: string; name: string }>;
    modified: Array<{
      id: string;
      name: string;
      hasChanges: boolean;
      propertyChanges: Array<{
        property: string;
        before: any;
        after: any;
      }>;
      componentsAdded: number;
      componentsRemoved: number;
      componentsModified: number;
      componentDetails: Array<{
        type: "added" | "removed" | "modified";
        id: string;
        componentType: string;
        name?: string;
        changes?: Array<{
          path: string;
          before: any;
          after: any;
        }>;
      }>;
    }>;
  };
  summary: {
    pagesAdded: number;
    pagesRemoved: number;
    pagesModified: number;
    componentsAdded: number;
    componentsRemoved: number;
    componentsModified: number;
  };
}

export function DiffViewer({
  iterationId,
  snapshotId1,
  snapshotId2,
  onClose,
}: DiffViewerProps) {
  const [snapshots, setSnapshots] = useState<Snapshot[]>([]);
  const [selectedSnapshot1, setSelectedSnapshot1] = useState<string>(
    snapshotId1 || ""
  );
  const [selectedSnapshot2, setSelectedSnapshot2] = useState<string>(
    snapshotId2 || ""
  );
  const [diffResult, setDiffResult] = useState<DiffResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<"summary" | "pages" | "components">(
    "summary"
  );

  useEffect(() => {
    loadSnapshots();
  }, [iterationId]);

  const loadSnapshots = async () => {
    try {
      const token = localStorage.getItem("auth_token");
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api/v1"}/iterations/${iterationId}/snapshots`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
      const result = await response.json();
      if (result.success) {
        setSnapshots(result.data);
      }
    } catch (error) {
      console.error("Failed to load snapshots:", error);
    }
  };

  const handleCompare = async () => {
    if (!selectedSnapshot1 || !selectedSnapshot2) return;

    setIsLoading(true);
    try {
      const token = localStorage.getItem("auth_token");
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api/v1"}/snapshots/diff?snapshotId1=${selectedSnapshot1}&snapshotId2=${selectedSnapshot2}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
      const result = await response.json();
      if (result.success) {
        setDiffResult(result.data);
      }
    } catch (error) {
      console.error("Failed to compare snapshots:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleExport = async (format: "markdown" | "json") => {
    if (!diffResult) return;

    let content: string;
    let filename: string;
    let mimeType: string;

    if (format === "json") {
      content = JSON.stringify(diffResult, null, 2);
      filename = "diff-report.json";
      mimeType = "application/json";
    } else {
      content = generateMarkdownReport(diffResult);
      filename = "diff-report.md";
      mimeType = "text/markdown";
    }

    // 下载文件
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const generateMarkdownReport = (diff: DiffResult): string => {
    let md = `# 版本对比报告\n\n`;
    md += `> 生成时间: ${new Date().toLocaleString("zh-CN")}\n\n`;
    md += `## 概览\n\n`;
    md += `| 类型 | 新增 | 删除 | 修改 |\n`;
    md += `|------|------|------|------|\n`;
    md += `| 页面 | ${diff.summary.pagesAdded} | ${diff.summary.pagesRemoved} | ${diff.summary.pagesModified} |\n`;
    md += `| 组件 | ${diff.summary.componentsAdded} | ${diff.summary.componentsRemoved} | ${diff.summary.componentsModified} |\n\n`;

    if (diff.pages.added.length > 0) {
      md += `## 新增页面\n\n`;
      diff.pages.added.forEach((page) => {
        md += `- ${page.name}\n`;
      });
      md += `\n`;
    }

    if (diff.pages.removed.length > 0) {
      md += `## 删除页面\n\n`;
      diff.pages.removed.forEach((page) => {
        md += `- ~~${page.name}~~\n`;
      });
      md += `\n`;
    }

    if (diff.pages.modified.length > 0) {
      md += `## 修改页面\n\n`;
      diff.pages.modified.forEach((page) => {
        md += `### ${page.name}\n\n`;

        if (page.propertyChanges.length > 0) {
          md += `**属性变更:**\n\n`;
          md += `| 属性 | 旧值 | 新值 |\n`;
          md += `|------|------|------|\n`;
          page.propertyChanges.forEach((change) => {
            md += `| ${change.property} | ${JSON.stringify(change.before)} | ${JSON.stringify(change.after)} |\n`;
          });
          md += `\n`;
        }

        if (page.componentDetails.length > 0) {
          md += `**组件变更:**\n\n`;
          md += `- 新增: ${page.componentsAdded}\n`;
          md += `- 删除: ${page.componentsRemoved}\n`;
          md += `- 修改: ${page.componentsModified}\n\n`;

          page.componentDetails.forEach((comp) => {
            const icon =
              comp.type === "added"
                ? "🟢"
                : comp.type === "removed"
                ? "🔴"
                : "🔵";
            md += `${icon} ${comp.type === "added" ? "新增" : comp.type === "removed" ? "删除" : "修改"}: ${comp.name || comp.componentType}\n`;

            if (comp.changes && comp.changes.length > 0) {
              comp.changes.forEach((change) => {
                md += `  - ${change.path}: ${JSON.stringify(change.before)} → ${JSON.stringify(change.after)}\n`;
              });
            }
          });
          md += `\n`;
        }
      });
    }

    return md;
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center">
      <div className="bg-white rounded-lg shadow-xl w-[90vw] h-[80vh] flex flex-col">
        {/* Header */}
        <div className="p-4 border-b flex items-center justify-between">
          <h2 className="text-lg font-semibold">版本对比</h2>
          <div className="flex items-center space-x-2">
            {diffResult && (
              <>
                <Button
                  onClick={() => handleExport("markdown")}
                  variant="outline"
                  size="sm"
                >
                  导出 Markdown
                </Button>
                <Button
                  onClick={() => handleExport("json")}
                  variant="outline"
                  size="sm"
                >
                  导出 JSON
                </Button>
              </>
            )}
            <Button onClick={onClose} variant="ghost" size="sm">
              关闭
            </Button>
          </div>
        </div>

        {/* Snapshot Selection */}
        <div className="p-4 border-b bg-gray-50">
          <div className="flex items-center space-x-4">
            <div className="flex-1">
              <label className="text-sm font-medium mb-1 block">
                快照 1（旧版本）
              </label>
              <select
                value={selectedSnapshot1}
                onChange={(e) => setSelectedSnapshot1(e.target.value)}
                className="w-full p-2 border rounded text-sm"
              >
                <option value="">选择快照...</option>
                {snapshots.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} (v{s.version}) -{" "}
                    {new Date(s.createdAt).toLocaleDateString("zh-CN")}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex items-end">
              <Button
                onClick={handleCompare}
                disabled={
                  !selectedSnapshot1 || !selectedSnapshot2 || isLoading
                }
              >
                {isLoading ? "对比中..." : "开始对比"}
              </Button>
            </div>
            <div className="flex-1">
              <label className="text-sm font-medium mb-1 block">
                快照 2（新版本）
              </label>
              <select
                value={selectedSnapshot2}
                onChange={(e) => setSelectedSnapshot2(e.target.value)}
                className="w-full p-2 border rounded text-sm"
              >
                <option value="">选择快照...</option>
                {snapshots.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} (v{s.version}) -{" "}
                    {new Date(s.createdAt).toLocaleDateString("zh-CN")}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-hidden flex flex-col">
          {!diffResult ? (
            <div className="flex-1 flex items-center justify-center text-muted-foreground">
              选择两个快照进行对比
            </div>
          ) : (
            <>
              {/* Tabs */}
              <div className="border-b">
                <div className="flex">
                  <button
                    onClick={() => setActiveTab("summary")}
                    className={`px-4 py-2 text-sm font-medium border-b-2 ${
                      activeTab === "summary"
                        ? "border-blue-500 text-blue-600"
                        : "border-transparent text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    概览
                  </button>
                  <button
                    onClick={() => setActiveTab("pages")}
                    className={`px-4 py-2 text-sm font-medium border-b-2 ${
                      activeTab === "pages"
                        ? "border-blue-500 text-blue-600"
                        : "border-transparent text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    页面变更
                  </button>
                  <button
                    onClick={() => setActiveTab("components")}
                    className={`px-4 py-2 text-sm font-medium border-b-2 ${
                      activeTab === "components"
                        ? "border-blue-500 text-blue-600"
                        : "border-transparent text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    组件变更
                  </button>
                </div>
              </div>

              {/* Tab Content */}
              <div className="flex-1 overflow-y-auto p-4">
                {activeTab === "summary" && (
                  <div className="space-y-6">
                    <div className="grid grid-cols-3 gap-4">
                      <div className="bg-green-50 p-4 rounded-lg">
                        <div className="text-2xl font-bold text-green-600">
                          {diffResult.summary.pagesAdded}
                        </div>
                        <div className="text-sm text-green-800">
                          新增页面
                        </div>
                      </div>
                      <div className="bg-red-50 p-4 rounded-lg">
                        <div className="text-2xl font-bold text-red-600">
                          {diffResult.summary.pagesRemoved}
                        </div>
                        <div className="text-sm text-red-800">
                          删除页面
                        </div>
                      </div>
                      <div className="bg-blue-50 p-4 rounded-lg">
                        <div className="text-2xl font-bold text-blue-600">
                          {diffResult.summary.pagesModified}
                        </div>
                        <div className="text-sm text-blue-800">
                          修改页面
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-4">
                      <div className="bg-green-50 p-4 rounded-lg">
                        <div className="text-2xl font-bold text-green-600">
                          {diffResult.summary.componentsAdded}
                        </div>
                        <div className="text-sm text-green-800">
                          新增组件
                        </div>
                      </div>
                      <div className="bg-red-50 p-4 rounded-lg">
                        <div className="text-2xl font-bold text-red-600">
                          {diffResult.summary.componentsRemoved}
                        </div>
                        <div className="text-sm text-red-800">
                          删除组件
                        </div>
                      </div>
                      <div className="bg-blue-50 p-4 rounded-lg">
                        <div className="text-2xl font-bold text-blue-600">
                          {diffResult.summary.componentsModified}
                        </div>
                        <div className="text-sm text-blue-800">
                          修改组件
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {activeTab === "pages" && (
                  <div className="space-y-4">
                    {diffResult.pages.added.length > 0 && (
                      <div>
                        <h3 className="font-medium text-green-600 mb-2">
                          新增页面
                        </h3>
                        {diffResult.pages.added.map((page) => (
                          <div
                            key={page.id}
                            className="p-3 bg-green-50 rounded mb-2"
                          >
                            🟢 {page.name}
                          </div>
                        ))}
                      </div>
                    )}

                    {diffResult.pages.removed.length > 0 && (
                      <div>
                        <h3 className="font-medium text-red-600 mb-2">
                          删除页面
                        </h3>
                        {diffResult.pages.removed.map((page) => (
                          <div
                            key={page.id}
                            className="p-3 bg-red-50 rounded mb-2"
                          >
                            🔴 <span className="line-through">{page.name}</span>
                          </div>
                        ))}
                      </div>
                    )}

                    {diffResult.pages.modified.length > 0 && (
                      <div>
                        <h3 className="font-medium text-blue-600 mb-2">
                          修改页面
                        </h3>
                        {diffResult.pages.modified.map((page) => (
                          <div
                            key={page.id}
                            className="p-3 bg-blue-50 rounded mb-2"
                          >
                            <div className="font-medium">🔵 {page.name}</div>
                            <div className="text-sm text-muted-foreground mt-1">
                              新增 {page.componentsAdded} 组件 · 删除{" "}
                              {page.componentsRemoved} 组件 · 修改{" "}
                              {page.componentsModified} 组件
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {activeTab === "components" && (
                  <div className="space-y-4">
                    {diffResult.pages.modified.map((page) => (
                      <div key={page.id} className="border rounded-lg p-4">
                        <h3 className="font-medium mb-3">{page.name}</h3>
                        <div className="space-y-2">
                          {page.componentDetails.map((comp, index) => (
                            <div
                              key={index}
                              className="flex items-start space-x-2 p-2 bg-gray-50 rounded"
                            >
                              <span>
                                {comp.type === "added"
                                  ? "🟢"
                                  : comp.type === "removed"
                                  ? "🔴"
                                  : "🔵"}
                              </span>
                              <div className="flex-1">
                                <div className="font-medium text-sm">
                                  {comp.name || comp.componentType}
                                  <span className="ml-2 text-xs text-muted-foreground">
                                    ({comp.type === "added"
                                      ? "新增"
                                      : comp.type === "removed"
                                      ? "删除"
                                      : "修改"})
                                  </span>
                                </div>
                                {comp.changes && comp.changes.length > 0 && (
                                  <div className="mt-1 text-xs space-y-1">
                                    {comp.changes.map((change, i) => (
                                      <div key={i}>
                                        <span className="text-muted-foreground">
                                          {change.path}:
                                        </span>{" "}
                                        <span className="line-through text-red-500">
                                          {JSON.stringify(change.before)}
                                        </span>{" "}
                                        →{" "}
                                        <span className="text-green-500">
                                          {JSON.stringify(change.after)}
                                        </span>
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
