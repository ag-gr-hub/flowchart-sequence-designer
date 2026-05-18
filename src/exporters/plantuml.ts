import type { DiagramModel, DiagramNode, DiagramEdge, SequenceMessage } from '../core/types.js';

function nodeShape(node: DiagramNode): [string, string] {
  switch (node.shape) {
    case 'diamond':
      return ['<>', '<>'];
    case 'circle':
      return ['(', ')'];
    case 'parallelogram':
      return ['/', '/'];
    default:
      return ['[', ']'];
  }
}

function exportFlowchart(model: DiagramModel): string {
  const lines: string[] = ['@startuml'];
  if (model.title) lines.push(`title ${model.title}`);
  lines.push('');

  for (const node of model.nodes) {
    const [open, close] = nodeShape(node);
    lines.push(`state "${node.label}" as ${node.id} ${open}${close}`);
  }
  lines.push('');

  for (const edge of model.edges) {
    const arrow =
      edge.style === 'dashed' ? '-[dashed]->' : edge.style === 'dotted' ? '-[dotted]->' : '-->';
    const label = edge.label ? ` : ${edge.label}` : '';
    lines.push(`${edge.from} ${arrow} ${edge.to}${label}`);
  }

  lines.push('@enduml');
  return lines.join('\n');
}

function msgArrow(msg: SequenceMessage): string {
  return msg.style === 'dashed' ? '-->' : '->';
}

function exportSequence(model: DiagramModel): string {
  const lines: string[] = ['@startuml'];
  if (model.title) lines.push(`title ${model.title}`);
  lines.push('');

  for (const actor of model.actors ?? []) {
    lines.push(`participant ${actor}`);
  }
  lines.push('');

  for (const msg of model.messages ?? []) {
    lines.push(`${msg.from} ${msgArrow(msg)} ${msg.to} : ${msg.label}`);
  }

  lines.push('@enduml');
  return lines.join('\n');
}

/**
 * Serialize a `DiagramModel` to PlantUML source. Dispatches between the
 * state-diagram form (flowchart) and the sequence-diagram form based on
 * `model.type`.
 *
 * **Round-trip notes (flowchart):**
 * - Edge style maps `solid` → `-->`, `dashed` → `-[dashed]->`,
 *   `dotted` → `-[dotted]->`.
 * - Node shapes are emitted via the `state ".." as id < >` syntax; some
 *   shape information is lossy (PlantUML state diagrams don't distinguish
 *   every shape this package supports).
 * - `waypoint`, `metadata`, and `variant` are **dropped**.
 *
 * **Round-trip notes (sequence):**
 * - Actor order is preserved; message style `solid` → `->`, `dashed` → `-->`.
 */
export function toPlantUML(model: DiagramModel): string {
  return model.type === 'sequence' ? exportSequence(model) : exportFlowchart(model);
}
