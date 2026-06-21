"use client";

import { useState, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface Page {
  id: string;
  name: string;
  slug?: string;
  sortOrder?: number;
  _count: {
    components: number;
    annotations: number;
  };
}

interface LeftPanelProps {
  pages: Page[];
  currentPageId?: string;
  onPageSelect: (pageId: string) => void;
  onPageReorder?: (pageId: string, newIndex: number) => void;
  onPageCreate?: () => void;
  onPageDuplicate?: (pageId: string) => void;
  onPageDelete?: (pageId: string) => void;
  onPageRename?: (pageId: string, newName: string) => void;
  onEnterReviewMode?: () => void;
}

interface ContextMenu {
  x: number;
  y: number;
  pageId: string;
  pageName: string;
}

export function LeftPanel({
  pages,
  currentPageId,
  onPageSelect,
  onPageReorder,
  onPageCreate,
  onPageDuplicate,
  onPageDelete,
  onPageRename,
  onEnterReviewMode,
}: LeftPanelProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [contextMenu, setContextMenu] = useState<ContextMenu | null>(null);
  const [draggedPage, setDraggedPage] = useState<string | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const [renameState, setRenameState] = useState<{ pageId: string; name: string } | null>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const filteredPages = pages.filter((page) =>
    page.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // 统计总标注数
  const totalAnnotations = pages.reduce(
    (sum, page) => sum + page._count.annotations,
    0
  );

  // 右键菜单
  const handleContextMenu = useCallback((e: React.MouseEvent, page: Page) => {
    e.preventDefault();
    e.stopPropagation();
    setContextMenu({
      x: e.clientX,
      y: e.clientY,
      pageId: page.id,
      pageName: page.name,
    });
  }, []);

  // 关闭右键菜单
  const closeContextMenu = useCallback(() => {
    setContextMenu(null);
  }, []);

  // 拖拽开始
  const handleDragStart = useCallback((e: React.DragEvent, pageId: string) => {
    setDraggedPage(pageId);
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", pageId);
  }, []);

  // 拖拽经过
  const handleDragOver = useCallback((e: React.DragEvent, index: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    setDragOverIndex(index);
  }, []);

  // 拖拽离开
  const handleDragLeave = useCallback(() => {
    setDragOverIndex(null);
  }, []);

  // 拖拽放下
  const handleDrop = useCallback((e: React.DragEvent, targetIndex: number) => {
    e.preventDefault();
    const pageId = e.dataTransfer.getData("text/plain");
    if (pageId && onPageReorder) {
      onPageReorder(pageId, targetIndex);
    }
    setDraggedPage(null);
    setDragOverIndex(null);
  }, [onPageReorder]);

  // 拖拽结束
  const handleDragEnd = useCallback(() => {
    setDraggedPage(null);
    setDragOverIndex(null);
  }, []);

  // 折叠状态
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
        <div className="mt-4 text-xs text-muted-foreground writing-mode-vertical">
          {pages.length} 页
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="w-64 bg-white border-r flex flex-col shrink-0">
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
        <div ref={listRef} className="flex-1 overflow-y-auto">
          {filteredPages.length === 0 ? (
            <div className="p-4 text-center text-sm text-muted-foreground">
              {searchQuery ? "没有匹配的页面" : "暂无页面"}
            </div>
          ) : (
            <div className="py-1">
              {filteredPages.map((page, index) => (
                <div
                  key={page.id}
                  draggable
                  onDragStart={(e) => handleDragStart(e, page.id)}
                  onDragOver={(e) => handleDragOver(e, index)}
                  onDragLeave={handleDragLeave}
                  onDrop={(e) => handleDrop(e, index)}
                  onDragEnd={handleDragEnd}
                  onClick={() => onPageSelect(page.id)}
                  onContextMenu={(e) => handleContextMenu(e, page)}
                  className={`
                    w-full px-4 py-2 text-left text-sm cursor-pointer
                    flex items-center justify-between
                    transition-colors duration-150
                    ${currentPageId === page.id ? "bg-blue-50 text-blue-600" : "hover:bg-gray-50"}
                    ${draggedPage === page.id ? "opacity-50" : ""}
                    ${dragOverIndex === index ? "border-t-2 border-blue-500" : ""}
                  `}
                >
                  <div className="flex items-center space-x-2 min-w-0">
                    {/* 拖拽手柄 */}
                    <span className="text-gray-300 cursor-grab active:cursor-grabbing select-none">
                      ⠿
                    </span>
                    <span className="text-muted-foreground">📄</span>
                    <span className="truncate">{page.name}</span>
                  </div>
                  <div className="flex items-center space-x-2 shrink-0">
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
      </div>

      {/* Context Menu */}
      {contextMenu && (
        <>
          {/* 背景遮罩 */}
          <div
            className="fixed inset-0 z-40"
            onClick={closeContextMenu}
          />
          {/* 菜单内容 */}
          <div
            className="fixed z-50 bg-white rounded-lg shadow-lg border py-1 min-w-[160px]"
            style={{ left: contextMenu.x, top: contextMenu.y }}
          >
            <div className="px-3 py-1.5 text-xs text-muted-foreground border-b">
              {contextMenu.pageName}
            </div>
            <button
              onClick={() => {
                onPageSelect(contextMenu.pageId);
                closeContextMenu();
              }}
              className="w-full px-3 py-2 text-sm text-left hover:bg-gray-50 flex items-center space-x-2"
            >
              <span>📝</span>
              <span>打开页面</span>
            </button>
            <button
              onClick={() => {
                onPageDuplicate?.(contextMenu.pageId);
                closeContextMenu();
              }}
              className="w-full px-3 py-2 text-sm text-left hover:bg-gray-50 flex items-center space-x-2"
            >
              <span>📋</span>
              <span>复制页面</span>
            </button>
            <button
              onClick={() => {
                setRenameState({ pageId: contextMenu.pageId, name: contextMenu.pageName });
                closeContextMenu();
              }}
              className="w-full px-3 py-2 text-sm text-left hover:bg-gray-50 flex items-center space-x-2"
            >
              <span>✏️</span>
              <span>重命名</span>
            </button>
            <div className="border-t my-1" />
            <button
              onClick={() => {
                if (confirm(`确定要删除页面 "${contextMenu.pageName}" 吗？`)) {
                  onPageDelete?.(contextMenu.pageId);
                }
                closeContextMenu();
              }}
              className="w-full px-3 py-2 text-sm text-left hover:bg-red-50 text-red-600 flex items-center space-x-2"
            >
              <span>🗑</span>
              <span>删除页面</span>
            </button>
          </div>
        </>
      )}

      {/* Rename Dialog */}
      {renameState && (
        <>
          <div
            className="fixed inset-0 z-50 bg-black/30"
            onClick={() => setRenameState(null)}
          />
          <div className="fixed z-50 top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white rounded-lg shadow-xl p-6 w-80">
            <h3 className="text-lg font-semibold mb-4">重命名页面</h3>
            <Input
              value={renameState.name}
              onChange={(e) =>
                setRenameState({ ...renameState, name: e.target.value })
              }
              onKeyDown={(e) => {
                if (e.key === "Enter" && renameState.name.trim()) {
                  onPageRename?.(renameState.pageId, renameState.name.trim());
                  setRenameState(null);
                }
                if (e.key === "Escape") {
                  setRenameState(null);
                }
              }}
              className="mb-4"
              autoFocus
              placeholder="输入页面名称"
            />
            <div className="flex justify-end space-x-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setRenameState(null)}
              >
                取消
              </Button>
              <Button
                size="sm"
                disabled={!renameState.name.trim()}
                onClick={() => {
                  onPageRename?.(renameState.pageId, renameState.name.trim());
                  setRenameState(null);
                }}
              >
                确认
              </Button>
            </div>
          </div>
        </>
      )}
    </>
  );
}
