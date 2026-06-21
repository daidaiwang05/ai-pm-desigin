"use client";

import { memo, useMemo } from "react";
import { Rect, Text, Group, Circle, Line } from "react-konva";
import type { Component } from "@/types/schema";

interface ComponentRendererProps {
  component: Component;
  isSelected: boolean;
  isDragging?: boolean;
  onSelect: (e?: any) => void;
  onDragStart?: () => void;
  onDragMove?: (e: any) => void;
  onDragEnd: (e: any) => void;
  onResizeStart?: (handle: string) => void;
}

/**
 * 自定义比较函数，避免不必要的重绘
 * 只在关键属性变化时才重渲染
 */
function arePropsEqual(
  prevProps: ComponentRendererProps,
  nextProps: ComponentRendererProps
): boolean {
  // 选中状态变化必须重绘
  if (prevProps.isSelected !== nextProps.isSelected) return false;
  if (prevProps.isDragging !== nextProps.isDragging) return false;

  const prev = prevProps.component;
  const next = nextProps.component;

  // 组件 ID 变化必须重绘
  if (prev.id !== next.id) return false;

  // 名称变化
  if (prev.name !== next.name) return false;

  // 锁定状态变化
  if (prev.isLocked !== next.isLocked) return false;

  // 组件类型变化
  if (prev.componentType !== next.componentType) return false;

  // 布局变化必须重绘（包括 rotation 和 zIndex）
  const prevLayout = prev.layout;
  const nextLayout = next.layout;
  if (
    prevLayout.x !== nextLayout.x ||
    prevLayout.y !== nextLayout.y ||
    prevLayout.w !== nextLayout.w ||
    prevLayout.h !== nextLayout.h ||
    prevLayout.rotation !== nextLayout.rotation ||
    prevLayout.zIndex !== nextLayout.zIndex
  ) {
    return false;
  }

  // Props 浅比较（双向 key 检查，防止 undefined 值不对称）
  const prevPropsObj = prev.props;
  const nextPropsObj = next.props;
  const prevKeys = Object.keys(prevPropsObj);
  const nextKeys = Object.keys(nextPropsObj);
  if (prevKeys.length !== nextKeys.length) return false;
  for (const key of prevKeys) {
    if (!(key in nextPropsObj) || prevPropsObj[key] !== nextPropsObj[key]) return false;
  }

  // 样式浅比较（双向 key 检查）
  const prevStyles = prev.styles;
  const nextStyles = next.styles;
  const prevStyleKeys = Object.keys(prevStyles);
  const nextStyleKeys = Object.keys(nextStyles);
  if (prevStyleKeys.length !== nextStyleKeys.length) return false;
  for (const key of prevStyleKeys) {
    if (!(key in nextStyles) || prevStyles[key] !== nextStyles[key]) return false;
  }

  return true;
}

export const ComponentRenderer = memo(function ComponentRenderer({
  component,
  isSelected,
  isDragging = false,
  onSelect,
  onDragStart,
  onDragMove,
  onDragEnd,
  onResizeStart,
}: ComponentRendererProps) {
  const { componentType, props, layout, styles } = component;
  const { x, y, w, h } = layout;

  // Render based on component type
  const renderComponent = () => {
    switch (componentType) {
      case "Text":
        return (
          <Text
            text={props.content || "文本"}
            fontSize={props.fontSize || 14}
            fontFamily={props.fontFamily || "Arial"}
            fontStyle={props.fontWeight || "normal"}
            fill={props.color || "#000000"}
            align={props.align || "left"}
            width={w}
            height={h}
            padding={4}
          />
        );

      case "Button":
        const variant = props.variant || "primary";
        const buttonColors: Record<string, string> = {
          primary: "#2563eb",
          secondary: "#6b7280",
          ghost: "transparent",
          danger: "#dc2626",
        };
        return (
          <Group>
            <Rect
              width={w}
              height={h}
              fill={buttonColors[variant] || buttonColors.primary}
              cornerRadius={props.borderRadius || 6}
              shadowColor="black"
              shadowBlur={variant === "ghost" ? 0 : 2}
              shadowOpacity={0.1}
            />
            <Text
              text={props.text || "按钮"}
              fontSize={props.fontSize || 14}
              fontFamily="Arial"
              fill={variant === "ghost" ? "#374151" : "#ffffff"}
              align="center"
              verticalAlign="middle"
              width={w}
              height={h}
            />
          </Group>
        );

      case "Input":
        return (
          <Group>
            {props.label && (
              <Text
                text={props.label}
                fontSize={12}
                fontFamily="Arial"
                fill="#374151"
                y={-20}
              />
            )}
            <Rect
              width={w}
              height={h}
              fill={styles?.bgColor || "#f9fafb"}
              stroke="#d1d5db"
              strokeWidth={1}
              cornerRadius={6}
            />
            <Text
              text={props.placeholder || "输入框"}
              fontSize={14}
              fontFamily="Arial"
              fill="#9ca3af"
              padding={12}
              width={w}
              height={h}
              verticalAlign="middle"
            />
          </Group>
        );

      case "Card":
        return (
          <Group>
            <Rect
              width={w}
              height={h}
              fill="#ffffff"
              stroke="#e5e7eb"
              strokeWidth={1}
              cornerRadius={8}
              shadowColor="black"
              shadowBlur={4}
              shadowOpacity={0.05}
            />
            {props.title && (
              <Text
                text={props.title}
                fontSize={16}
                fontFamily="Arial"
                fontStyle="bold"
                fill="#111827"
                padding={16}
                width={w - 32}
              />
            )}
            {props.content && (
              <Text
                text={props.content}
                fontSize={14}
                fontFamily="Arial"
                fill="#6b7280"
                padding={16}
                y={props.title ? 40 : 16}
                width={w - 32}
              />
            )}
          </Group>
        );

      case "Image":
        return (
          <Group>
            <Rect
              width={w}
              height={h}
              fill="#e5e7eb"
              cornerRadius={props.borderRadius || 0}
            />
            <Text
              text={props.alt || "图片"}
              fontSize={12}
              fontFamily="Arial"
              fill="#9ca3af"
              align="center"
              verticalAlign="middle"
              width={w}
              height={h}
            />
          </Group>
        );

      case "Divider":
        return (
          <Line
            points={[0, h / 2, w, h / 2]}
            stroke={styles?.color || "#e5e7eb"}
            strokeWidth={styles?.thickness || 1}
          />
        );

      case "Avatar":
        return (
          <Group>
            <Circle
              x={w / 2}
              y={h / 2}
              radius={Math.min(w, h) / 2}
              fill="#e5e7eb"
            />
            <Text
              text={props.name?.[0] || "U"}
              fontSize={Math.min(w, h) / 2}
              fontFamily="Arial"
              fill="#6b7280"
              align="center"
              verticalAlign="middle"
              width={w}
              height={h}
            />
          </Group>
        );

      case "Tag":
        const tagColors: Record<string, string> = {
          default: "#e5e7eb",
          primary: "#dbeafe",
          success: "#dcfce7",
          warning: "#fef3c7",
          danger: "#fee2e2",
        };
        return (
          <Group>
            <Rect
              width={w}
              height={h}
              fill={tagColors[props.color || "default"]}
              cornerRadius={h / 2}
            />
            <Text
              text={props.text || "标签"}
              fontSize={12}
              fontFamily="Arial"
              fill="#374151"
              align="center"
              verticalAlign="middle"
              width={w}
              height={h}
            />
          </Group>
        );

      default:
        // Default rectangle for unknown types
        return (
          <Group>
            <Rect
              width={w}
              height={h}
              fill="#f3f4f6"
              stroke="#d1d5db"
              strokeWidth={1}
              cornerRadius={4}
            />
            <Text
              text={componentType}
              fontSize={12}
              fontFamily="Arial"
              fill="#6b7280"
              align="center"
              verticalAlign="middle"
              width={w}
              height={h}
            />
          </Group>
        );
    }
  };

  const isLocked = component.isLocked || false;

  // 拖拽时的缩放效果
  const dragScale = isDragging ? 1.02 : 1;

  return (
    <Group
      x={x}
      y={y}
      scaleX={dragScale}
      scaleY={dragScale}
      draggable={!isLocked}
      onClick={(e) => onSelect(e?.evt)}
      onTap={(e) => onSelect(e?.evt)}
      onDragStart={isLocked ? undefined : onDragStart}
      onDragMove={isLocked ? undefined : onDragMove}
      onDragEnd={isLocked ? undefined : onDragEnd}
    >
      {/* Drag shadow */}
      {isDragging && (
        <Rect
          x={4}
          y={4}
          width={w}
          height={h}
          fill="rgba(0, 0, 0, 0.15)"
          cornerRadius={4}
          listening={false}
        />
      )}

      {renderComponent()}

      {/* Selection indicator */}
      {isSelected && (
        <>
          {/* Selection border */}
          <Rect
            width={w}
            height={h}
            stroke={isLocked ? "#f59e0b" : "#2563eb"}
            strokeWidth={2}
            dash={isLocked ? [2, 2] : [5, 3]}
            listening={false}
          />
          {/* Corner markers */}
          {!isLocked && [
            { x: 0, y: 0 },
            { x: w, y: 0 },
            { x: 0, y: h },
            { x: w, y: h },
          ].map((pos, i) => (
            <Circle
              key={`corner-${i}`}
              x={pos.x}
              y={pos.y}
              radius={3}
              fill="#ffffff"
              stroke="#2563eb"
              strokeWidth={1.5}
              listening={false}
            />
          ))}
        </>
      )}

      {/* Lock indicator */}
      {isLocked && (
        <Text
          x={w - 16}
          y={4}
          text="🔒"
          fontSize={12}
          listening={false}
        />
      )}

      {/* Resize handles */}
      {isSelected && !isLocked && (
        <>
          {/* Corner handles (bigger hit area) */}
          {[
            { pos: "nw", x: 0, y: 0, cursor: "nw-resize" },
            { pos: "ne", x: w, y: 0, cursor: "ne-resize" },
            { pos: "sw", x: 0, y: h, cursor: "sw-resize" },
            { pos: "se", x: w, y: h, cursor: "se-resize" },
          ].map((handle) => (
            <Group key={handle.pos}>
              {/* Visual handle */}
              <Rect
                x={handle.x - 4}
                y={handle.y - 4}
                width={8}
                height={8}
                fill="#ffffff"
                stroke="#2563eb"
                strokeWidth={1}
                cornerRadius={1}
                listening={false}
              />
              {/* Invisible bigger hit area */}
              <Rect
                x={handle.x - 12}
                y={handle.y - 12}
                width={24}
                height={24}
                fill="transparent"
                cursor={handle.cursor}
                onMouseDown={(e) => {
                  e.cancelBubble = true;
                  onResizeStart?.(handle.pos);
                }}
              />
            </Group>
          ))}

          {/* Edge handles (bigger hit area) */}
          {[
            { pos: "n", x: w / 2, y: 0, cursor: "n-resize" },
            { pos: "s", x: w / 2, y: h, cursor: "s-resize" },
            { pos: "w", x: 0, y: h / 2, cursor: "w-resize" },
            { pos: "e", x: w, y: h / 2, cursor: "e-resize" },
          ].map((handle) => (
            <Group key={handle.pos}>
              {/* Visual handle */}
              <Rect
                x={handle.x - 4}
                y={handle.y - 2}
                width={8}
                height={4}
                fill="#ffffff"
                stroke="#2563eb"
                strokeWidth={1}
                cornerRadius={1}
                listening={false}
              />
              {/* Invisible bigger hit area */}
              <Rect
                x={handle.x - 12}
                y={handle.y - 8}
                width={24}
                height={16}
                fill="transparent"
                cursor={handle.cursor}
                onMouseDown={(e) => {
                  e.cancelBubble = true;
                  onResizeStart?.(handle.pos);
                }}
              />
            </Group>
          ))}
        </>
      )}
    </Group>
  );
}, arePropsEqual);
