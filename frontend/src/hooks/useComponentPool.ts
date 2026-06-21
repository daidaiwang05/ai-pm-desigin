"use client";

import { useRef, useCallback } from "react";

interface PoolOptions {
  initialSize?: number;
  maxSize?: number;
}

/**
 * 组件对象池 Hook
 * 复用组件对象，减少内存分配和 GC 压力
 */
export function useComponentPool<T extends { id: string }>(
  createItem: () => T,
  options: PoolOptions = {}
) {
  const { initialSize = 10, maxSize = 100 } = options;
  const poolRef = useRef<Map<string, T[]>>(new Map());
  const activeRef = useRef<Map<string, T>>(new Map());

  /**
   * 从池中获取或创建对象
   */
  const acquire = useCallback(
    (id: string): T => {
      // 检查是否已激活
      const existing = activeRef.current.get(id);
      if (existing) return existing;

      // 从池中获取
      const typePool = poolRef.current.get(id);
      let item: T;

      if (typePool && typePool.length > 0) {
        item = typePool.pop()!;
      } else {
        item = createItem();
      }

      activeRef.current.set(id, item);
      return item;
    },
    [createItem]
  );

  /**
   * 释放对象回池中
   */
  const release = useCallback(
    (id: string) => {
      const item = activeRef.current.get(id);
      if (!item) return;

      activeRef.current.delete(id);

      // 归还到池中
      let typePool = poolRef.current.get(id);
      if (!typePool) {
        typePool = [];
        poolRef.current.set(id, typePool);
      }

      // 限制池大小
      if (typePool.length < maxSize) {
        typePool.push(item);
      }
    },
    [maxSize]
  );

  /**
   * 清空池
   */
  const clear = useCallback(() => {
    poolRef.current.clear();
    activeRef.current.clear();
  }, []);

  /**
   * 获取池状态
   */
  const getStats = useCallback(() => {
    let totalPooled = 0;
    poolRef.current.forEach((pool) => {
      totalPooled += pool.length;
    });

    return {
      pooled: totalPooled,
      active: activeRef.current.size,
    };
  }, []);

  return {
    acquire,
    release,
    clear,
    getStats,
  };
}
