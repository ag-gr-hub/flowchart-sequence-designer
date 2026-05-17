import { describe, it, expect } from 'bun:test';
import { nearestInDirection } from '../ui/traversal.js';

describe('nearestInDirection', () => {
  const a = { id: 'a', x: 0, y: 0 };
  const right = { id: 'r', x: 100, y: 0 };
  const farRight = { id: 'fr', x: 300, y: 0 };
  const left = { id: 'l', x: -100, y: 0 };
  const up = { id: 'u', x: 0, y: -100 };
  const down = { id: 'd', x: 0, y: 100 };

  it('returns null when there are no candidates', () => {
    expect(nearestInDirection(0, 0, 'right', [])).toBeNull();
  });

  it('finds the nearest node to the right', () => {
    expect(nearestInDirection(a.x, a.y, 'right', [right, farRight])).toBe('r');
  });

  it('ignores nodes in the wrong direction', () => {
    expect(nearestInDirection(a.x, a.y, 'right', [left, up])).toBeNull();
  });

  it('picks the right axis for up vs down', () => {
    expect(nearestInDirection(a.x, a.y, 'up', [up, down])).toBe('u');
    expect(nearestInDirection(a.x, a.y, 'down', [up, down])).toBe('d');
  });

  it('respects the 45° cone — diagonal candidates resolve to the dominant axis', () => {
    // (50, 100) is 63° below horizontal — dy > dx, so it counts for "down", not "right".
    const diag = { id: 'diag', x: 50, y: 100 };
    expect(nearestInDirection(0, 0, 'right', [diag])).toBeNull();
    expect(nearestInDirection(0, 0, 'down', [diag])).toBe('diag');
  });

  it('excludes the origin itself', () => {
    const self = { id: 'self', x: 0, y: 0 };
    expect(nearestInDirection(0, 0, 'right', [self, right])).toBe('r');
  });
});
