import { useCallback, useRef, useState } from 'react';

const MAX_HISTORY = 80;

export interface HistoryApi<T> {
  state: T;
  /** Replace state without recording history (e.g. mid-drag). */
  apply: (next: T) => void;
  /** Replace state AND push the previous-to-this snapshot onto the undo stack. */
  applyAndPush: (next: T) => void;
  undo: () => void;
  redo: () => void;
  canUndo: boolean;
  canRedo: boolean;
}

/**
 * Linear undo/redo history bounded to MAX_HISTORY entries. The initial value
 * counts as the first entry, so calling `applyAndPush` then `undo` returns to
 * the initial state. `onChange` fires for every state replacement, including
 * undo/redo navigation.
 */
export function useHistory<T>(initial: T, onChange?: (next: T) => void): HistoryApi<T> {
  const [state, setState] = useState<T>(initial);
  const stackRef = useRef<T[]>([initial]);
  const idxRef = useRef(0);
  // Force re-renders when canUndo/canRedo flip (refs alone don't trigger renders).
  const [, setTick] = useState(0);
  const bump = () => setTick((n) => n + 1);

  const apply = useCallback(
    (next: T) => {
      setState(next);
      onChange?.(next);
    },
    [onChange],
  );

  const applyAndPush = useCallback(
    (next: T) => {
      const stack = stackRef.current.slice(0, idxRef.current + 1);
      stack.push(next);
      if (stack.length > MAX_HISTORY) stack.shift();
      stackRef.current = stack;
      idxRef.current = stack.length - 1;
      setState(next);
      onChange?.(next);
      bump();
    },
    [onChange],
  );

  const undo = useCallback(() => {
    if (idxRef.current <= 0) return;
    idxRef.current--;
    const next = stackRef.current[idxRef.current];
    setState(next);
    onChange?.(next);
    bump();
  }, [onChange]);

  const redo = useCallback(() => {
    if (idxRef.current >= stackRef.current.length - 1) return;
    idxRef.current++;
    const next = stackRef.current[idxRef.current];
    setState(next);
    onChange?.(next);
    bump();
  }, [onChange]);

  return {
    state,
    apply,
    applyAndPush,
    undo,
    redo,
    canUndo: idxRef.current > 0,
    canRedo: idxRef.current < stackRef.current.length - 1,
  };
}
