/**
 * @file useThrottledBroadcast.test.ts
 * @description Testes REAIS para useThrottledBroadcast - importa e executa o hook de produção
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useThrottledBroadcast } from './useThrottledBroadcast';
import React from 'react';

// Mock BroadcastChannel
class MockBroadcastChannel {
  name: string;
  postMessage = vi.fn();
  close = vi.fn();
  onmessage: ((event: MessageEvent) => void) | null = null;
  onerror: ((event: Event) => void) | null = null;

  constructor(name: string) {
    this.name = name;
  }
}

describe('useThrottledBroadcast', () => {
  let mockChannel: MockBroadcastChannel;
  let channelRef: React.RefObject<BroadcastChannel | null>;

  beforeEach(() => {
    vi.useFakeTimers();
    mockChannel = new MockBroadcastChannel('test-channel');
    channelRef = { current: mockChannel as unknown as BroadcastChannel };
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  describe('Initialization', () => {
    it('should return a broadcast function', () => {
      const { result } = renderHook(() => useThrottledBroadcast(channelRef, 1000));

      expect(typeof result.current).toBe('function');
    });
  });

  describe('Immediate broadcast', () => {
    it('should broadcast immediately on first call', () => {
      const { result } = renderHook(() => useThrottledBroadcast(channelRef, 1000));

      act(() => {
        result.current({ type: 'test', data: 'first' });
      });

      expect(mockChannel.postMessage).toHaveBeenCalledTimes(1);
      expect(mockChannel.postMessage).toHaveBeenCalledWith({ type: 'test', data: 'first' });
    });

    it('should broadcast immediately after throttle window passes', () => {
      const { result } = renderHook(() => useThrottledBroadcast(channelRef, 1000));

      act(() => {
        result.current({ type: 'first' });
      });

      // Advance time past throttle window
      act(() => {
        vi.advanceTimersByTime(1100);
      });

      act(() => {
        result.current({ type: 'second' });
      });

      expect(mockChannel.postMessage).toHaveBeenCalledTimes(2);
    });
  });

  describe('Throttling', () => {
    it('should not broadcast immediately within throttle window', () => {
      const { result } = renderHook(() => useThrottledBroadcast(channelRef, 1000));

      act(() => {
        result.current({ type: 'first' });
      });

      act(() => {
        result.current({ type: 'second' });
      });

      // Only first should have been sent immediately
      expect(mockChannel.postMessage).toHaveBeenCalledTimes(1);
      expect(mockChannel.postMessage).toHaveBeenCalledWith({ type: 'first' });
    });

    it('should send trailing message after throttle window', () => {
      const { result } = renderHook(() => useThrottledBroadcast(channelRef, 1000));

      act(() => {
        result.current({ type: 'first' });
      });

      act(() => {
        result.current({ type: 'trailing' });
      });

      // Advance time to trigger trailing
      act(() => {
        vi.advanceTimersByTime(1100);
      });

      expect(mockChannel.postMessage).toHaveBeenCalledTimes(2);
      expect(mockChannel.postMessage).toHaveBeenLastCalledWith({ type: 'trailing' });
    });

    it('should only send last message when multiple are queued', () => {
      const { result } = renderHook(() => useThrottledBroadcast(channelRef, 1000));

      act(() => {
        result.current({ type: 'first' });
        result.current({ type: 'second' });
        result.current({ type: 'third' });
        result.current({ type: 'last' });
      });

      // Advance time to trigger trailing
      act(() => {
        vi.advanceTimersByTime(1100);
      });

      // First + last trailing
      expect(mockChannel.postMessage).toHaveBeenCalledTimes(2);
      expect(mockChannel.postMessage).toHaveBeenLastCalledWith({ type: 'last' });
    });
  });

  describe('Null channel handling', () => {
    it('should not throw when channel is null', () => {
      const nullRef: React.RefObject<BroadcastChannel | null> = { current: null };
      const { result } = renderHook(() => useThrottledBroadcast(nullRef, 1000));

      expect(() => {
        act(() => {
          result.current({ type: 'test' });
        });
      }).not.toThrow();
    });
  });

  describe('Custom throttle interval', () => {
    it('should respect custom throttle interval', () => {
      const { result } = renderHook(() => useThrottledBroadcast(channelRef, 500));

      act(() => {
        result.current({ type: 'first' });
        result.current({ type: 'second' });
      });

      // Advance half the throttle time
      act(() => {
        vi.advanceTimersByTime(300);
      });

      // Still only first sent
      expect(mockChannel.postMessage).toHaveBeenCalledTimes(1);

      // Advance past throttle
      act(() => {
        vi.advanceTimersByTime(300);
      });

      // Now trailing should be sent
      expect(mockChannel.postMessage).toHaveBeenCalledTimes(2);
    });
  });

  describe('Cleanup', () => {
    it('should clear pending timer on unmount', () => {
      const { result, unmount } = renderHook(() => useThrottledBroadcast(channelRef, 1000));

      act(() => {
        result.current({ type: 'first' });
        result.current({ type: 'pending' });
      });

      // Unmount before trailing fires
      unmount();

      // Advance time
      act(() => {
        vi.advanceTimersByTime(1100);
      });

      // Trailing should NOT have been sent (timer was cleared)
      expect(mockChannel.postMessage).toHaveBeenCalledTimes(1);
    });
  });
});
