"use client";

import { useState, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface Page {
  id: string;
  name: string;
  slug?: string;
  sortOrder: number;
  _count: {
    components: number;
    annotations: number;
  };
}

interface PageTreeProps {
  pages: Page[];
  currentPageId?: string;
  onPageSelect: (pageId: string) => void;
  onPageReorder: (pageOrders: { pageId: string; sortOrder: number }[]) => void;
  onPageCreate: () => void;
  onPageDelete: (pageId: string) => void;
  onPageRename: (pageId: string, name: string) => void;
  onEnterReviewMode?: () => void;
}

export function PageTree({
  pages,
  currentPageId,
  onPageSelect,
  onPageReorder,
  onPageCreate,
  onPageDelete,
  onPageRename,
  onEnterReviewMode,
}: PageTreeProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [draggedPage, setDraggedPage] = useState<Page | null>(null);
  const [dragOverPage, setDragOverPage] = useState<Page | null>(null);
  const [editingPageId, setEditingPageId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");
  const [contextMenu, setContextMenu] = useState<{
    x: number;
    y: number;
    page: Page;
  } | null>(null);

  const dragCounter = useRef(0);

  const filteredPages = pages
    .filter((page) =>
      page.name.toLowerCase().includes(searchQuery.toLowerCase())
    )
    .sort((a, b) => a.sortOrder - b.sortOrder);

  const totalAnnotations = pages.reduce(
    (sum, page) => sum + page._count.annotations,
    0
  );

  // Drag handlers
  const handleDragStart = useCallback((e: React.DragEvent, page: Page) => {
    setDraggedPage(page);
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", page.id);
  }, []);

  const handleDragOver = useCallback(
    (e: React.DragEvent, page: Page) => {
      e.preventDefault();
      e.dataTransfer.dropEffect = "move";
      if (draggedPage && draggedPage.id !== page.id) {
        setDragOverPage(page);
      }
    },
    [draggedPage]
  );

  const handleDragLeave = useCallback(() => {
    setDragOverPage(null);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent, targetPage: Page) => {
      e.preventDefault();
      setDragOverPage(null);

      if (!draggedPage || draggedPage.id === targetPage.id) {
        return;
      }

      // 计算新的排序
      const sortedPages = [...pages].sort((a, b) => a.sortOrder - b.sortOrder);
      const draggedIndex = sortedPages.findIndex(
        (p) => p.id === draggedPage.id
      );
      const targetIndex = sortedPages.findIndex(
        (p) => p.id === targetPage.id
      );

      // 重新排序
      const newOrders: { pageId: string; sortOrder: number }[] = [];
      sortedPages.splice(draggedIndex, 1);
      sortedPages.splice(targetIndex, 0, draggedPage);

      sortedPages.forEach((page, index) => {
        newOrders.push({ pageId: page.id, sortOrder: index });
      });

      onPageReorder(newOrders);
      setDraggedPage(null);
    },
    [draggedPage, pages, onPageReorder]
  );

  const handleDragEnd = useCallback(() => {
    setDraggedPage(null);
    setDragOverPage(null);
  }, []);

  // Context menu
  const handleContextMenu = useCallback(
    (e: React.MouseEvent, page: Page) => {
      e.preventDefault();
      setContextMenu({ x: e.clientX, y: e.clientY, page });
    },
    []
  );

  // Rename
  const handleStartRename = useCallback((page: Page) => {
    setEditingPageId(page.id);
    setEditingName(page.name);
    setContextMenu(null);
  }, []);

  const handleFinishRename = useCallback(() => {
    if (editingPageId && editingName.trim()) {
      onPageRename(editingPageId, editingName.trim());
    }
    setEditingPageId(null);
    setEditingName("");
  }, [editingPageId, editingName, onPageRename]);

  // Delete
  const handleDelete = useCallback(
    (page: Page) => {
      if (confirm(`确定要删除页面 "${page.name}" 吗？`)) {
        onPageDelete(page.id);
      }
      setContextMenu(null);
    },
    [onPageDelete]
  );

  if (isCollapsed) {
    return (
      <div className="w-10 bg-white border-r flex flex-col items-center py-4 shrink-0">
        <button
          onClick={() => setIsCollapsed(false)}
          className="p-2 hover:bg-gray-100 rounded"
          title="展开面板"
        >
          →
        </button>
      </div>
    );
  }

  return (
    <div className="w-64 bg-white border-r flex flex-col shrink-0 relative">
      {/* Header */}
      <div className="p-4 border-b flex items-center justify-between">
        <h3 className="font-semibold text-sm">页面</h3>
        <button
          onClick={() => setIsCollapsed(true)}
          className="p-1 hover:bg-gray-100 rounded text-muted-foreground"
          title="收起面板"
        >
          ←
        </button>
      </div>

      {/* Search */}
      <div className="p-3 border-b">
        <Input
          placeholder="搜索页面..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="h-8 text-sm"
        />
      </div>

      {/* Page List */}
      <div className="flex-1 overflow-y-auto">
        {filteredPages.length === 0 ? (
          <div className="p-4 text-center text-sm text-muted-foreground">
            {searchQuery ? "没有匹配的页面" : "暂无页面"}
          </div>
        ) : (
          <div className="py-1">
            {filteredPages.map((page) => (
              <div
                key={page.id}
                draggable
                onDragStart={(e) => handleDragStart(e, page)}
                onDragOver={(e) => handleDragOver(e, page)}
                onDragLeave={handleDragLeave}
                onDrop={(e) => handleDrop(e, page)}
                onDragEnd={handleDragEnd}
                onContextMenu={(e) => handleContextMenu(e, page)}
                onClick={() => onPageSelect(page.id)}
                className={`w-full px-4 py-2 text-left text-sm hover:bg-gray-50 flex items-center justify-between cursor-move transition-colors ${
                  currentPageId === page.id ? "bg-blue-50 text-blue-600" : ""
                } ${
                  dragOverPage?.id === page.id
                    ? "border-t-2 border-blue-500"
                    : ""
                } ${
                  draggedPage?.id === page.id ? "opacity-50" : ""
                }`}
              >
                <div className="flex items-center space-x-2">
                  <span className="text-muted-foreground cursor-grab">
                    ⠿
                  </span>
                  {editingPageId === page.id ? (
                    <Input
                      value={editingName}
                      onChange={(e) => setEditingName(e.target.value)}
                      onBlur={handleFinishRename}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") handleFinishRename();
                        if (e.key === "Escape") setEditingPageId(null);
                      }}
                      className="h-6 text-sm py-0 px-1"
                      autoFocus
                      onClick={(e) => e.stopPropagation()}
                    />
                  ) : (
                    <span className="truncate">{page.name}</span>
                  )}
                </div>
                <div className="flex items-center space-x-2">
                  {page._count.annotations > 0 && (
                    <span className="px-1.5 py-0.5 bg-yellow-100 text-yellow-800 rounded text-xs">
                      {page._count.annotations}
                    </span>
                  )}
                  <span className="text-xs text-muted-foreground">
                    {page._count.components}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Review Mode Button */}
      {onEnterReviewMode && (
        <div className="p-3 border-t">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-muted-foreground">
              {totalAnnotations} 个标注待评审
            </span>
          </div>
          <Button
            onClick={onEnterReviewMode}
            variant="outline"
            size="sm"
            className="w-full"
          >
            🔍 进入评审模式
          </Button>
        </div>
      )}

      {/* Add Page Button */}
      <div className="p-3 border-t">
        <Button
          onClick={onPageCreate}
          variant="outline"
          size="sm"
          className="w-full"
        >
          + 新建页面
        </Button>
      </div>

      {/* Context Menu */}
      {contextMenu && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setContextMenu(null)}
          />
          <div
            className="fixed z-50 bg-white border rounded-lg shadow-lg py-1 min-w-[120px]"
            style={{ left: contextMenu.x, top: contextMenu.y }}
          >
            <button
              onClick={() => onPageSelect(contextMenu.page.id)}
              className="w-full px-3 py-1.5 text-sm text-left hover:bg-gray-100"
            >
              打开
            </button>
            <button
              onClick={() => handleStartRename(contextMenu.page)}
              className="w-full px-3 py-1.5 text-sm text-left hover:bg-gray-100"
            >
              重命名
            </button>
            <div className="h-px bg-gray-200 my-1" />
            <button
              onClick={() => handleDelete(contextMenu.page)}
              className="w-full px-3 py-1.5 text-sm text-left hover:bg-gray-100 text-red-600"
            >
              删除
            </button>
          </div>
        </>
      )}
    </div>
  );
}
