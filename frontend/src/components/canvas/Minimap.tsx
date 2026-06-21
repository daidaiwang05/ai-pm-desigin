"use client";

import { memo, useRef, useEffect, useCallback } from "react";
import type { Component } from "@/types/schema";

interface MinimapProps {
  components: Component[];
  pageWidth: number;
  pageHeight: number;
  viewportWidth: number;
  viewportHeight: number;
  scale: number;
  position: { x: number; y: number };
  onNavigate: (x: number, y: number) => void;
  selectedComponentId?: string;
}

const MINIMAP_WIDTH = 180;
const MINIMAP_HEIGHT = 120;
const MINIMAP_PADDING = 8;

export const Minimap = memo(function Minimap({
  components,
  pageWidth,
  pageHeight,
  viewportWidth,
  viewportHeight,
  scale,
  position,
  onNavigate,
  selectedComponentId,
}: MinimapProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const isDragging = useRef(false);

  // 计算缩放比例（防止除零）
  const safePageWidth = Math.max(pageWidth, 1);
  const safePageHeight = Math.max(pageHeight, 1);
  const scaleX = (MINIMAP_WIDTH - MINIMAP_PADDING * 2) / safePageWidth;
  const scaleY = (MINIMAP_HEIGHT - MINIMAP_PADDING * 2) / safePageHeight;
  const minimapScale = Math.min(scaleX, scaleY);

  // 绘制迷你地图
  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // 清空画布
    ctx.clearRect(0, 0, MINIMAP_WIDTH, MINIMAP_HEIGHT);

    // 绘制背景
    ctx.fillStyle = "#f9fafb";
    ctx.fillRect(0, 0, MINIMAP_WIDTH, MINIMAP_HEIGHT);

    // 计算偏移（居中）
    const offsetX = MINIMAP_PADDING + (MINIMAP_WIDTH - MINIMAP_PADDING * 2 - pageWidth * minimapScale) / 2;
    const offsetY = MINIMAP_PADDING + (MINIMAP_HEIGHT - MINIMAP_PADDING * 2 - pageHeight * minimapScale) / 2;

    // 绘制页面背景
    ctx.fillStyle = "#ffffff";
    ctx.strokeStyle = "#e5e7eb";
    ctx.lineWidth = 1;
    ctx.fillRect(offsetX, offsetY, pageWidth * minimapScale, pageHeight * minimapScale);
    ctx.strokeRect(offsetX, offsetY, pageWidth * minimapScale, pageHeight * minimapScale);

    // 绘制组件
    components.forEach((comp) => {
      const { x, y, w, h } = comp.layout;
      const isSelected = comp.id === selectedComponentId;

      ctx.fillStyle = isSelected ? "#3b82f6" : "#94a3b8";
      ctx.fillRect(
        offsetX + x * minimapScale,
        offsetY + y * minimapScale,
        Math.max(w * minimapScale, 2),
        Math.max(h * minimapScale, 2)
      );
    });

    // 绘制视口区域
    const viewportX = offsetX + (-position.x / scale) * minimapScale;
    const viewportY = offsetY + (-position.y / scale) * minimapScale;
    const viewportW = (viewportWidth / scale) * minimapScale;
    const viewportH = (viewportHeight / scale) * minimapScale;

    ctx.strokeStyle = "#3b82f6";
    ctx.lineWidth = 2;
    ctx.setLineDash([4, 2]);
    ctx.strokeRect(viewportX, viewportY, viewportW, viewportH);
    ctx.setLineDash([]);

    // 视口区域半透明填充
    ctx.fillStyle = "rgba(59, 130, 246, 0.1)";
    ctx.fillRect(viewportX, viewportY, viewportW, viewportH);
  }, [components, pageWidth, pageHeight, viewportWidth, viewportHeight, scale, position, selectedComponentId, minimapScale]);

  // 重绘画布
  useEffect(() => {
    draw();
  }, [draw]);

  // 处理点击导航
  const handleClick = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      const canvas = canvasRef.current;
      if (!canvas) return;

      const rect = canvas.getBoundingClientRect();
      const clickX = e.clientX - rect.left;
      const clickY = e.clientY - rect.top;

      const offsetX = MINIMAP_PADDING + (MINIMAP_WIDTH - MINIMAP_PADDING * 2 - pageWidth * minimapScale) / 2;
      const offsetY = MINIMAP_PADDING + (MINIMAP_HEIGHT - MINIMAP_PADDING * 2 - pageHeight * minimapScale) / 2;

      // 转换为画布坐标
      const canvasX = (clickX - offsetX) / minimapScale;
      const canvasY = (clickY - offsetY) / minimapScale;

      // 计算新的位置（使点击位置居中）
      const newX = -(canvasX * scale - viewportWidth / 2);
      const newY = -(canvasY * scale - viewportHeight / 2);

      onNavigate(newX, newY);
    },
    [pageWidth, pageHeight, scale, viewportWidth, viewportHeight, minimapScale, onNavigate]
  );

  // 处理拖拽导航
  const handleMouseDown = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    isDragging.current = true;
    handleClick(e);
  }, [handleClick]);

  const handleMouseMove = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      if (!isDragging.current) return;
      handleClick(e);
    },
    [handleClick]
  );

  const handleMouseUp = useCallback(() => {
    isDragging.current = false;
  }, []);

  return (
    <div className="absolute bottom-4 right-4 z-10 bg-white rounded-lg shadow-lg border overflow-hidden">
      <canvas
        ref={canvasRef}
        width={MINIMAP_WIDTH}
        height={MINIMAP_HEIGHT}
        className="cursor-pointer"
        onClick={handleClick}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      />
      <div className="absolute top-1 left-2 text-[10px] text-muted-foreground">
        迷你地图
      </div>
    </div>
  );
});
