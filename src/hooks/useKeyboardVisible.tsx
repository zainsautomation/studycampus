import { useState, useEffect, useCallback } from 'react';

/**
 * Hook to detect if the virtual keyboard is visible on mobile devices.
 * Works on both Android Chrome and iOS Safari.
 */
export function useKeyboardVisible() {
  const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);

  const handleFocusIn = useCallback((e: FocusEvent) => {
    const target = e.target as HTMLElement;
    // Check if the focused element is an input, textarea, or contenteditable
    if (
      target.tagName === 'INPUT' ||
      target.tagName === 'TEXTAREA' ||
      target.isContentEditable ||
      target.getAttribute('contenteditable') === 'true' ||
      target.closest('[contenteditable="true"]')
    ) {
      setIsKeyboardVisible(true);
    }
  }, []);

  const handleFocusOut = useCallback((e: FocusEvent) => {
    // Small delay to handle focus switching between inputs
    setTimeout(() => {
      const activeElement = document.activeElement as HTMLElement;
      if (
        !activeElement ||
        (activeElement.tagName !== 'INPUT' &&
          activeElement.tagName !== 'TEXTAREA' &&
          !activeElement.isContentEditable &&
          activeElement.getAttribute('contenteditable') !== 'true' &&
          !activeElement.closest('[contenteditable="true"]'))
      ) {
        setIsKeyboardVisible(false);
      }
    }, 100);
  }, []);

  // iOS-specific: detect viewport resize which happens when keyboard appears
  const handleResize = useCallback(() => {
    // On iOS, when keyboard opens, visualViewport.height decreases
    if (window.visualViewport) {
      const heightDiff = window.innerHeight - window.visualViewport.height;
      // If the viewport shrinks by more than 150px, keyboard is likely open
      if (heightDiff > 150) {
        setIsKeyboardVisible(true);
      }
    }
  }, []);

  useEffect(() => {
    document.addEventListener('focusin', handleFocusIn);
    document.addEventListener('focusout', handleFocusOut);
    
    // Add visualViewport listener for iOS
    if (window.visualViewport) {
      window.visualViewport.addEventListener('resize', handleResize);
    }

    return () => {
      document.removeEventListener('focusin', handleFocusIn);
      document.removeEventListener('focusout', handleFocusOut);
      if (window.visualViewport) {
        window.visualViewport.removeEventListener('resize', handleResize);
      }
    };
  }, [handleFocusIn, handleFocusOut, handleResize]);

  return isKeyboardVisible;
}
