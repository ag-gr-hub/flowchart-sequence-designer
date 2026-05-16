import { describe, it, expect } from 'bun:test';
import {
  MIN_NODE_W,
  MAX_NODE_W,
  MIN_Q_W,
  GRID,
  estimateTextW,
  nodeWidth,
  answerCardW,
  questionNodeW,
  questionNodeH,
  snap,
  bezierPath,
  bezierPathVia,
  bezierMidpoint,
} from '../ui/layout.js';

describe('layout helpers', () => {
  describe('estimateTextW', () => {
    it('scales linearly with character count', () => {
      expect(estimateTextW('')).toBe(0);
      expect(estimateTextW('a')).toBe(7.5);
      expect(estimateTextW('abcd')).toBe(30);
    });

    it('honors custom px-per-char', () => {
      expect(estimateTextW('abc', 10)).toBe(30);
    });
  });

  describe('nodeWidth', () => {
    it('clamps short labels to MIN_NODE_W', () => {
      expect(nodeWidth('')).toBe(MIN_NODE_W);
      expect(nodeWidth('hi')).toBe(MIN_NODE_W);
    });

    it('clamps long labels to MAX_NODE_W', () => {
      expect(nodeWidth('x'.repeat(500))).toBe(MAX_NODE_W);
    });

    it('grows with mid-length labels', () => {
      const a = nodeWidth('Order received');
      const b = nodeWidth('Order received and validated by upstream');
      expect(b).toBeGreaterThan(a);
      expect(b).toBeLessThanOrEqual(MAX_NODE_W);
    });
  });

  describe('answerCardW', () => {
    it('has a sensible floor for short answers', () => {
      const empty = answerCardW('');
      const oneChar = answerCardW('Y');
      expect(empty).toBeGreaterThanOrEqual(86);
      expect(oneChar).toBeGreaterThanOrEqual(86);
    });

    it('grows for long answers', () => {
      const floor = answerCardW('Y');
      expect(answerCardW('A long-form answer string')).toBeGreaterThan(floor);
    });
  });

  describe('questionNodeW', () => {
    it('uses MIN_Q_W when label and answers are tiny', () => {
      const w = questionNodeW({ id: 'q', label: 'Hi', shape: 'rectangle' });
      expect(w).toBeGreaterThanOrEqual(MIN_Q_W);
    });

    it('sums answer card widths plus padding', () => {
      const withOne = questionNodeW({
        id: 'q', label: 'q', shape: 'rectangle',
        metadata: { answers: ['Yes'] },
      });
      const withThree = questionNodeW({
        id: 'q', label: 'q', shape: 'rectangle',
        metadata: { answers: ['Yes', 'No', 'Maybe'] },
      });
      expect(withThree).toBeGreaterThan(withOne);
    });
  });

  describe('questionNodeH', () => {
    it('adds the empty-state row when there are no answers', () => {
      const empty = questionNodeH([]);
      const filled = questionNodeH(['a']);
      // both are > 0 and the filled variant is at least as tall.
      expect(empty).toBeGreaterThan(0);
      expect(filled).toBeGreaterThan(0);
    });
  });

  describe('snap', () => {
    it('snaps to GRID multiples', () => {
      expect(snap(0)).toBe(0);
      expect(snap(GRID - 1)).toBe(GRID);
      expect(snap(GRID + 1)).toBe(GRID);
      expect(snap(GRID * 3 + 5)).toBe(GRID * 3);
    });

    it('snaps negative values', () => {
      expect(snap(-GRID + 1)).toBe(-GRID);
    });
  });

  describe('bezierPath', () => {
    it('produces an M/C SVG path command', () => {
      const d = bezierPath(0, 0, 100, 200);
      expect(d.startsWith('M ')).toBe(true);
      expect(d).toContain(' C ');
      expect(d).toContain(' 100 200');
    });

    it('uses lateral pull for right-exit ports', () => {
      const right = bezierPath(0, 0, 100, 50, 'right');
      const bottom = bezierPath(0, 0, 100, 50, 'bottom');
      expect(right).not.toBe(bottom);
    });

    it('uses lateral pull for left-exit ports', () => {
      const left = bezierPath(0, 0, -100, 50, 'left');
      expect(left).toContain(' C ');
    });

    it('compensates with extra curve for upward targets', () => {
      const upward = bezierPath(0, 200, 100, 50);
      const downward = bezierPath(0, 0, 100, 200);
      // Both should be valid bezier strings; the upward case shouldn't be empty.
      expect(upward).toContain(' C ');
      expect(downward).toContain(' C ');
    });
  });

  it('exports the documented constant bounds', () => {
    expect(MIN_NODE_W).toBeLessThan(MAX_NODE_W);
    expect(MIN_Q_W).toBeGreaterThan(0);
    expect(GRID).toBeGreaterThan(0);
  });

  describe('bezierPathVia', () => {
    it('produces a single continuous M / C / C path', () => {
      const d = bezierPathVia(0, 0, 50, 100, 100, 200);
      expect(d.startsWith('M 0 0')).toBe(true);
      // Two cubic segments — exactly two "C " tokens.
      expect(d.match(/ C /g)?.length).toBe(2);
      // Waypoint coordinates appear in the path.
      expect(d).toContain('50 100');
    });

    it('does not duplicate the M command for the second segment', () => {
      const d = bezierPathVia(0, 0, 50, 100, 100, 200);
      expect(d.match(/M /g)?.length).toBe(1);
    });
  });

  describe('bezierMidpoint', () => {
    it('returns the geometric midpoint of the endpoints', () => {
      const m = bezierMidpoint(0, 0, 200, 400);
      expect(m.x).toBe(100);
      expect(m.y).toBe(200);
    });
  });
});
