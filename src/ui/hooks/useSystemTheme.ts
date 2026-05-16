import { useEffect, useState } from 'react';

/**
 * Resolves `'auto'` to the OS's current `prefers-color-scheme` and updates
 * when it flips. Returns `true` for dark, `false` for light. `'light'` and
 * `'dark'` short-circuit to a constant value.
 */
export function useIsDark(theme: 'light' | 'dark' | 'auto'): boolean {
  const [sysDark, setSysDark] = useState<boolean>(() =>
    typeof window !== 'undefined'
      ? window.matchMedia('(prefers-color-scheme: dark)').matches
      : false,
  );
  useEffect(() => {
    if (theme !== 'auto' || typeof window === 'undefined') return;
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = (e: MediaQueryListEvent) => setSysDark(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, [theme]);
  return theme === 'dark' || (theme === 'auto' && sysDark);
}

/**
 * Tracks the user's `prefers-reduced-motion` preference. Returns `true` if
 * the user has requested reduced motion. Listens for changes.
 */
export function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = useState<boolean>(() =>
    typeof window !== 'undefined'
      ? window.matchMedia('(prefers-reduced-motion: reduce)').matches
      : false,
  );
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const handler = (e: MediaQueryListEvent) => setReduced(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);
  return reduced;
}
