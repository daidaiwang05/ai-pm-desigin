import { describe, it, expect } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useAlignmentGuides } from '@/hooks/useAlignmentGuides';
import type { Component } from '@/types/schema';

function createComponent(overrides: Partial<Component> = {}): Component {
  return {
    id: `comp-${Math.random().toString(36).slice(2, 9)}`,
    pageId: 'page-1',
    componentType: 'Text',
    name: 'Test',
    props: {},
    layout: { x: 0, y: 0, w: 100, h: 50 },
    styles: {},
    interactions: [],
    states: {},
    sortOrder: 0,
    isLocked: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...overrides,
  };
}

describe('useAlignmentGuides', () => {
  it('should snap to left edge of another component', () => {
    const { result } = renderHook(() => useAlignmentGuides());

    const existing = createComponent({
      id: 'existing',
      layout: { x: 100, y: 100, w: 200, h: 100 },
    });

    const dragged = createComponent({
      id: 'dragged',
      layout: { x: 0, y: 0, w: 80, h: 40 },
    });

    // Propose position close to existing component's left edge (x=100)
    const alignment = result.current.calculateAlignment(
      dragged,
      [existing, dragged],
      103, // Within SNAP_THRESHOLD (5px)
      200
    );

    // Should snap to x=100 (existing component's left edge)
    expect(alignment.x).toBe(100);
  });

  it('should snap to center of another component', () => {
    const { result } = renderHook(() => useAlignmentGuides());

    const existing = createComponent({
      id: 'existing',
      layout: { x: 100, y: 100, w: 200, h: 100 },
    });

    const dragged = createComponent({
      id: 'dragged',
      layout: { x: 0, y: 0, w: 80, h: 40 },
    });

    // Existing center X = 100 + 200/2 = 200
    // Dragged center X = proposedX + 80/2
    // To snap dragged center to 200: proposedX + 40 = 200, so proposedX = 160
    const alignment = result.current.calculateAlignment(
      dragged,
      [existing, dragged],
      162, // Close to center
      200
    );

    expect(alignment.x).toBe(160);
  });

  it('should not snap when beyond threshold', () => {
    const { result } = renderHook(() => useAlignmentGuides());

    const existing = createComponent({
      id: 'existing',
      layout: { x: 100, y: 100, w: 200, h: 100 },
    });

    const dragged = createComponent({
      id: 'dragged',
      layout: { x: 0, y: 0, w: 80, h: 40 },
    });

    const alignment = result.current.calculateAlignment(
      dragged,
      [existing, dragged],
      500, // Far from any edge
      500
    );

    expect(alignment.x).toBe(500);
    expect(alignment.y).toBe(500);
  });

  it('should snap to page origin (0,0)', () => {
    const { result } = renderHook(() => useAlignmentGuides());

    const dragged = createComponent({
      id: 'dragged',
      layout: { x: 0, y: 0, w: 80, h: 40 },
    });

    const alignment = result.current.calculateAlignment(
      dragged,
      [dragged],
      3, // Close to x=0
      2  // Close to y=0
    );

    expect(alignment.x).toBe(0);
    expect(alignment.y).toBe(0);
  });

  it('should generate guides when snapping', () => {
    const { result } = renderHook(() => useAlignmentGuides());

    const existing = createComponent({
      id: 'existing',
      layout: { x: 100, y: 100, w: 200, h: 100 },
    });

    const dragged = createComponent({
      id: 'dragged',
      layout: { x: 0, y: 0, w: 80, h: 40 },
    });

    const alignment = result.current.calculateAlignment(
      dragged,
      [existing, dragged],
      103,
      102
    );

    expect(alignment.guides.length).toBeGreaterThan(0);
  });

  it('clearGuides should clear all guides', () => {
    const { result } = renderHook(() => useAlignmentGuides());

    act(() => {
      result.current.clearGuides();
    });

    expect(result.current.guides).toEqual([]);
  });
});
