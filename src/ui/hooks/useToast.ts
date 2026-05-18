import { useCallback, useState } from 'react';

export interface Toast {
  id: number;
  message: string;
  type: 'success' | 'error' | 'info';
}

let _toastSeq = 0;

/**
 * Minimal toast notification state. Returns `toasts` (current visible toasts)
 * and `showToast(message, type?)` to push a new one. Toasts auto-dismiss after
 * 3 seconds.
 */
export function useToast() {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const showToast = useCallback((message: string, type: Toast['type'] = 'info') => {
    const id = ++_toastSeq;
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3000);
  }, []);

  const dismissToast = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return { toasts, showToast, dismissToast };
}
