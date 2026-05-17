import { useEffect } from 'react';

/**
 * A single keyboard command registration. `match` decides whether the
 * keydown event belongs to this command; `run` executes it. Returning
 * `true` from `run` signals that the event was handled — the hook calls
 * `preventDefault()` automatically.
 */
export interface KeyCommand {
  /** Return `true` when this command should handle the event. */
  match: (e: KeyboardEvent) => boolean;
  /** Execute the command. Return `true` to call `preventDefault()`. */
  run: (e: KeyboardEvent) => boolean | void;
}

// Helpers for building match predicates.
const isInput = (e: KeyboardEvent): boolean => {
  const tgt = e.target as HTMLElement | null;
  return !!(tgt && (tgt.tagName === 'INPUT' || tgt.tagName === 'TEXTAREA' || tgt.isContentEditable));
};

/**
 * Installs a single `keydown` listener on `window` that dispatches to the
 * first matching `KeyCommand` in the provided array. Commands at the front
 * of the list take priority — place more-specific bindings before generic
 * ones. Events targeted at `<input>` / `<textarea>` / `contentEditable`
 * elements are silently skipped so the editor never steals text-entry keys.
 *
 * Both `DiagramEditor` and `SequenceEditor` previously inlined an identical
 * pattern (check target tag → switch on key combos). Centralizing into this
 * hook deduplicates the boilerplate and keeps each command's match + action
 * colocated, making it easier to test and extend.
 *
 * @param commands  Ordered list of keyboard commands. Re-creating this array
 *   on every render is fine — the hook only uses the latest ref.
 * @param deps     Dependency array passed through to `useEffect` so the
 *   listener re-binds when relevant state changes.
 */
export function useEditorKeyboard(commands: KeyCommand[], deps: unknown[]): void {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (isInput(e)) return;
      for (const cmd of commands) {
        if (cmd.match(e)) {
          const handled = cmd.run(e);
          if (handled) e.preventDefault();
          return;
        }
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
}
