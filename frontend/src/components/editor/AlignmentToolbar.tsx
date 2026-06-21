"use client";

import { useState } from "react";
import type { Component } from "@/types/schema";
import { useAlignment } from "@/hooks/useAlignment";

interface AlignmentToolbarProps {
  selectedComponents: Component[];
  onAlign: (alignment: {
    [componentId: string]: { x?: number; y?: number };
  }) => void;
  onSpacing?: (axis: "x" | "y", gap: number) => void;
}

const ALIGNMENT_OPTIONS = [
  { type: "left", icon: "⫷", label: "左对齐", minCount: 2 },
  { type: "center-h", icon: "⫼", label: "水平居中", minCount: 2 },
  { type: "right", icon: "⫸", label: "右对齐", minCount: 2 },
  { type: "top", icon: "⫠", label: "顶对齐", minCount: 2 },
  { type: "center-v", icon: "⫥", label: "垂直居中", minCount: 2 },
  { type: "bottom", icon: "⫡", label: "底对齐", minCount: 2 },
  { type: "distribute-h", icon: "⫴", label: "水平分布", minCount: 3 },
  { type: "distribute-v", icon: "⫵", label: "垂直分布", minCount: 3 },
] as const;

export function AlignmentToolbar({
  selectedComponents,
  onAlign,
  onSpacing,
}: AlignmentToolbarProps) {
  const { calculateAlignment } = useAlignment();
  const [showSpacing, setShowSpacing] = useState(false);
  const [spacingValue, setSpacingValue] = useState(16);

  if (selectedComponents.length < 2) {
    return null;
  }

  const handleAlign = (type: (typeof ALIGNMENT_OPTIONS)[number]["type"]) => {
    const result = calculateAlignment(selectedComponents, type);
    if (Object.keys(result).length > 0) {
      onAlign(result);
    }
  };

  const handleSpacing = (axis: "x" | "y") => {
    if (onSpacing) {
      onSpacing(axis, spacingValue);
    }
    setShowSpacing(false);
  };

  return (
    <div className="flex items-center space-x-1 bg-white rounded-lg shadow-sm border p-1">
      {ALIGNMENT_OPTIONS.map((option) => (
        <button
          key={option.type}
          onClick={() => handleAlign(option.type)}
          disabled={selectedComponents.length < option.minCount}
          className="px-2 py-1 text-sm hover:bg-gray-100 rounded disabled:opacity-30 disabled:cursor-not-allowed"
          title={option.label}
        >
          {option.icon}
        </button>
      ))}

      <div className="w-px h-5 bg-gray-200 mx-1" />

      {/* Spacing controls */}
      <button
        onClick={() => setShowSpacing(!showSpacing)}
        className="px-2 py-1 text-sm hover:bg-gray-100 rounded"
        title="调整间距"
      >
        ⬜
      </button>

      {showSpacing && (
        <div className="absolute top-full left-0 mt-1 bg-white rounded-lg shadow-lg border p-3 z-20">
          <div className="text-xs font-medium mb-2">组件间距</div>
          <div className="flex items-center space-x-2 mb-2">
            <label className="text-xs text-muted-foreground">间距:</label>
            <input
              type="number"
              value={spacingValue}
              onChange={(e) => setSpacingValue(Number(e.target.value))}
              className="w-16 h-7 px-2 text-sm border rounded"
              min={0}
              max={200}
            />
            <span className="text-xs text-muted-foreground">px</span>
          </div>
          <div className="flex space-x-2">
            <button
              onClick={() => handleSpacing("x")}
              className="flex-1 px-2 py-1 text-xs bg-gray-50 hover:bg-gray-100 rounded border"
            >
              ↔ 水平
            </button>
            <button
              onClick={() => handleSpacing("y")}
              className="flex-1 px-2 py-1 text-xs bg-gray-50 hover:bg-gray-100 rounded border"
            >
              ↕ 垂直
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
