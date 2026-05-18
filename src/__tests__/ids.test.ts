import { describe, test, expect } from 'bun:test';
import { nextId, makeIdSource } from '../core/ids.js';

describe('nextId', () => {
  test('returns prefix1 on empty input', () => {
    expect(nextId('node', [])).toBe('node1');
    expect(nextId('e', [])).toBe('e1');
    expect(nextId('m', [])).toBe('m1');
  });

  test('returns max + 1 across matching entities', () => {
    expect(nextId('m', [{ id: 'm1' }, { id: 'm2' }, { id: 'm3' }])).toBe('m4');
    expect(nextId('node', [{ id: 'node10' }, { id: 'node3' }])).toBe('node11');
  });

  test('ignores entities whose IDs do not match the prefix shape', () => {
    expect(nextId('m', [{ id: 'm1' }, { id: 'something-else' }, { id: 'm-2-x' }])).toBe('m2');
    expect(nextId('node', [{ id: 'node5' }, { id: 'edge99' }])).toBe('node6');
  });

  test('handles regex metacharacters in the prefix safely', () => {
    expect(nextId('e.', [{ id: 'e.1' }, { id: 'e.2' }])).toBe('e.3');
  });

  test('no collision with preset IDs (the original bug)', () => {
    const preset = [{ id: 'm1' }, { id: 'm2' }, { id: 'm3' }, { id: 'm4' }];
    const first = nextId('m', preset);
    expect(preset.find((p) => p.id === first)).toBeUndefined();
  });
});

describe('makeIdSource', () => {
  test('produces a sequence of unique IDs in one operation', () => {
    const gen = makeIdSource('node', [{ id: 'node3' }]);
    expect(gen()).toBe('node4');
    expect(gen()).toBe('node5');
    expect(gen()).toBe('node6');
  });

  test('does not collide with existing IDs when minting many at once', () => {
    const existing = [{ id: 'e1' }, { id: 'e2' }];
    const gen = makeIdSource('e', existing);
    const minted = Array.from({ length: 5 }, () => gen());
    expect(new Set([...existing.map((e) => e.id), ...minted]).size).toBe(7);
  });
});
