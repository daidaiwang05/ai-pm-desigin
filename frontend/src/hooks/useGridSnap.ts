"use client";

import { useState, useCallback } from "react";

interface GridSnapOptions {
  gridSize?: number;
  enabled?: boolean;
}

interface SnapResult {
  x: number;
  y: number;
  snapped: boolean;
}

/**
 * 网格吸附 Hook
 * 将坐标吸附到最近的网格点
 */
export function useGridSnap(options: GridSnapOptions = {}) {
  const { gridSize: initialGridSize = 20, enabled: initialEnabled = true } = options;
  const [gridSize, setGridSize] = useState(initialGridSize);
  const [enabled, setEnabled] = useState(initialEnabled);

  /**
   * 吸附坐标到网格
   */
  const snapToGrid = useCallback(
    (x: number, y: number): SnapResult => {
      if (!enabled) {
        return { x, y, snapped: false };
      }

      const snappedX = Math.round(x / gridSize) * gridSize;
      const snappedY = Math.round(y / gridSize) * gridSize;
      const snapped = snappedX !== x || snappedY !== y;

      return { x: snappedX, y: snappedY, snapped };
    },
    [enabled, gridSize]
  );

  /**
   * 吸附尺寸到网格
   */
  const snapSizeToGrid = useCallback(
    (w: number, h: number): { w: number; h: number } => {
      if (!enabled) {
        return { w, h };
      }

      return {
        w: Math.round(w / gridSize) * gridSize,
        h: Math.round(h / gridSize) * gridSize,
      };
    },
    [enabled, gridSize]
  );

  /**
   * 切换网格吸附
   */
  const toggleGridSnap = useCallback(() => {
    setEnabled((prev) => !prev);
  }, []);

  /**
   * 设置网格大小
   */
  const updateGridSize = useCallback((size: number) => {
    setGridSize(Math.max(5, Math.min(100, size)));
  }, []);

  return {
    gridSize,
    enabled,
    snapToGrid,
    snapSizeToGrid,
    toggleGridSnap,
    updateGridSize,
    setEnabled,
  };
}
