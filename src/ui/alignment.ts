/**
 * Alignment guides and snap-to-sibling logic, used while dragging a single
 * node. Pure functions — no DOM, no React — so they can be unit tested.
 */

export const ALIGN_SNAP_THRESHOLD = 4; // canvas-space pixels

export interface AlignBox {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface AlignGuideV {
  pos: number;   // x position in canvas coords
  minY: number;  // line extent (vertical guide)
  maxY: number;
}

export interface AlignGuideH {
  pos: number;   // y position in canvas coords
  minX: number;  // line extent (horizontal guide)
  maxX: number;
}

export interface AlignResult {
  x: number;
  y: number;
  guideX?: AlignGuideV;
  guideY?: AlignGuideH;
}

/**
 * Given a dragged box and a list of other boxes, return the snapped
 * position and any alignment guides that should be shown.
 *
 * Snaps the left, horizontal-center, or right edge to a matching axis on
 * any sibling within ALIGN_SNAP_THRESHOLD. Likewise for top, vertical-center,
 * and bottom. The closest match per axis wins.
 */
export function findSiblingSnap(
  dragged: AlignBox,
  others: AlignBox[],
  threshold: number = ALIGN_SNAP_THRESHOLD,
): AlignResult {
  const dL = dragged.x;
  const dC = dragged.x + dragged.w / 2;
  const dR = dragged.x + dragged.w;
  const dT = dragged.y;
  const dM = dragged.y + dragged.h / 2;
  const dB = dragged.y + dragged.h;

  let bestX: { delta: number; pos: number; otherIdx: number } | null = null;
  let bestY: { delta: number; pos: number; otherIdx: number } | null = null;

  others.forEach((o, idx) => {
    const oL = o.x;
    const oC = o.x + o.w / 2;
    const oR = o.x + o.w;
    const oT = o.y;
    const oM = o.y + o.h / 2;
    const oB = o.y + o.h;

    const xCandidates: { delta: number; pos: number }[] = [
      { delta: oL - dL, pos: oL }, // left -> left
      { delta: oC - dC, pos: oC }, // center -> center
      { delta: oR - dR, pos: oR }, // right -> right
    ];
    for (const c of xCandidates) {
      if (Math.abs(c.delta) < threshold && (!bestX || Math.abs(c.delta) < Math.abs(bestX.delta))) {
        bestX = { delta: c.delta, pos: c.pos, otherIdx: idx };
      }
    }

    const yCandidates: { delta: number; pos: number }[] = [
      { delta: oT - dT, pos: oT }, // top -> top
      { delta: oM - dM, pos: oM }, // middle -> middle
      { delta: oB - dB, pos: oB }, // bottom -> bottom
    ];
    for (const c of yCandidates) {
      if (Math.abs(c.delta) < threshold && (!bestY || Math.abs(c.delta) < Math.abs(bestY.delta))) {
        bestY = { delta: c.delta, pos: c.pos, otherIdx: idx };
      }
    }
  });

  let x = dragged.x;
  let y = dragged.y;
  let guideX: AlignGuideV | undefined;
  let guideY: AlignGuideH | undefined;

  if (bestX) {
    const bx = bestX as { delta: number; pos: number; otherIdx: number };
    x = dragged.x + bx.delta;
    const o = others[bx.otherIdx]!;
    guideX = {
      pos: bx.pos,
      minY: Math.min(y, o.y) - 12,
      maxY: Math.max(y + dragged.h, o.y + o.h) + 12,
    };
  }
  if (bestY) {
    const by = bestY as { delta: number; pos: number; otherIdx: number };
    y = dragged.y + by.delta;
    const o = others[by.otherIdx]!;
    guideY = {
      pos: by.pos,
      minX: Math.min(x, o.x) - 12,
      maxX: Math.max(x + dragged.w, o.x + o.w) + 12,
    };
  }

  return { x, y, guideX, guideY };
}
