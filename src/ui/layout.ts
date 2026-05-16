import type { DiagramNode } from '../core/types.js';

// Fixed heights; widths are dynamic per-node.
export const NODE_H = 48;
export const Q_BASE_H = 68;
export const Q_ANS_ROW_H = 80;
export const GRID = 24;
export const Q_CARD_PAD = 8;

// Width bounds.
export const MIN_NODE_W = 120;
export const MAX_NODE_W = 320;
export const MIN_Q_W = 220;
export const MAX_Q_W = 400;

/** Estimate text width at ~7.5px/char (13px ui-sans-serif mixed-case). */
export function estimateTextW(text: string, pxPerChar = 7.5): number {
  return text.length * pxPerChar;
}

/** Dynamic width for standard nodes based on label length. */
export function nodeWidth(label: string): number {
  return Math.min(MAX_NODE_W, Math.max(MIN_NODE_W, Math.ceil(estimateTextW(label) + 48)));
}

/** Width of a single answer card based on its text content. */
export function answerCardW(ans: string): number {
  return Math.max(86, Math.ceil(Math.max(estimateTextW(ans, 7.5) + 20, 56) + 32));
}

/** Dynamic width for question nodes — header vs. sum of side-by-side answer cards. */
export function questionNodeW(node: DiagramNode): number {
  const answers = (node.metadata?.answers as string[] | undefined) ?? [];
  const headerW = estimateTextW(node.label, 8) + 80;
  if (answers.length === 0) return Math.max(MIN_Q_W, Math.ceil(headerW));
  const cardsW =
    answers.reduce((s, a) => s + answerCardW(a), 0) +
    (answers.length - 1) * Q_CARD_PAD +
    2 * Q_CARD_PAD;
  return Math.max(MIN_Q_W, Math.ceil(Math.max(headerW, cardsW)));
}

export function questionNodeH(answers: string[]): number {
  return Q_BASE_H + (answers.length === 0 ? 48 : Q_ANS_ROW_H);
}

/** Snap a value to the nearest grid step. */
export function snap(v: number): number {
  return Math.round(v / GRID) * GRID;
}

/**
 * Cubic-bezier path between two ports. The default `bottom` direction pulls the
 * source control point straight down and the target control point straight up,
 * producing the natural S-curve used by the canvas. `right`/`left` exits add
 * lateral pull for ports that emerge from a node's side (answer cards).
 */
export function bezierPath(
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  exitDir: 'bottom' | 'right' | 'left' = 'bottom',
): string {
  if (exitDir === 'right') {
    const dx = Math.abs(x2 - x1),
      dy = Math.abs(y2 - y1);
    const c = Math.max(60, (dx + dy) * 0.45);
    return `M ${x1} ${y1} C ${x1 + c} ${y1}, ${x2} ${y2 - c * 0.5}, ${x2} ${y2}`;
  }
  if (exitDir === 'left') {
    const dx = Math.abs(x2 - x1),
      dy = Math.abs(y2 - y1);
    const c = Math.max(60, (dx + dy) * 0.45);
    return `M ${x1} ${y1} C ${x1 - c} ${y1}, ${x2} ${y2 - c * 0.5}, ${x2} ${y2}`;
  }
  const dy = y2 - y1;
  const dyAbs = Math.abs(dy);
  const dxAbs = Math.abs(x2 - x1);
  const base = dy > 0 ? dyAbs * 0.55 : Math.max(90, dyAbs * 0.5 + dxAbs * 0.28);
  const curve = Math.max(36, Math.min(220, base));
  return `M ${x1} ${y1} C ${x1} ${y1 + curve}, ${x2} ${y2 - curve}, ${x2} ${y2}`;
}

/**
 * Two-segment cubic path that passes through `(wx, wy)` as a hard waypoint.
 * Each segment uses the same vertical-pull logic as `bezierPath`. The result
 * is one continuous path command: `M src C ... wx wy C ... dst`.
 */
export function bezierPathVia(
  x1: number,
  y1: number,
  wx: number,
  wy: number,
  x2: number,
  y2: number,
): string {
  const seg1 = bezierPath(x1, y1, wx, wy, 'bottom');
  const seg2 = bezierPath(wx, wy, x2, y2, 'bottom');
  // seg2 starts with `M wx wy ` — strip it so the path continues from
  // the end of seg1 (which is already at `wx, wy`).
  const seg2NoM = seg2.replace(/^M\s+-?[\d.]+\s+-?[\d.]+\s+/, '');
  return seg1 + ' ' + seg2NoM;
}

/** Approximate midpoint of the cubic path produced by `bezierPath`. */
export function bezierMidpoint(
  x1: number,
  y1: number,
  x2: number,
  y2: number,
): { x: number; y: number } {
  // The cubic uses control points (x1, y1+curve) and (x2, y2-curve). At t=0.5
  // a cubic bezier evaluates to (P0+3P1+3P2+P3)/8. So Y is:
  //   (y1 + 3(y1+curve) + 3(y2-curve) + y2) / 8 = (4y1 + 4y2) / 8 = (y1+y2)/2
  // X collapses similarly since both control points share the endpoint X.
  return { x: (x1 + x2) / 2, y: (y1 + y2) / 2 };
}
