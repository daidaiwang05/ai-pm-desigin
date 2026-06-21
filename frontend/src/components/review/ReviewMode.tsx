"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { apiClient } from "@/api/client";

interface ReviewModeProps {
  iteration: {
    id: string;
    name: string;
    version: string;
    status: string;
  };
  pages: Array<{
    id: string;
    name: string;
    deviceType: string;
    viewportW: number;
    viewportH: number;
    bgColor: string;
    components: any[];
  }>;
  onClose: () => void;
}

interface ReviewStats {
  total: number;
  open: number;
  resolved: number;
  accepted: number;
  rejected: number;
  byTag: Record<string, number>;
}

export function ReviewMode({ iteration, pages, onClose }: ReviewModeProps) {
  const [currentPageIndex, setCurrentPageIndex] = useState(0);
  const [showAnnotations, setShowAnnotations] = useState(true);
  const [stats, setStats] = useState<ReviewStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadStats();
  }, [iteration.id]);

  const loadStats = async () => {
    try {
      const token = localStorage.getItem("auth_token");
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api/v1"}/iterations/${iteration.id}/annotations/stats`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
      const result = await response.json();
      if (result.success) {
        setStats(result.data);
      }
    } catch (error) {
      console.error("Failed to load stats:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const currentPage = pages[currentPageIndex];

  return (
    <div className="h-screen flex flex-col bg-gray-900">
      {/* Header */}
      <header className="h-14 bg-gray-800 text-white flex items-center px-4 justify-between">
        <div className="flex items-center space-x-4">
          <button
            onClick={onClose}
            className="px-3 py-1.5 bg-gray-700 rounded hover:bg-gray-600 text-sm"
          >
            ← 退出评审
          </button>
          <div className="h-6 w-px bg-gray-600" />
          <h1 className="font-semibold">{iteration.name}</h1>
          <span className="text-sm text-gray-400">v{iteration.version}</span>
        </div>

        <div className="flex items-center space-x-4">
          <button
            onClick={() => setShowAnnotations(!showAnnotations)}
            className={`px-3 py-1.5 rounded text-sm ${
              showAnnotations
                ? "bg-blue-600 text-white"
                : "bg-gray-700 text-gray-300 hover:bg-gray-600"
            }`}
          >
            {showAnnotations ? "隐藏标注" : "显示标注"}
          </button>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar - Page List & Stats */}
        <aside className="w-64 bg-gray-800 text-white overflow-y-auto">
          {/* Review Stats */}
          {stats && (
            <div className="p-4 border-b border-gray-700">
              <h3 className="text-sm font-medium mb-3">评审进度</h3>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-400">总标注</span>
                  <span>{stats.total}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-400">待评审</span>
                  <span className="text-yellow-400">{stats.open}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-400">已解决</span>
                  <span className="text-green-400">{stats.resolved}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-400">已确认</span>
                  <span className="text-blue-400">{stats.accepted}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-400">已拒绝</span>
                  <span className="text-red-400">{stats.rejected}</span>
                </div>
              </div>

              {/* Progress Bar */}
              {stats.total > 0 && (
                <div className="mt-3">
                  <div className="flex justify-between text-xs text-gray-400 mb-1">
                    <span>完成度</span>
                    <span>
                      {Math.round(
                        ((stats.resolved + stats.accepted) / stats.total) * 100
                      )}
                      %
                    </span>
                  </div>
                  <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-green-500"
                      style={{
                        width: `${
                          ((stats.resolved + stats.accepted) / stats.total) * 100
                        }%`,
                      }}
                    />
                  </div>
                </div>
              )}

              {/* By Tag */}
              {stats.byTag && Object.keys(stats.byTag).length > 0 && (
                <div className="mt-3 pt-3 border-t border-gray-700">
                  <div className="text-xs text-gray-400 mb-2">按类型</div>
                  <div className="flex space-x-2">
                    {stats.byTag.R1 && (
                      <span className="px-2 py-0.5 bg-red-900 text-red-300 rounded text-xs">
                        R1: {stats.byTag.R1}
                      </span>
                    )}
                    {stats.byTag.R2 && (
                      <span className="px-2 py-0.5 bg-orange-900 text-orange-300 rounded text-xs">
                        R2: {stats.byTag.R2}
                      </span>
                    )}
                    {stats.byTag.R3 && (
                      <span className="px-2 py-0.5 bg-gray-700 text-gray-300 rounded text-xs">
                        R3: {stats.byTag.R3}
                      </span>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Page List */}
          <div className="p-4">
            <h3 className="text-sm font-medium mb-3">页面列表</h3>
            <div className="space-y-1">
              {pages.map((page, index) => (
                <button
                  key={page.id}
                  onClick={() => setCurrentPageIndex(index)}
                  className={`w-full text-left px-3 py-2 rounded text-sm ${
                    currentPageIndex === index
                      ? "bg-blue-600 text-white"
                      : "text-gray-300 hover:bg-gray-700"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span>{page.name}</span>
                    <span className="text-xs text-gray-400">
                      {page.components.length} 组件
                    </span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </aside>

        {/* Main Content - Canvas Preview */}
        <main className="flex-1 overflow-auto p-8 flex items-center justify-center">
          {currentPage && (
            <div
              className="relative bg-white shadow-2xl"
              style={{
                width: currentPage.viewportW,
                height: currentPage.viewportH,
                backgroundColor: currentPage.bgColor,
                transform: "scale(0.8)",
                transformOrigin: "top center",
              }}
            >
              {/* Render components */}
              {currentPage.components.map((comp) => (
                <div
                  key={comp.id}
                  className="absolute"
                  style={{
                    left: comp.layout.x,
                    top: comp.layout.y,
                    width: comp.layout.w,
                    height: comp.layout.h,
                  }}
                >
                  <ReviewComponent
                    component={comp}
                    showAnnotations={showAnnotations}
                  />
                </div>
              ))}
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

function ReviewComponent({
  component,
  showAnnotations,
}: {
  component: any;
  showAnnotations: boolean;
}) {
  const { componentType, props, annotations } = component;

  const renderComponent = () => {
    switch (componentType) {
      case "Text":
        return (
          <div
            style={{
              fontSize: props.fontSize || 14,
              fontWeight: props.fontWeight || "normal",
              color: props.color || "#000",
            }}
          >
            {props.content || "文本"}
          </div>
        );

      case "Button":
        return (
          <button className="w-full h-full bg-blue-600 text-white rounded">
            {props.text || "按钮"}
          </button>
        );

      case "Input":
        return (
          <div className="w-full h-full border rounded px-3 py-2 bg-gray-50 text-gray-400">
            {props.placeholder || "输入框"}
          </div>
        );

      case "Card":
        return (
          <div className="w-full h-full border rounded-lg p-4 bg-white shadow-sm">
            {props.title && <h3 className="font-medium mb-2">{props.title}</h3>}
            {props.content && (
              <p className="text-sm text-gray-600">{props.content}</p>
            )}
          </div>
        );

      default:
        return (
          <div className="w-full h-full bg-gray-100 border border-dashed border-gray-300 rounded flex items-center justify-center text-xs text-gray-400">
            {componentType}
          </div>
        );
    }
  };

  return (
    <div className="relative w-full h-full group">
      {renderComponent()}

      {/* Annotations */}
      {showAnnotations && annotations?.length > 0 && (
        <div className="absolute -top-2 -right-2 flex flex-wrap gap-1 z-10">
          {annotations.map((anno: any) => {
            const tagColors: Record<string, string> = {
              R1: "bg-red-500",
              R2: "bg-orange-500",
              R3: "bg-gray-500",
            };
            return (
              <div
                key={anno.id}
                className={`px-1.5 py-0.5 rounded text-white text-xs cursor-pointer ${
                  tagColors[anno.tag || ""] || "bg-blue-500"
                }`}
                title={`${anno.tag || "标注"}: ${anno.content}`}
              >
                {anno.tag || "标注"}
              </div>
            );
          })}
        </div>
      )}

      {/* Hover tooltip for annotations */}
      {annotations?.length > 0 && (
        <div className="absolute left-0 top-full mt-1 bg-gray-900 text-white text-xs p-2 rounded shadow-lg opacity-0 group-hover:opacity-100 transition-opacity z-20 min-w-[200px]">
          {annotations.map((anno: any) => (
            <div key={anno.id} className="mb-1 last:mb-0">
              <span className="font-medium">{anno.tag || "标注"}:</span>{" "}
              {anno.content}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
