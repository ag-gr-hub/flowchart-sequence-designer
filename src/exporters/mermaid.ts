import type { DiagramModel, DiagramNode, DiagramEdge, SequenceMessage } from '../core/types.js';

const SHAPE_OPEN: Record<string, string> = {
  rectangle: '[',
  diamond: '{',
  circle: '((',
  parallelogram: '[/',
};
const SHAPE_CLOSE: Record<string, string> = {
  rectangle: ']',
  diamond: '}',
  circle: '))',
  parallelogram: '/]',
};

function formatNode(node: DiagramNode): string {
  const shape = node.shape ?? 'rectangle';
  const open = SHAPE_OPEN[shape] ?? '[';
  const close = SHAPE_CLOSE[shape] ?? ']';
  return `  ${node.id}${open}"${node.label}"${close}`;
}

function edgeArrow(edge: DiagramEdge): string {
  const style = edge.style ?? 'solid';
  const arrowhead = edge.arrowhead ?? 'arrow';
  // Mermaid flowcharts only have solid and dashed; dotted collapses to dashed.
  if (style === 'dashed' || style === 'dotted') return arrowhead === 'none' ? '-.-' : '-.->';
  return arrowhead === 'none' ? '---' : '-->';
}

function formatEdge(edge: DiagramEdge): string {
  const arrow = edgeArrow(edge);
  return edge.label
    ? `  ${edge.from} ${arrow}|"${edge.label}"| ${edge.to}`
    : `  ${edge.from} ${arrow} ${edge.to}`;
}

function exportFlowchart(model: DiagramModel): string {
  const lines: string[] = ['graph TD'];
  if (model.title) lines.unshift(`---\ntitle: ${model.title}\n---`);
  for (const node of model.nodes) lines.push(formatNode(node));
  for (const edge of model.edges) lines.push(formatEdge(edge));
  return lines.join('\n');
}

function msgArrow(msg: SequenceMessage): string {
  return msg.style === 'dashed' ? '-->>' : '->>';
}

function exportSequence(model: DiagramModel): string {
  const lines: string[] = ['sequenceDiagram'];
  if (model.title) lines.unshift(`---\ntitle: ${model.title}\n---`);
  for (const actor of (model.actors ?? [])) lines.push(`  participant ${actor}`);
  for (const msg of (model.messages ?? [])) {
    lines.push(`  ${msg.from}${msgArrow(msg)}${msg.to}: ${msg.label}`);
  }
  return lines.join('\n');
}

/**
 * Serialize a `DiagramModel` to Mermaid source. Dispatches between
 * `graph TD` (flowchart) and `sequenceDiagram` based on `model.type`.
 *
 * **Round-trip notes (flowchart):**
 * - Node shapes `rectangle`, `diamond`, `circle`, `parallelogram` map to
 *   `[ ]`, `{ }`, `(( ))`, `[/ /]` respectively.
 * - Edge style `solid` → `-->`, `dashed` and `dotted` → `-.->` (Mermaid
 *   collapses dotted to dashed). `arrowhead: 'none'` strips the head.
 * - `waypoint`, `metadata`, and `variant` are **dropped** — Mermaid has no
 *   way to encode routing or arbitrary metadata.
 *
 * **Round-trip notes (sequence):**
 * - Message style `solid` → `->>`, `dashed` → `-->>`.
 */
export function toMermaid(model: DiagramModel): string {
  return model.type === 'sequence' ? exportSequence(model) : exportFlowchart(model);
}
