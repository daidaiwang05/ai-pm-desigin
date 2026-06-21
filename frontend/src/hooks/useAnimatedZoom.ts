"use client";

import { useState, useCallback, useRef } from "react";

interface AnimatedZoomOptions {
  duration?: number; // 动画时长（毫秒）
  minScale?: number;
  maxScale?: number;
}

/**
 * 动画缩放 Hook
 * 提供平滑的缩放过渡动画
 */
export function useAnimatedZoom(options: AnimatedZoomOptions = {}) {
  const { duration = 200, minScale = 0.25, maxScale = 4 } = options;
  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const animationRef = useRef<number | null>(null);

  /**
   * 动画缩放到目标值
   */
  const animateToScale = useCallback(
    (targetScale: number, pivotX?: number, pivotY?: number) => {
      const clampedTarget = Math.min(Math.max(targetScale, minScale), maxScale);
      if (clampedTarget === scale) return;

      // 取消之前的动画
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }

      const startScale = scale;
      const startTime = performance.now();
      const startPos = { ...position };

      const animate = (currentTime: number) => {
        const elapsed = currentTime - startTime;
        const progress = Math.min(elapsed / duration, 1);

        // 使用 easeOutCubic 缓动函数
        const eased = 1 - Math.pow(1 - progress, 3);

        const currentScale = startScale + (clampedTarget - startScale) * eased;

        // 如果有缩放中心点，调整位置以保持中心不变
        if (pivotX !== undefined && pivotY !== undefined) {
          const scaleRatio = currentScale / startScale;
          const newX = pivotX - (pivotX - startPos.x) * scaleRatio;
          const newY = pivotY - (pivotY - startPos.y) * scaleRatio;
          setPosition({ x: newX, y: newY });
        }

        setScale(currentScale);

        if (progress < 1) {
          animationRef.current = requestAnimationFrame(animate);
        } else {
          animationRef.current = null;
        }
      };

      animationRef.current = requestAnimationFrame(animate);
    },
    [scale, position, duration, minScale, maxScale]
  );

  /**
   * 缩放到适应页面
   */
  const zoomToPage = useCallback(
    (pageWidth: number, pageHeight: number, containerWidth: number, containerHeight: number) => {
      const scaleX = containerWidth / pageWidth;
      const scaleY = containerHeight / pageHeight;
      const targetScale = Math.min(scaleX, scaleY) * 0.9;
      const targetX = (containerWidth - pageWidth * targetScale) / 2;
      const targetY = (containerHeight - pageHeight * targetScale) / 2;

      animateToScale(targetScale);
      setPosition({ x: targetX, y: targetY });
    },
    [animateToScale]
  );

  /**
   * 缩放到适应内容
   */
  const zoomToFit = useCallback(
    (
      components: Array<{ layout: { x: number; y: number; w: number; h: number } }>,
      containerWidth: number,
      containerHeight: number
    ) => {
      if (components.length === 0) {
        animateToScale(1);
        setPosition({ x: 0, y: 0 });
        return;
      }

      let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
      components.forEach((comp) => {
        const { x, y, w, h } = comp.layout;
        minX = Math.min(minX, x);
        minY = Math.min(minY, y);
        maxX = Math.max(maxX, x + w);
        maxY = Math.max(maxY, y + h);
      });

      const padding = 50;
      const contentWidth = maxX - minX + padding * 2;
      const contentHeight = maxY - minY + padding * 2;

      const scaleX = containerWidth / contentWidth;
      const scaleY = containerHeight / contentHeight;
      const targetScale = Math.min(Math.max(Math.min(scaleX, scaleY), 0.25), 2);

      const centerX = (minX + maxX) / 2;
      const centerY = (minY + maxY) / 2;
      const newX = containerWidth / 2 - centerX * targetScale;
      const newY = containerHeight / 2 - centerY * targetScale;

      animateToScale(targetScale);
      setPosition({ x: newX, y: newY });
    },
    [animateToScale]
  );

  /**
   * 重置缩放
   */
  const resetZoom = useCallback(() => {
    animateToScale(1);
    setPosition({ x: 0, y: 0 });
  }, [animateToScale]);

  return {
    scale,
    position,
    setPosition,
    animateToScale,
    zoomToPage,
    zoomToFit,
    resetZoom,
  };
}
