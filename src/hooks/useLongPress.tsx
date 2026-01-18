import { useCallback, useRef } from 'react';

interface LongPressOptions {
  delay?: number;
  onLongPress: () => void;
  onClick?: () => void;
}

interface LongPressHandlers {
  onTouchStart: (e: React.TouchEvent) => void;
  onTouchEnd: (e: React.TouchEvent) => void;
  onTouchMove: (e: React.TouchEvent) => void;
  onMouseDown: (e: React.MouseEvent) => void;
  onMouseUp: (e: React.MouseEvent) => void;
  onMouseLeave: (e: React.MouseEvent) => void;
}

export function useLongPress({
  delay = 600,
  onLongPress,
  onClick,
}: LongPressOptions): LongPressHandlers {
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const longPressTriggeredRef = useRef(false);
  const startPosRef = useRef<{ x: number; y: number } | null>(null);

  const clear = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const handlers: LongPressHandlers = {
    onTouchStart: (e: React.TouchEvent) => {
      const touch = e.touches[0];
      startPosRef.current = { x: touch.clientX, y: touch.clientY };
      longPressTriggeredRef.current = false;

      timerRef.current = setTimeout(() => {
        // If touch was cancelled by scrolling/moving, startPosRef will be null
        if (startPosRef.current) {
          longPressTriggeredRef.current = true;
          onLongPress();
        }
      }, delay);
    },

    onTouchEnd: (e: React.TouchEvent) => {
      const wasCancelled = startPosRef.current === null;
      clear();

      if (longPressTriggeredRef.current) {
        e.preventDefault();
      } else if (onClick && !wasCancelled) {
        onClick();
      }

      startPosRef.current = null;
    },

    onTouchMove: (e: React.TouchEvent) => {
      if (startPosRef.current) {
        const touch = e.touches[0];
        const dx = Math.abs(touch.clientX - startPosRef.current.x);
        const dy = Math.abs(touch.clientY - startPosRef.current.y);

        // Cancel the long-press as soon as user starts scrolling/dragging.
        // Keep this small to avoid accidental opens while scrolling.
        if (dx > 5 || dy > 5) {
          clear();
          startPosRef.current = null;
        }
      }
    },

    onMouseDown: () => {
      longPressTriggeredRef.current = false;
      timerRef.current = setTimeout(() => {
        longPressTriggeredRef.current = true;
        onLongPress();
      }, delay);
    },

    onMouseUp: () => {
      clear();
      if (!longPressTriggeredRef.current && onClick) {
        onClick();
      }
    },

    onMouseLeave: () => {
      clear();
    },
  };

  return handlers;
}
