"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

// ============================================
// 类型定义
// ============================================

interface AnnotationHistory {
  id: string;
  action: string;
  oldValue?: string;
  newValue?: string;
  userId: string;
  userName: string;
  createdAt: string;
}

interface Annotation {
  id: string;
  componentId: string;
  annotationType: string;
  content: string;
  status: string;
  priority: number;
  tag?: string;
  color: string;
  creator: {
    id: string;
    name: string;
    avatarUrl?: string;
  };
  comments: Array<{
    id: string;
    content: string;
    user: {
      id: string;
      name: string;
      avatarUrl?: string;
    };
    createdAt: string;
  }>;
  history?: AnnotationHistory[];
  createdAt: string;
  updatedAt: string;
}

interface AnnotationPanelProps {
  componentId: string;
  iterationId: string;
  pageId: string;
  onClose: () => void;
  onAnnotationCreated?: () => void;
}

// 筛选选项
const FILTER_OPTIONS = [
  { value: "all", label: "全部", icon: "📋" },
  { value: "R1", label: "R1 必须", icon: "🔴", color: "bg-red-100 text-red-800" },
  { value: "R2", label: "R2 期望", icon: "🟠", color: "bg-orange-100 text-orange-800" },
  { value: "R3", label: "R3 可选", icon: "⚪", color: "bg-gray-100 text-gray-800" },
];

const STATUS_OPTIONS = [
  { value: "all", label: "全部状态" },
  { value: "open", label: "待评审" },
  { value: "resolved", label: "已解决" },
  { value: "accepted", label: "已确认" },
  { value: "rejected", label: "已拒绝" },
];

// ============================================
// 组件定义
// ============================================

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api/v1";

export function AnnotationPanel({
  componentId,
  iterationId,
  pageId,
  onClose,
  onAnnotationCreated,
}: AnnotationPanelProps) {
  const [annotations, setAnnotations] = useState<Annotation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [newContent, setNewContent] = useState("");
  const [newTag, setNewTag] = useState<string>("");
  const [newComment, setNewComment] = useState("");
  const [activeAnnotation, setActiveAnnotation] = useState<string | null>(null);

  // 筛选状态
  const [filterTag, setFilterTag] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [showHistory, setShowHistory] = useState<string | null>(null);

  useEffect(() => {
    loadAnnotations();
  }, [componentId]);

  const loadAnnotations = async () => {
    try {
      const token = localStorage.getItem("auth_token");
      const response = await fetch(
        `${API_BASE}/iterations/${iterationId}/annotations?componentId=${componentId}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
      const result = await response.json();
      if (result.success) {
        setAnnotations(result.data);
      }
    } catch (error) {
      console.error("Failed to load annotations:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateAnnotation = async () => {
    if (!newContent.trim()) return;

    try {
      const token = localStorage.getItem("auth_token");
      const response = await fetch(
        `${API_BASE}/annotations`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            componentId,
            pageId,
            iterationId,
            content: newContent,
            tag: newTag || undefined,
            annotationType: "requirement",
          }),
        }
      );
      const result = await response.json();
      if (result.success) {
        setNewContent("");
        setNewTag("");
        setShowCreate(false);
        await loadAnnotations();
        onAnnotationCreated?.();
      }
    } catch (error) {
      console.error("Failed to create annotation:", error);
    }
  };

  const handleUpdateStatus = async (annotationId: string, status: string) => {
    try {
      const token = localStorage.getItem("auth_token");
      const response = await fetch(
        `${API_BASE}/annotations/${annotationId}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ status }),
        }
      );
      const result = await response.json();
      if (result.success) {
        await loadAnnotations();
      }
    } catch (error) {
      console.error("Failed to update annotation:", error);
    }
  };

  const handleAddComment = async (annotationId: string) => {
    if (!newComment.trim()) return;

    try {
      const token = localStorage.getItem("auth_token");
      const response = await fetch(
        `${API_BASE}/annotations/${annotationId}/comments`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ content: newComment }),
        }
      );
      const result = await response.json();
      if (result.success) {
        setNewComment("");
        await loadAnnotations();
      }
    } catch (error) {
      console.error("Failed to add comment:", error);
    }
  };

  const handleDeleteAnnotation = async (annotationId: string) => {
    if (!confirm("确定要删除这条标注吗？")) return;

    try {
      const token = localStorage.getItem("auth_token");
      const response = await fetch(
        `${API_BASE}/annotations/${annotationId}`,
        {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
      const result = await response.json();
      if (result.success) {
        await loadAnnotations();
      }
    } catch (error) {
      console.error("Failed to delete annotation:", error);
    }
  };

  // 筛选标注
  const filteredAnnotations = annotations.filter((anno) => {
    if (filterTag !== "all" && anno.tag !== filterTag) return false;
    if (filterStatus !== "all" && anno.status !== filterStatus) return false;
    return true;
  });

  // 统计
  const stats = {
    total: annotations.length,
    R1: annotations.filter((a) => a.tag === "R1").length,
    R2: annotations.filter((a) => a.tag === "R2").length,
    R3: annotations.filter((a) => a.tag === "R3").length,
    open: annotations.filter((a) => a.status === "open").length,
    resolved: annotations.filter((a) => a.status === "resolved").length,
  };

  const getTagColor = (tag?: string) => {
    switch (tag) {
      case "R1": return "bg-red-100 text-red-800";
      case "R2": return "bg-orange-100 text-orange-800";
      case "R3": return "bg-gray-100 text-gray-800";
      default: return "bg-blue-100 text-blue-800";
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "open": return "bg-gray-100 text-gray-800";
      case "resolved": return "bg-green-100 text-green-800";
      case "accepted": return "bg-blue-100 text-blue-800";
      case "rejected": return "bg-red-100 text-red-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case "open": return "待评审";
      case "resolved": return "已解决";
      case "accepted": return "已确认";
      case "rejected": return "已拒绝";
      default: return status;
    }
  };

  return (
    <div className="w-80 bg-white border-l flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b flex items-center justify-between">
        <div>
          <h3 className="font-semibold">需求标注</h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            {stats.total} 个标注 · {stats.open} 待评审
          </p>
        </div>
        <button
          onClick={onClose}
          className="p-1 hover:bg-gray-100 rounded text-muted-foreground"
        >
          ✕
        </button>
      </div>

      {/* Filters */}
      <div className="p-3 border-b space-y-2">
        {/* Tag Filter */}
        <div className="flex space-x-1">
          {FILTER_OPTIONS.map((option) => (
            <button
              key={option.value}
              onClick={() => setFilterTag(option.value)}
              className={`px-2 py-1 rounded text-xs transition-colors ${
                filterTag === option.value
                  ? option.color || "bg-blue-100 text-blue-800"
                  : "bg-gray-50 text-gray-600 hover:bg-gray-100"
              }`}
            >
              {option.icon} {option.label}
              {option.value !== "all" && (
                <span className="ml-1">
                  {stats[option.value as keyof typeof stats] || 0}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Status Filter */}
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="w-full h-7 rounded border text-xs px-2"
        >
          {STATUS_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>

      {/* Create Button */}
      <div className="p-3 border-b">
        <Button
          onClick={() => setShowCreate(!showCreate)}
          variant="outline"
          size="sm"
          className="w-full"
        >
          + 添加标注
        </Button>
      </div>

      {/* Create Form */}
      {showCreate && (
        <div className="p-3 border-b space-y-3">
          <div>
            <Label className="text-xs">标注类型</Label>
            <div className="flex space-x-2 mt-1">
              {["R1", "R2", "R3"].map((tag) => (
                <button
                  key={tag}
                  onClick={() => setNewTag(newTag === tag ? "" : tag)}
                  className={`px-3 py-1 rounded text-sm ${
                    newTag === tag
                      ? getTagColor(tag)
                      : "bg-gray-50 text-gray-600 hover:bg-gray-100"
                  }`}
                >
                  {tag}
                </button>
              ))}
            </div>
          </div>
          <div>
            <Label className="text-xs">标注内容</Label>
            <textarea
              value={newContent}
              onChange={(e) => setNewContent(e.target.value)}
              placeholder="输入需求标注内容..."
              className="w-full mt-1 p-2 border rounded text-sm resize-none"
              rows={3}
            />
          </div>
          <div className="flex space-x-2">
            <Button
              onClick={handleCreateAnnotation}
              size="sm"
              disabled={!newContent.trim()}
            >
              保存
            </Button>
            <Button
              onClick={() => setShowCreate(false)}
              variant="ghost"
              size="sm"
            >
              取消
            </Button>
          </div>
        </div>
      )}

      {/* Annotations List */}
      <div className="flex-1 overflow-y-auto">
        {isLoading ? (
          <div className="p-4 text-center text-sm text-muted-foreground">
            加载中...
          </div>
        ) : filteredAnnotations.length === 0 ? (
          <div className="p-4 text-center text-sm text-muted-foreground">
            {filterTag !== "all" || filterStatus !== "all"
              ? "没有匹配的标注"
              : "暂无标注"}
          </div>
        ) : (
          <div className="divide-y">
            {filteredAnnotations.map((annotation) => (
              <div key={annotation.id} className="p-3">
                {/* Annotation Header */}
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center space-x-2">
                    {annotation.tag && (
                      <span
                        className={`px-2 py-0.5 rounded text-xs font-medium ${getTagColor(
                          annotation.tag
                        )}`}
                      >
                        {annotation.tag}
                      </span>
                    )}
                    <span
                      className={`px-2 py-0.5 rounded text-xs ${getStatusColor(
                        annotation.status
                      )}`}
                    >
                      {getStatusText(annotation.status)}
                    </span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <button
                      onClick={() =>
                        setShowHistory(
                          showHistory === annotation.id ? null : annotation.id
                        )
                      }
                      className="text-xs text-muted-foreground hover:text-blue-500"
                      title="查看变更历史"
                    >
                      📜
                    </button>
                    <button
                      onClick={() => handleDeleteAnnotation(annotation.id)}
                      className="text-xs text-muted-foreground hover:text-red-500"
                      title="删除标注"
                    >
                      🗑
                    </button>
                  </div>
                </div>

                {/* Content */}
                <p className="text-sm mb-2">{annotation.content}</p>

                {/* Creator */}
                <div className="text-xs text-muted-foreground mb-2">
                  {annotation.creator.name} ·{" "}
                  {new Date(annotation.createdAt).toLocaleDateString("zh-CN")}
                  {annotation.updatedAt !== annotation.createdAt && (
                    <span> · 已编辑</span>
                  )}
                </div>

                {/* Actions */}
                <div className="flex space-x-2 mb-2">
                  {annotation.status === "open" && (
                    <>
                      <button
                        onClick={() =>
                          handleUpdateStatus(annotation.id, "resolved")
                        }
                        className="text-xs text-green-600 hover:underline"
                      >
                        标记解决
                      </button>
                      <button
                        onClick={() =>
                          handleUpdateStatus(annotation.id, "accepted")
                        }
                        className="text-xs text-blue-600 hover:underline"
                      >
                        确认
                      </button>
                      <button
                        onClick={() =>
                          handleUpdateStatus(annotation.id, "rejected")
                        }
                        className="text-xs text-red-600 hover:underline"
                      >
                        拒绝
                      </button>
                    </>
                  )}
                  {annotation.status !== "open" && (
                    <button
                      onClick={() =>
                        handleUpdateStatus(annotation.id, "open")
                      }
                      className="text-xs text-gray-600 hover:underline"
                    >
                      重新打开
                    </button>
                  )}
                </div>

                {/* History */}
                {showHistory === annotation.id && annotation.history && (
                  <div className="ml-2 pl-2 border-l mb-2 space-y-1">
                    <div className="text-xs font-medium text-muted-foreground">
                      变更历史
                    </div>
                    {annotation.history.map((entry) => (
                      <div key={entry.id} className="text-xs">
                        <span className="text-muted-foreground">
                          {new Date(entry.createdAt).toLocaleString("zh-CN")}
                        </span>
                        <span className="mx-1">·</span>
                        <span>{entry.userName}</span>
                        <span className="mx-1">·</span>
                        <span>{entry.action}</span>
                        {entry.oldValue && entry.newValue && (
                          <span className="text-muted-foreground">
                            {" "}
                            ({entry.oldValue} → {entry.newValue})
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {/* Comments */}
                {annotation.comments.length > 0 && (
                  <div className="ml-2 pl-2 border-l space-y-2">
                    {annotation.comments.map((comment) => (
                      <div key={comment.id} className="text-xs">
                        <span className="font-medium">
                          {comment.user.name}
                        </span>
                        <span className="text-muted-foreground">
                          {" "}
                          · {new Date(comment.createdAt).toLocaleDateString("zh-CN")}
                        </span>
                        <p className="mt-1">{comment.content}</p>
                      </div>
                    ))}
                  </div>
                )}

                {/* Add Comment */}
                <div className="mt-2 flex space-x-2">
                  <Input
                    value={
                      activeAnnotation === annotation.id ? newComment : ""
                    }
                    onChange={(e) => {
                      setActiveAnnotation(annotation.id);
                      setNewComment(e.target.value);
                    }}
                    onFocus={() => setActiveAnnotation(annotation.id)}
                    placeholder="添加评论..."
                    className="h-7 text-xs"
                  />
                  <Button
                    onClick={() => handleAddComment(annotation.id)}
                    size="sm"
                    className="h-7 px-2 text-xs"
                    disabled={
                      activeAnnotation !== annotation.id ||
                      !newComment.trim()
                    }
                  >
                    发送
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
