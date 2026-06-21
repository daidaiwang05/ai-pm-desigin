import { create } from 'zustand';

interface ComponentTemplate {
  id: string;
  name: string;
  componentType: string;
  props: Record<string, any>;
  styles: Record<string, any>;
  createdAt: string;
}

interface TemplatesState {
  templates: ComponentTemplate[];

  // Actions
  addTemplate: (name: string, componentType: string, props: Record<string, any>, styles: Record<string, any>) => void;
  removeTemplate: (id: string) => void;
  getTemplatesForType: (componentType: string) => ComponentTemplate[];
  applyTemplate: (id: string) => ComponentTemplate | null;
}

export const useTemplatesStore = create<TemplatesState>((set, get) => {
  // 从 localStorage 加载模板
  const loadTemplates = (): ComponentTemplate[] => {
    if (typeof window === 'undefined') return [];
    try {
      const stored = localStorage.getItem('component-templates');
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  };

  // 保存模板到 localStorage
  const saveTemplates = (templates: ComponentTemplate[]) => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('component-templates', JSON.stringify(templates));
    }
  };

  return {
    templates: loadTemplates(),

    addTemplate: (name, componentType, props, styles) => {
      const { templates } = get();
      const newTemplate: ComponentTemplate = {
        id: `tpl-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
        name,
        componentType,
        props: { ...props },
        styles: { ...styles },
        createdAt: new Date().toISOString(),
      };

      const updated = [...templates, newTemplate];
      set({ templates: updated });
      saveTemplates(updated);
    },

    removeTemplate: (id) => {
      const { templates } = get();
      const updated = templates.filter((t) => t.id !== id);
      set({ templates: updated });
      saveTemplates(updated);
    },

    getTemplatesForType: (componentType) => {
      return get().templates.filter((t) => t.componentType === componentType);
    },

    applyTemplate: (id) => {
      return get().templates.find((t) => t.id === id) || null;
    },
  };
});
