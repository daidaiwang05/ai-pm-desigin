"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import { Canvas } from "@/components/canvas/Canvas";
import { LeftPanel } from "@/components/editor/LeftPanel";
import { RightPanel } from "@/components/editor/RightPanel";
import { ComponentPanel } from "@/components/editor/ComponentPanel";
import { StatusBar } from "@/components/editor/StatusBar";
import { AnnotationPanel } from "@/components/annotation/AnnotationPanel";
import { AIAssistantPanel } from "@/components/ai/AIAssistantPanel";
import { useHistoryStore } from "@/stores/history";
import type { Page as PageType, Component, Iteration as IterationType } from "@/types/schema";

// 扩展 Page 类型以包含组件
interface PageWithComponents extends PageType {
  components: Component[];
  _count: {
    components: number;
    annotations: number;
  };
}

interface IterationWithPages extends IterationType {
  pages: PageWithComponents[];
}

export default function ProjectEditorPage() {
  const params = useParams();
  const [iteration, setIteration] = useState<IterationWithPages | null>(null);
  const [pages, setPages] = useState<PageWithComponents[]>([]);
  const [currentPage, setCurrentPage] = useState<PageWithComponents | null>(null);
  const [selectedComponent, setSelectedComponent] = useState<Component | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showAnnotations, setShowAnnotations] = useState(false);
  const [showAI, setShowAI] = useState(false);

  // History store for undo/redo
  const { undo, redo, canUndo, canRedo, clear: clearHistory } = useHistoryStore();

  const getToken = () => localStorage.getItem("auth_token");

  const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api/v1";

  const handleResponse = async (response: Response) => {
    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error?.message || `请求失败 (${response.status})`);
    }
    if (!data.success) {
      throw new Error(data.error?.message || "请求失败");
    }
    return data;
  };

  const apiGet = async (url: string) => {
    const response = await fetch(`${API_BASE}${url}`, {
      headers: { Authorization: `Bearer ${getToken()}` },
    });
    return handleResponse(response);
  };

  const apiPost = async (url: string, data: any) => {
    const response = await fetch(`${API_BASE}${url}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${getToken()}`,
      },
      body: JSON.stringify(data),
    });
    return handleResponse(response);
  };

  const apiPatch = async (url: string, data: any) => {
    const response = await fetch(`${API_BASE}${url}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${getToken()}`,
      },
      body: JSON.stringify(data),
    });
    return handleResponse(response);
  };

  const apiDelete = async (url: string) => {
    const response = await fetch(`${API_BASE}${url}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${getToken()}` },
    });
    return handleResponse(response);
  };

  useEffect(() => {
    loadProjectData();
  }, [params.id]);

  const loadProjectData = async () => {
    try {
      const projectResult = await apiGet(`/projects/${params.id}`);
      if (!projectResult.data?.currentIteration) {
        setIsLoading(false);
        return;
      }

      const iterResult = await apiGet(
        `/iterations/${projectResult.data.currentIteration.id}`
      );
      if (iterResult.data) {
        setIteration(iterResult.data);
        setPages(iterResult.data.pages || []);

        if (iterResult.data.pages?.length > 0) {
          await loadPage(iterResult.data.pages[0].id);
        }
      }
    } catch (error) {
      console.error("Failed to load project data:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadPage = async (pageId: string) => {
    try {
      const result = await apiGet(`/pages/${pageId}`);
      if (result.data) {
        setCurrentPage(result.data);
        setSelectedComponent(null);
      }
    } catch (error) {
      console.error("Failed to load page:", error);
    }
  };

  const handlePageSelect = (pageId: string) => {
    loadPage(pageId);
  };

  const handleComponentSelect = (component: any) => {
    setSelectedComponent(component);
    if (component) {
      setShowAnnotations(true);
    }
  };

  const handleComponentUpdate = async (componentId: string, data: any) => {
    if (!currentPage) return;

    try {
      await apiPatch(`/components/${componentId}`, data);
      await loadPage(currentPage.id);
    } catch (error) {
      console.error("Failed to update component:", error);
    }
  };

  const handleComponentCreate = async (component: any) => {
    if (!currentPage) return;

    try {
      await apiPost(`/pages/${currentPage.id}/components`, component);
      await loadPage(currentPage.id);
    } catch (error) {
      console.error("Failed to create component:", error);
    }
  };

  const handleDeleteComponent = async () => {
    if (!selectedComponent || !currentPage) return;

    try {
      await apiDelete(`/components/${selectedComponent.id}`);
      setSelectedComponent(null);
      await loadPage(currentPage.id);
    } catch (error) {
      console.error("Failed to delete component:", error);
    }
  };

  // 视口切换
  const handleViewportChange = async (w: number, h: number, device: string) => {
    if (!currentPage) return;

    try {
      await apiPatch(`/pages/${currentPage.id}`, {
        viewportW: w,
        viewportH: h,
        deviceType: device,
      });
      await loadPage(currentPage.id);
    } catch (error) {
      console.error("Failed to update viewport:", error);
    }
  };

  // 页面管理
  const handlePageCreate = async () => {
    if (!iteration) return;

    try {
      const result = await apiPost(`/iterations/${iteration.id}/pages`, {
        name: `新页面 ${pages.length + 1}`,
        pageType: "screen",
        deviceType: "desktop",
        viewportW: 1440,
        viewportH: 900,
      });
      if (result.data) {
        await loadProjectData();
        await loadPage(result.data.id);
      }
    } catch (error) {
      console.error("Failed to create page:", error);
    }
  };

  const handlePageDuplicate = async (pageId: string) => {
    try {
      const result = await apiPost(`/pages/${pageId}/duplicate`, {});
      if (result.data) {
        await loadProjectData();
      }
    } catch (error) {
      console.error("Failed to duplicate page:", error);
    }
  };

  const handlePageDelete = async (pageId: string) => {
    try {
      await apiDelete(`/pages/${pageId}`);
      if (currentPage?.id === pageId) {
        setCurrentPage(null);
        setSelectedComponent(null);
      }
      await loadProjectData();
    } catch (error) {
      console.error("Failed to delete page:", error);
    }
  };

  const handlePageReorder = async (pageId: string, newIndex: number) => {
    try {
      await apiPatch(`/pages/${pageId}/reorder`, { sortOrder: newIndex });
      await loadProjectData();
    } catch (error) {
      console.error("Failed to reorder page:", error);
    }
  };

  const handlePageRename = async (pageId: string, newName: string) => {
    try {
      await apiPatch(`/pages/${pageId}`, { name: newName });
      await loadProjectData();
      if (currentPage?.id === pageId) {
        await loadPage(pageId);
      }
    } catch (error) {
      console.error("Failed to rename page:", error);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-muted-foreground">加载中...</div>
      </div>
    );
  }

  return (
    <div className="flex h-full">
      {/* Left Panel - Page Tree */}
      <LeftPanel
        pages={pages}
        currentPageId={currentPage?.id}
        onPageSelect={handlePageSelect}
        onPageCreate={handlePageCreate}
        onPageDuplicate={handlePageDuplicate}
        onPageDelete={handlePageDelete}
        onPageReorder={handlePageReorder}
        onPageRename={handlePageRename}
      />

      {/* Component Panel */}
      <ComponentPanel onComponentDragStart={() => {}} />

      {/* Center - Canvas */}
      <div className="flex-1 bg-gray-100 overflow-hidden">
        {/* Toolbar */}
        <div className="h-10 bg-white border-b flex items-center px-4 space-x-2">
          <button
            onClick={() => {
              const entry = undo();
              if (entry?.data?.componentId && entry.data.before) {
                handleComponentUpdate(entry.data.componentId, entry.data.before);
              }
            }}
            disabled={!canUndo()}
            className="p-1.5 rounded hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
            title="撤销 (Ctrl+Z)"
          >
            ↩️
          </button>
          <button
            onClick={() => {
              const entry = redo();
              if (entry?.data?.componentId && entry.data.after) {
                handleComponentUpdate(entry.data.componentId, entry.data.after);
              }
            }}
            disabled={!canRedo()}
            className="p-1.5 rounded hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
            title="重做 (Ctrl+Shift+Z)"
          >
            ↪️
          </button>
          <div className="w-px h-6 bg-gray-200" />
          <button
            onClick={() => setShowAnnotations(!showAnnotations)}
            className={`px-2 py-1 text-xs rounded ${
              showAnnotations ? "bg-blue-100 text-blue-700" : "hover:bg-gray-100"
            }`}
          >
            标注
          </button>
          <div className="w-px h-6 bg-gray-200" />
          <button
            onClick={() => setShowAI(!showAI)}
            className={`px-2 py-1 text-xs rounded ${
              showAI ? "bg-purple-100 text-purple-700" : "hover:bg-gray-100"
            }`}
          >
            🤖 AI 助手
          </button>
        </div>

        {/* Canvas */}
        {currentPage ? (
          <Canvas
            page={currentPage}
            components={currentPage.components || []}
            selectedComponent={selectedComponent}
            onComponentSelect={handleComponentSelect}
            onComponentUpdate={handleComponentUpdate}
            onComponentCreate={handleComponentCreate}
            onViewportChange={handleViewportChange}
          />
        ) : (
          <div className="flex items-center justify-center h-[calc(100%-40px)] text-muted-foreground">
            请选择或创建一个页面
          </div>
        )}
      </div>

      {/* AI Assistant Panel */}
      {showAI && (
        <div className="absolute right-4 top-14 z-50">
          <AIAssistantPanel
            currentPage={currentPage}
            onApplyGenerated={(generatedPages) => {
              // 应用生成的页面到当前项目
              console.log("Apply generated pages:", generatedPages);
              // TODO: 将生成的页面保存到后端
              setShowAI(false);
            }}
            onApplyRefined={(refinedPage) => {
              // 应用优化后的页面
              console.log("Apply refined page:", refinedPage);
              if (currentPage) {
                loadPage(currentPage.id);
              }
            }}
            onClose={() => setShowAI(false)}
          />
        </div>
      )}

      {/* Right Panel - Properties or Annotations */}
      {showAnnotations && selectedComponent && iteration ? (
        <AnnotationPanel
          componentId={selectedComponent.id}
          iterationId={iteration.id}
          pageId={currentPage!.id}
          onClose={() => setShowAnnotations(false)}
          onAnnotationCreated={() => {
            if (currentPage) {
              loadPage(currentPage.id);
            }
          }}
        />
      ) : (
        <RightPanel
          selectedComponent={selectedComponent}
          onComponentUpdate={handleComponentUpdate}
          pageId={currentPage?.id}
        />
      )}

      {/* Status Bar */}
      <StatusBar
        pageName={currentPage?.name}
        componentCount={currentPage?._count?.components || 0}
        canUndo={canUndo()}
        canRedo={canRedo()}
      />
    </div>
  );
}
