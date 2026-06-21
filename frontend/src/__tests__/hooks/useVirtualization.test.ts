import { describe, it, expect } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useVirtualization } from '@/hooks/useVirtualization';
import type { Component } from '@/types/schema';

function createComponent(overrides: Partial<Component> = {}): Component {
  return {
    id: `comp-${Math.random().toString(36).slice(2, 9)}`,
    pageId: 'page-1',
    componentType: 'Text',
    name: 'Test',
    props: { content: 'Hello' },
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

describe('useVirtualization', () => {
  it('should filter visible components within viewport', () => {
    const { result } = renderHook(() =>
      useVirtualization({
        viewportWidth: 1000,
        viewportHeight: 800,
        scale: 1,
        offsetX: 0,
        offsetY: 0,
        overscan: 0,
      })
    );

    const components = [
      createComponent({ layout: { x: 50, y: 50, w: 100, h: 50 } }), // Visible
      createComponent({ layout: { x: 2000, y: 2000, w: 100, h: 50 } }), // Outside viewport
      createComponent({ layout: { x: 800, y: 600, w: 100, h: 50 } }), // Visible (edge)
    ];

    const visible = result.current.filterVisibleComponents(components);
    expect(visible).toHaveLength(2);
  });

  it('should include components in overscan area', () => {
    const { result } = renderHook(() =>
      useVirtualization({
        viewportWidth: 1000,
        viewportHeight: 800,
        scale: 1,
        offsetX: 0,
        offsetY: 0,
        overscan: 200,
      })
    );

    const components = [
      createComponent({ layout: { x: 50, y: 50, w: 100, h: 50 } }), // Visible
      createComponent({ layout: { x: 1100, y: 50, w: 100, h: 50 } }), // In overscan
      createComponent({ layout: { x: 2000, y: 2000, w: 100, h: 50 } }), // Outside
    ];

    const visible = result.current.filterVisibleComponents(components);
    expect(visible).toHaveLength(2);
  });

  it('should handle zoomed out view (scale < 1)', () => {
    const { result } = renderHook(() =>
      useVirtualization({
        viewportWidth: 1000,
        viewportHeight: 800,
        scale: 0.5,
        offsetX: 0,
        offsetY: 0,
        overscan: 0,
      })
    );

    // At scale 0.5, visible area is 2000x1600 in canvas coordinates
    const components = [
      createComponent({ layout: { x: 1500, y: 1200, w: 100, h: 50 } }), // Visible at 0.5x
      createComponent({ layout: { x: 3000, y: 3000, w: 100, h: 50 } }), // Outside
    ];

    const visible = result.current.filterVisibleComponents(components);
    expect(visible).toHaveLength(1);
  });

  it('should handle panned view (non-zero offset)', () => {
    const { result } = renderHook(() =>
      useVirtualization({
        viewportWidth: 1000,
        viewportHeight: 800,
        scale: 1,
        offsetX: -500,
        offsetY: -300,
        overscan: 0,
      })
    );

    const components = [
      createComponent({ layout: { x: 600, y: 400, w: 100, h: 50 } }), // Visible after pan
      createComponent({ layout: { x: 0, y: 0, w: 100, h: 50 } }), // Outside after pan
    ];

    const visible = result.current.filterVisibleComponents(components);
    expect(visible).toHaveLength(1);
  });

  it('isComponentVisible should return correct boolean', () => {
    const { result } = renderHook(() =>
      useVirtualization({
        viewportWidth: 1000,
        viewportHeight: 800,
        scale: 1,
        offsetX: 0,
        offsetY: 0,
        overscan: 0,
      })
    );

    const visibleComp = createComponent({ layout: { x: 50, y: 50, w: 100, h: 50 } });
    const hiddenComp = createComponent({ layout: { x: 2000, y: 2000, w: 100, h: 50 } });

    expect(result.current.isComponentVisible(visibleComp)).toBe(true);
    expect(result.current.isComponentVisible(hiddenComp)).toBe(false);
  });

  it('should handle empty component list', () => {
    const { result } = renderHook(() =>
      useVirtualization({
        viewportWidth: 1000,
        viewportHeight: 800,
        scale: 1,
        offsetX: 0,
        offsetY: 0,
      })
    );

    expect(result.current.filterVisibleComponents([])).toEqual([]);
  });
});
