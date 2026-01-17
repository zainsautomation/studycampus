import { useCallback, useRef, useState } from 'react';

interface LongPressOptions {
  delay?: number;
  onLongPress: () => void;
  onClick?: () => void;
}

interface LongPressResult {
  onPointerDown: (e: React.PointerEvent) => void;
  onPointerUp: (e: React.PointerEvent) => void;
  onPointerLeave: (e: React.PointerEvent) => void;
  onPointerCancel: (e: React.PointerEvent) => void;
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

  const onPointerDown = useCallback((e: React.PointerEvent) => {
    e.preventDefault();
    startPressTimer();
  }, [startPressTimer]);

  const onPointerUp = useCallback((e: React.PointerEvent) => {
    clearPressTimer();
    if (!longPressTriggeredRef.current && onClick) {
      onClick();
    }
    setIsLongPressing(false);
  }, [clearPressTimer, onClick]);

  const onPointerLeave = useCallback(() => {
    clearPressTimer();
    setIsLongPressing(false);
  }, [clearPressTimer]);

  const onPointerCancel = useCallback(() => {
    clearPressTimer();
    setIsLongPressing(false);
  }, [clearPressTimer]);

  return {
    onPointerDown,
    onPointerUp,
    onPointerLeave,
    onPointerCancel,
    isLongPressing,
  };
}
