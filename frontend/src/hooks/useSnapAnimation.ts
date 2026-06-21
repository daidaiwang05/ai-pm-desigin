"use client";

import { useState, useCallback, useRef, useEffect } from "react";

interface SnapAnimationOptions {
  duration?: number; // 动画时长（毫秒）
}

/**
 * 吸附动画 Hook
 * 提供平滑的吸附过渡效果
 */
export function useSnapAnimation(options: SnapAnimationOptions = {}) {
  const { duration = 150 } = options;
  const animationRef = useRef<number | null>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [snapPosition, setSnapPosition] = useState<{ x: number; y: number } | null>(null);

  // 自动清理：组件卸载时取消所有动画和定时器
  useEffect(() => {
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  /**
   * 执行吸附动画
   */
  const animateSnap = useCallback(
    (
      fromX: number,
      fromY: number,
      toX: number,
      toY: number,
      onUpdate: (x: number, y: number) => void,
      onComplete?: () => void
    ) => {
      // 取消之前的动画
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }

      // 如果距离很小，直接跳转
      const distance = Math.sqrt((toX - fromX) ** 2 + (toY - fromY) ** 2);
      if (distance < 1) {
        onUpdate(toX, toY);
        onComplete?.();
        return;
      }

      const startTime = performance.now();

      const animate = (currentTime: number) => {
        const elapsed = currentTime - startTime;
        const progress = Math.min(elapsed / duration, 1);

        // 使用 easeOutCubic 缓动函数
        const eased = 1 - Math.pow(1 - progress, 3);

        const currentX = fromX + (toX - fromX) * eased;
        const currentY = fromY + (toY - fromY) * eased;

        onUpdate(currentX, currentY);

        if (progress < 1) {
          animationRef.current = requestAnimationFrame(animate);
        } else {
          animationRef.current = null;
          onComplete?.();
        }
      };

      animationRef.current = requestAnimationFrame(animate);
    },
    [duration]
  );

  /**
   * 显示吸附位置指示器
   */
  const showSnapIndicator = useCallback(
    (x: number, y: number) => {
      // 清除之前的定时器
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }

      setSnapPosition({ x, y });

      // 自动隐藏（使用 ref 存储定时器 ID）
      timeoutRef.current = setTimeout(() => {
        setSnapPosition(null);
        timeoutRef.current = null;
      }, 300);
    },
    []
  );

  /**
   * 清理动画
   */
  const cleanup = useCallback(() => {
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
      animationRef.current = null;
    }
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }, []);

  return {
    snapPosition,
    animateSnap,
    showSnapIndicator,
    cleanup,
  };
}
