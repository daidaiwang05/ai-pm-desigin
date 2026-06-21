import { create } from 'zustand';
import type { Component } from '@/types/schema';

// 粘贴时返回的组件数据（不含 id，让后端生成）
type ComponentPasteData = Omit<Component, 'id'>;

interface ClipboardState {
  copiedComponent: Component | null;
  copiedComponents: Component[]; // 批量复制

  // Actions
  copy: (component: Component) => void;
  copyMultiple: (components: Component[]) => void;
  paste: () => ComponentPasteData | null;
  pasteMultiple: () => ComponentPasteData[];
  hasClipboard: () => boolean;
  clear: () => void;
}

export const useClipboardStore = create<ClipboardState>((set, get) => ({
  copiedComponent: null,
  copiedComponents: [],

  copy: (component) => {
    set({
      copiedComponent: { ...component },
      copiedComponents: [],
    });
  },

  copyMultiple: (components) => {
    set({
      copiedComponent: null,
      copiedComponents: components.map((c) => ({ ...c })),
    });
  },

  paste: () => {
    const { copiedComponent } = get();
    if (!copiedComponent) return null;

    // 返回组件的深拷贝，偏移位置避免重叠，不含 id
    const { id, ...rest } = copiedComponent;
    return {
      ...rest,
      layout: {
        ...rest.layout,
        x: rest.layout.x + 20,
        y: rest.layout.y + 20,
      },
    };
  },

  pasteMultiple: () => {
    const { copiedComponents } = get();
    if (copiedComponents.length === 0) return [];

    // 返回组件的深拷贝，偏移位置避免重叠
    return copiedComponents.map((c) => {
      const { id, ...rest } = c;
      return {
        ...rest,
        layout: {
          ...rest.layout,
          x: rest.layout.x + 20,
          y: rest.layout.y + 20,
        },
      };
    });
  },

  hasClipboard: () => {
    const { copiedComponent, copiedComponents } = get();
    return copiedComponent !== null || copiedComponents.length > 0;
  },

  clear: () => {
    set({ copiedComponent: null, copiedComponents: [] });
  },
}));
