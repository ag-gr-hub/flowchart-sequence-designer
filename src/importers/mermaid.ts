import { Model } from '../core/model.js';
import type { DiagramNode, DiagramEdge, NodeShape, SequenceMessage } from '../core/types.js';

let _idCounter = 0;
const uid = () => `n${++_idCounter}`;
const eid = (() => { let c = 0; return () => `e${++c}`; })();
const mid = (() => { let c = 0; return () => `m${++c}`; })();

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

function parseFlowchart(lines: string[]): Model {
  const model = new Model('flowchart');
  const nodeMap = new Map<string, boolean>();

  const ensureNode = (id: string) => {
    if (!nodeMap.has(id)) {
      nodeMap.set(id, true);
      model.addNode({ id, label: id, shape: 'rectangle' });
    }
  };

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('graph') || trimmed.startsWith('flowchart') || trimmed.startsWith('%%')) continue;

    // Edge pattern: A -->|label| B or A --> B
    const edgeMatch = trimmed.match(/^(.+?)\s*(-->|---)(\|(.+?)\|)?\s*(.+)$/);
    if (edgeMatch) {
      const fromRaw = edgeMatch[1].trim();
      const toRaw = edgeMatch[5].trim();
      const label = edgeMatch[4]?.replace(/^["']|["']$/g, '');
      const style = edgeMatch[2] === '---' ? 'solid' : 'solid';

      const fromNode = parseNodeDecl(fromRaw);
      const toNode = parseNodeDecl(toRaw);

      if (fromNode && !nodeMap.has(fromNode.id)) {
        nodeMap.set(fromNode.id, true);
        model.addNode(fromNode);
      } else {
        ensureNode(fromRaw.replace(/\W.*/, ''));
      }
      if (toNode && !nodeMap.has(toNode.id)) {
        nodeMap.set(toNode.id, true);
        model.addNode(toNode);
      } else {
        ensureNode(toRaw.replace(/\W.*/, ''));
      }

      const fromId = fromNode?.id ?? fromRaw.replace(/\W.*/, '');
      const toId = toNode?.id ?? toRaw.replace(/\W.*/, '');
      model.addEdge({ id: eid(), from: fromId, to: toId, ...(label ? { label } : {}), style });
      continue;
    }

    // Standalone node declaration
    const nodeDecl = parseNodeDecl(trimmed);
    if (nodeDecl && !nodeMap.has(nodeDecl.id)) {
      nodeMap.set(nodeDecl.id, true);
      model.addNode(nodeDecl);
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

    // A->>B: label or A-->B: label
    const msgMatch = trimmed.match(/^(.+?)\s*(->>|-->|->)\s*(.+?):\s*(.+)$/);
    if (msgMatch) {
      const from = msgMatch[1].trim();
      const arrow = msgMatch[2];
      const to = msgMatch[3].trim();
      const label = msgMatch[4].trim();
      model.addActor(from);
      model.addActor(to);
      model.addMessage({ id: mid(), from, to, label, style: arrow.includes('-') && arrow.includes('>') && arrow.startsWith('-') && !arrow.startsWith('->') ? 'dashed' : 'solid' });
    }
  }

  return model;
}

export function fromMermaid(mermaid: string): Model {
  const rawLines = mermaid.split('\n');

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
