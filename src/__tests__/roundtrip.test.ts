import { describe, it, expect } from 'bun:test';
import { flowchart } from '../core/flowchart.js';
import { sequence } from '../core/sequence.js';
import { fromMermaid } from '../importers/mermaid.js';
import { fromJSON } from '../importers/json.js';
import { Model } from '../core/model.js';
import { toSVG } from '../exporters/svg.js';

describe('Round-trip: flowchart → Mermaid → model', () => {
  it('preserves node count', () => {
    const fc = flowchart('Flow')
      .node('a', 'A')
      .node('b', 'B')
      .node('c', 'C')
      .edge('a', 'b')
      .edge('b', 'c');
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
    const fc = flowchart('Test')
      .node('x', 'X', { shape: 'diamond' })
      .node('y', 'Y')
      .edge('x', 'y', { label: 'ok' });
    const model = fromJSON(fc.toJSON()).toJSON();
    expect(model.nodes[0]!.shape).toBe('diamond');
    expect(model.edges[0]!.label).toBe('ok');
    expect(model.title).toBe('Test');
  });
});

describe('fromMermaid: simple graph', () => {
  it('parses graph TD with bare nodes', () => {
    const model = fromMermaid('graph TD\n  A-->B\n  B-->C').toJSON();
    expect(model.nodes.map((n) => n.id)).toEqual(expect.arrayContaining(['A', 'B', 'C']));
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
    expect(model.messages![0]!.label).toBe('ping');
  });

  it('preserves dashed message style', () => {
    const seq = sequence('S').actor('A').actor('B').message('A', 'B', 'reply', { style: 'dashed' });
    const model = fromMermaid(seq.toMermaid()).toJSON();
    expect(model.messages![0]!.style).toBe('dashed');
  });
});

describe('Edge style serialization', () => {
  it('Mermaid exports dashed edges with -.->', () => {
    const fc = flowchart('S').node('a', 'A').node('b', 'B').edge('a', 'b', { style: 'dashed' });
    expect(fc.toMermaid()).toContain('-.->');
  });

  it('Mermaid roundtrip preserves dashed style', () => {
    const fc = flowchart('S').node('a', 'A').node('b', 'B').edge('a', 'b', { style: 'dashed' });
    const model = fromMermaid(fc.toMermaid()).toJSON();
    expect(model.edges[0]!.style).toBe('dashed');
  });

  it('Mermaid collapses dotted to dashed (no native dotted syntax)', () => {
    const fc = flowchart('S').node('a', 'A').node('b', 'B').edge('a', 'b', { style: 'dotted' });
    const out = fc.toMermaid();
    expect(out).toContain('-.->');
    expect(out).not.toContain('~.~');
  });

  it('PlantUML exports dashed edges with -[dashed]->', () => {
    const fc = flowchart('S').node('a', 'A').node('b', 'B').edge('a', 'b', { style: 'dashed' });
    expect(fc.toPlantUML()).toContain('-[dashed]->');
  });

  it('PlantUML exports dotted edges with -[dotted]->', () => {
    const fc = flowchart('S').node('a', 'A').node('b', 'B').edge('a', 'b', { style: 'dotted' });
    expect(fc.toPlantUML()).toContain('-[dotted]->');
  });

  it('PlantUML exports solid edges with plain -->', () => {
    const fc = flowchart('S').node('a', 'A').node('b', 'B').edge('a', 'b');
    expect(fc.toPlantUML()).toMatch(/a\s+-->\s+b/);
  });
});

describe('Mermaid importer hardening', () => {
  it('skips %% comments', () => {
    const src = 'graph TD\n  %% this is a comment\n  A-->B\n  %% another\n  B-->C';
    const m = fromMermaid(src).toJSON();
    expect(m.nodes).toHaveLength(3);
    expect(m.edges).toHaveLength(2);
  });

  it('skips classDef / class / style / linkStyle / click directives', () => {
    const src = [
      'graph TD',
      '  A-->B',
      '  classDef warning fill:#f00',
      '  class A warning',
      '  style B fill:#0f0',
      '  linkStyle 0 stroke:#00f',
      '  click A "https://example.com"',
    ].join('\n');
    const m = fromMermaid(src).toJSON();
    expect(m.nodes).toHaveLength(2);
    expect(m.edges).toHaveLength(1);
  });

  it('strips mermaid.initialize(...) config block', () => {
    const src = 'mermaid.initialize({ startOnLoad: true });\ngraph TD\n  A-->B';
    const m = fromMermaid(src).toJSON();
    expect(m.nodes).toHaveLength(2);
  });

  it('parses subgraph blocks and tags contained nodes with metadata.group', () => {
    const src = ['graph TD', '  subgraph backend', '    A-->B', '  end', '  C-->D'].join('\n');
    const m = fromMermaid(src).toJSON();
    const a = m.nodes.find((n) => n.id === 'A');
    const c = m.nodes.find((n) => n.id === 'C');
    expect(a?.metadata?.group).toBe('backend');
    expect(c?.metadata?.group).toBeUndefined();
  });

  it('parses dashed edges with arrow', () => {
    const m = fromMermaid('graph TD\n  A-.->B').toJSON();
    expect(m.edges[0]!.style).toBe('dashed');
  });
});

describe('Model validation', () => {
  it('addEdge throws on unknown source node', () => {
    const m = new Model('flowchart').addNode({ id: 'a', label: 'A' });
    expect(() => m.addEdge({ id: 'e1', from: 'ghost', to: 'a' })).toThrow(/unknown source/);
  });

  it('addEdge throws on unknown target node', () => {
    const m = new Model('flowchart').addNode({ id: 'a', label: 'A' });
    expect(() => m.addEdge({ id: 'e1', from: 'a', to: 'ghost' })).toThrow(/unknown target/);
  });

  it('validate() surfaces dangling edges from imported data', () => {
    const m = Model.fromData({
      type: 'flowchart',
      nodes: [{ id: 'a', label: 'A' }],
      edges: [{ id: 'e1', from: 'a', to: 'missing' }],
    });
    const errs = m.validate();
    expect(errs).toHaveLength(1);
    expect(errs[0]!.kind).toBe('dangling-to');
  });

  it('validate() detects duplicate node ids', () => {
    const m = Model.fromData({
      type: 'flowchart',
      nodes: [
        { id: 'a', label: 'A' },
        { id: 'a', label: 'A2' },
      ],
      edges: [],
    });
    const errs = m.validate();
    expect(errs.some((e) => e.kind === 'duplicate-node-id')).toBe(true);
  });
});

describe('Variant persistence', () => {
  it('round-trips through JSON', () => {
    const data = { type: 'flowchart' as const, variant: 'question' as const, nodes: [], edges: [] };
    const back = fromJSON(JSON.stringify(data)).toJSON();
    expect(back.variant).toBe('question');
  });
});

describe('toSVG — theme overrides', () => {
  const model = flowchart('Themed').node('a', 'Alpha').node('b', 'Beta').edge('a', 'b').getModel().toJSON();

  it('default SVG uses default bg color', () => {
    const svg = toSVG(model);
    expect(svg).toContain('#fafbfc');
  });

  it('theme override replaces bg color', () => {
    const svg = toSVG(model, { bg: '#ff0000' });
    expect(svg).toContain('#ff0000');
    expect(svg).not.toContain('"#fafbfc"');
  });

  it('theme override replaces edge color in arrowhead', () => {
    const svg = toSVG(model, { edge: '#00ff00' });
    expect(svg).toContain('#00ff00');
  });

  it('partial override only changes specified tokens', () => {
    const svg = toSVG(model, { bg: '#123456' });
    // dot color should still be the default
    expect(svg).toContain('#dbe3ee');
  });

  it('override does not persist to the next call (no global state leak)', () => {
    toSVG(model, { bg: '#abcdef' });
    const svg2 = toSVG(model);
    expect(svg2).toContain('#fafbfc');
    expect(svg2).not.toContain('#abcdef');
  });
});
