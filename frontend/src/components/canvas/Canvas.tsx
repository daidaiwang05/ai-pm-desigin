"use client";

import { useRef, useState, useCallback, useEffect, useMemo } from "react";
import { Stage, Layer, Rect, Text, Group, Line, Circle } from "react-konva";
import { ComponentRenderer } from "./ComponentRenderer";
import { AlignmentToolbar } from "@/components/editor/AlignmentToolbar";
import { Minimap } from "./Minimap";
import { useHistoryStore } from "@/stores/history";
import { useClipboardStore } from "@/stores/clipboard";
import { useSelectionStore } from "@/stores/selection";
import { useGroupsStore } from "@/stores/groups";
import { useKeyboard, SHORTCUTS } from "@/hooks/useKeyboard";
import { useThrottle } from "@/hooks/useThrottle";
import { useAlignmentGuides } from "@/hooks/useAlignmentGuides";
import { useGridSnap } from "@/hooks/useGridSnap";
import { useVirtualization } from "@/hooks/useVirtualization";
import { useAlignment } from "@/hooks/useAlignment";
import type { Component as ComponentType, Page } from "@/types/schema";

// 视口预设
const VIEWPORT_PRESETS = [
  { name: "桌面端", icon: "🖥", w: 1440, h: 900, device: "desktop" },
  { name: "平板", icon: "📱", w: 768, h: 1024, device: "tablet" },
  { name: "手机", icon: "📲", w: 375, h: 812, device: "mobile" },
];

interface CanvasProps {
  page: Pick<Page, 'id' | 'name' | 'viewportW' | 'viewportH' | 'bgColor'>;
  components: ComponentType[];
  selectedComponent: ComponentType | null;
  onComponentSelect: (component: ComponentType | null) => void;
  onComponentUpdate: (componentId: string, data: Partial<ComponentType>) => void;
  onComponentCreate: (component: Partial<ComponentType>) => void;
  onViewportChange?: (w: number, h: number, device: string) => void;
}

export function Canvas({
  page,
  components,
  selectedComponent,
  onComponentSelect,
  onComponentUpdate,
  onComponentCreate,
  onViewportChange,
}: CanvasProps) {
  const stageRef = useRef<any>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [stageSize, setStageSize] = useState({ width: 800, height: 600 });
  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [resizeState, setResizeState] = useState<{
    componentId: string;
    handle: string;
    startLayout: { x: number; y: number; w: number; h: number };
  } | null>(null);
  const [dragGhost, setDragGhost] = useState<{
    x: number;
    y: number;
    w: number;
    h: number;
    type: string;
  } | null>(null);
  const [snapIndicator, setSnapIndicator] = useState<{
    x: number;
    y: number;
    type: "grid" | "alignment";
  } | null>(null);
  const dragStartRef = useRef<Record<string, { x: number; y: number; w: number; h: number }>>({});

  // History store for undo/redo
  const { push: pushHistory, undo, redo, canUndo, canRedo } = useHistoryStore();

  // Clipboard store for copy/paste
  const { copy, paste, hasClipboard } = useClipboardStore();

  // Selection store for multi-select
  const {
    select: selectComponent,
    addToSelection,
    toggleSelection,
    selectAll,
    clearSelection,
    isSelected: isComponentSelected,
    getSelectedIds,
    selectedComponents,
  } = useSelectionStore();

  // Groups store
  const {
    createGroup,
    ungroupGroup,
    getGroupByComponent,
    isComponentInGroup,
    groups,
  } = useGroupsStore();

  // 对齐辅助线
  const { guides, calculateAlignment, clearGuides } = useAlignmentGuides();

  // 组件对齐
  const { calculateAlignment: calculateComponentAlignment } = useAlignment();

  // 网格吸附
  const { snapToGrid, enabled: gridSnapEnabled, toggleGridSnap } = useGridSnap({ gridSize: 20 });

  // 虚拟化（只渲染可见组件）
  const { filterVisibleComponents, getStats } = useVirtualization({
    viewportWidth: stageSize.width,
    viewportHeight: stageSize.height,
    scale,
    offsetX: position.x,
    offsetY: position.y,
    overscan: 300,
  });

  // 可见组件列表（memoized）
  const visibleComponents = useMemo(
    () => filterVisibleComponents(components),
    [components, filterVisibleComponents]
  );

  // 批量绘制优化：使用 ref 跟踪是否需要重绘
  const layerRef = useRef<any>(null);
  const needsDrawRef = useRef(false);

  // 触发批量绘制
  const requestDraw = useCallback(() => {
    if (!needsDrawRef.current) {
      needsDrawRef.current = true;
      requestAnimationFrame(() => {
        if (layerRef.current) {
          layerRef.current.batchDraw();
        }
        needsDrawRef.current = false;
      });
    }
  }, []);

  // 节流的组件更新（用于拖拽时的实时预览）
  const throttledUpdate = useThrottle((componentId: string, data: Partial<ComponentType>) => {
    onComponentUpdate(componentId, data);
  }, 16); // 约 60fps

  // 键盘快捷键
  useKeyboard([
    // 撤销/重做
    {
      ...SHORTCUTS.UNDO,
      handler: () => {
        const entry = undo();
        if (entry?.data?.componentId && entry.data.before) {
          onComponentUpdate(entry.data.componentId, entry.data.before);
        }
      },
    },
    {
      ...SHORTCUTS.REDO,
      handler: () => {
        const entry = redo();
        if (entry?.data?.componentId && entry.data.after) {
          onComponentUpdate(entry.data.componentId, entry.data.after);
        }
      },
    },
    {
      ...SHORTCUTS.REDO_ALT,
      handler: () => {
        const entry = redo();
        if (entry?.data?.componentId && entry.data.after) {
          onComponentUpdate(entry.data.componentId, entry.data.after);
        }
      },
    },
    // 删除组件
    {
      ...SHORTCUTS.DELETE,
      handler: () => {
        if (selectedComponent) {
          onComponentUpdate(selectedComponent.id, { deleted: true } as any);
        }
      },
    },
    {
      ...SHORTCUTS.DELETE_ALT,
      handler: () => {
        if (selectedComponent) {
          onComponentUpdate(selectedComponent.id, { deleted: true } as any);
        }
      },
    },
    // 复制/粘贴
    {
      ...SHORTCUTS.COPY,
      handler: () => {
        if (selectedComponent) {
          copy(selectedComponent);
        }
      },
    },
    {
      ...SHORTCUTS.PASTE,
      handler: () => {
        const pasted = paste();
        if (pasted) {
          onComponentCreate(pasted);
        }
      },
    },
    {
      ...SHORTCUTS.DUPLICATE,
      handler: () => {
        if (selectedComponent) {
          const duplicated = {
            ...selectedComponent,
            id: undefined,
            layout: {
              ...selectedComponent.layout,
              x: selectedComponent.layout.x + 20,
              y: selectedComponent.layout.y + 20,
            },
          };
          onComponentCreate(duplicated);
        }
      },
    },
    // 全选
    {
      ...SHORTCUTS.SELECT_ALL,
      handler: () => {
        selectAll(components);
      },
    },
    // 组合
    {
      ...SHORTCUTS.GROUP,
      handler: () => {
        const selectedIds = getSelectedIds();
        if (selectedIds.length >= 2) {
          const compsToGroup = components.filter((c) => selectedIds.includes(c.id));
          createGroup("", compsToGroup);
        }
      },
    },
    // 取消组合
    {
      ...SHORTCUTS.UNGROUP,
      handler: () => {
        if (selectedComponent) {
          const group = getGroupByComponent(selectedComponent.id);
          if (group) {
            ungroupGroup(group.id);
          }
        }
      },
    },
    // 方向键移动组件
    {
      ...SHORTCUTS.MOVE_UP,
      handler: () => {
        if (selectedComponent) {
          const step = 1;
          onComponentUpdate(selectedComponent.id, {
            layout: { ...selectedComponent.layout, y: selectedComponent.layout.y - step },
          });
        }
      },
    },
    {
      ...SHORTCUTS.MOVE_DOWN,
      handler: () => {
        if (selectedComponent) {
          const step = 1;
          onComponentUpdate(selectedComponent.id, {
            layout: { ...selectedComponent.layout, y: selectedComponent.layout.y + step },
          });
        }
      },
    },
    {
      ...SHORTCUTS.MOVE_LEFT,
      handler: () => {
        if (selectedComponent) {
          const step = 1;
          onComponentUpdate(selectedComponent.id, {
            layout: { ...selectedComponent.layout, x: selectedComponent.layout.x - step },
          });
        }
      },
    },
    {
      ...SHORTCUTS.MOVE_RIGHT,
      handler: () => {
        if (selectedComponent) {
          const step = 1;
          onComponentUpdate(selectedComponent.id, {
            layout: { ...selectedComponent.layout, x: selectedComponent.layout.x + step },
          });
        }
      },
    },
    // Shift + 方向键快速移动
    {
      ...SHORTCUTS.MOVE_UP_FAST,
      handler: () => {
        if (selectedComponent) {
          const step = 10;
          onComponentUpdate(selectedComponent.id, {
            layout: { ...selectedComponent.layout, y: selectedComponent.layout.y - step },
          });
        }
      },
    },
    {
      ...SHORTCUTS.MOVE_DOWN_FAST,
      handler: () => {
        if (selectedComponent) {
          const step = 10;
          onComponentUpdate(selectedComponent.id, {
            layout: { ...selectedComponent.layout, y: selectedComponent.layout.y + step },
          });
        }
      },
    },
    {
      ...SHORTCUTS.MOVE_LEFT_FAST,
      handler: () => {
        if (selectedComponent) {
          const step = 10;
          onComponentUpdate(selectedComponent.id, {
            layout: { ...selectedComponent.layout, x: selectedComponent.layout.x - step },
          });
        }
      },
    },
    {
      ...SHORTCUTS.MOVE_RIGHT_FAST,
      handler: () => {
        if (selectedComponent) {
          const step = 10;
          onComponentUpdate(selectedComponent.id, {
            layout: { ...selectedComponent.layout, x: selectedComponent.layout.x + step },
          });
        }
      },
    },
    // 缩放快捷键
    {
      ...SHORTCUTS.ZOOM_IN,
      handler: () => setScale(Math.min(scale * 1.2, 4)),
    },
    {
      ...SHORTCUTS.ZOOM_OUT,
      handler: () => setScale(Math.max(scale / 1.2, 0.25)),
    },
    {
      ...SHORTCUTS.ZOOM_RESET,
      handler: () => {
        setScale(1);
        setPosition({ x: 0, y: 0 });
      },
    },
  ]);

  // Update stage size on container resize
  useEffect(() => {
    const updateSize = () => {
      if (containerRef.current) {
        setStageSize({
          width: containerRef.current.offsetWidth,
          height: containerRef.current.offsetHeight,
        });
      }
    };

    updateSize();
    window.addEventListener("resize", updateSize);
    return () => window.removeEventListener("resize", updateSize);
  }, []);

  // Handle zoom with smooth animation (use ref to avoid stale closure)
  const scaleRef = useRef(scale);
  scaleRef.current = scale; // 保持 ref 同步
  const zoomAnimationRef = useRef<number | null>(null);
  const handleWheel = useCallback((e: any) => {
    e.evt.preventDefault();
    const scaleBy = 1.05;
    const oldScale = scaleRef.current;
    const newScale = e.evt.deltaY < 0 ? oldScale * scaleBy : oldScale / scaleBy;
    const clampedScale = Math.min(Math.max(newScale, 0.25), 4);

    // 使用 requestAnimationFrame 平滑缩放
    if (zoomAnimationRef.current) {
      cancelAnimationFrame(zoomAnimationRef.current);
    }
    zoomAnimationRef.current = requestAnimationFrame(() => {
      setScale(clampedScale);
    });
  }, []); // 不依赖 scale，使用 ref

  // 缩放以适应所有组件
  const handleZoomToFit = useCallback(() => {
    if (components.length === 0) {
      setScale(1);
      setPosition({ x: 0, y: 0 });
      return;
    }

    // 计算所有组件的边界
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    components.forEach((comp) => {
      const { x, y, w, h } = comp.layout;
      minX = Math.min(minX, x);
      minY = Math.min(minY, y);
      maxX = Math.max(maxX, x + w);
      maxY = Math.max(maxY, y + h);
    });

    // 添加边距
    const padding = 50;
    const contentWidth = maxX - minX + padding * 2;
    const contentHeight = maxY - minY + padding * 2;

    // 计算缩放比例
    const scaleX = stageSize.width / contentWidth;
    const scaleY = stageSize.height / contentHeight;
    const newScale = Math.min(Math.max(Math.min(scaleX, scaleY), 0.25), 2);

    // 计算居中位置
    const centerX = (minX + maxX) / 2;
    const centerY = (minY + maxY) / 2;
    const newX = stageSize.width / 2 - centerX * newScale;
    const newY = stageSize.height / 2 - centerY * newScale;

    setScale(newScale);
    setPosition({ x: newX, y: newY });
  }, [components, stageSize]);

  // 缩放以适应页面
  const handleZoomToPage = useCallback(() => {
    const scaleX = stageSize.width / page.viewportW;
    const scaleY = stageSize.height / page.viewportH;
    const newScale = Math.min(Math.max(Math.min(scaleX, scaleY) * 0.9, 0.25), 2);

    const newX = (stageSize.width - page.viewportW * newScale) / 2;
    const newY = (stageSize.height - page.viewportH * newScale) / 2;

    setScale(newScale);
    setPosition({ x: newX, y: newY });
  }, [stageSize, page]);

  // Handle stage click (deselect)
  const handleStageClick = useCallback((e: any) => {
    if (e.target === e.target.getStage()) {
      onComponentSelect(null);
      clearSelection();
    }
  }, [onComponentSelect, clearSelection]);

  // Grid style options
  const [gridStyle, setGridStyle] = useState<"lines" | "dots" | "cross">("lines");

  // Grid lines (memoized for performance, only render visible area)
  const gridSize = 20;
  const maxX = page.viewportW;
  const maxY = page.viewportH;

  const gridLines = useMemo(() => {
    const lines = [];

    // 计算可见区域（考虑缩放和偏移）
    const visibleLeft = Math.max(0, Math.floor(-position.x / scale / gridSize) * gridSize);
    const visibleTop = Math.max(0, Math.floor(-position.y / scale / gridSize) * gridSize);
    const visibleRight = Math.min(maxX, Math.ceil((-position.x + stageSize.width) / scale / gridSize) * gridSize + gridSize);
    const visibleBottom = Math.min(maxY, Math.ceil((-position.y + stageSize.height) / scale / gridSize) * gridSize + gridSize);

    if (gridStyle === "lines") {
      // 线状网格
      for (let i = visibleLeft; i <= visibleRight; i += gridSize) {
        lines.push(
          <Line
            key={`v-${i}`}
            points={[i, 0, i, maxY]}
            stroke="#e5e7eb"
            strokeWidth={0.5}
          />
        );
      }
      for (let j = visibleTop; j <= visibleBottom; j += gridSize) {
        lines.push(
          <Line
            key={`h-${j}`}
            points={[0, j, maxX, j]}
            stroke="#e5e7eb"
            strokeWidth={0.5}
          />
        );
      }
    } else if (gridStyle === "dots") {
      // 点状网格
      for (let i = visibleLeft; i <= visibleRight; i += gridSize) {
        for (let j = visibleTop; j <= visibleBottom; j += gridSize) {
          lines.push(
            <Circle
              key={`dot-${i}-${j}`}
              x={i}
              y={j}
              radius={1.5}
              fill="#d1d5db"
            />
          );
        }
      }
    } else if (gridStyle === "cross") {
      // 十字网格
      for (let i = visibleLeft; i <= visibleRight; i += gridSize) {
        for (let j = visibleTop; j <= visibleBottom; j += gridSize) {
          const size = 4;
          lines.push(
            <Line
              key={`cross-h-${i}-${j}`}
              points={[i - size, j, i + size, j]}
              stroke="#d1d5db"
              strokeWidth={0.5}
            />
          );
          lines.push(
            <Line
              key={`cross-v-${i}-${j}`}
              points={[i, j - size, i, j + size]}
              stroke="#d1d5db"
              strokeWidth={0.5}
            />
          );
        }
      }
    }

    return lines;
  }, [maxX, maxY, gridSize, gridStyle, position, scale, stageSize]);

  // 处理组件对齐
  const handleAlign = useCallback(
    (alignment: { [componentId: string]: { x?: number; y?: number } }) => {
      Object.entries(alignment).forEach(([componentId, newPos]) => {
        const component = components.find((c) => c.id === componentId);
        if (component) {
          onComponentUpdate(componentId, {
            layout: {
              ...component.layout,
              ...newPos,
            },
          });
        }
      });
    },
    [components, onComponentUpdate]
  );

  return (
    <div ref={containerRef} className="w-full h-full overflow-hidden">
      {/* Alignment Toolbar (多选时显示) */}
      {selectedComponents.length >= 2 && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-10">
          <AlignmentToolbar
            selectedComponents={selectedComponents}
            onAlign={handleAlign}
            onSpacing={(axis, gap) => {
              // 按指定轴排序组件
              const sorted = [...selectedComponents].sort((a, b) =>
                axis === "x" ? a.layout.x - b.layout.x : a.layout.y - b.layout.y
              );

              // 从第二个组件开始调整位置
              for (let i = 1; i < sorted.length; i++) {
                const prev = sorted[i - 1];
                const curr = sorted[i];
                const newPos =
                  axis === "x"
                    ? { x: prev.layout.x + prev.layout.w + gap }
                    : { y: prev.layout.y + prev.layout.h + gap };
                onComponentUpdate(curr.id, {
                  layout: { ...curr.layout, ...newPos },
                });
              }
            }}
          />
        </div>
      )}

      {/* Main Toolbar */}
      <div className="absolute top-4 left-1/2 -translate-x-1/2 z-10 flex items-center space-x-1 bg-white rounded-lg shadow-sm border p-1">
        {/* Undo/Redo */}
        <button
          onClick={() => {
            const entry = undo();
            if (entry?.data?.componentId && entry.data.before) {
              onComponentUpdate(entry.data.componentId, entry.data.before);
            }
          }}
          disabled={!canUndo()}
          className="px-2 py-1 text-sm hover:bg-gray-100 rounded disabled:opacity-30 disabled:cursor-not-allowed"
          title="撤销 (Ctrl+Z)"
        >
          ↩
        </button>
        <button
          onClick={() => {
            const entry = redo();
            if (entry?.data?.componentId && entry.data.after) {
              onComponentUpdate(entry.data.componentId, entry.data.after);
            }
          }}
          disabled={!canRedo()}
          className="px-2 py-1 text-sm hover:bg-gray-100 rounded disabled:opacity-30 disabled:cursor-not-allowed"
          title="重做 (Ctrl+Shift+Z)"
        >
          ↪
        </button>

        <div className="w-px h-5 bg-gray-200 mx-1" />

        {/* Zoom controls */}
        <button
          onClick={() => setScale(Math.max(scale / 1.2, 0.25))}
          className="px-2 py-1 text-sm hover:bg-gray-100 rounded"
          title="缩小"
        >
          −
        </button>
        <span className="text-sm text-muted-foreground min-w-[50px] text-center">
          {Math.round(scale * 100)}%
        </span>
        <button
          onClick={() => setScale(Math.min(scale * 1.2, 4))}
          className="px-2 py-1 text-sm hover:bg-gray-100 rounded"
          title="放大"
        >
          +
        </button>
        <button
          onClick={handleZoomToPage}
          className="px-2 py-1 text-sm hover:bg-gray-100 rounded"
          title="适应页面"
        >
          ◻
        </button>
        <button
          onClick={handleZoomToFit}
          className="px-2 py-1 text-sm hover:bg-gray-100 rounded"
          title="适应内容"
        >
          ⊞
        </button>
        <button
          onClick={() => {
            setScale(1);
            setPosition({ x: 0, y: 0 });
          }}
          className="px-2 py-1 text-sm hover:bg-gray-100 rounded"
          title="重置视图"
        >
          ⊙
        </button>

        <div className="w-px h-5 bg-gray-200 mx-1" />

        {/* Grid snap toggle */}
        <button
          onClick={toggleGridSnap}
          className={`px-2 py-1 text-sm rounded transition-colors ${
            gridSnapEnabled
              ? "bg-blue-100 text-blue-700"
              : "hover:bg-gray-100 text-gray-600"
          }`}
          title={gridSnapEnabled ? "关闭网格吸附" : "开启网格吸附"}
        >
          #
        </button>

        {/* Grid style selector */}
        <div className="relative group">
          <button
            className="px-2 py-1 text-sm hover:bg-gray-100 rounded"
            title="网格样式"
          >
            ⊞
          </button>
          <div className="absolute top-full left-0 mt-1 bg-white rounded-lg shadow-lg border p-1 hidden group-hover:block z-20">
            {[
              { style: "lines" as const, icon: "⊞", label: "线状" },
              { style: "dots" as const, icon: "⋯", label: "点状" },
              { style: "cross" as const, icon: "⊕", label: "十字" },
            ].map((option) => (
              <button
                key={option.style}
                onClick={() => setGridStyle(option.style)}
                className={`w-full px-3 py-1.5 text-xs text-left rounded flex items-center space-x-2 ${
                  gridStyle === option.style
                    ? "bg-blue-50 text-blue-700"
                    : "hover:bg-gray-50"
                }`}
              >
                <span>{option.icon}</span>
                <span>{option.label}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="w-px h-5 bg-gray-200 mx-1" />

        {/* Viewport presets */}
        {VIEWPORT_PRESETS.map((preset) => (
          <button
            key={preset.device}
            onClick={() => onViewportChange?.(preset.w, preset.h, preset.device)}
            className={`px-2 py-1 text-sm rounded transition-colors ${
              page.viewportW === preset.w && page.viewportH === preset.h
                ? "bg-blue-100 text-blue-700"
                : "hover:bg-gray-100 text-gray-600"
            }`}
            title={`${preset.name} (${preset.w}×${preset.h})`}
          >
            {preset.icon}
          </button>
        ))}
      </div>

      {/* Viewport size indicator */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-10 px-3 py-1 bg-white/80 rounded-full text-xs text-muted-foreground border">
        {page.viewportW} × {page.viewportH}
      </div>

      {/* Component position tooltip (拖拽时显示) */}
      {selectedComponent && (
        <div className="absolute bottom-4 left-4 z-10 px-3 py-2 bg-white/90 rounded-lg text-xs border shadow-sm">
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-1.5">
              <span className="text-muted-foreground">X:</span>
              <span className="font-mono font-medium">{Math.round(selectedComponent.layout.x)}</span>
            </div>
            <div className="flex items-center space-x-1.5">
              <span className="text-muted-foreground">Y:</span>
              <span className="font-mono font-medium">{Math.round(selectedComponent.layout.y)}</span>
            </div>
            <div className="w-px h-3 bg-gray-300" />
            <div className="flex items-center space-x-1.5">
              <span className="text-muted-foreground">W:</span>
              <span className="font-mono font-medium">{Math.round(selectedComponent.layout.w)}</span>
            </div>
            <div className="flex items-center space-x-1.5">
              <span className="text-muted-foreground">H:</span>
              <span className="font-mono font-medium">{Math.round(selectedComponent.layout.h)}</span>
            </div>
            {gridSnapEnabled && (
              <>
                <div className="w-px h-3 bg-gray-300" />
                <span className="text-blue-500">网格吸附</span>
              </>
            )}
          </div>
        </div>
      )}

      {/* Resize tooltip */}
      {resizeState && (
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-20 px-4 py-2 bg-gray-900/90 text-white rounded-lg text-sm shadow-lg">
          <div className="flex items-center space-x-3">
            <span className="font-mono">
              {Math.round(
                components.find(c => c.id === resizeState.componentId)?.layout.w || 0
              )} × {Math.round(
                components.find(c => c.id === resizeState.componentId)?.layout.h || 0
              )}
            </span>
          </div>
        </div>
      )}

      {/* Minimap */}
      <Minimap
        components={components}
        pageWidth={page.viewportW}
        pageHeight={page.viewportH}
        viewportWidth={stageSize.width}
        viewportHeight={stageSize.height}
        scale={scale}
        position={position}
        onNavigate={(x, y) => setPosition({ x, y })}
        selectedComponentId={selectedComponent?.id}
      />

      {/* Drop zone for components from panel */}
      <div
        className="absolute inset-0 z-0"
        onDragOver={(e) => {
          e.preventDefault();
          e.dataTransfer.dropEffect = "copy";
        }}
        onDrop={(e) => {
          e.preventDefault();
          const componentType = e.dataTransfer.getData("componentType");
          if (!componentType) return;

          // 计算放置位置（考虑缩放和偏移）
          const rect = containerRef.current?.getBoundingClientRect();
          if (!rect) return;

          const x = (e.clientX - rect.left - position.x) / scale;
          const y = (e.clientY - rect.top - position.y) / scale;

          // 创建新组件
          onComponentCreate({
            componentType,
            name: componentType,
            props: {},
            layout: { x: Math.round(x), y: Math.round(y), w: 200, h: 40 },
          });
        }}
      />

      <Stage
        ref={stageRef}
        width={stageSize.width}
        height={stageSize.height}
        scaleX={scale}
        scaleY={scale}
        x={position.x}
        y={position.y}
        onWheel={handleWheel}
        onClick={handleStageClick}
        draggable={!resizeState}
        onDragStart={() => setIsDragging(true)}
        onDragEnd={(e) => {
          setIsDragging(false);
          setPosition({ x: e.target.x(), y: e.target.y() });
        }}
        onMouseMove={(e) => {
          if (!resizeState) return;
          const pos = e.target.getStage()?.getPointerPosition();
          if (!pos) return;

          const { componentId, handle, startLayout } = resizeState;
          const newX = (pos.x - position.x) / scale;
          const newY = (pos.y - position.y) / scale;

          const newLayout = { ...startLayout };

          // 根据手柄位置计算新尺寸
          if (handle.includes("e")) {
            newLayout.w = Math.max(20, newX - startLayout.x);
          }
          if (handle.includes("w")) {
            const newW = Math.max(20, startLayout.x + startLayout.w - newX);
            newLayout.x = startLayout.x + startLayout.w - newW;
            newLayout.w = newW;
          }
          if (handle.includes("s")) {
            newLayout.h = Math.max(20, newY - startLayout.y);
          }
          if (handle.includes("n")) {
            const newH = Math.max(20, startLayout.y + startLayout.h - newY);
            newLayout.y = startLayout.y + startLayout.h - newH;
            newLayout.h = newH;
          }

          // 应用网格吸附
          const snapped = snapToGrid(newLayout.x, newLayout.y);
          newLayout.x = snapped.x;
          newLayout.y = snapped.y;

          onComponentUpdate(componentId, { layout: newLayout });
        }}
        onMouseUp={() => {
          if (!resizeState) return;

          // 记录到历史
          const component = components.find(c => c.id === resizeState.componentId);
          if (component) {
            pushHistory({
              type: "update",
              description: `调整组件 "${component.name || component.componentType}" 大小`,
              data: {
                pageId: page.id,
                componentId: resizeState.componentId,
                before: { layout: resizeState.startLayout },
                after: { layout: component.layout },
              },
            });
          }

          setResizeState(null);
        }}
      >
        <Layer ref={layerRef}>
          {/* Page background */}
          <Rect
            x={0}
            y={0}
            width={page.viewportW}
            height={page.viewportH}
            fill={page.bgColor}
            shadowColor="black"
            shadowBlur={10}
            shadowOpacity={0.1}
            shadowOffsetX={2}
            shadowOffsetY={2}
          />

          {/* Grid */}
          {gridLines}

          {/* Alignment Guides */}
          {guides.map((guide, index) => (
            <Line
              key={`guide-${index}`}
              points={
                guide.type === "vertical"
                  ? [guide.position, guide.start, guide.position, guide.end]
                  : [guide.start, guide.position, guide.end, guide.position]
              }
              stroke="#3b82f6"
              strokeWidth={1}
              dash={[4, 4]}
              listening={false}
            />
          ))}

          {/* Group Boundaries */}
          {groups.map((group) => (
            <Group key={group.id}>
              <Rect
                x={group.bounds.x - 4}
                y={group.bounds.y - 4}
                width={group.bounds.w + 8}
                height={group.bounds.h + 8}
                stroke="#8b5cf6"
                strokeWidth={1}
                dash={[6, 3]}
                fill="transparent"
                listening={false}
              />
              <Text
                x={group.bounds.x - 4}
                y={group.bounds.y - 16}
                text={group.name}
                fontSize={10}
                fill="#8b5cf6"
                listening={false}
              />
            </Group>
          ))}

          {/* Drag ghost preview */}
          {dragGhost && (
            <Rect
              x={dragGhost.x}
              y={dragGhost.y}
              width={dragGhost.w}
              height={dragGhost.h}
              fill="rgba(37, 99, 235, 0.1)"
              stroke="#2563eb"
              strokeWidth={1}
              dash={[4, 4]}
              cornerRadius={4}
              listening={false}
            />
          )}

          {/* Snap indicator */}
          {snapIndicator && (
            <Group>
              {snapIndicator.type === "grid" ? (
                <Circle
                  x={snapIndicator.x}
                  y={snapIndicator.y}
                  radius={6}
                  fill="rgba(34, 197, 94, 0.3)"
                  stroke="#22c55e"
                  strokeWidth={1}
                  listening={false}
                />
              ) : (
                <Rect
                  x={snapIndicator.x - 4}
                  y={snapIndicator.y - 4}
                  width={8}
                  height={8}
                  fill="rgba(59, 130, 246, 0.3)"
                  stroke="#3b82f6"
                  strokeWidth={1}
                  cornerRadius={1}
                  listening={false}
                />
              )}
            </Group>
          )}

          {/* Components (虚拟化：只渲染可见组件) */}
          {visibleComponents.map((component) => (
            <ComponentRenderer
              key={component.id}
              component={component}
              isSelected={selectedComponent?.id === component.id || isComponentSelected(component.id)}
              isDragging={dragStartRef.current[component.id] !== undefined}
              onSelect={(e) => {
                // Shift+点击：多选
                if (e?.shiftKey) {
                  toggleSelection(component);
                  onComponentSelect(component);
                } else {
                  selectComponent(component);
                  onComponentSelect(component);
                }
              }}
              onDragStart={() => {
                // 记录拖拽前的位置
                dragStartRef.current[component.id] = { ...component.layout };
                // 显示拖拽幽灵
                setDragGhost({
                  x: component.layout.x,
                  y: component.layout.y,
                  w: component.layout.w,
                  h: component.layout.h,
                  type: component.componentType,
                });
              }}
              onDragMove={(e) => {
                // 先应用网格吸附
                let proposedX = e.target.x();
                let proposedY = e.target.y();

                // 边界约束（不允许拖出画布）
                proposedX = Math.max(0, Math.min(proposedX, page.viewportW - component.layout.w));
                proposedY = Math.max(0, Math.min(proposedY, page.viewportH - component.layout.h));

                // 应用网格吸附
                const snapped = snapToGrid(proposedX, proposedY);
                proposedX = snapped.x;
                proposedY = snapped.y;

                // 计算对齐位置
                const aligned = calculateAlignment(
                  component,
                  components,
                  proposedX,
                  proposedY
                );

                // 检测是否发生了吸附
                const didSnap = snapped.snapped || aligned.x !== proposedX || aligned.y !== proposedY;
                if (didSnap) {
                  setSnapIndicator({
                    x: aligned.x,
                    y: aligned.y,
                    type: snapped.snapped ? "grid" : "alignment",
                  });
                } else {
                  setSnapIndicator(null);
                }

                // 如果有吸附，更新位置
                if (aligned.x !== proposedX || aligned.y !== proposedY) {
                  e.target.x(aligned.x);
                  e.target.y(aligned.y);
                }

                // 更新幽灵位置
                setDragGhost(prev => prev ? {
                  ...prev,
                  x: aligned.x,
                  y: aligned.y,
                } : null);

                // 拖拽过程中使用节流更新（实时预览）
                throttledUpdate(component.id, {
                  layout: {
                    ...component.layout,
                    x: aligned.x,
                    y: aligned.y,
                  },
                });
              }}
              onDragEnd={(e) => {
                const newLayout = {
                  ...component.layout,
                  x: e.target.x(),
                  y: e.target.y(),
                };

                // 清除辅助线、幽灵和吸附指示器
                clearGuides();
                setDragGhost(null);
                setSnapIndicator(null);

                // 记录到历史
                const beforeLayout = dragStartRef.current[component.id];
                if (beforeLayout) {
                  pushHistory({
                    type: "move",
                    description: `移动组件 "${component.name || component.componentType}"`,
                    data: {
                      pageId: page.id,
                      componentId: component.id,
                      before: { layout: beforeLayout },
                      after: { layout: newLayout },
                    },
                  });
                  delete dragStartRef.current[component.id];
                }

                onComponentUpdate(component.id, { layout: newLayout });
              }}
              onResizeStart={(handle) => {
                // 开始调整大小（阶段级别处理）
                setResizeState({
                  componentId: component.id,
                  handle,
                  startLayout: { ...component.layout },
                });
              }}
            />
          ))}
        </Layer>
      </Stage>
    </div>
  );
}
