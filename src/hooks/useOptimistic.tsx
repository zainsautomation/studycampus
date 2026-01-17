import { useState, useCallback } from 'react';
import { toast } from '@/hooks/use-toast';

interface UseOptimisticOptions<T> {
  onSuccess?: (result: T) => void;
  onError?: (error: Error) => void;
  successMessage?: string;
  errorMessage?: string;
}

export function useOptimistic<T, Args extends unknown[]>(
  asyncFn: (...args: Args) => Promise<T>,
  options: UseOptimisticOptions<T> = {}
) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const execute = useCallback(
    async (...args: Args): Promise<T | null> => {
      setIsLoading(true);
      setError(null);

      try {
        const result = await asyncFn(...args);
        
        if (options.successMessage) {
          toast({
            title: 'Success',
            description: options.successMessage,
          });
        }
        
        options.onSuccess?.(result);
        return result;
      } catch (err) {
        const error = err instanceof Error ? err : new Error('An error occurred');
        setError(error);
        
        toast({
          title: 'Error',
          description: options.errorMessage || error.message,
          variant: 'destructive',
        });
        
        options.onError?.(error);
        return null;
      } finally {
        setIsLoading(false);
      }
    },
    [asyncFn, options]
  );

  return { execute, isLoading, error };
}

// Hook for optimistic state updates with rollback
export function useOptimisticState<T>(initialValue: T) {
  const [value, setValue] = useState<T>(initialValue);
  const [previousValue, setPreviousValue] = useState<T>(initialValue);

  const optimisticUpdate = useCallback((newValue: T) => {
    setPreviousValue(value);
    setValue(newValue);
  }, [value]);

  const rollback = useCallback(() => {
    setValue(previousValue);
  }, [previousValue]);

  const confirm = useCallback(() => {
    setPreviousValue(value);
  }, [value]);

  return {
    value,
    setValue,
    optimisticUpdate,
    rollback,
    confirm,
  };
}

// Hook for optimistic list mutations
export function useOptimisticList<T extends { id: string }>(initialItems: T[]) {
  const [items, setItems] = useState<T[]>(initialItems);
  const [pendingChanges, setPendingChanges] = useState<Map<string, T>>(new Map());

  const optimisticAdd = useCallback((item: T) => {
    setItems(prev => [...prev, item]);
    setPendingChanges(prev => new Map(prev).set(item.id, item));
  }, []);

  const optimisticRemove = useCallback((id: string) => {
    const removedItem = items.find(i => i.id === id);
    if (removedItem) {
      setPendingChanges(prev => new Map(prev).set(id, removedItem));
      setItems(prev => prev.filter(i => i.id !== id));
    }
  }, [items]);

  const optimisticUpdate = useCallback((id: string, updates: Partial<T>) => {
    const originalItem = items.find(i => i.id === id);
    if (originalItem) {
      setPendingChanges(prev => new Map(prev).set(id, originalItem));
      setItems(prev => prev.map(i => i.id === id ? { ...i, ...updates } : i));
    }
  }, [items]);

  const rollback = useCallback((id: string) => {
    const original = pendingChanges.get(id);
    if (original) {
      // Check if it was a remove (item exists in pending but not in current)
      const currentItem = items.find(i => i.id === id);
      if (!currentItem) {
        // It was a remove, restore the item
        setItems(prev => [...prev, original]);
      } else {
        // It was an update, restore original values
        setItems(prev => prev.map(i => i.id === id ? original : i));
      }
      setPendingChanges(prev => {
        const next = new Map(prev);
        next.delete(id);
        return next;
      });
    }
  }, [items, pendingChanges]);

  const confirm = useCallback((id: string) => {
    setPendingChanges(prev => {
      const next = new Map(prev);
      next.delete(id);
      return next;
    });
  }, []);

  return {
    items,
    setItems,
    optimisticAdd,
    optimisticRemove,
    optimisticUpdate,
    rollback,
    confirm,
  };
}
