import { describe, it, expect } from 'bun:test';
import { flowchart } from '../core/flowchart.js';
import { sequence } from '../core/sequence.js';
import { fromMermaid } from '../importers/mermaid.js';
import { fromJSON } from '../importers/json.js';

describe('Round-trip: flowchart → Mermaid → model', () => {
  it('preserves node count', () => {
    const fc = flowchart('Flow').node('a', 'A').node('b', 'B').node('c', 'C').edge('a', 'b').edge('b', 'c');
    const model = fromMermaid(fc.toMermaid()).toJSON();
    expect(model.nodes).toHaveLength(3);
    expect(model.edges).toHaveLength(2);
  });

  it('preserves title', () => {
    const fc = flowchart('My Title').node('a', 'A');
    const model = fromMermaid(fc.toMermaid()).toJSON();
    expect(model.title).toBe('My Title');
  });
});

describe('Round-trip: flowchart → JSON → model', () => {
  it('is lossless', () => {
    const fc = flowchart('Test').node('x', 'X', { shape: 'diamond' }).node('y', 'Y').edge('x', 'y', { label: 'ok' });
    const model = fromJSON(fc.toJSON()).toJSON();
    expect(model.nodes[0].shape).toBe('diamond');
    expect(model.edges[0].label).toBe('ok');
    expect(model.title).toBe('Test');
  });
});

describe('fromMermaid: simple graph', () => {
  it('parses graph TD with bare nodes', () => {
    const model = fromMermaid('graph TD\n  A-->B\n  B-->C').toJSON();
    expect(model.nodes.map(n => n.id)).toEqual(expect.arrayContaining(['A', 'B', 'C']));
    expect(model.edges).toHaveLength(2);
  });
});

describe('Round-trip: sequence → Mermaid → model', () => {
  it('preserves actors and messages', () => {
    const seq = sequence('S').actor('U').actor('V').message('U', 'V', 'ping');
    const model = fromMermaid(seq.toMermaid()).toJSON();
    expect(model.type).toBe('sequence');
    expect(model.actors).toContain('U');
    expect(model.messages).toHaveLength(1);
    expect(model.messages![0].label).toBe('ping');
  });
});
