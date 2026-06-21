import { create } from 'zustand';
import type { Component } from '@/types/schema';

interface SelectionState {
  selectedIds: Set<string>;
  selectedComponents: Component[];

  // Actions
  select: (component: Component) => void;
  addToSelection: (component: Component) => void;
  removeFromSelection: (componentId: string) => void;
  toggleSelection: (component: Component) => void;
  selectAll: (components: Component[]) => void;
  clearSelection: () => void;
  isSelected: (componentId: string) => boolean;
  getSelectedIds: () => string[];
  hasSelection: () => boolean;
  isMultiSelect: () => boolean;
}

export const useSelectionStore = create<SelectionState>((set, get) => ({
  selectedIds: new Set(),
  selectedComponents: [],

  select: (component) => {
    set({
      selectedIds: new Set([component.id]),
      selectedComponents: [component],
    });
  },

  addToSelection: (component) => {
    const { selectedIds, selectedComponents } = get();
    if (selectedIds.has(component.id)) return;

    const newIds = new Set(selectedIds);
    newIds.add(component.id);
    set({
      selectedIds: newIds,
      selectedComponents: [...selectedComponents, component],
    });
  },

  removeFromSelection: (componentId) => {
    const { selectedIds, selectedComponents } = get();
    if (!selectedIds.has(componentId)) return;

    const newIds = new Set(selectedIds);
    newIds.delete(componentId);
    set({
      selectedIds: newIds,
      selectedComponents: selectedComponents.filter((c) => c.id !== componentId),
    });
  },

  toggleSelection: (component) => {
    const { selectedIds } = get();
    if (selectedIds.has(component.id)) {
      get().removeFromSelection(component.id);
    } else {
      get().addToSelection(component);
    }
  },

  selectAll: (components) => {
    set({
      selectedIds: new Set(components.map((c) => c.id)),
      selectedComponents: [...components],
    });
  },

  clearSelection: () => {
    set({ selectedIds: new Set(), selectedComponents: [] });
  },

  isSelected: (componentId) => {
    return get().selectedIds.has(componentId);
  },

  getSelectedIds: () => {
    return Array.from(get().selectedIds);
  },

  hasSelection: () => {
    return get().selectedIds.size > 0;
  },

  isMultiSelect: () => {
    return get().selectedIds.size > 1;
  },
}));
