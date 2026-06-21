"use client";

import { useCallback } from "react";
import type { Component } from "@/types/schema";

type AlignmentType =
  | "left"
  | "center-h"
  | "right"
  | "top"
  | "center-v"
  | "bottom"
  | "distribute-h"
  | "distribute-v";

interface AlignmentResult {
  [componentId: string]: { x?: number; y?: number };
}

/**
 * 组件对齐 Hook
 * 计算多个组件的对齐位置
 */
export function useAlignment() {
  /**
   * 计算对齐后的位置
   */
  const calculateAlignment = useCallback(
    (components: Component[], type: AlignmentType): AlignmentResult => {
      if (components.length < 2) return {};

      const result: AlignmentResult = {};

      // 计算边界
      const minX = Math.min(...components.map((c) => c.layout.x));
      const maxX = Math.max(...components.map((c) => c.layout.x + c.layout.w));
      const minY = Math.min(...components.map((c) => c.layout.y));
      const maxY = Math.max(...components.map((c) => c.layout.y + c.layout.h));

      switch (type) {
        case "left":
          // 左对齐：所有组件的 x = minX
          components.forEach((c) => {
            result[c.id] = { x: minX };
          });
          break;

        case "center-h":
          // 水平居中：所有组件的中心 x = (minX + maxX) / 2
          const centerX = (minX + maxX) / 2;
          components.forEach((c) => {
            result[c.id] = { x: centerX - c.layout.w / 2 };
          });
          break;

        case "right":
          // 右对齐：所有组件的右边缘 = maxX
          components.forEach((c) => {
            result[c.id] = { x: maxX - c.layout.w };
          });
          break;

        case "top":
          // 顶部对齐：所有组件的 y = minY
          components.forEach((c) => {
            result[c.id] = { y: minY };
          });
          break;

        case "center-v":
          // 垂直居中：所有组件的中心 y = (minY + maxY) / 2
          const centerY = (minY + maxY) / 2;
          components.forEach((c) => {
            result[c.id] = { y: centerY - c.layout.h / 2 };
          });
          break;

        case "bottom":
          // 底部对齐：所有组件的底边缘 = maxY
          components.forEach((c) => {
            result[c.id] = { y: maxY - c.layout.h };
          });
          break;

        case "distribute-h":
          // 水平均匀分布
          if (components.length < 3) break;
          const sortedH = [...components].sort((a, b) => a.layout.x - b.layout.x);
          const totalWidth = sortedH.reduce((sum, c) => sum + c.layout.w, 0);
          const totalSpace = maxX - minX - totalWidth;
          const gapH = Math.max(0, totalSpace / (components.length - 1));
          let currentX = minX;
          sortedH.forEach((c) => {
            result[c.id] = { x: currentX };
            currentX += c.layout.w + gapH;
          });
          break;

        case "distribute-v":
          // 垂直均匀分布
          if (components.length < 3) break;
          const sortedV = [...components].sort((a, b) => a.layout.y - b.layout.y);
          const totalHeight = sortedV.reduce((sum, c) => sum + c.layout.h, 0);
          const totalSpaceV = maxY - minY - totalHeight;
          const gapV = Math.max(0, totalSpaceV / (components.length - 1));
          let currentY = minY;
          sortedV.forEach((c) => {
            result[c.id] = { y: currentY };
            currentY += c.layout.h + gapV;
          });
          break;
      }

      return result;
    },
    []
  );

  return { calculateAlignment };
}
