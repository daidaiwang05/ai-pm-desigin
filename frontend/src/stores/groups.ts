import { create } from 'zustand';
import type { Component } from '@/types/schema';

interface ComponentGroup {
  id: string;
  name: string;
  componentIds: string[];
  bounds: { x: number; y: number; w: number; h: number };
}

interface GroupsState {
  groups: ComponentGroup[];
  selectedGroupId: string | null;

  // Actions
  createGroup: (name: string, components: Component[]) => ComponentGroup;
  ungroupGroup: (groupId: string) => string[];
  selectGroup: (groupId: string | null) => void;
  getGroupByComponent: (componentId: string) => ComponentGroup | undefined;
  getGroupComponents: (groupId: string) => string[];
  isComponentInGroup: (componentId: string) => boolean;
  updateGroupBounds: (groupId: string, components: Component[]) => void;
  renameGroup: (groupId: string, name: string) => void;
  clear: () => void;
}

let groupCounter = 0;

export const useGroupsStore = create<GroupsState>((set, get) => ({
  groups: [],
  selectedGroupId: null,

  createGroup: (name, components) => {
    const { groups } = get();

    // 计算组的边界
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    components.forEach((comp) => {
      const { x, y, w, h } = comp.layout;
      minX = Math.min(minX, x);
      minY = Math.min(minY, y);
      maxX = Math.max(maxX, x + w);
      maxY = Math.max(maxY, y + h);
    });

    const newGroup: ComponentGroup = {
      id: `group-${++groupCounter}`,
      name: name || `组 ${groupCounter}`,
      componentIds: components.map((c) => c.id),
      bounds: { x: minX, y: minY, w: maxX - minX, h: maxY - minY },
    };

    set({
      groups: [...groups, newGroup],
      selectedGroupId: newGroup.id,
    });

    return newGroup;
  },

  ungroupGroup: (groupId) => {
    const { groups, selectedGroupId } = get();
    const group = groups.find((g) => g.id === groupId);
    if (!group) return [];

    set({
      groups: groups.filter((g) => g.id !== groupId),
      selectedGroupId: selectedGroupId === groupId ? null : selectedGroupId,
    });

    return group.componentIds;
  },

  selectGroup: (groupId) => {
    set({ selectedGroupId: groupId });
  },

  getGroupByComponent: (componentId) => {
    return get().groups.find((g) => g.componentIds.includes(componentId));
  },

  getGroupComponents: (groupId) => {
    const group = get().groups.find((g) => g.id === groupId);
    return group ? group.componentIds : [];
  },

  isComponentInGroup: (componentId) => {
    return get().groups.some((g) => g.componentIds.includes(componentId));
  },

  updateGroupBounds: (groupId, components) => {
    const { groups } = get();
    const group = groups.find((g) => g.id === groupId);
    if (!group) return;

    const groupComponents = components.filter((c) =>
      group.componentIds.includes(c.id)
    );

    if (groupComponents.length === 0) return;

    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    groupComponents.forEach((comp) => {
      const { x, y, w, h } = comp.layout;
      minX = Math.min(minX, x);
      minY = Math.min(minY, y);
      maxX = Math.max(maxX, x + w);
      maxY = Math.max(maxY, y + h);
    });

    set({
      groups: groups.map((g) =>
        g.id === groupId
          ? { ...g, bounds: { x: minX, y: minY, w: maxX - minX, h: maxY - minY } }
          : g
      ),
    });
  },

  renameGroup: (groupId, name) => {
    const { groups } = get();
    set({
      groups: groups.map((g) =>
        g.id === groupId ? { ...g, name } : g
      ),
    });
  },

  clear: () => {
    set({ groups: [], selectedGroupId: null });
  },
}));
