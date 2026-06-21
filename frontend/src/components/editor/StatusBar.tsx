"use client";

interface StatusBarProps {
  pageName?: string;
  componentCount: number;
  canUndo?: boolean;
  canRedo?: boolean;
}

export function StatusBar({
  pageName,
  componentCount,
  canUndo,
  canRedo,
}: StatusBarProps) {
  return (
    <div className="h-8 bg-white border-t flex items-center px-4 text-xs text-muted-foreground shrink-0">
      <div className="flex items-center space-x-4">
        <span>{pageName || "未选择页面"}</span>
        <span>•</span>
        <span>{componentCount} 个组件</span>
      </div>
      <div className="flex-1" />
      <div className="flex items-center space-x-4">
        {canUndo !== undefined && (
          <span className={canUndo ? "text-foreground" : "text-muted-foreground/50"}>
            ↩ 撤销
          </span>
        )}
        {canRedo !== undefined && (
          <span className={canRedo ? "text-foreground" : "text-muted-foreground/50"}>
            ↪ 重做
          </span>
        )}
        <span>•</span>
        <span>Ctrl+Z 撤销 | Ctrl+Shift+Z 重做</span>
      </div>
    </div>
  );
}
