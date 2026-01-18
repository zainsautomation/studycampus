import { useCallback, useRef, useState } from 'react';

interface LongPressOptions {
  delay?: number;
  onLongPress: () => void;
  onClick?: () => void;
}

interface LongPressResult {
  onTouchStart: (e: React.TouchEvent) => void;
  onTouchEnd: (e: React.TouchEvent) => void;
  onTouchMove: (e: React.TouchEvent) => void;
  onMouseDown: (e: React.MouseEvent) => void;
  onMouseUp: (e: React.MouseEvent) => void;
  onMouseLeave: (e: React.MouseEvent) => void;
  isLongPressing: boolean;
}

export function useLongPress({
  delay = 600,
  onLongPress,
  onClick,
}: LongPressOptions): LongPressResult {
  const [isLongPressing, setIsLongPressing] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const longPressTriggeredRef = useRef(false);
  const startPosRef = useRef<{ x: number; y: number } | null>(null);

  const startPressTimer = useCallback(() => {
    longPressTriggeredRef.current = false;
    timerRef.current = setTimeout(() => {
      longPressTriggeredRef.current = true;
      setIsLongPressing(true);
      onLongPress();
    }, delay);
  }, [delay, onLongPress]);

  const clearPressTimer = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  // Touch events for mobile
  const onTouchStart = useCallback((e: React.TouchEvent) => {
    const touch = e.touches[0];
    startPosRef.current = { x: touch.clientX, y: touch.clientY };
    startPressTimer();
  }, [startPressTimer]);

  const onTouchEnd = useCallback((e: React.TouchEvent) => {
    clearPressTimer();
    if (longPressTriggeredRef.current) {
      e.preventDefault(); // Prevent click after long press
    } else if (onClick) {
      onClick();
    }
    setIsLongPressing(false);
    startPosRef.current = null;
  }, [clearPressTimer, onClick]);

  const onTouchMove = useCallback((e: React.TouchEvent) => {
    // Cancel long press if user moves finger too much
    if (startPosRef.current) {
      const touch = e.touches[0];
      const dx = Math.abs(touch.clientX - startPosRef.current.x);
      const dy = Math.abs(touch.clientY - startPosRef.current.y);
      if (dx > 10 || dy > 10) {
        clearPressTimer();
        setIsLongPressing(false);
      }
    }
  }, [clearPressTimer]);

  // Mouse events for desktop
  const onMouseDown = useCallback((e: React.MouseEvent) => {
    // Skip if this is a touch device (touch events will handle it)
    if (e.nativeEvent instanceof PointerEvent && e.nativeEvent.pointerType === 'touch') {
      return;
    }
    startPressTimer();
  }, [startPressTimer]);

  const onMouseUp = useCallback((e: React.MouseEvent) => {
    clearPressTimer();
    if (!longPressTriggeredRef.current && onClick) {
      onClick();
    }
    setIsLongPressing(false);
  }, [clearPressTimer, onClick]);

  const onMouseLeave = useCallback(() => {
    clearPressTimer();
    setIsLongPressing(false);
  }, [clearPressTimer]);

  return {
    onTouchStart,
    onTouchEnd,
    onTouchMove,
    onMouseDown,
    onMouseUp,
    onMouseLeave,
    isLongPressing,
  };
}
