"use client";

import { useState, useCallback } from "react";
import type { Component } from "@/types/schema";

interface GuideLine {
  type: "vertical" | "horizontal";
  position: number;
  start: number;
  end: number;
}

interface AlignmentResult {
  x: number;
  y: number;
  guides: GuideLine[];
}

const SNAP_THRESHOLD = 5; // 吸附阈值（像素）

/**
 * 对齐辅助线 Hook
 * 计算组件拖拽时的对齐位置和辅助线
 */
export function useAlignmentGuides() {
  const [guides, setGuides] = useState<GuideLine[]>([]);

  /**
   * 计算对齐位置
   */
  const calculateAlignment = useCallback(
    (
      draggedComponent: Component,
      allComponents: Component[],
      proposedX: number,
      proposedY: number
    ): AlignmentResult => {
      const newGuides: GuideLine[] = [];
      let alignedX = proposedX;
      let alignedY = proposedY;

      const dragW = draggedComponent.layout.w;
      const dragH = draggedComponent.layout.h;
      const dragCenterX = proposedX + dragW / 2;
      const dragCenterY = proposedY + dragH / 2;
      const dragRight = proposedX + dragW;
      const dragBottom = proposedY + dragH;

      // 收集所有其他组件的对齐点
      const verticalPoints: number[] = []; // x 坐标
      const horizontalPoints: number[] = []; // y 坐标

      allComponents.forEach((comp) => {
        if (comp.id === draggedComponent.id) return;

        const { x, y, w, h } = comp.layout;
        // 左边缘
        verticalPoints.push(x);
        // 右边缘
        verticalPoints.push(x + w);
        // 中心 X
        verticalPoints.push(x + w / 2);
        // 上边缘
        horizontalPoints.push(y);
        // 下边缘
        horizontalPoints.push(y + h);
        // 中心 Y
        horizontalPoints.push(y + h / 2);
      });

      // 添加页面边界
      verticalPoints.push(0);
      horizontalPoints.push(0);

      // 检查垂直对齐（X 方向）
      const dragXPoints = [
        { value: proposedX, label: "left" },
        { value: dragRight, label: "right" },
        { value: dragCenterX, label: "center" },
      ];

      let bestXDiff = SNAP_THRESHOLD + 1;
      let bestXGuide: GuideLine | null = null;

      dragXPoints.forEach(({ value: dragPoint }) => {
        verticalPoints.forEach((targetX) => {
          const diff = Math.abs(dragPoint - targetX);
          if (diff < bestXDiff && diff <= SNAP_THRESHOLD) {
            bestXDiff = diff;
            const offset = dragPoint - proposedX;
            alignedX = targetX - offset;

            // 计算辅助线范围
            const minY = Math.min(proposedY, targetX === 0 ? 0 : proposedY);
            const maxY = Math.max(dragBottom, targetX === 0 ? 2000 : dragBottom);

            bestXGuide = {
              type: "vertical",
              position: targetX,
              start: Math.min(proposedY, proposedY - 100),
              end: Math.max(dragBottom, dragBottom + 100),
            };
          }
        });
      });

      // 检查水平对齐（Y 方向）
      const dragYPoints = [
        { value: proposedY, label: "top" },
        { value: dragBottom, label: "bottom" },
        { value: dragCenterY, label: "center" },
      ];

      let bestYDiff = SNAP_THRESHOLD + 1;
      let bestYGuide: GuideLine | null = null;

      dragYPoints.forEach(({ value: dragPoint }) => {
        horizontalPoints.forEach((targetY) => {
          const diff = Math.abs(dragPoint - targetY);
          if (diff < bestYDiff && diff <= SNAP_THRESHOLD) {
            bestYDiff = diff;
            const offset = dragPoint - proposedY;
            alignedY = targetY - offset;

            bestYGuide = {
              type: "horizontal",
              position: targetY,
              start: Math.min(proposedX, proposedX - 100),
              end: Math.max(dragRight, dragRight + 100),
            };
          }
        });
      });

      // 设置辅助线
      const resultGuides: GuideLine[] = [];
      if (bestXGuide) resultGuides.push(bestXGuide);
      if (bestYGuide) resultGuides.push(bestYGuide);
      setGuides(resultGuides);

      return { x: alignedX, y: alignedY, guides: resultGuides };
    },
    []
  );

  /**
   * 清除辅助线
   */
  const clearGuides = useCallback(() => {
    setGuides([]);
  }, []);

  return { guides, calculateAlignment, clearGuides };
}
