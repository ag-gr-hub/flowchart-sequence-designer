import type { DiagramModel, DiagramNode, DiagramEdge } from '../core/types.js';

// Layout constants — kept in sync with src/ui/DiagramEditor.tsx
const NODE_H = 48;
const Q_BASE_H = 68;
const Q_ANS_ROW_H = 80;
const Q_CARD_PAD = 8;
const MIN_NODE_W = 120;
const MAX_NODE_W = 320;
const MIN_Q_W = 220;
const PADDING = 48;
const H_GAP = 80;
const V_GAP = 96;

function estimateTextW(text: string, pxPerChar = 7.5): number {
  return text.length * pxPerChar;
}

function nodeWidth(label: string): number {
  return Math.min(MAX_NODE_W, Math.max(MIN_NODE_W, Math.ceil(estimateTextW(label) + 48)));
}

function answerCardW(ans: string): number {
  return Math.max(86, Math.ceil(Math.max(estimateTextW(ans, 7.5) + 20, 56) + 32));
}

function questionNodeW(node: DiagramNode): number {
  const answers = (node.metadata?.answers as string[] | undefined) ?? [];
  const headerW = estimateTextW(node.label, 8) + 80;
  if (answers.length === 0) return Math.max(MIN_Q_W, Math.ceil(headerW));
  const cardsW = answers.reduce((s, a) => s + answerCardW(a), 0)
    + (answers.length - 1) * Q_CARD_PAD + 2 * Q_CARD_PAD;
  return Math.max(MIN_Q_W, Math.ceil(Math.max(headerW, cardsW)));
}

function questionNodeH(answers: string[]): number {
  return Q_BASE_H + (answers.length === 0 ? 48 : Q_ANS_ROW_H);
}

function bezierPath(x1: number, y1: number, x2: number, y2: number): string {
  const dy = y2 - y1;
  const dyAbs = Math.abs(dy);
  const dxAbs = Math.abs(x2 - x1);
  const base = dy > 0 ? dyAbs * 0.55 : Math.max(90, dyAbs * 0.5 + dxAbs * 0.28);
  const curve = Math.max(36, Math.min(220, base));
  return `M ${x1} ${y1} C ${x1} ${y1 + curve}, ${x2} ${y2 - curve}, ${x2} ${y2}`;
}

interface LayoutBox { x: number; y: number; w: number; h: number }

function isQuestion(node: DiagramNode, variant: DiagramModel['variant']): boolean {
  return variant === 'question' && !!node.metadata?.answers;
}

/** Honor x/y on nodes if present; otherwise BFS-layer fallback. */
function computeLayout(model: DiagramModel): Map<string, LayoutBox> {
  const boxes = new Map<string, LayoutBox>();
  const sized = model.nodes.map(n => {
    const w = isQuestion(n, model.variant) ? questionNodeW(n) : nodeWidth(n.label);
    const h = isQuestion(n, model.variant)
      ? questionNodeH((n.metadata?.answers as string[] | undefined) ?? [])
      : NODE_H;
    return { node: n, w, h };
  });

  const allPositioned = sized.every(s => typeof s.node.x === 'number' && typeof s.node.y === 'number');
  if (allPositioned) {
    for (const s of sized) {
      boxes.set(s.node.id, { x: s.node.x as number, y: s.node.y as number, w: s.w, h: s.h });
    }
    return boxes;
  }

  // BFS-layer fallback for un-positioned graphs (e.g. fresh imports).
  const inDeg = new Map(model.nodes.map(n => [n.id, 0]));
  for (const e of model.edges) inDeg.set(e.to, (inDeg.get(e.to) ?? 0) + 1);

  const layers = new Map<string, number>();
  const queue = model.nodes.filter(n => (inDeg.get(n.id) ?? 0) === 0).map(n => n.id);
  for (const id of queue) layers.set(id, 0);
  let head = 0;
  while (head < queue.length) {
    const cur = queue[head++];
    const layer = layers.get(cur) ?? 0;
    for (const e of model.edges) {
      if (e.from === cur) {
        const next = layers.get(e.to) ?? -1;
        if (next < layer + 1) {
          layers.set(e.to, layer + 1);
          queue.push(e.to);
        }
      }
    }
  }
  model.nodes.forEach(n => { if (!layers.has(n.id)) layers.set(n.id, 0); });

  const byLayer = new Map<number, typeof sized>();
  for (const s of sized) {
    const layer = layers.get(s.node.id) ?? 0;
    if (!byLayer.has(layer)) byLayer.set(layer, []);
    byLayer.get(layer)!.push(s);
  }

  let y = PADDING;
  for (const layer of [...byLayer.keys()].sort((a, b) => a - b)) {
    const row = byLayer.get(layer)!;
    let x = PADDING;
    let maxH = 0;
    for (const s of row) {
      boxes.set(s.node.id, { x, y, w: s.w, h: s.h });
      x += s.w + H_GAP;
      maxH = Math.max(maxH, s.h);
    }
    y += maxH + V_GAP;
  }
  return boxes;
}

function escapeXML(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

// Match canvas: indigo/slate palette, light theme by default.
const COLORS = {
  bg: '#fafbfc',
  dot: '#dbe3ee',
  nodeFill: '#ffffff',
  nodeStroke: '#cbd5e1',
  edge: '#94a3b8',
  text: '#1e293b',
  textSub: '#94a3b8',
  amber: '#d97706',
  amberSoft: '#fef9ee',
  amberLine: '#fde68a',
  amberCardBg: '#fffdf7',
};

function renderStandardNode(node: DiagramNode, box: LayoutBox): string {
  const cx = box.x + box.w / 2;
  const cy = box.y + box.h / 2;
  const shape = node.shape ?? 'rectangle';
  const label = `<text x="${cx}" y="${cy + 4.5}" text-anchor="middle" font-family="ui-sans-serif,system-ui,-apple-system,sans-serif" font-size="13" font-weight="500" fill="${COLORS.text}">${escapeXML(node.label)}</text>`;

  let shapeEl = '';
  if (shape === 'diamond') {
    const pts = `${cx},${box.y} ${box.x + box.w},${cy} ${cx},${box.y + box.h} ${box.x},${cy}`;
    shapeEl = `<polygon points="${pts}" fill="${COLORS.nodeFill}" stroke="${COLORS.nodeStroke}" stroke-width="1.25" filter="url(#nodeShadow)"/>`;
  } else if (shape === 'circle') {
    const r = Math.min(box.w, box.h) / 2 - 1;
    shapeEl = `<circle cx="${cx}" cy="${cy}" r="${r}" fill="${COLORS.nodeFill}" stroke="${COLORS.nodeStroke}" stroke-width="1.25" filter="url(#nodeShadow)"/>`;
  } else if (shape === 'parallelogram') {
    const pts = `${box.x + 14},${box.y} ${box.x + box.w},${box.y} ${box.x + box.w - 14},${box.y + box.h} ${box.x},${box.y + box.h}`;
    shapeEl = `<polygon points="${pts}" fill="${COLORS.nodeFill}" stroke="${COLORS.nodeStroke}" stroke-width="1.25" filter="url(#nodeShadow)"/>`;
  } else {
    shapeEl = `<rect x="${box.x}" y="${box.y}" width="${box.w}" height="${box.h}" rx="14" fill="${COLORS.nodeFill}" stroke="${COLORS.nodeStroke}" stroke-width="1.25" filter="url(#nodeShadow)"/>`;
  }
  return shapeEl + label;
}

function renderQuestionNode(node: DiagramNode, box: LayoutBox): string {
  const answers = (node.metadata?.answers as string[] | undefined) ?? [];
  const clipId = `qhdr-${node.id.replace(/[^a-zA-Z0-9_-]/g, '_')}`;
  const x = box.x, y = box.y, w = box.w, h = box.h;
  const parts: string[] = [];

  // Card body
  parts.push(`<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="14" fill="${COLORS.nodeFill}" stroke="${COLORS.amberLine}" stroke-width="1.5" filter="url(#nodeShadow)"/>`);

  // Header tint (clipped to top rounded corners)
  parts.push(`<defs><clipPath id="${clipId}"><rect x="${x}" y="${y}" width="${w}" height="${Q_BASE_H}" rx="14"/></clipPath></defs>`);
  parts.push(`<rect x="${x}" y="${y}" width="${w}" height="${Q_BASE_H}" fill="${COLORS.amberSoft}" clip-path="url(#${clipId})"/>`);

  // Amber left accent
  parts.push(`<rect x="${x}" y="${y}" width="4" height="${Q_BASE_H}" rx="2" fill="${COLORS.amber}"/>`);

  // ? badge
  parts.push(`<rect x="${x + 12}" y="${y + 14}" width="28" height="28" rx="8" fill="${COLORS.amber}"/>`);
  parts.push(`<text x="${x + 26}" y="${y + 33}" text-anchor="middle" font-size="15" font-weight="900" fill="white">?</text>`);

  // QUESTION label + node label
  parts.push(`<text x="${x + 50}" y="${y + 27}" font-family="ui-sans-serif,system-ui,sans-serif" font-size="9" font-weight="700" fill="${COLORS.textSub}" letter-spacing="0.6">QUESTION</text>`);
  parts.push(`<text x="${x + 50}" y="${y + 42}" font-family="ui-sans-serif,system-ui,sans-serif" font-size="13" font-weight="700" fill="${COLORS.text}">${escapeXML(node.label)}</text>`);

  // Divider
  parts.push(`<line x1="${x}" y1="${y + Q_BASE_H}" x2="${x + w}" y2="${y + Q_BASE_H}" stroke="${COLORS.amberLine}" stroke-width="1"/>`);

  if (answers.length === 0) {
    parts.push(`<text x="${x + w / 2}" y="${y + Q_BASE_H + 22}" text-anchor="middle" font-size="10" fill="${COLORS.amber}" opacity="0.4" font-weight="600">No answers yet</text>`);
  } else {
    const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    answers.forEach((ans, i) => {
      const prevW = answers.slice(0, i).reduce((s, a) => s + answerCardW(a) + Q_CARD_PAD, 0);
      const cW = answerCardW(ans);
      const cardX = x + Q_CARD_PAD + prevW;
      const cardY = y + Q_BASE_H + 7;
      const cardH = Q_ANS_ROW_H - 20;
      const cx = cardX + cW / 2;
      const letter = i < 26 ? letters[i] : `${i + 1}`;
      const maxChars = Math.max(2, Math.floor((cW - 20) / 7.5));
      const displayAns = ans.length > maxChars ? ans.slice(0, maxChars - 1) + '…' : ans;

      parts.push(`<rect x="${cardX}" y="${cardY}" width="${cW}" height="${cardH}" rx="8" fill="${COLORS.amberCardBg}" stroke="${COLORS.amberLine}" stroke-width="1"/>`);
      parts.push(`<rect x="${cx - 11}" y="${cardY + 7}" width="22" height="22" rx="6" fill="#fef3c7"/>`);
      parts.push(`<text x="${cx}" y="${cardY + 22}" text-anchor="middle" font-size="10" font-weight="800" fill="${COLORS.amber}">${escapeXML(letter)}</text>`);
      parts.push(`<text x="${cx}" y="${cardY + 46}" text-anchor="middle" font-size="11" font-weight="500" fill="#374151" font-family="ui-sans-serif,system-ui,sans-serif">${escapeXML(displayAns)}</text>`);
    });
  }

  return parts.join('');
}

function renderEdge(edge: DiagramEdge, boxes: Map<string, LayoutBox>, variant: DiagramModel['variant'], nodes: DiagramNode[]): string {
  const fromBox = boxes.get(edge.from);
  const toBox = boxes.get(edge.to);
  if (!fromBox || !toBox) return '';

  let x1: number, y1: number;
  const fromNode = nodes.find(n => n.id === edge.from);

  if (fromNode && isQuestion(fromNode, variant)) {
    const answers = (fromNode.metadata?.answers as string[] | undefined) ?? [];
    const idx = answers.indexOf(edge.label ?? '');
    if (idx >= 0) {
      const prevW = answers.slice(0, idx).reduce((s, a) => s + answerCardW(a) + Q_CARD_PAD, 0);
      const cW = answerCardW(answers[idx]);
      x1 = fromBox.x + Q_CARD_PAD + prevW + cW / 2;
      y1 = fromBox.y + Q_BASE_H + Q_ANS_ROW_H - 8;
    } else {
      x1 = fromBox.x + fromBox.w / 2;
      y1 = fromBox.y + fromBox.h;
    }
  } else {
    x1 = fromBox.x + fromBox.w / 2;
    y1 = fromBox.y + fromBox.h;
  }
  const x2 = toBox.x + toBox.w / 2;
  const y2 = toBox.y;

  const dash = edge.style === 'dashed' ? ' stroke-dasharray="6,4"'
    : edge.style === 'dotted' ? ' stroke-dasharray="2,3"' : '';
  const marker = edge.arrowhead === 'none' ? '' : ' marker-end="url(#arrow)"';
  const d = bezierPath(x1, y1, x2, y2);

  let out = `<path d="${d}" fill="none" stroke="${COLORS.edge}" stroke-width="1.5"${dash}${marker}/>`;

  if (edge.label) {
    const midX = (x1 + x2) / 2;
    const midY = (y1 + y2) / 2;
    const labelW = estimateTextW(edge.label, 7) + 14;
    out += `<rect x="${midX - labelW / 2}" y="${midY - 11}" width="${labelW}" height="18" rx="9" fill="${COLORS.bg}" stroke="${COLORS.nodeStroke}" stroke-width="1"/>`;
    out += `<text x="${midX}" y="${midY + 2}" text-anchor="middle" font-family="ui-sans-serif,system-ui,sans-serif" font-size="11" fill="${COLORS.text}">${escapeXML(edge.label)}</text>`;
  }
  return out;
}

/**
 * Render a `DiagramModel` to a standalone SVG string. The output mirrors the
 * editor canvas: dot-grid background, soft drop-shadowed nodes, smooth
 * cubic-bezier edges. No external assets — the result is fully inline and
 * pasteable into HTML, README files, or PR descriptions.
 *
 * Layout is computed identically to the editor's hit-test pass (same width
 * estimation, padding, and question-card sizing), so an exported SVG matches
 * what you see on screen.
 *
 * Works in Node, Bun, and the browser (no DOM APIs needed).
 */
export function toSVG(model: DiagramModel): string {
  const boxes = computeLayout(model);
  let maxX = 0, maxY = 0;
  for (const b of boxes.values()) {
    maxX = Math.max(maxX, b.x + b.w);
    maxY = Math.max(maxY, b.y + b.h);
  }
  const width = maxX + PADDING;
  const height = maxY + PADDING + (model.title ? 32 : 0);

  const defs = [
    `<defs>`,
    `<pattern id="dotgrid" x="0" y="0" width="24" height="24" patternUnits="userSpaceOnUse">`,
    `<circle cx="12" cy="12" r="1.1" fill="${COLORS.dot}"/>`,
    `</pattern>`,
    `<filter id="nodeShadow" x="-20%" y="-20%" width="140%" height="140%">`,
    `<feDropShadow dx="0" dy="3" stdDeviation="5" flood-color="rgba(15,23,42,0.09)"/>`,
    `</filter>`,
    `<marker id="arrow" markerWidth="9" markerHeight="7" refX="8.5" refY="3.5" orient="auto" markerUnits="strokeWidth">`,
    `<path d="M0,0.5 L9,3.5 L0,6.5 L2.2,3.5 Z" fill="${COLORS.edge}"/>`,
    `</marker>`,
    `</defs>`,
  ].join('');

  const titleEl = model.title
    ? `<text x="${width / 2}" y="22" text-anchor="middle" font-family="ui-sans-serif,system-ui,sans-serif" font-size="15" font-weight="700" fill="${COLORS.text}">${escapeXML(model.title)}</text>`
    : '';

  const edges = model.edges.map(e => renderEdge(e, boxes, model.variant, model.nodes)).join('\n');
  const nodes = model.nodes.map(n => {
    const b = boxes.get(n.id)!;
    return isQuestion(n, model.variant) ? renderQuestionNode(n, b) : renderStandardNode(n, b);
  }).join('\n');

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">\n${defs}\n<rect width="${width}" height="${height}" fill="${COLORS.bg}"/>\n<rect width="${width}" height="${height}" fill="url(#dotgrid)"/>\n${titleEl}\n${edges}\n${nodes}\n</svg>`;
}

/**
 * Render a `DiagramModel` to a PNG `Blob`. Routes the SVG output through an
 * `<img>` and a `<canvas>` at `devicePixelRatio` scale, so the result is
 * crisp on hi-DPI displays.
 *
 * **Browser-only.** Throws if called in a Node/Bun environment (the Canvas
 * API is not available). For server-side PNG rendering, pipe `toSVG()` output
 * through a library like `@resvg/resvg-js`.
 */
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
      const scale = window.devicePixelRatio || 2;
      canvas.width = img.naturalWidth * scale;
      canvas.height = img.naturalHeight * scale;
      const ctx = canvas.getContext('2d')!;
      ctx.scale(scale, scale);
      ctx.drawImage(img, 0, 0);
      URL.revokeObjectURL(url);
      canvas.toBlob(b => b ? resolve(b) : reject(new Error('Canvas toBlob failed')), 'image/png');
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('SVG image load failed')); };
    img.src = url;
  });
}
