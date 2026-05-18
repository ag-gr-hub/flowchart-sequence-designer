import { useEffect, type RefObject } from 'react';

interface Transform {
  x: number;
  y: number;
  scale: number;
}

interface UseCanvasTouchOptions {
  /** Current pan/zoom transform — read at touch-start to seed the gesture. */
  transform: Transform;
  /** Updater applied while the gesture runs. */
  setTransform: (next: Transform | ((tr: Transform) => Transform)) => void;
  /** Fired after ~550 ms of stationary contact. Cancelled by movement. */
  onLongPress: (clientX: number, clientY: number) => void;
  /** Min/max scale for pinch zoom (defaults match the wheel hook). */
  minScale?: number;
  maxScale?: number;
  /** Long-press duration and pixels-of-slop allowance before cancel. */
  longPressMs?: number;
  longPressSlop?: number;
}

/**
 * Touch gesture wiring for the canvas SVG: single-finger pan on the
 * background, two-finger pinch zoom anywhere, and long-press to fire
 * `onLongPress` (typically opens the context menu). The synthetic `click`
 * that follows a fired long-press is swallowed so the menu isn't dismissed
 * immediately.
 */
export function useCanvasTouch(
  ref: RefObject<SVGSVGElement>,
  {
    transform,
    setTransform,
    onLongPress,
    minScale = 0.15,
    maxScale = 3,
    longPressMs = 550,
    longPressSlop = 8,
  }: UseCanvasTouchOptions,
): void {
  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    let touchPan: { ox: number; oy: number; tx: number; ty: number } | null = null;
    let pinch: {
      dist: number;
      cx: number;
      cy: number;
      scale: number;
      tx: number;
      ty: number;
    } | null = null;
    let longPressTimer: ReturnType<typeof setTimeout> | null = null;
    let longPressStart: { x: number; y: number } | null = null;
    let longPressFired = false;

    const dist = (a: Touch, b: Touch) => Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY);

    const cancelLongPress = () => {
      if (longPressTimer) {
        clearTimeout(longPressTimer);
        longPressTimer = null;
      }
      longPressStart = null;
    };

    const onStart = (e: TouchEvent) => {
      if (e.touches.length === 2) {
        e.preventDefault();
        cancelLongPress();
        const [a, b] = [e.touches[0]!, e.touches[1]!];
        const rect = el.getBoundingClientRect();
        pinch = {
          dist: dist(a, b),
          cx: (a.clientX + b.clientX) / 2 - rect.left,
          cy: (a.clientY + b.clientY) / 2 - rect.top,
          scale: transform.scale,
          tx: transform.x,
          ty: transform.y,
        };
        touchPan = null;
        return;
      }
      if (e.touches.length === 1) {
        const target = e.target as SVGElement | null;
        const t0 = e.touches[0]!;
        longPressFired = false;
        longPressStart = { x: t0.clientX, y: t0.clientY };
        longPressTimer = setTimeout(() => {
          if (!longPressStart) return;
          longPressFired = true;
          touchPan = null;
          onLongPress(longPressStart.x, longPressStart.y);
        }, longPressMs);
        if (target?.dataset.bg !== '1' && target !== el) return;
        touchPan = { ox: t0.clientX, oy: t0.clientY, tx: transform.x, ty: transform.y };
      }
    };

    const onMove = (e: TouchEvent) => {
      if (pinch && e.touches.length === 2) {
        e.preventDefault();
        const [a, b] = [e.touches[0]!, e.touches[1]!];
        const ratio = dist(a, b) / pinch.dist;
        const scale = Math.min(maxScale, Math.max(minScale, pinch.scale * ratio));
        setTransform({
          scale,
          x: pinch.cx - (pinch.cx - pinch.tx) * (scale / pinch.scale),
          y: pinch.cy - (pinch.cy - pinch.ty) * (scale / pinch.scale),
        });
        return;
      }
      if (e.touches.length === 1) {
        const t0 = e.touches[0]!;
        if (
          longPressStart &&
          (Math.abs(t0.clientX - longPressStart.x) > longPressSlop ||
            Math.abs(t0.clientY - longPressStart.y) > longPressSlop)
        ) {
          cancelLongPress();
        }
        if (touchPan) {
          e.preventDefault();
          const pan = touchPan;
          setTransform((tr) => ({
            ...tr,
            x: pan.tx + (t0.clientX - pan.ox),
            y: pan.ty + (t0.clientY - pan.oy),
          }));
        }
      }
    };

    const onEnd = (e: TouchEvent) => {
      cancelLongPress();
      if (longPressFired) {
        e.preventDefault();
        longPressFired = false;
      }
      if (e.touches.length === 0) {
        touchPan = null;
        pinch = null;
      }
      if (e.touches.length === 1) pinch = null;
    };

    el.addEventListener('touchstart', onStart, { passive: false });
    el.addEventListener('touchmove', onMove, { passive: false });
    el.addEventListener('touchend', onEnd);
    el.addEventListener('touchcancel', onEnd);
    return () => {
      cancelLongPress();
      el.removeEventListener('touchstart', onStart);
      el.removeEventListener('touchmove', onMove);
      el.removeEventListener('touchend', onEnd);
      el.removeEventListener('touchcancel', onEnd);
    };
  }, [
    ref,
    transform.scale,
    transform.x,
    transform.y,
    setTransform,
    onLongPress,
    minScale,
    maxScale,
    longPressMs,
    longPressSlop,
  ]);
}
