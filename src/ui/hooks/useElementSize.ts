import { useEffect, useState, type RefObject } from 'react';

/**
 * Observes a ref'd element's bounding rect and reports its current size.
 * Returns `{ w: 0, h: 0 }` until the element mounts; updates on every
 * ResizeObserver tick. No-ops when `ResizeObserver` is unavailable (older
 * non-browser test envs).
 */
export function useElementSize<E extends Element>(
  ref: RefObject<E | null>,
): { w: number; h: number } {
  const [size, setSize] = useState<{ w: number; h: number }>({ w: 0, h: 0 });

  useEffect(() => {
    const el = ref.current;
    if (!el || typeof ResizeObserver === 'undefined') return;
    const measure = () => {
      const r = el.getBoundingClientRect();
      setSize({ w: r.width, h: r.height });
    };
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    measure();
    return () => ro.disconnect();
  }, [ref]);

  return size;
}
