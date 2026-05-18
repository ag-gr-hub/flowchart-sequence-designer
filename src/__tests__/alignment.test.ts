import { describe, it, expect } from 'bun:test';
import { findSiblingSnap, ALIGN_SNAP_THRESHOLD } from '../ui/alignment.js';

describe('findSiblingSnap', () => {
  it('returns the input position when there are no siblings', () => {
    const r = findSiblingSnap({ x: 100, y: 100, w: 80, h: 40 }, []);
    expect(r.x).toBe(100);
    expect(r.y).toBe(100);
    expect(r.guideX).toBeUndefined();
    expect(r.guideY).toBeUndefined();
  });

  it('snaps left-to-left when within threshold', () => {
    const r = findSiblingSnap({ x: 102, y: 200, w: 80, h: 40 }, [{ x: 100, y: 50, w: 80, h: 40 }]);
    expect(r.x).toBe(100);
    expect(r.guideX?.pos).toBe(100);
  });

  it('snaps horizontal centers', () => {
    // sibling center = 200; dragged center should align there.
    // dragged.w = 80, so dragged.x must become 160.
    const r = findSiblingSnap({ x: 158, y: 0, w: 80, h: 40 }, [{ x: 160, y: 100, w: 80, h: 40 }]);
    expect(r.x).toBe(160);
  });

  it('snaps top edges', () => {
    const r = findSiblingSnap({ x: 500, y: 103, w: 60, h: 40 }, [{ x: 100, y: 100, w: 60, h: 40 }]);
    expect(r.y).toBe(100);
    expect(r.guideY?.pos).toBe(100);
  });

  it('does NOT snap when delta exceeds threshold', () => {
    const r = findSiblingSnap({ x: 200, y: 200, w: 80, h: 40 }, [{ x: 100, y: 100, w: 80, h: 40 }]);
    expect(r.x).toBe(200);
    expect(r.y).toBe(200);
    expect(r.guideX).toBeUndefined();
    expect(r.guideY).toBeUndefined();
  });

  it('picks the closest sibling when multiple are within threshold', () => {
    const r = findSiblingSnap({ x: 101, y: 0, w: 80, h: 40 }, [
      { x: 100, y: 0, w: 80, h: 40 }, // 1 px away
      { x: 103, y: 0, w: 80, h: 40 }, // 2 px away
    ]);
    expect(r.x).toBe(100);
  });

  it('reports a guide that spans both boxes vertically with padding', () => {
    const r = findSiblingSnap({ x: 100, y: 200, w: 80, h: 40 }, [{ x: 100, y: 50, w: 80, h: 40 }]);
    expect(r.guideX).toBeDefined();
    expect(r.guideX!.minY).toBeLessThan(50); // includes padding
    expect(r.guideX!.maxY).toBeGreaterThan(240); // 200 + 40
  });

  it('threshold is configurable', () => {
    expect(ALIGN_SNAP_THRESHOLD).toBeGreaterThan(0);
    const r = findSiblingSnap({ x: 110, y: 0, w: 80, h: 40 }, [{ x: 100, y: 0, w: 80, h: 40 }], 20);
    expect(r.x).toBe(100); // threshold of 20 catches a 10px delta
  });
});
