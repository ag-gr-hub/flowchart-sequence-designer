import { describe, it, expect } from 'bun:test';
import { flowchart } from '../core/flowchart.js';

describe('FlowchartBuilder', () => {
  it('exports valid Mermaid graph', () => {
    const out = flowchart('My Flow')
      .node('a', 'Start', { shape: 'circle' })
      .node('b', 'End', { shape: 'circle' })
      .edge('a', 'b')
      .toMermaid();
    expect(out).toContain('graph TD');
    expect(out).toContain('title: My Flow');
    expect(out).toContain('a');
    expect(out).toContain('b');
  });

  it('exports diamond shape correctly', () => {
    const out = flowchart().node('d', 'Decision', { shape: 'diamond' }).toMermaid();
    expect(out).toContain('{');
  });

  it('exports edge with label', () => {
    const out = flowchart()
      .node('a', 'A')
      .node('b', 'B')
      .edge('a', 'b', { label: 'Yes' })
      .toMermaid();
    expect(out).toContain('Yes');
  });

  it('exports valid PlantUML', () => {
    const out = flowchart().node('a', 'Start').node('b', 'End').edge('a', 'b').toPlantUML();
    expect(out).toContain('@startuml');
    expect(out).toContain('@enduml');
    expect(out).toContain('a --> b');
  });

  it('exports valid JSON', () => {
    const json = flowchart().node('a', 'Start').toJSON();
    const parsed = JSON.parse(json);
    expect(parsed.type).toBe('flowchart');
    expect(parsed.nodes).toHaveLength(1);
    expect(parsed.nodes[0].id).toBe('a');
  });

  it('exports SVG string', () => {
    const svg = flowchart().node('a', 'Start').node('b', 'End').edge('a', 'b').toSVG();
    expect(svg).toStartWith('<svg');
    expect(svg).toContain('</svg>');
    expect(svg).toContain('Start');
  });

  it('throws on duplicate node id', () => {
    expect(() => flowchart().node('a', 'A').node('a', 'Duplicate')).toThrow();
  });

  it('removes node and its edges', () => {
    const fc = flowchart().node('a', 'A').node('b', 'B').edge('a', 'b').removeNode('a');
    const data = JSON.parse(fc.toJSON());
    expect(data.nodes).toHaveLength(1);
    expect(data.edges).toHaveLength(0);
  });
});
