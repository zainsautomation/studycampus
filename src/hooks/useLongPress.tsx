import { useCallback, useRef, useState } from 'react';

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
        longPressTriggeredRef.current = true;
        onLongPress();
      }, delay);
    },
    
    onTouchEnd: (e: React.TouchEvent) => {
      clear();
      if (longPressTriggeredRef.current) {
        e.preventDefault();
      } else if (onClick) {
        onClick();
      }
      startPosRef.current = null;
    },
    
    onTouchMove: (e: React.TouchEvent) => {
      if (startPosRef.current) {
        const touch = e.touches[0];
        const dx = Math.abs(touch.clientX - startPosRef.current.x);
        const dy = Math.abs(touch.clientY - startPosRef.current.y);
        if (dx > 10 || dy > 10) {
          clear();
        }
      }
    },
    
    onMouseDown: (e: React.MouseEvent) => {
      longPressTriggeredRef.current = false;
      timerRef.current = setTimeout(() => {
        longPressTriggeredRef.current = true;
        onLongPress();
      }, delay);
    },
    
    onMouseUp: (e: React.MouseEvent) => {
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
