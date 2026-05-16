import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Toolbar } from './Toolbar.js';
import { StepEditor } from './StepEditor.js';
import type { DiagramModel, DiagramNode, DiagramEdge, ExportFormat, DiagramVariant } from '../core/types.js';
import { toMermaid } from '../exporters/mermaid.js';
import { toPlantUML } from '../exporters/plantuml.js';
import { toJSON } from '../exporters/json.js';
import { toSVG, toPNG } from '../exporters/svg.js';
import { fromMermaid } from '../importers/mermaid.js';
import { fromJSON } from '../importers/json.js';

const NODE_W = 152;
const NODE_H = 48;
const Q_W = 192;
const Q_BASE_H = 52;
const Q_ANS_H = 30;
const GRID = 24;

// ── Theme ──────────────────────────────────────────────────────────────────
export interface ThemeColors {
  canvas: string; dot: string;
  nodeFill: string; nodeStroke: string; nodeSelectedFill: string;
  edgeColor: string;
  textPrimary: string; textSecondary: string; textMuted: string;
  panelBg: string; panelBorder: string;
  ctrlsBg: string; ctrlsBorder: string;
  inputBg: string; inputBorder: string; inputText: string;
  cardBg: string; cardBorder: string;
  sectionBorder: string;
  labelText: string;
  hintText: string;
  statusBg: string;
  btnSecBg: string; btnSecText: string;
  shapeBtnBg: string; shapeBtnBorder: string;
  addFormBg: string;
  bannerBg: string;
}

const lightTheme: ThemeColors = {
  canvas: '#f8fafc', dot: '#dde3ed',
  nodeFill: '#ffffff', nodeStroke: '#cbd5e1', nodeSelectedFill: '#f5f3ff',
  edgeColor: '#94a3b8',
  textPrimary: '#1e293b', textSecondary: '#475569', textMuted: '#94a3b8',
  panelBg: '#ffffff', panelBorder: '#e2e8f0',
  ctrlsBg: '#ffffff', ctrlsBorder: '#cbd5e1',
  inputBg: '#f8fafc', inputBorder: '#e2e8f0', inputText: '#1e293b',
  cardBg: '#f8fafc', cardBorder: '#e2e8f0',
  sectionBorder: '#f1f5f9',
  labelText: '#94a3b8',
  hintText: '#94a3b8',
  statusBg: '#ffffff',
  btnSecBg: '#e2e8f0', btnSecText: '#475569',
  shapeBtnBg: '#f1f5f9', shapeBtnBorder: '#e2e8f0',
  addFormBg: '#f5f3ff',
  bannerBg: '#f8fafc',
};

const darkTheme: ThemeColors = {
  canvas: '#0f172a', dot: '#1e293b',
  nodeFill: '#1e293b', nodeStroke: '#334155', nodeSelectedFill: '#1e1b4b',
  edgeColor: '#475569',
  textPrimary: '#f1f5f9', textSecondary: '#94a3b8', textMuted: '#475569',
  panelBg: '#1e293b', panelBorder: '#334155',
  ctrlsBg: '#0f172a', ctrlsBorder: '#1e293b',
  inputBg: '#0f172a', inputBorder: '#334155', inputText: '#e2e8f0',
  cardBg: '#0f172a', cardBorder: '#334155',
  sectionBorder: '#0f172a',
  labelText: '#475569',
  hintText: '#475569',
  statusBg: '#0f172a',
  btnSecBg: '#334155', btnSecText: '#94a3b8',
  shapeBtnBg: '#0f172a', shapeBtnBorder: '#334155',
  addFormBg: '#1e1b4b',
  bannerBg: '#1e293b',
};

// ── Accent palettes ────────────────────────────────────────────────────────
const C = {
  indigo: '#4f46e5', indigoGlow: 'rgba(79,70,229,0.22)',
  amber: '#d97706', amberLight: '#fef3c7', amberBorder: '#fcd34d', amberGlow: 'rgba(217,119,6,0.25)',
  amberDark: '#fbbf24', amberDarkLight: 'rgba(251,191,36,0.12)', amberDarkBorder: 'rgba(251,191,36,0.3)',
  emerald: '#059669', emeraldLight: '#ecfdf5', emeraldGlow: 'rgba(5,150,105,0.2)',
  emeraldDark: '#10b981', emeraldDarkLight: 'rgba(16,185,129,0.12)', emeraldDarkBorder: 'rgba(16,185,129,0.3)',
};

interface Transform { x: number; y: number; scale: number }
interface DragState { nodeId: string; ox: number; oy: number }
interface LiveEdge {
  fromId: string; fromX: number; fromY: number;
  exitDir: 'bottom' | 'right'; answerLabel?: string; toX: number; toY: number;
}

export interface DiagramEditorProps {
  initialModel?: DiagramModel;
  onChange?: (model: DiagramModel) => void;
  onExport?: (format: ExportFormat, content: string | Blob) => void;
  height?: number | string;
  allowedExports?: ExportFormat[];
  allowImport?: boolean;
  variant?: DiagramVariant;
  theme?: 'light' | 'dark' | 'auto';
}

function snap(v: number) { return Math.round(v / GRID) * GRID; }

function questionNodeH(answers: string[]): number {
  return Q_BASE_H + Math.max(1, answers.length) * Q_ANS_H;
}

function bezierPath(x1: number, y1: number, x2: number, y2: number, exitDir: 'bottom' | 'right' = 'bottom'): string {
  if (exitDir === 'right') {
    const dx = Math.abs(x2 - x1), dy = Math.abs(y2 - y1);
    const c = Math.max(60, (dx + dy) * 0.45);
    return `M ${x1} ${y1} C ${x1 + c} ${y1}, ${x2} ${y2 - c * 0.5}, ${x2} ${y2}`;
  }
  const dy = Math.abs(y2 - y1), dx = Math.abs(x2 - x1);
  const curve = Math.max(50, (dy + dx) * 0.4);
  return `M ${x1} ${y1} C ${x1} ${y1 + curve}, ${x2} ${y2 - curve}, ${x2} ${y2}`;
}

function variantAccent(variant: DiagramVariant, isDark: boolean) {
  if (variant === 'question') {
    return isDark
      ? { color: C.amberDark, fill: C.amberDarkLight, border: C.amberDarkBorder, glow: C.amberGlow }
      : { color: C.amber, fill: C.amberLight, border: C.amberBorder, glow: C.amberGlow };
  }
  if (variant === 'journey') {
    return isDark
      ? { color: C.emeraldDark, fill: C.emeraldDarkLight, border: C.emeraldDarkBorder, glow: C.emeraldGlow }
      : { color: C.emerald, fill: C.emeraldLight, border: '#6ee7b7', glow: C.emeraldGlow };
  }
  return isDark
    ? { color: '#818cf8', fill: 'rgba(79,70,229,0.12)', border: 'rgba(79,70,229,0.3)', glow: C.indigoGlow }
    : { color: C.indigo, fill: '#f5f3ff', border: '#c7d2fe', glow: C.indigoGlow };
}

// ── Standard node shape ────────────────────────────────────────────────────
function NodeShape({ node, selected, variant, stepNumber, t, isDark }: {
  node: DiagramNode; selected: boolean; variant: DiagramVariant;
  stepNumber?: number; t: ThemeColors; isDark: boolean;
}) {
  const acc = variantAccent(variant, isDark);
  const cx = NODE_W / 2, cy = NODE_H / 2;
  const stroke = selected ? acc.color : t.nodeStroke;
  const fill = selected ? t.nodeSelectedFill : t.nodeFill;
  const sw = selected ? 2 : 1.5;

  const glow = selected && (
    <g style={{ filter: 'blur(7px)' }}>
      {node.shape === 'circle'
        ? <circle cx={cx} cy={cy} r={NODE_H / 2 + 5} fill={acc.glow} />
        : node.shape === 'diamond'
        ? <polygon points={`${cx},${-7} ${NODE_W + 7},${cy} ${cx},${NODE_H + 7} ${-7},${cy}`} fill={acc.glow} />
        : <rect x={-5} y={-5} width={NODE_W + 10} height={NODE_H + 10} rx={16} fill={acc.glow} />}
    </g>
  );

  const badgeColor = isDark ? C.emeraldDark : C.emerald;
  const badge = variant === 'journey' && stepNumber !== undefined && (
    <>
      <circle cx={14} cy={14} r={10} fill={badgeColor} />
      <text x={14} y={18} textAnchor="middle" fontSize={9} fill="white" fontWeight="700" style={{ pointerEvents: 'none', userSelect: 'none' }}>{stepNumber}</text>
    </>
  );

  switch (node.shape) {
    case 'diamond': {
      const pts = `${cx},0 ${NODE_W},${cy} ${cx},${NODE_H} 0,${cy}`;
      return <>{glow}<polygon points={pts} fill={fill} stroke={stroke} strokeWidth={sw} filter="url(#nodeShadow)" />{badge}</>;
    }
    case 'circle':
      return <>{glow}<circle cx={cx} cy={cy} r={NODE_H / 2 - 1} fill={fill} stroke={stroke} strokeWidth={sw} filter="url(#nodeShadow)" />{badge}</>;
    case 'parallelogram':
      return <>{glow}<polygon points={`14,0 ${NODE_W},0 ${NODE_W - 14},${NODE_H} 0,${NODE_H}`} fill={fill} stroke={stroke} strokeWidth={sw} filter="url(#nodeShadow)" />{badge}</>;
    default:
      return <>{glow}<rect width={NODE_W} height={NODE_H} rx={12} fill={fill} stroke={stroke} strokeWidth={sw} filter="url(#nodeShadow)" />{badge}</>;
  }
}

// ── Question node ──────────────────────────────────────────────────────────
function QuestionNode({ node, selected, edges, isDark, onAnswerPortDown }: {
  node: DiagramNode; selected: boolean; edges: DiagramEdge[];
  isDark: boolean;
  onAnswerPortDown: (e: React.MouseEvent, nodeId: string, answer: string, portY: number) => void;
}) {
  const answers: string[] = (node.metadata?.answers as string[] | undefined) ?? [];
  const totalH = questionNodeH(answers);
  const amberColor = isDark ? C.amberDark : C.amber;
  const amberBorder = isDark ? C.amberDarkBorder : C.amberBorder;
  const amberFill = isDark ? C.amberDarkLight : C.amberLight;
  const nodeFill = isDark ? (selected ? 'rgba(251,191,36,0.08)' : '#1e293b') : (selected ? C.amberLight : '#fffdf7');
  const stroke = selected ? amberColor : amberBorder;
  const sw = selected ? 2 : 1.5;
  const textColor = isDark ? '#f1f5f9' : '#1e293b';
  const pillFill = isDark ? '#0f172a' : '#fff';

  const glow = selected && (
    <g style={{ filter: 'blur(8px)' }}>
      <rect x={-6} y={-6} width={Q_W + 12} height={totalH + 12} rx={16} fill={C.amberGlow} />
    </g>
  );

  return (
    <>
      {glow}
      <rect width={Q_W} height={totalH} rx={12} fill={nodeFill} stroke={stroke} strokeWidth={sw} filter="url(#nodeShadow)" />
      <circle cx={Q_W - 14} cy={16} r={11} fill={amberColor} />
      <text x={Q_W - 14} y={20} textAnchor="middle" fontSize={12} fontWeight="800" fill="white" style={{ pointerEvents: 'none', userSelect: 'none' }}>?</text>
      <text
        x={Q_W / 2 - 8} y={Q_BASE_H / 2 + 5}
        textAnchor="middle" fontSize={13} fontWeight="600"
        fontFamily="ui-sans-serif,system-ui,sans-serif"
        fill={selected ? amberColor : textColor}
        style={{ pointerEvents: 'none', userSelect: 'none' }}
      >
        {node.label}
      </text>
      <line x1={10} y1={Q_BASE_H} x2={Q_W - 10} y2={Q_BASE_H} stroke={amberBorder} strokeWidth={1} />
      {answers.length === 0 && (
        <text x={Q_W / 2} y={Q_BASE_H + Q_ANS_H / 2 + 5} textAnchor="middle" fontSize={11} fill={amberColor} opacity={0.5} style={{ pointerEvents: 'none', userSelect: 'none' }}>
          Add answers in panel →
        </text>
      )}
      {answers.map((ans, i) => {
        const rowY = Q_BASE_H + i * Q_ANS_H;
        const midY = rowY + Q_ANS_H / 2;
        const connected = edges.some(e => e.from === node.id && e.label === ans);
        return (
          <g key={ans + i}>
            <rect x={10} y={rowY + 5} width={Q_W - 46} height={Q_ANS_H - 10} rx={999}
              fill={connected ? amberColor : pillFill} stroke={amberBorder} strokeWidth={1} />
            <text
              x={Q_W / 2 - 14} y={midY + 4}
              textAnchor="middle" fontSize={11} fontWeight="500"
              fill={connected ? '#fff' : (isDark ? '#94a3b8' : '#475569')}
              style={{ pointerEvents: 'none', userSelect: 'none' }}
            >
              {ans.length > 18 ? ans.slice(0, 16) + '…' : ans}
            </text>
            <circle
              cx={Q_W - 14} cy={midY} r={7}
              fill={connected ? amberColor : pillFill}
              stroke={amberColor} strokeWidth={1.5}
              style={{ cursor: 'crosshair', filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.2))' }}
              onMouseDown={e => onAnswerPortDown(e, node.id, ans, midY)}
            />
            <text x={Q_W - 14} y={midY + 4} textAnchor="middle" fontSize={9}
              fill={connected ? '#fff' : amberColor}
              style={{ pointerEvents: 'none', userSelect: 'none' }}>→</text>
          </g>
        );
      })}
    </>
  );
}

// ── Edge ───────────────────────────────────────────────────────────────────
function EdgeLine({ edge, nodes, variant, t, isDark }: {
  edge: DiagramEdge; nodes: DiagramNode[]; variant: DiagramVariant;
  t: ThemeColors; isDark: boolean;
}) {
  const from = nodes.find(n => n.id === edge.from);
  const to = nodes.find(n => n.id === edge.to);
  if (!from || !to) return null;

  let x1: number, y1: number, exitDir: 'bottom' | 'right' = 'bottom';
  const amberColor = isDark ? C.amberDark : C.amber;

  if (variant === 'question') {
    const answers: string[] = (from.metadata?.answers as string[] | undefined) ?? [];
    const idx = answers.indexOf(edge.label ?? '');
    if (idx >= 0) {
      x1 = (from.x ?? 0) + Q_W;
      y1 = (from.y ?? 0) + Q_BASE_H + idx * Q_ANS_H + Q_ANS_H / 2;
      exitDir = 'right';
    } else {
      x1 = (from.x ?? 0) + Q_W / 2;
      y1 = (from.y ?? 0) + questionNodeH(answers);
    }
  } else {
    x1 = (from.x ?? 0) + NODE_W / 2;
    y1 = (from.y ?? 0) + NODE_H;
  }

  const toW = variant === 'question' ? Q_W : NODE_W;
  const x2 = (to.x ?? 0) + toW / 2;
  const y2 = to.y ?? 0;
  const d = bezierPath(x1, y1, x2, y2, exitDir);
  const mx = (x1 + x2) / 2, my = (y1 + y2) / 2 - 8;
  const dash = edge.style === 'dashed' ? '7,4' : edge.style === 'dotted' ? '2,4' : undefined;
  const edgeClr = variant === 'question' ? amberColor : t.edgeColor;

  return (
    <g>
      <path d={d} fill="none" stroke="transparent" strokeWidth={12} />
      <path d={d} fill="none" stroke={edgeClr}
        strokeWidth={variant === 'question' ? 2 : 1.5} strokeDasharray={dash}
        strokeLinecap="round"
        markerEnd={variant === 'question' ? 'url(#arrowAmber)' : 'url(#arrowhead)'}
        opacity={variant === 'question' ? 0.75 : 1}
      />
      {edge.label && variant !== 'question' && (
        <>
          <rect x={mx - 30} y={my - 11} width={60} height={19} rx={5} fill={t.panelBg} stroke={t.cardBorder} strokeWidth={1} />
          <text x={mx} y={my + 4} textAnchor="middle" fontSize={10} fill={t.textSecondary}
            fontFamily="ui-sans-serif,system-ui,sans-serif" fontWeight="500">{edge.label}</text>
        </>
      )}
    </g>
  );
}

let _nodeSeq = 0;
let _edgeSeq = 0;

export function DiagramEditor({
  initialModel, onChange, onExport, height = 600,
  allowedExports, allowImport = true, variant = 'flowchart', theme = 'auto',
}: DiagramEditorProps) {
  const base: DiagramModel = initialModel ?? { type: 'flowchart', nodes: [], edges: [] };
  const [model, setModel] = useState<DiagramModel>(base);
  const [transform, setTransform] = useState<Transform>({ x: 60, y: 60, scale: 1 });
  const [selected, setSelected] = useState<string | null>(null);
  const [drag, setDrag] = useState<DragState | null>(null);
  const [pan, setPan] = useState<{ ox: number; oy: number; tx: number; ty: number } | null>(null);
  const [liveEdge, setLiveEdge] = useState<LiveEdge | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editLabel, setEditLabel] = useState('');
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [sysDark, setSysDark] = useState(() =>
    typeof window !== 'undefined' ? window.matchMedia('(prefers-color-scheme: dark)').matches : false
  );
  const svgRef = useRef<SVGSVGElement>(null);

  // Listen for system theme changes
  useEffect(() => {
    if (theme !== 'auto') return;
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = (e: MediaQueryListEvent) => setSysDark(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, [theme]);

  const isDark = theme === 'dark' || (theme === 'auto' && sysDark);
  const t = isDark ? darkTheme : lightTheme;

  const notify = useCallback((m: DiagramModel) => onChange?.(m), [onChange]);

  const toCanvas = useCallback((clientX: number, clientY: number) => {
    const rect = svgRef.current!.getBoundingClientRect();
    return { x: (clientX - rect.left - transform.x) / transform.scale, y: (clientY - rect.top - transform.y) / transform.scale };
  }, [transform]);

  useEffect(() => {
    const el = svgRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const rect = el.getBoundingClientRect();
      const px = e.clientX - rect.left, py = e.clientY - rect.top;
      const delta = e.deltaY > 0 ? 0.9 : 1.1;
      setTransform(tr => {
        const scale = Math.min(3, Math.max(0.15, tr.scale * delta));
        return { scale, x: px - (px - tr.x) * (scale / tr.scale), y: py - (py - tr.y) * (scale / tr.scale) };
      });
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, []);

  const onPortMouseDown = (e: React.MouseEvent, nodeId: string) => {
    e.stopPropagation();
    const node = model.nodes.find(n => n.id === nodeId)!;
    const { x, y } = toCanvas(e.clientX, e.clientY);
    setLiveEdge({ fromId: nodeId, fromX: (node.x ?? 0) + NODE_W / 2, fromY: (node.y ?? 0) + NODE_H, exitDir: 'bottom', toX: x, toY: y });
  };

  const onAnswerPortDown = (e: React.MouseEvent, nodeId: string, answer: string, portYInNode: number) => {
    e.stopPropagation();
    const node = model.nodes.find(n => n.id === nodeId)!;
    const { x, y } = toCanvas(e.clientX, e.clientY);
    setLiveEdge({ fromId: nodeId, fromX: (node.x ?? 0) + Q_W, fromY: (node.y ?? 0) + portYInNode, exitDir: 'right', answerLabel: answer, toX: x, toY: y });
  };

  const onNodeMouseDown = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (liveEdge) return;
    setSelected(id);
    const node = model.nodes.find(n => n.id === id)!;
    setDrag({ nodeId: id, ox: e.clientX - (transform.x + (node.x ?? 0) * transform.scale), oy: e.clientY - (transform.y + (node.y ?? 0) * transform.scale) });
  };

  const onNodeMouseUp = (e: React.MouseEvent, targetId: string) => {
    if (!liveEdge || liveEdge.fromId === targetId) return;
    e.stopPropagation();
    const label = liveEdge.answerLabel;
    if (label) {
      const existing = model.edges.find(ex => ex.from === liveEdge.fromId && ex.label === label);
      if (existing) {
        const updated = { ...model, edges: model.edges.map(ex => ex.id === existing.id ? { ...ex, to: targetId } : ex) };
        setModel(updated); notify(updated);
      } else {
        const newEdge: DiagramEdge = { id: `e${++_edgeSeq}`, from: liveEdge.fromId, to: targetId, label };
        const updated = { ...model, edges: [...model.edges, newEdge] };
        setModel(updated); notify(updated);
      }
    } else {
      const newEdge: DiagramEdge = { id: `e${++_edgeSeq}`, from: liveEdge.fromId, to: targetId };
      const updated = { ...model, edges: [...model.edges, newEdge] };
      setModel(updated); notify(updated);
    }
    setLiveEdge(null);
  };

  const onSvgMouseDown = (e: React.MouseEvent) => {
    if ((e.target as SVGElement).dataset.bg === '1' || e.target === svgRef.current) {
      setSelected(null);
      setPan({ ox: e.clientX, oy: e.clientY, tx: transform.x, ty: transform.y });
    }
  };

  const onMouseMove = (e: React.MouseEvent) => {
    if (liveEdge) {
      const { x, y } = toCanvas(e.clientX, e.clientY);
      setLiveEdge(le => le ? { ...le, toX: x, toY: y } : null);
      return;
    }
    if (drag) {
      const x = snap((e.clientX - drag.ox - transform.x) / transform.scale);
      const y = snap((e.clientY - drag.oy - transform.y) / transform.scale);
      const updated = { ...model, nodes: model.nodes.map(n => n.id === drag.nodeId ? { ...n, x, y } : n) };
      setModel(updated); notify(updated);
    } else if (pan) {
      setTransform(tr => ({ ...tr, x: pan.tx + (e.clientX - pan.ox), y: pan.ty + (e.clientY - pan.oy) }));
    }
  };

  const onMouseUp = () => { setDrag(null); setPan(null); if (liveEdge) setLiveEdge(null); };

  const onNodeDblClick = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    const node = model.nodes.find(n => n.id === id)!;
    setEditingId(id); setEditLabel(node.label);
  };

  const commitEdit = () => {
    if (!editingId) return;
    setModel(m => { const up = { ...m, nodes: m.nodes.map(n => n.id === editingId ? { ...n, label: editLabel } : n) }; notify(up); return up; });
    setEditingId(null);
  };

  const addNode = () => {
    const id = `node${++_nodeSeq}`;
    const p = { x: snap(100 + Math.random() * 240), y: snap(100 + Math.random() * 180) };
    const label = variant === 'question' ? 'New Question' : variant === 'journey' ? `Step ${model.nodes.length + 1}` : 'New Step';
    const metadata = variant === 'question' ? { answers: [] } : undefined;
    const updated = { ...model, nodes: [...model.nodes, { id, label, shape: 'rectangle' as const, metadata, ...p }] };
    setModel(updated); notify(updated); setSelected(id);
  };

  const deleteSelected = () => {
    if (!selected) return;
    const updated = { ...model, nodes: model.nodes.filter(n => n.id !== selected), edges: model.edges.filter(e => e.from !== selected && e.to !== selected) };
    setModel(updated); notify(updated); setSelected(null);
  };

  const handleExport = useCallback(async (format: ExportFormat) => {
    let content: string | Blob;
    switch (format) {
      case 'mermaid': content = toMermaid(model); break;
      case 'plantuml': content = toPlantUML(model); break;
      case 'json': content = toJSON(model); break;
      case 'svg': content = toSVG(model); break;
      case 'png': content = await toPNG(model); break;
      default: return;
    }
    if (onExport) { onExport(format, content); return; }
    const url = content instanceof Blob ? URL.createObjectURL(content) : URL.createObjectURL(new Blob([content], { type: 'text/plain' }));
    const a = document.createElement('a'); a.href = url; a.download = `diagram.${format === 'plantuml' ? 'puml' : format}`; a.click(); URL.revokeObjectURL(url);
  }, [model, onExport]);

  const handleImport = useCallback((text: string) => {
    try {
      const m = text.trim().startsWith('{') ? fromJSON(text).toJSON() : fromMermaid(text).toJSON();
      const nodes = m.nodes.map((n, i) => ({ ...n, x: n.x ?? snap(80 + (i % 4) * 200), y: n.y ?? snap(80 + Math.floor(i / 4) * 140) }));
      const updated = { ...m, nodes }; setModel(updated); notify(updated);
    } catch (err) { alert(`Import failed: ${(err as Error).message}`); }
  }, [notify]);

  const acc = variantAccent(variant, isDark);
  const variantLabel = variant === 'question' ? 'Question' : variant === 'journey' ? 'Step' : 'Node';
  const shadowColor = isDark ? 'rgba(0,0,0,0.5)' : 'rgba(30,41,59,0.07)';
  const arrowColor = isDark ? '#475569' : '#94a3b8';
  const amberArrow = isDark ? C.amberDark : C.amber;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height, width: '100%', fontFamily: 'ui-sans-serif,system-ui,sans-serif', boxSizing: 'border-box', background: t.ctrlsBg }}>
      <Toolbar onExport={handleExport} onImport={allowImport ? handleImport : undefined} allowedExports={allowedExports} allowImport={allowImport} />

      {/* Controls bar */}
      <div style={{ display: 'flex', gap: 6, padding: '7px 14px', background: t.ctrlsBg, borderBottom: `1px solid ${t.ctrlsBorder}`, alignItems: 'center', flexWrap: 'wrap' }}>
        <button onClick={addNode} style={ctrlBtn(acc.color, isDark)}>+ {variantLabel}</button>
        {selected && (
          <>
            <div style={{ width: 1, height: 20, background: t.ctrlsBorder, margin: '0 2px' }} />
            <button onClick={deleteSelected} style={{ ...ctrlBtn('transparent', isDark), color: '#ef4444', border: `1px solid ${isDark ? '#7f1d1d' : '#fca5a5'}` }}>Delete</button>
          </>
        )}
        {liveEdge && (
          <span style={{ fontSize: 11, color: acc.color, fontWeight: 600, marginLeft: 6 }}>
            {liveEdge.answerLabel ? `Routing "${liveEdge.answerLabel}" →` : 'Drop on a node to connect'}
            <span style={{ fontWeight: 400, color: t.textMuted, marginLeft: 6 }}>release to cancel</span>
          </span>
        )}
        <span style={{ marginLeft: 'auto', fontSize: 11, color: t.textMuted }}>
          {variant === 'question' ? 'drag answer port to connect · ' : 'drag port dot · '}scroll to zoom · drag to pan
        </span>
      </div>

      {variant !== 'flowchart' && (
        <div style={{ padding: '3px 14px', background: acc.fill, borderBottom: `1px solid ${acc.border}`, fontSize: 11, color: acc.color, fontWeight: 600 }}>
          {variant === 'question' ? '? Question Flow — add answers in the panel, drag their port to connect' : '↗ Journey Map — numbered steps, drag port to sequence'}
        </div>
      )}

      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
        <div style={{ flex: 1, overflow: 'hidden', position: 'relative', background: t.canvas }}>
          <svg
            ref={svgRef}
            width="100%" height="100%"
            style={{ display: 'block', cursor: pan ? 'grabbing' : drag ? 'grabbing' : liveEdge ? 'crosshair' : 'default', userSelect: 'none' }}
            onMouseDown={onSvgMouseDown}
            onMouseMove={onMouseMove}
            onMouseUp={onMouseUp}
            onMouseLeave={onMouseUp}
          >
            <defs>
              <pattern id="dots" width={GRID} height={GRID} patternUnits="userSpaceOnUse">
                <circle cx={GRID / 2} cy={GRID / 2} r={1} fill={t.dot} />
              </pattern>
              <filter id="nodeShadow" x="-15%" y="-15%" width="130%" height="140%">
                <feDropShadow dx="0" dy="2" stdDeviation="3" floodColor={shadowColor} floodOpacity="1" />
              </filter>
              <marker id="arrowhead" markerWidth="8" markerHeight="6" refX="7" refY="3" orient="auto" markerUnits="strokeWidth">
                <path d="M0,0 L8,3 L0,6 Z" fill={arrowColor} />
              </marker>
              <marker id="arrowAmber" markerWidth="8" markerHeight="6" refX="7" refY="3" orient="auto" markerUnits="strokeWidth">
                <path d="M0,0 L8,3 L0,6 Z" fill={amberArrow} />
              </marker>
              <marker id="arrowLive" markerWidth="8" markerHeight="6" refX="7" refY="3" orient="auto" markerUnits="strokeWidth">
                <path d="M0,0 L8,3 L0,6 Z" fill={acc.color} />
              </marker>
            </defs>

            <rect width="100%" height="100%" fill="url(#dots)" data-bg="1" />

            <g transform={`translate(${transform.x},${transform.y}) scale(${transform.scale})`}>
              {model.edges.map(e => <EdgeLine key={e.id} edge={e} nodes={model.nodes} variant={variant} t={t} isDark={isDark} />)}

              {liveEdge && (() => {
                const d = bezierPath(liveEdge.fromX, liveEdge.fromY, liveEdge.toX, liveEdge.toY, liveEdge.exitDir);
                return <path d={d} fill="none" stroke={acc.color} strokeWidth={2} strokeDasharray="6,3" strokeLinecap="round" opacity={0.75} markerEnd="url(#arrowLive)" />;
              })()}

              {model.nodes.map((node, idx) => {
                const isHovered = hoveredId === node.id;
                const isQuestion = variant === 'question';
                const nodeW = isQuestion ? Q_W : NODE_W;
                const nodeH = isQuestion ? questionNodeH((node.metadata?.answers as string[] | undefined) ?? []) : NODE_H;

                return (
                  <g
                    key={node.id}
                    transform={`translate(${node.x ?? 0},${node.y ?? 0})`}
                    style={{ cursor: drag?.nodeId === node.id ? 'grabbing' : 'grab' }}
                    onMouseDown={e => onNodeMouseDown(e, node.id)}
                    onMouseUp={e => onNodeMouseUp(e, node.id)}
                    onDoubleClick={e => onNodeDblClick(e, node.id)}
                    onMouseEnter={() => setHoveredId(node.id)}
                    onMouseLeave={() => setHoveredId(null)}
                  >
                    {isQuestion ? (
                      <QuestionNode node={node} selected={selected === node.id} edges={model.edges} isDark={isDark} onAnswerPortDown={onAnswerPortDown} />
                    ) : (
                      <>
                        <NodeShape node={node} selected={selected === node.id} variant={variant} stepNumber={variant === 'journey' ? idx + 1 : undefined} t={t} isDark={isDark} />
                        {editingId === node.id ? (
                          <foreignObject x={6} y={6} width={NODE_W - 12} height={NODE_H - 12}>
                            <input
                              // @ts-ignore
                              xmlns="http://www.w3.org/1999/xhtml" autoFocus
                              value={editLabel}
                              onChange={e => setEditLabel(e.target.value)}
                              onBlur={commitEdit}
                              onKeyDown={e => { if (e.key === 'Enter') commitEdit(); if (e.key === 'Escape') setEditingId(null); }}
                              style={{ width: '100%', height: '100%', border: 'none', borderRadius: 6, outline: `2px solid ${acc.color}`, textAlign: 'center', fontSize: 13, fontWeight: 500, background: t.inputBg, boxSizing: 'border-box', padding: '0 6px', fontFamily: 'inherit', color: t.inputText }}
                            />
                          </foreignObject>
                        ) : (
                          <text x={NODE_W / 2} y={NODE_H / 2 + 5} textAnchor="middle" fontSize={13} fontWeight="500" fontFamily="ui-sans-serif,system-ui,sans-serif" fill={selected === node.id ? acc.color : t.textPrimary} style={{ pointerEvents: 'none', userSelect: 'none' }}>
                            {node.label}
                          </text>
                        )}
                        <circle
                          cx={NODE_W / 2} cy={NODE_H + 1} r={6}
                          fill={acc.color} stroke={isDark ? '#0f172a' : 'white'} strokeWidth={2}
                          style={{ cursor: 'crosshair', opacity: isHovered ? 1 : 0, transition: 'opacity 0.15s', pointerEvents: isHovered ? 'all' : 'none', filter: 'drop-shadow(0 1px 3px rgba(0,0,0,0.25))' }}
                          onMouseDown={e => onPortMouseDown(e, node.id)}
                        />
                      </>
                    )}

                    {liveEdge && liveEdge.fromId !== node.id && (
                      <circle cx={nodeW / 2} cy={-1} r={6} fill={acc.color} stroke={isDark ? '#0f172a' : 'white'} strokeWidth={2} style={{ opacity: 0.85, pointerEvents: 'none' }} />
                    )}
                  </g>
                );
              })}
            </g>
          </svg>

          {model.nodes.length === 0 && (
            <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none', gap: 8 }}>
              <div style={{ fontSize: 36, opacity: 0.1, color: t.textPrimary }}>{variant === 'question' ? '?' : variant === 'journey' ? '↗' : '⬡'}</div>
              <div style={{ fontSize: 13, color: t.textMuted, fontWeight: 500 }}>Click <strong style={{ color: acc.color }}>+ {variantLabel}</strong> to start</div>
            </div>
          )}
        </div>

        {selected && (
          <StepEditor key={selected} nodeId={selected} model={model} onModelChange={m => { setModel(m); notify(m); }} variant={variant} isDark={isDark} t={t} acc={acc} />
        )}
      </div>

      <div style={{ padding: '4px 14px', fontSize: 11, color: t.textMuted, background: t.statusBg, borderTop: `1px solid ${t.ctrlsBorder}`, display: 'flex', gap: 16 }}>
        <span>{model.nodes.length} {variantLabel.toLowerCase()}s</span>
        <span>{model.edges.length} connections</span>
        <span>{Math.round(transform.scale * 100)}% zoom</span>
        {selected && <span style={{ color: acc.color }}>{model.nodes.find(n => n.id === selected)?.label}</span>}
      </div>
    </div>
  );
}

function ctrlBtn(accent: string, isDark: boolean): React.CSSProperties {
  const isTransparent = accent === 'transparent';
  return {
    display: 'inline-flex', alignItems: 'center', gap: 5,
    padding: '5px 12px',
    background: isTransparent ? 'transparent' : accent,
    color: isTransparent ? '#ef4444' : '#fff',
    border: isTransparent ? `1px solid ${isDark ? '#7f1d1d' : '#fca5a5'}` : 'none',
    borderRadius: 6, cursor: 'pointer', fontSize: 12, fontWeight: 500, fontFamily: 'inherit',
  };
}
