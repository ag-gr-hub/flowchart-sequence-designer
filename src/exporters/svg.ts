import type { DiagramModel, DiagramNode, DiagramEdge } from '../core/types.js';

const NODE_W = 140;
const NODE_H = 44;
const H_GAP = 60;
const V_GAP = 80;
const PADDING = 40;

function assignPositions(nodes: DiagramNode[], edges: DiagramEdge[]): Map<string, { x: number; y: number }> {
  const pos = new Map<string, { x: number; y: number }>();
  const layers = new Map<string, number>();

  // BFS to assign layers
  const inDeg = new Map(nodes.map(n => [n.id, 0]));
  for (const e of edges) inDeg.set(e.to, (inDeg.get(e.to) ?? 0) + 1);

  const queue = nodes.filter(n => (inDeg.get(n.id) ?? 0) === 0).map(n => n.id);
  for (const id of queue) layers.set(id, 0);

  let head = 0;
  while (head < queue.length) {
    const cur = queue[head++];
    const layer = layers.get(cur) ?? 0;
    for (const e of edges) {
      if (e.from === cur) {
        const next = layers.get(e.to) ?? -1;
        if (next < layer + 1) {
          layers.set(e.to, layer + 1);
          queue.push(e.to);
        }
      }
    }
  }

  // Group by layer
  const byLayer = new Map<number, string[]>();
  for (const [id, layer] of layers) {
    if (!byLayer.has(layer)) byLayer.set(layer, []);
    byLayer.get(layer)!.push(id);
  }

  for (const [layer, ids] of byLayer) {
    ids.forEach((id, i) => {
      pos.set(id, {
        x: PADDING + i * (NODE_W + H_GAP),
        y: PADDING + layer * (NODE_H + V_GAP),
      });
    });
  }

  // Fallback for disconnected nodes
  nodes.forEach((n, i) => {
    if (!pos.has(n.id)) pos.set(n.id, { x: PADDING + i * (NODE_W + H_GAP), y: PADDING });
  });

  return pos;
}

function nodeShape(node: DiagramNode, x: number, y: number): string {
  const cx = x + NODE_W / 2;
  const cy = y + NODE_H / 2;
  const label = `<text x="${cx}" y="${cy + 5}" text-anchor="middle" font-family="sans-serif" font-size="13" fill="#1a1a1a">${escapeXML(node.label)}</text>`;

  switch (node.shape) {
    case 'diamond': {
      const pts = `${cx},${y} ${x + NODE_W},${cy} ${cx},${y + NODE_H} ${x},${cy}`;
      return `<polygon points="${pts}" fill="#fff" stroke="#555" stroke-width="1.5"/>${label}`;
    }
    case 'circle': {
      const r = Math.min(NODE_W, NODE_H) / 2;
      return `<circle cx="${cx}" cy="${cy}" r="${r}" fill="#fff" stroke="#555" stroke-width="1.5"/>${label}`;
    }
    default:
      return `<rect x="${x}" y="${y}" width="${NODE_W}" height="${NODE_H}" rx="6" fill="#fff" stroke="#555" stroke-width="1.5"/>${label}`;
  }
}

function escapeXML(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function renderEdge(edge: DiagramEdge, pos: Map<string, { x: number; y: number }>): string {
  const from = pos.get(edge.from);
  const to = pos.get(edge.to);
  if (!from || !to) return '';

  const x1 = from.x + NODE_W / 2;
  const y1 = from.y + NODE_H;
  const x2 = to.x + NODE_W / 2;
  const y2 = to.y;

  const dash = edge.style === 'dashed' ? 'stroke-dasharray="6,3"' : edge.style === 'dotted' ? 'stroke-dasharray="2,3"' : '';
  const midX = (x1 + x2) / 2;
  const midY = (y1 + y2) / 2;
  const labelEl = edge.label
    ? `<text x="${midX}" y="${midY - 6}" text-anchor="middle" font-family="sans-serif" font-size="11" fill="#555">${escapeXML(edge.label)}</text>`
    : '';

  return `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="#555" stroke-width="1.5" ${dash} marker-end="url(#arrow)"/>${labelEl}`;
}

export function toSVG(model: DiagramModel): string {
  const pos = assignPositions(model.nodes, model.edges);

  let maxX = 0, maxY = 0;
  for (const { x, y } of pos.values()) {
    maxX = Math.max(maxX, x + NODE_W + PADDING);
    maxY = Math.max(maxY, y + NODE_H + PADDING);
  }

  const defs = `<defs><marker id="arrow" markerWidth="10" markerHeight="7" refX="10" refY="3.5" orient="auto"><polygon points="0 0, 10 3.5, 0 7" fill="#555"/></marker></defs>`;
  const edges = model.edges.map(e => renderEdge(e, pos)).join('\n');
  const nodes = model.nodes.map(n => {
    const p = pos.get(n.id)!;
    return nodeShape(n, p.x, p.y);
  }).join('\n');

  const title = model.title ? `<text x="${maxX / 2}" y="20" text-anchor="middle" font-family="sans-serif" font-size="15" font-weight="bold" fill="#1a1a1a">${escapeXML(model.title)}</text>` : '';

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${maxX}" height="${maxY}" viewBox="0 0 ${maxX} ${maxY}">\n${defs}\n${title}\n${edges}\n${nodes}\n</svg>`;
}

export async function toPNG(model: DiagramModel): Promise<Blob> {
  if (typeof document === 'undefined') {
    throw new Error('toPNG requires a browser environment. For Node/Bun server use, pipe toSVG() through @resvg/resvg-js.');
  }

  const svg = toSVG(model);
  const blob = new Blob([svg], { type: 'image/svg+xml' });
  const url = URL.createObjectURL(blob);

  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      canvas.getContext('2d')!.drawImage(img, 0, 0);
      URL.revokeObjectURL(url);
      canvas.toBlob(b => b ? resolve(b) : reject(new Error('Canvas toBlob failed')), 'image/png');
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('SVG image load failed')); };
    img.src = url;
  });
}
