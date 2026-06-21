"use client";

import { useRef, useCallback, useEffect } from "react";

interface CacheEntry {
  data: any;
  timestamp: number;
  size: number;
}

interface CanvasCacheOptions {
  maxSize?: number; // 最大缓存条目数
  ttl?: number; // 缓存过期时间（毫秒）
}

/**
 * 画布缓存 Hook
 * 用于缓存组件渲染结果，避免重复计算
 */
export function useCanvasCache(options: CanvasCacheOptions = {}) {
  const { maxSize = 100, ttl = 5 * 60 * 1000 } = options; // 默认 5 分钟过期
  const cacheRef = useRef<Map<string, CacheEntry>>(new Map());
  const sizeRef = useRef(0);

  // 清理过期缓存
  const cleanup = useCallback(() => {
    const now = Date.now();
    const cache = cacheRef.current;

    for (const [key, entry] of cache.entries()) {
      if (now - entry.timestamp > ttl) {
        sizeRef.current -= entry.size;
        cache.delete(key);
      }
    }
  }, [ttl]);

  // 定期清理
  useEffect(() => {
    const interval = setInterval(cleanup, 60000); // 每分钟清理一次
    return () => clearInterval(interval);
  }, [cleanup]);

  // 获取缓存
  const get = useCallback((key: string): any | null => {
    const entry = cacheRef.current.get(key);
    if (!entry) return null;

    // 检查是否过期
    if (Date.now() - entry.timestamp > ttl) {
      sizeRef.current -= entry.size;
      cacheRef.current.delete(key);
      return null;
    }

    return entry.data;
  }, [ttl]);

  // 设置缓存
  const set = useCallback((key: string, data: any) => {
    const size = JSON.stringify(data).length;

    // 如果缓存已满，清理最旧的条目
    while (cacheRef.current.size >= maxSize && sizeRef.current + size > maxSize * 1000) {
      const firstKey = cacheRef.current.keys().next().value;
      if (firstKey) {
        const entry = cacheRef.current.get(firstKey);
        if (entry) {
          sizeRef.current -= entry.size;
        }
        cacheRef.current.delete(firstKey);
      } else {
        break;
      }
    }

    cacheRef.current.set(key, {
      data,
      timestamp: Date.now(),
      size,
    });
    sizeRef.current += size;
  }, [maxSize]);

  // 删除缓存
  const remove = useCallback((key: string) => {
    const entry = cacheRef.current.get(key);
    if (entry) {
      sizeRef.current -= entry.size;
      cacheRef.current.delete(key);
    }
  }, []);

  // 清空缓存
  const clear = useCallback(() => {
    cacheRef.current.clear();
    sizeRef.current = 0;
  }, []);

  // 获取缓存统计
  const stats = useCallback(() => {
    return {
      size: cacheRef.current.size,
      memoryUsage: sizeRef.current,
    };
  }, []);

  return { get, set, remove, clear, stats, cleanup };
}
