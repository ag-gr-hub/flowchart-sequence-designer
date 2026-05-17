import { Model } from '../core/model.js';
import type { NodeShape } from '../core/types.js';
import { nextId } from '../core/ids.js';

// Detects shape from Mermaid node syntax
function parseNodeDecl(raw: string): { id: string; label: string; shape: NodeShape } | null {
  // diamond: id{label}, circle: id((label)), parallelogram: id[/label/], default: id[label] or id("label")
  const patterns: [RegExp, NodeShape][] = [
    [/^(\w+)\{\{?"?(.+?)"?\}?\}$/, 'diamond'],
    [/^(\w+)\(\("?(.+?)"?\)\)$/, 'circle'],
    [/^(\w+)\[\/(.+?)\/\]$/, 'parallelogram'],
    [/^(\w+)\[["']?(.+?)["']?\]$/, 'rectangle'],
    [/^(\w+)\("?(.+?)"?\)$/, 'rectangle'],
  ];
  for (const [re, shape] of patterns) {
    const m = raw.match(re);
    if (m) return { id: m[1], label: m[2].replace(/^["']|["']$/g, ''), shape };
  }
  return null;
}

// Mermaid flowchart edge connector: solid (-->, ---), dashed (-.->, -.-), or with labels.
// Anchored so node IDs ending in `{`/`[`/`(` cannot bleed into the connector.
const EDGE_RE = /^(.+?)\s*(-\.->|-\.-|-->|---)(?:\|(.+?)\|)?\s*(.+)$/;

function detectStyle(connector: string): 'solid' | 'dashed' {
  return connector.startsWith('-.') ? 'dashed' : 'solid';
}

function detectArrowhead(connector: string): 'arrow' | 'none' {
  return connector.endsWith('>') ? 'arrow' : 'none';
}

function parseFlowchart(lines: string[]): Model {
  const model = new Model('flowchart');
  const nodeMap = new Map<string, boolean>();
  const groupStack: string[] = [];

  const ensureNode = (id: string, group?: string) => {
    if (!nodeMap.has(id)) {
      nodeMap.set(id, true);
      const metadata = group ? { group } : undefined;
      model.addNode({ id, label: id, shape: 'rectangle', ...(metadata ? { metadata } : {}) });
    }
  };

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    // Skip Mermaid comments, config blocks, header directives, and click handlers.
    if (
      trimmed.startsWith('%%') ||
      trimmed.startsWith('graph') ||
      trimmed.startsWith('flowchart') ||
      trimmed.startsWith('click ') ||
      trimmed.startsWith('classDef ') ||
      trimmed.startsWith('class ') ||
      trimmed.startsWith('style ') ||
      trimmed.startsWith('linkStyle ')
    ) continue;

    // Subgraphs: track current group so contained nodes get metadata.group set.
    const subgraphOpen = trimmed.match(/^subgraph\s+(\S+)/i);
    if (subgraphOpen) { groupStack.push(subgraphOpen[1]); continue; }
    if (/^end\b/i.test(trimmed)) { groupStack.pop(); continue; }

    const currentGroup = groupStack[groupStack.length - 1];

    const edgeMatch = trimmed.match(EDGE_RE);
    if (edgeMatch) {
      const fromRaw = edgeMatch[1].trim();
      const connector = edgeMatch[2];
      const label = edgeMatch[3]?.replace(/^["']|["']$/g, '');
      const toRaw = edgeMatch[4].trim();
      const style = detectStyle(connector);
      const arrowhead = detectArrowhead(connector);

      const fromNode = parseNodeDecl(fromRaw);
      const toNode = parseNodeDecl(toRaw);

      if (fromNode && !nodeMap.has(fromNode.id)) {
        nodeMap.set(fromNode.id, true);
        const metadata = currentGroup ? { group: currentGroup } : undefined;
        model.addNode({ ...fromNode, ...(metadata ? { metadata } : {}) });
      } else if (!fromNode) {
        ensureNode(fromRaw.replace(/\W.*/, ''), currentGroup);
      }
      if (toNode && !nodeMap.has(toNode.id)) {
        nodeMap.set(toNode.id, true);
        const metadata = currentGroup ? { group: currentGroup } : undefined;
        model.addNode({ ...toNode, ...(metadata ? { metadata } : {}) });
      } else if (!toNode) {
        ensureNode(toRaw.replace(/\W.*/, ''), currentGroup);
      }

      const fromId = fromNode?.id ?? fromRaw.replace(/\W.*/, '');
      const toId = toNode?.id ?? toRaw.replace(/\W.*/, '');
      model.addEdge({
        id: nextId('e', model.toJSON().edges),
        from: fromId, to: toId,
        ...(label ? { label } : {}),
        style,
        ...(arrowhead === 'none' ? { arrowhead } : {}),
      });
      continue;
    }

    const nodeDecl = parseNodeDecl(trimmed);
    if (nodeDecl && !nodeMap.has(nodeDecl.id)) {
      nodeMap.set(nodeDecl.id, true);
      const metadata = currentGroup ? { group: currentGroup } : undefined;
      model.addNode({ ...nodeDecl, ...(metadata ? { metadata } : {}) });
    }
  }

  return model;
}

function parseSequence(lines: string[], title?: string): Model {
  const model = new Model('sequence', title);

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('sequenceDiagram') || trimmed.startsWith('%%')) continue;

    const participantMatch = trimmed.match(/^participant\s+(.+)$/i);
    if (participantMatch) {
      model.addActor(participantMatch[1].trim());
      continue;
    }

    const actorMatch = trimmed.match(/^actor\s+(.+)$/i);
    if (actorMatch) {
      model.addActor(actorMatch[1].trim());
      continue;
    }

    // Sequence message arrows: ->, ->>, -->, -->>  (-- prefix = dashed)
    const msgMatch = trimmed.match(/^(.+?)\s*(-->>|->>|-->|->)\s*(.+?):\s*(.+)$/);
    if (msgMatch) {
      const from = msgMatch[1].trim();
      const arrow = msgMatch[2];
      const to = msgMatch[3].trim();
      const label = msgMatch[4].trim();
      model.addActor(from);
      model.addActor(to);
      const messages = model.toJSON().messages ?? [];
      model.addMessage({ id: nextId('m', messages), from, to, label, style: arrow.startsWith('--') ? 'dashed' : 'solid' });
    }
  }

  return model;
}

/**
 * Parse Mermaid source into a `Model`. Auto-detects `flowchart` /
 * `sequenceDiagram` from the directive line and dispatches accordingly.
 *
 * **What is preserved:**
 * - Flowcharts: node shapes (`[]` / `{}` / `(())` / `[/]`), node labels,
 *   edge connectors (`-->`, `-.->`, `---`, `-.-`), edge labels, and
 *   `subgraph` grouping (stored on `node.metadata.group`).
 * - Sequence: actor declarations, message arrows (`->>`, `-->>`), labels.
 * - Frontmatter `title: ...` blocks are lifted into `model.title`.
 *
 * **What is dropped or normalized:**
 * - `mermaid.initialize(...)` blocks, `%%{init: ...}%%` directives, and
 *   click handlers — stripped before parsing.
 * - Dotted edges collapse to `dashed` (Mermaid's dot/dash style is lossy).
 * - Node positions, `waypoint`, and any package-specific metadata other
 *   than `group` are not present in Mermaid and so cannot round-trip.
 */
export function fromMermaid(mermaid: string): Model {
  // Strip mermaid.initialize(...) and similar JS-style config blocks that
  // sometimes appear in copy-pasted snippets — anything between `init` and `)`.
  const cleaned = mermaid.replace(/mermaid\.initialize\([\s\S]*?\)\s*;?/g, '');
  const rawLines = cleaned.split('\n');

  // Strip frontmatter
  let startIdx = 0;
  let title: string | undefined;
  if (rawLines[0]?.trim() === '---') {
    const endFm = rawLines.findIndex((l, i) => i > 0 && l.trim() === '---');
    if (endFm !== -1) {
      const fmLines = rawLines.slice(1, endFm);
      for (const fl of fmLines) {
        const tm = fl.match(/^title:\s*(.+)$/);
        if (tm) title = tm[1].trim();
      }
      startIdx = endFm + 1;
    }
  }

  const lines = rawLines.slice(startIdx);
  const firstContent = lines.find(l => l.trim());

  if (firstContent?.trim().startsWith('sequenceDiagram')) {
    const m = parseSequence(lines, title);
    return m;
  }

  const m = parseFlowchart(lines);
  if (title) {
    // patch title via internal JSON round-trip
    const data = m.toJSON();
    data.title = title;
    return Model.fromData(data);
  }
  return m;
}
