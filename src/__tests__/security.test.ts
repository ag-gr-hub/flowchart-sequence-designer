import { describe, it, expect } from 'bun:test';
import { sanitizeLabel, sanitizeURL, MAX_NODES, MAX_IMPORT_LENGTH } from '../core/sanitize';
import { fromMermaid } from '../importers/mermaid';
import { fromJSON } from '../importers/json';
import { toSVG } from '../exporters/svg';
import { flowchart } from '../core/flowchart';

describe('sanitizeLabel', () => {
  it('strips HTML tags', () => {
    expect(sanitizeLabel('<script>alert(1)</script>')).toBe('alert(1)');
    expect(sanitizeLabel('<img src=x onerror=alert(1)>')).toBe('');
    expect(sanitizeLabel('<foreignObject>evil</foreignObject>')).toBe('evil');
  });

  it('strips javascript: URIs', () => {
    expect(sanitizeLabel('javascript:alert(1)')).toBe('alert(1)');
    expect(sanitizeLabel('JAVASCRIPT:alert(1)')).toBe('alert(1)');
    expect(sanitizeLabel('java\tscript:alert(1)')).not.toContain('javascript:');
  });

  it('strips data: and vbscript: URIs', () => {
    expect(sanitizeLabel('data:text/html,<script>alert(1)</script>')).not.toContain('data:');
    expect(sanitizeLabel('vbscript:MsgBox("XSS")')).not.toContain('vbscript:');
  });

  it('strips on* event handlers', () => {
    expect(sanitizeLabel('onerror=alert(1)')).not.toContain('onerror=');
    expect(sanitizeLabel('onclick=steal()')).not.toContain('onclick=');
    expect(sanitizeLabel('ONLOAD=hack()')).not.toContain('ONLOAD=');
  });

  it('strips null bytes', () => {
    expect(sanitizeLabel('hel\x00lo')).toBe('hello');
  });

  it('enforces max length', () => {
    const long = 'A'.repeat(5000);
    expect(sanitizeLabel(long).length).toBeLessThanOrEqual(2000);
  });

  it('preserves safe text', () => {
    expect(sanitizeLabel('Hello World')).toBe('Hello World');
    expect(sanitizeLabel('Decision?')).toBe('Decision?');
    expect(sanitizeLabel('A → B')).toBe('A → B');
  });
});

describe('sanitizeURL', () => {
  it('allows http and https', () => {
    expect(sanitizeURL('https://example.com')).toBe('https://example.com');
    expect(sanitizeURL('http://example.com')).toBe('http://example.com');
  });

  it('allows mailto', () => {
    expect(sanitizeURL('mailto:test@example.com')).toBe('mailto:test@example.com');
  });

  it('blocks javascript: URIs', () => {
    expect(sanitizeURL('javascript:alert(1)')).toBeUndefined();
    expect(sanitizeURL('JAVASCRIPT:alert(1)')).toBeUndefined();
  });

  it('blocks data: URIs', () => {
    expect(sanitizeURL('data:text/html,<script>alert(1)</script>')).toBeUndefined();
  });

  it('blocks vbscript: URIs', () => {
    expect(sanitizeURL('vbscript:MsgBox("XSS")')).toBeUndefined();
  });
});

describe('Mermaid importer XSS hardening', () => {
  it('sanitizes node labels containing script tags', () => {
    const model = fromMermaid('graph TD\n  A["<script>alert(1)</script>"] --> B[Safe]').toJSON();
    const maliciousNode = model.nodes.find((n) => n.id === 'A');
    expect(maliciousNode?.label).not.toContain('<script>');
    expect(maliciousNode?.label).not.toContain('</script>');
  });

  it('sanitizes node labels containing javascript: URIs', () => {
    const model = fromMermaid('graph TD\n  A["javascript:alert(1)"] --> B[OK]').toJSON();
    const node = model.nodes.find((n) => n.id === 'A');
    expect(node?.label).not.toContain('javascript:');
  });

  it('sanitizes edge labels', () => {
    // Tag-based payload: tags stripped, resulting empty label omitted
    const model = fromMermaid('graph TD\n  A -->|<img onerror=alert(1)>| B').toJSON();
    const edge = model.edges[0];
    expect(edge?.label ?? '').not.toContain('<img');
    expect(edge?.label ?? '').not.toContain('onerror=');

    // Text-based payload: javascript: stripped from edge label
    const model2 = fromMermaid('graph TD\n  X -->|javascript:alert(1)| Y').toJSON();
    const edge2 = model2.edges[0];
    expect(edge2?.label ?? '').not.toContain('javascript:');
  });

  it('sanitizes sequence message labels', () => {
    const model = fromMermaid('sequenceDiagram\n  A->>B: <script>alert(1)</script>').toJSON();
    const msg = model.messages?.[0];
    expect(msg?.label).not.toContain('<script>');
  });

  it('enforces node count limit', () => {
    const lines = ['graph TD'];
    for (let i = 0; i < 600; i++) {
      lines.push(`  N${i}[Node ${i}]`);
    }
    expect(() => fromMermaid(lines.join('\n'))).toThrow(/maximum.*500.*nodes/i);
  });

  it('enforces input length limit', () => {
    const huge = 'graph TD\n' + 'A'.repeat(MAX_IMPORT_LENGTH + 1);
    expect(() => fromMermaid(huge)).toThrow(/maximum/i);
  });
});

describe('JSON importer security', () => {
  it('strips __proto__ keys from parsed JSON', () => {
    const malicious = JSON.stringify({
      type: 'flowchart',
      nodes: [{ id: 'a', label: 'A', __proto__: { polluted: true } }],
      edges: [],
      __proto__: { admin: true },
    });
    const model = fromJSON(malicious).toJSON();
    expect((model as any).admin).toBeUndefined();
    expect((model.nodes[0] as any)?.polluted).toBeUndefined();
  });

  it('sanitizes labels in JSON import', () => {
    const data = {
      type: 'flowchart' as const,
      nodes: [{ id: 'a', label: '<script>alert(1)</script>' }],
      edges: [],
    };
    const model = fromJSON(data).toJSON();
    expect(model.nodes[0]!.label).not.toContain('<script>');
  });

  it('enforces node count limit', () => {
    const nodes = Array.from({ length: 600 }, (_, i) => ({ id: `n${i}`, label: `N${i}` }));
    expect(() => fromJSON({ type: 'flowchart', nodes, edges: [] })).toThrow(/maximum.*500/i);
  });
});

describe('SVG export XSS hardening', () => {
  it('escapes quotes in node labels', () => {
    const fc = flowchart().node('a', 'He said "hello"').toSVG();
    expect(fc).toContain('&quot;');
    expect(fc).not.toMatch(/<text[^>]*"hello"[^<]*<\/text>/);
  });

  it('escapes angle brackets in labels', () => {
    const fc = flowchart().node('a', '<b>bold</b>').toSVG();
    // sanitizeForSVG strips tags first, so <b>bold</b> becomes "bold"
    expect(fc).not.toContain('<b>bold</b>');
    // Raw angle brackets in non-tag form still get escaped
    const fc2 = flowchart().node('a', 'x < y > z').toSVG();
    expect(fc2).toContain('&lt;');
    expect(fc2).toContain('&gt;');
  });

  it('escapes single quotes in labels', () => {
    const fc = flowchart().node('a', "it's").toSVG();
    expect(fc).toContain('&#39;');
  });

  it('strips javascript: URIs from SVG output', () => {
    const svg = toSVG({
      type: 'flowchart',
      nodes: [{ id: 'a', label: 'javascript:alert(1)' }],
      edges: [],
    });
    expect(svg).not.toContain('javascript:');
  });

  it('strips on* event handlers from SVG output', () => {
    const svg = toSVG({
      type: 'flowchart',
      nodes: [{ id: 'a', label: 'onerror=alert(1)' }],
      edges: [],
    });
    expect(svg).not.toContain('onerror=');
  });

  it('does not contain <script> tags', () => {
    const svg = toSVG({
      type: 'flowchart',
      nodes: [{ id: 'a', label: '<script>hack()</script>' }],
      edges: [],
    });
    expect(svg).not.toContain('<script>');
    expect(svg).not.toContain('</script>');
  });

  it('does not contain <foreignObject>', () => {
    const svg = toSVG({
      type: 'flowchart',
      nodes: [{ id: 'a', label: '<foreignObject>evil</foreignObject>' }],
      edges: [],
    });
    expect(svg).not.toContain('<foreignObject>');
  });
});
