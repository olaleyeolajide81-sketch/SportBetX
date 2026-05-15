import { renderHook, act } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { useDebounce } from '../hooks/useDebounce';

describe('useDebounce', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('returns the initial value immediately', () => {
    const { result } = renderHook(() => useDebounce('hello', 300));
    expect(result.current).toBe('hello');
  });

  it('does not update before the delay elapses', () => {
    const { result, rerender } = renderHook(({ value }) => useDebounce(value, 300), {
      initialProps: { value: 'hello' },
    });
    rerender({ value: 'world' });
    act(() => { vi.advanceTimersByTime(200); });
    expect(result.current).toBe('hello');
  });

  it('updates after the delay elapses', () => {
    const { result, rerender } = renderHook(({ value }) => useDebounce(value, 300), {
      initialProps: { value: 'hello' },
    });
    rerender({ value: 'world' });
    act(() => { vi.advanceTimersByTime(300); });
    expect(result.current).toBe('world');
  });

  it('only applies the last value when updated rapidly', () => {
    const { result, rerender } = renderHook(({ value }) => useDebounce(value, 300), {
      initialProps: { value: 'a' },
    });
    rerender({ value: 'b' });
    act(() => { vi.advanceTimersByTime(100); });
    rerender({ value: 'c' });
    act(() => { vi.advanceTimersByTime(300); });
    expect(result.current).toBe('c');
  });

  it('uses 300ms default delay', () => {
    const { result, rerender } = renderHook(({ value }) => useDebounce(value), {
      initialProps: { value: 'initial' },
    });
    rerender({ value: 'updated' });
    act(() => { vi.advanceTimersByTime(299); });
    expect(result.current).toBe('initial');
    act(() => { vi.advanceTimersByTime(1); });
    expect(result.current).toBe('updated');
  });
});
