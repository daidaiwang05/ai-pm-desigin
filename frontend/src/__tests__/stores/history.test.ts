import { describe, it, expect, beforeEach } from 'vitest';
import { useHistoryStore } from '@/stores/history';

describe('useHistoryStore', () => {
  beforeEach(() => {
    // Reset store state before each test
    useHistoryStore.setState({
      entries: [],
      currentIndex: -1,
      maxEntries: 50,
      undoRedoUntil: 0,
    });
  });

  describe('push', () => {
    it('should add a new history entry', () => {
      const { push, getHistory } = useHistoryStore.getState();

      push({
        type: 'add',
        description: 'Added component',
        data: { pageId: 'page-1', componentId: 'comp-1' },
      });

      const history = getHistory();
      expect(history).toHaveLength(1);
      expect(history[0].description).toBe('Added component');
    });

    it('should truncate future entries when pushing after undo', () => {
      const { push, undo, getHistory } = useHistoryStore.getState();

      push({ type: 'add', description: 'First', data: { pageId: 'page-1' } });
      push({ type: 'update', description: 'Second', data: { pageId: 'page-1' } });
      push({ type: 'delete', description: 'Third', data: { pageId: 'page-1' } });

      undo(); // Go back to index 1

      push({ type: 'move', description: 'New action', data: { pageId: 'page-1' } });

      const history = getHistory();
      expect(history).toHaveLength(3);
      expect(history[0].description).toBe('New action');
    });

    it('should respect maxEntries limit', () => {
      useHistoryStore.setState({ maxEntries: 3 });
      const { push, getHistory } = useHistoryStore.getState();

      push({ type: 'add', description: '1', data: { pageId: 'page-1' } });
      push({ type: 'add', description: '2', data: { pageId: 'page-1' } });
      push({ type: 'add', description: '3', data: { pageId: 'page-1' } });
      push({ type: 'add', description: '4', data: { pageId: 'page-1' } });

      const history = getHistory();
      expect(history).toHaveLength(3);
      expect(history[2].description).toBe('2'); // Oldest entry dropped
    });
  });

  describe('undo/redo', () => {
    it('should undo and redo actions', () => {
      const { push, undo, redo, canUndo, canRedo } = useHistoryStore.getState();

      push({ type: 'add', description: 'First', data: { pageId: 'page-1' } });
      push({ type: 'update', description: 'Second', data: { pageId: 'page-1' } });

      expect(canUndo()).toBe(true);
      expect(canRedo()).toBe(false);

      const undone = undo();
      expect(undone?.description).toBe('Second');
      expect(canRedo()).toBe(true);

      const redone = redo();
      expect(redone?.description).toBe('Second');
    });

    it('should return null when cannot undo', () => {
      const { undo } = useHistoryStore.getState();
      expect(undo()).toBeNull();
    });

    it('should return null when cannot redo', () => {
      const { push, redo } = useHistoryStore.getState();
      push({ type: 'add', description: 'Only', data: { pageId: 'page-1' } });
      expect(redo()).toBeNull();
    });
  });

  describe('clear', () => {
    it('should clear all history', () => {
      const { push, clear, getHistory } = useHistoryStore.getState();

      push({ type: 'add', description: '1', data: { pageId: 'page-1' } });
      push({ type: 'add', description: '2', data: { pageId: 'page-1' } });

      clear();

      expect(getHistory()).toHaveLength(0);
    });
  });
});
