import { useEffect, type RefObject } from 'react';

interface Transform {
  x: number;
  y: number;
  scale: number;
}

/**
 * Attaches a non-passive wheel listener that pans + zooms `transform` around
 * the cursor position. Non-passive is required so we can `preventDefault()`
 * the page scroll on the canvas.
 */
export function useCanvasWheel(
  ref: RefObject<SVGSVGElement | null>,
  setTransform: (updater: (t: Transform) => Transform) => void,
  options: { min?: number; max?: number; factor?: number } = {},
): void {
  const { min = 0.15, max = 3, factor = 0.1 } = options;
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const rect = el.getBoundingClientRect();
      const px = e.clientX - rect.left;
      const py = e.clientY - rect.top;
      const delta = e.deltaY > 0 ? 1 - factor : 1 + factor;
      setTransform((tr) => {
        const scale = Math.min(max, Math.max(min, tr.scale * delta));
        return {
          scale,
          x: px - (px - tr.x) * (scale / tr.scale),
          y: py - (py - tr.y) * (scale / tr.scale),
        };
      });
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, [ref, setTransform, min, max, factor]);
}
