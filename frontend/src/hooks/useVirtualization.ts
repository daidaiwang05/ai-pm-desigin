"use client";

import { useState, useCallback, useMemo, useRef, useEffect } from "react";
import type { Component } from "@/types/schema";

interface VirtualizationOptions {
  viewportWidth: number;
  viewportHeight: number;
  scale: number;
  offsetX: number;
  offsetY: number;
  overscan?: number; // 额外渲染的边距
}

interface SpatialCell {
  components: Component[];
}

const GRID_CELL_SIZE = 200; // 空间索引网格大小

/**
 * 虚拟化 Hook（带空间索引）
 * 只渲染可见区域内的组件，提升画布性能
 */
export function useVirtualization(options: VirtualizationOptions) {
  const {
    viewportWidth,
    viewportHeight,
    scale,
    offsetX,
    offsetY,
    overscan = 200,
  } = options;

  // 空间索引缓存
  const spatialIndexRef = useRef<Map<string, SpatialCell>>(new Map());
  const indexedComponentsRef = useRef<Component[]>([]);

  /**
   * 计算可见区域
   */
  const getVisibleBounds = useCallback(() => {
    // 计算画布坐标系中的可见区域
    const left = -offsetX / scale - overscan;
    const top = -offsetY / scale - overscan;
    const right = (-offsetX + viewportWidth) / scale + overscan;
    const bottom = (-offsetY + viewportHeight) / scale + overscan;

    return { left, top, right, bottom };
  }, [viewportWidth, viewportHeight, scale, offsetX, offsetY, overscan]);

  /**
   * 构建空间索引
   */
  const buildSpatialIndex = useCallback((components: Component[]) => {
    // 检查组件是否变化（浅比较）
    if (
      indexedComponentsRef.current.length === components.length &&
      indexedComponentsRef.current.every((c, i) => c === components[i])
    ) {
      return spatialIndexRef.current;
    }

    const index = new Map<string, SpatialCell>();

    for (const comp of components) {
      const { x, y, w, h } = comp.layout;

      // 计算组件覆盖的网格单元
      const startCol = Math.floor(x / GRID_CELL_SIZE);
      const startRow = Math.floor(y / GRID_CELL_SIZE);
      const endCol = Math.floor((x + w) / GRID_CELL_SIZE);
      const endRow = Math.floor((y + h) / GRID_CELL_SIZE);

      for (let col = startCol; col <= endCol; col++) {
        for (let row = startRow; row <= endRow; row++) {
          const key = `${col}:${row}`;
          if (!index.has(key)) {
            index.set(key, { components: [] });
          }
          index.get(key)!.components.push(comp);
        }
      }
    }

    spatialIndexRef.current = index;
    indexedComponentsRef.current = components;
    return index;
  }, []);

  /**
   * 过滤可见组件（使用空间索引）
   */
  const filterVisibleComponents = useCallback(
    (components: Component[]) => {
      // 组件数量少时直接遍历（避免索引开销）
      if (components.length < 50) {
        const bounds = getVisibleBounds();
        return components
          .filter((comp) => {
            const { x, y, w, h } = comp.layout;
            return (
              x + w >= bounds.left &&
              x <= bounds.right &&
              y + h >= bounds.top &&
              y <= bounds.bottom
            );
          })
          .sort((a, b) => a.sortOrder - b.sortOrder);
      }

      // 使用空间索引
      const index = buildSpatialIndex(components);
      const bounds = getVisibleBounds();

      // 计算可见区域覆盖的网格单元
      const startCol = Math.floor(bounds.left / GRID_CELL_SIZE);
      const startRow = Math.floor(bounds.top / GRID_CELL_SIZE);
      const endCol = Math.floor(bounds.right / GRID_CELL_SIZE);
      const endRow = Math.floor(bounds.bottom / GRID_CELL_SIZE);

      const visibleSet = new Set<Component>();

      for (let col = startCol; col <= endCol; col++) {
        for (let row = startRow; row <= endRow; row++) {
          const key = `${col}:${row}`;
          const cell = index.get(key);
          if (cell) {
            for (const comp of cell.components) {
              if (!visibleSet.has(comp)) {
                // 精确检查组件是否在可见区域内
                const { x, y, w, h } = comp.layout;
                if (
                  x + w >= bounds.left &&
                  x <= bounds.right &&
                  y + h >= bounds.top &&
                  y <= bounds.bottom
                ) {
                  visibleSet.add(comp);
                }
              }
            }
          }
        }
      }

      // Sort by sortOrder to preserve z-order (later = on top)
      return Array.from(visibleSet).sort((a, b) => a.sortOrder - b.sortOrder);
    },
    [getVisibleBounds, buildSpatialIndex]
  );

  /**
   * 检查单个组件是否可见
   */
  const isComponentVisible = useCallback(
    (component: Component) => {
      const bounds = getVisibleBounds();
      const { x, y, w, h } = component.layout;

      return (
        x + w >= bounds.left &&
        x <= bounds.right &&
        y + h >= bounds.top &&
        y <= bounds.bottom
      );
    },
    [getVisibleBounds]
  );

  /**
   * 获取可见组件统计
   */
  const getStats = useCallback(
    (components: Component[]) => {
      const visible = filterVisibleComponents(components);
      return {
        total: components.length,
        visible: visible.length,
        ratio: components.length > 0 ? visible.length / components.length : 0,
      };
    },
    [filterVisibleComponents]
  );

  return {
    filterVisibleComponents,
    isComponentVisible,
    getVisibleBounds,
    getStats,
  };
}
