import { create } from 'zustand';

interface HistoryEntry {
  id: string;
  timestamp: number;
  type: 'add' | 'update' | 'delete' | 'move' | 'batch';
  description: string;
  data: {
    pageId: string;
    componentId?: string;
    before?: any;
    after?: any;
    components?: any[];
  };
}

interface HistoryState {
  entries: HistoryEntry[];
  currentIndex: number;
  maxEntries: number;
  undoRedoUntil: number; // 时间戳：在此之前 push() 会被阻止

  // Actions
  push: (entry: Omit<HistoryEntry, 'id' | 'timestamp'>) => void;
  undo: () => HistoryEntry | null;
  redo: () => HistoryEntry | null;
  canUndo: () => boolean;
  canRedo: () => boolean;
  clear: () => void;
  getHistory: () => HistoryEntry[];
  getUndoDescription: () => string | null;
  getRedoDescription: () => string | null;
}

// undo/redo 保护窗口（毫秒）— 足够覆盖同步回调 + 微任务
const UNDO_REDO_GUARD_MS = 500;

export const useHistoryStore = create<HistoryState>((set, get) => ({
  entries: [],
  currentIndex: -1,
  maxEntries: 50,
  undoRedoUntil: 0,

  push: (entry) => {
    const { entries, currentIndex, maxEntries, undoRedoUntil } = get();

    // 时间戳守卫：在 undo/redo 保护窗口内阻止记录
    if (Date.now() < undoRedoUntil) return;

    // 创建新条目
    const newEntry: HistoryEntry = {
      ...entry,
      id: `history-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: Date.now(),
    };

    // 如果当前不在历史末尾，截断后续历史
    const newEntries = entries.slice(0, currentIndex + 1);
    newEntries.push(newEntry);

    // 限制历史条目数量
    if (newEntries.length > maxEntries) {
      newEntries.shift();
    }

    set({
      entries: newEntries,
      currentIndex: newEntries.length - 1,
    });
  },

  undo: () => {
    const { entries, currentIndex } = get();

    if (currentIndex < 0) {
      return null;
    }

    const entry = entries[currentIndex];

    set({
      currentIndex: currentIndex - 1,
      undoRedoUntil: Date.now() + UNDO_REDO_GUARD_MS,
    });

    return entry;
  },

  redo: () => {
    const { entries, currentIndex } = get();

    if (currentIndex >= entries.length - 1) {
      return null;
    }

    const entry = entries[currentIndex + 1];

    set({
      currentIndex: currentIndex + 1,
      undoRedoUntil: Date.now() + UNDO_REDO_GUARD_MS,
    });

    return entry;
  },

  canUndo: () => {
    const { currentIndex } = get();
    return currentIndex >= 0;
  },

  canRedo: () => {
    const { entries, currentIndex } = get();
    return currentIndex < entries.length - 1;
  },

  clear: () => {
    set({ entries: [], currentIndex: -1 });
  },

  getHistory: () => {
    const { entries } = get();
    return [...entries].reverse();
  },

  getUndoDescription: () => {
    const { entries, currentIndex } = get();
    if (currentIndex < 0) return null;
    return entries[currentIndex].description;
  },

  getRedoDescription: () => {
    const { entries, currentIndex } = get();
    if (currentIndex >= entries.length - 1) return null;
    return entries[currentIndex + 1].description;
  },
}));
