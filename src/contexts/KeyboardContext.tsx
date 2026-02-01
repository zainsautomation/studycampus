import { createContext, useContext, ReactNode } from 'react';
import { useKeyboardVisible } from '@/hooks/useKeyboardVisible';

interface KeyboardContextValue {
  isKeyboardVisible: boolean;
}

const KeyboardContext = createContext<KeyboardContextValue>({ isKeyboardVisible: false });

export function KeyboardProvider({ children }: { children: ReactNode }) {
  const isKeyboardVisible = useKeyboardVisible();
  
  return (
    <KeyboardContext.Provider value={{ isKeyboardVisible }}>
      {children}
    </KeyboardContext.Provider>
  );
}

export function useKeyboard() {
  return useContext(KeyboardContext);
}
