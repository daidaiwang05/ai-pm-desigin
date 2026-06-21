import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { cn, formatDate } from '@/lib/utils';

describe('cn (className utility)', () => {
  it('should merge class names', () => {
    const result = cn('text-red-500', 'text-blue-500');
    expect(result).toBe('text-blue-500');
  });

  it('should handle conditional classes', () => {
    const result = cn('base', true && 'active', false && 'hidden');
    expect(result).toContain('base');
    expect(result).toContain('active');
    expect(result).not.toContain('hidden');
  });

  it('should handle empty inputs', () => {
    expect(cn()).toBe('');
    expect(cn('', null, undefined)).toBe('');
  });

  it('should merge tailwind classes correctly', () => {
    const result = cn('px-4 py-2', 'px-6');
    expect(result).toBe('py-2 px-6');
  });
});

describe('formatDate', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2024-06-15T12:00:00Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should return "今天" for today', () => {
    expect(formatDate('2024-06-15T10:00:00Z')).toBe('今天');
  });

  it('should return "昨天" for yesterday', () => {
    expect(formatDate('2024-06-14T10:00:00Z')).toBe('昨天');
  });

  it('should return days ago for recent dates', () => {
    expect(formatDate('2024-06-12T10:00:00Z')).toBe('3 天前');
  });

  it('should return weeks ago for older dates', () => {
    expect(formatDate('2024-06-01T10:00:00Z')).toBe('2 周前');
  });

  it('should return formatted date for very old dates', () => {
    const result = formatDate('2024-01-01T10:00:00Z');
    // Should be a localized date string
    expect(result).toBeTruthy();
    expect(result).not.toBe('今天');
    expect(result).not.toBe('昨天');
  });
});
