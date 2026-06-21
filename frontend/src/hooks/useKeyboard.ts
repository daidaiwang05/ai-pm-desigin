"use client";

import { useEffect, useCallback } from 'react';

interface KeyboardShortcut {
  key: string;
  ctrl?: boolean;
  meta?: boolean;
  shift?: boolean;
  alt?: boolean;
  handler: () => void;
  description?: string;
}

export function useKeyboard(shortcuts: KeyboardShortcut[]) {
  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      // 忽略输入框中的快捷键
      const target = event.target as HTMLElement;
      if (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.tagName === 'SELECT' ||
        target.isContentEditable
      ) {
        return;
      }

      for (const shortcut of shortcuts) {
        const keyMatch = event.key.toLowerCase() === shortcut.key.toLowerCase();
        const ctrlMatch = shortcut.ctrl ? event.ctrlKey || event.metaKey : !(event.ctrlKey || event.metaKey);
        const shiftMatch = shortcut.shift ? event.shiftKey : !event.shiftKey;
        const altMatch = shortcut.alt ? event.altKey : !event.altKey;

        if (keyMatch && ctrlMatch && shiftMatch && altMatch) {
          event.preventDefault();
          event.stopPropagation();
          shortcut.handler();
          return;
        }
      }
    },
    [shortcuts]
  );

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);
}

// 预定义快捷键
export const SHORTCUTS = {
  // 编辑操作
  UNDO: { key: 'z', ctrl: true, description: '撤销' },
  REDO: { key: 'z', ctrl: true, shift: true, description: '重做' },
  REDO_ALT: { key: 'y', ctrl: true, description: '重做' },
  DELETE: { key: 'Delete', description: '删除' },
  DELETE_ALT: { key: 'Backspace', description: '删除' },
  COPY: { key: 'c', ctrl: true, description: '复制' },
  CUT: { key: 'x', ctrl: true, description: '剪切' },
  PASTE: { key: 'v', ctrl: true, description: '粘贴' },
  DUPLICATE: { key: 'd', ctrl: true, description: '复制组件' },
  SELECT_ALL: { key: 'a', ctrl: true, description: '全选' },
  SAVE: { key: 's', ctrl: true, description: '保存' },
  ESCAPE: { key: 'Escape', description: '取消' },

  // 画布操作
  ZOOM_IN: { key: '=', ctrl: true, description: '放大' },
  ZOOM_OUT: { key: '-', ctrl: true, description: '缩小' },
  ZOOM_RESET: { key: '0', ctrl: true, description: '重置缩放' },
  FIT_TO_SCREEN: { key: '1', ctrl: true, description: '适应屏幕' },

  // 组件操作
  MOVE_UP: { key: 'ArrowUp', description: '上移' },
  MOVE_DOWN: { key: 'ArrowDown', description: '下移' },
  MOVE_LEFT: { key: 'ArrowLeft', description: '左移' },
  MOVE_RIGHT: { key: 'ArrowRight', description: '右移' },
  MOVE_UP_FAST: { key: 'ArrowUp', shift: true, description: '快速上移' },
  MOVE_DOWN_FAST: { key: 'ArrowDown', shift: true, description: '快速下移' },
  MOVE_LEFT_FAST: { key: 'ArrowLeft', shift: true, description: '快速左移' },
  MOVE_RIGHT_FAST: { key: 'ArrowRight', shift: true, description: '快速右移' },

  // 分组操作
  GROUP: { key: 'g', ctrl: true, description: '组合' },
  UNGROUP: { key: 'g', ctrl: true, shift: true, description: '取消组合' },

  // 层级操作
  BRING_TO_FRONT: { key: ']', ctrl: true, shift: true, description: '置顶' },
  SEND_TO_BACK: { key: '[', ctrl: true, shift: true, description: '置底' },

  // 面板切换
  TOGGLE_LEFT_PANEL: { key: '[', ctrl: true, description: '切换左面板' },
  TOGGLE_RIGHT_PANEL: { key: ']', ctrl: true, description: '切换右面板' },
  TOGGLE_ANNOTATIONS: { key: 'a', ctrl: true, shift: true, description: '切换标注' },

  // 视图
  PREVIEW: { key: 'p', ctrl: true, description: '预览' },
  EXPORT: { key: 'e', ctrl: true, description: '导出' },
};
