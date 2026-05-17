/**
 * Geometric graph traversal — picks the nearest sibling node in a given
 * direction from an origin point. Used by the Alt+Arrow keyboard shortcut.
 */

export interface TraversalCandidate {
  id: string;
  x: number; // center x
  y: number; // center y
}

export type Direction = 'up' | 'down' | 'left' | 'right';

/**
 * Returns the id of the candidate node closest to `(fromX, fromY)` that lies
 * within the angular cone of `dir` (45° each side of the axis), or null if
 * nothing qualifies. Distance is Euclidean from origin to candidate center.
 */
export function nearestInDirection(
  fromX: number,
  fromY: number,
  dir: Direction,
  candidates: TraversalCandidate[],
): string | null {
  const matches = candidates.filter((c) => {
    const dx = c.x - fromX;
    const dy = c.y - fromY;
    if (dx === 0 && dy === 0) return false;
    if (dir === 'right') return dx > 0 && Math.abs(dy) <= Math.abs(dx);
    if (dir === 'left') return dx < 0 && Math.abs(dy) <= Math.abs(dx);
    if (dir === 'down') return dy > 0 && Math.abs(dx) <= Math.abs(dy);
    return dy < 0 && Math.abs(dx) <= Math.abs(dy); // up
  });
  if (matches.length === 0) return null;
  matches.sort(
    (a, b) =>
      Math.hypot(a.x - fromX, a.y - fromY) -
      Math.hypot(b.x - fromX, b.y - fromY),
  );
  return matches[0].id;
}
