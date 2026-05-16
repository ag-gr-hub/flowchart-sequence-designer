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
const GRID = 24;

const C = {
  indigo: '#4f46e5',
  indigoLight: '#818cf8',
  indigoGlow: 'rgba(79,70,229,0.18)',
  amber: '#d97706',
  amberFill: '#fffbeb',
  amberGlow: 'rgba(217,119,6,0.18)',
  emerald: '#059669',
  emeraldFill: '#ecfdf5',
  emeraldGlow: 'rgba(5,150,105,0.18)',
  slate300: '#cbd5e1',
  slate400: '#94a3b8',
  slate600: '#475569',
  slate800: '#1e293b',
  nodeFill: '#ffffff',
  nodeSelectedFill: '#f5f3ff',
  canvas: '#f8fafc',
  dot: '#dde3ed',
  edgeColor: '#94a3b8',
  portColor: '#4f46e5',
};

interface Transform { x: number; y: number; scale: number }
interface DragState { nodeId: string; ox: number; oy: number }
interface LiveEdge { fromId: string; toX: number; toY: number }

interface DiagramEditorProps {
  initialModel?: DiagramModel;
  onChange?: (model: DiagramModel) => void;
  onExport?: (format: ExportFormat, content: string | Blob) => void;
  height?: number | string;
  allowedExports?: ExportFormat[];
  allowImport?: boolean;
  variant?: DiagramVariant;
}

function snap(v: number) { return Math.round(v / GRID) * GRID; }

function bezierPath(x1: number, y1: number, x2: number, y2: number): string {
  const dy = Math.abs(y2 - y1);
  const dx = Math.abs(x2 - x1);
  const curve = Math.max(50, (dy + dx) * 0.4);
  return `M ${x1} ${y1} C ${x1} ${y1 + curve}, ${x2} ${y2 - curve}, ${x2} ${y2}`;
}

function variantNodeColors(variant: DiagramVariant, selected: boolean) {
  if (variant === 'question') return {
    fill: selected ? '#fef3c7' : C.amberFill,
    stroke: selected ? C.amber : '#fcd34d',
    glow: C.amberGlow,
    accent: C.amber,
    textColor: selected ? C.amber : C.slate800,
  };
  if (variant === 'journey') return {
    fill: selected ? '#d1fae5' : C.emeraldFill,
    stroke: selected ? C.emerald : '#6ee7b7',
    glow: C.emeraldGlow,
    accent: C.emerald,
    textColor: selected ? C.emerald : C.slate800,
  };
  return {
    fill: selected ? C.nodeSelectedFill : C.nodeFill,
    stroke: selected ? C.indigo : C.slate300,
    glow: C.indigoGlow,
    accent: C.indigo,
    textColor: selected ? C.indigo : C.slate800,
  };
}

function NodeShape({
  node, selected, connecting, variant, stepNumber, hovered,
}: {
  node: DiagramNode; selected: boolean; connecting: boolean;
  variant: DiagramVariant; stepNumber?: number; hovered: boolean;
}) {
  const cx = NODE_W / 2, cy = NODE_H / 2;
  const colors = variantNodeColors(variant, selected);
  const strokeColor = connecting ? '#06b6d4' : colors.stroke;
  const fillColor = connecting ? '#ecfeff' : colors.fill;
  const glowColor = connecting ? 'rgba(6,182,212,0.22)' : colors.glow;
  const sw = selected || connecting ? 2 : 1.5;

  const glow = (selected || connecting) && (
    <g style={{ filter: 'blur(7px)' }}>
      {node.shape === 'circle'
        ? <circle cx={cx} cy={cy} r={NODE_H / 2 + 5} fill={glowColor} />
        : node.shape === 'diamond'
        ? <polygon points={`${cx},${-7} ${NODE_W + 7},${cy} ${cx},${NODE_H + 7} ${-7},${cy}`} fill={glowColor} />
        : <rect x={-5} y={-5} width={NODE_W + 10} height={NODE_H + 10} rx={16} fill={glowColor} />}
    </g>
  );

  const badge = (
    <>
      {variant === 'question' && (
        <circle cx={NODE_W - 10} cy={10} r={8} fill={C.amber} />
      )}
      {variant === 'question' && (
        <text x={NODE_W - 10} y={14} textAnchor="middle" fontSize={10} fill="white" fontWeight="700" style={{ pointerEvents: 'none', userSelect: 'none' }}>?</text>
      )}
      {variant === 'journey' && stepNumber !== undefined && (
        <circle cx={12} cy={12} r={10} fill={C.emerald} />
      )}
      {variant === 'journey' && stepNumber !== undefined && (
        <text x={12} y={16} textAnchor="middle" fontSize={9} fill="white" fontWeight="700" style={{ pointerEvents: 'none', userSelect: 'none' }}>{stepNumber}</text>
      )}
    </>
  );

  switch (node.shape) {
    case 'diamond': {
      const pts = `${cx},0 ${NODE_W},${cy} ${cx},${NODE_H} 0,${cy}`;
      return <>{glow}<polygon points={pts} fill={fillColor} stroke={strokeColor} strokeWidth={sw} filter="url(#nodeShadow)" />{badge}</>;
    }
    case 'circle': {
      const r = NODE_H / 2 - 1;
      return <>{glow}<circle cx={cx} cy={cy} r={r} fill={fillColor} stroke={strokeColor} strokeWidth={sw} filter="url(#nodeShadow)" />{badge}</>;
    }
    case 'parallelogram':
      return <>{glow}<polygon points={`14,0 ${NODE_W},0 ${NODE_W - 14},${NODE_H} 0,${NODE_H}`} fill={fillColor} stroke={strokeColor} strokeWidth={sw} filter="url(#nodeShadow)" />{badge}</>;
    default:
      return <>{glow}<rect width={NODE_W} height={NODE_H} rx={12} fill={fillColor} stroke={strokeColor} strokeWidth={sw} filter="url(#nodeShadow)" />{badge}</>;
  }
}

function EdgeLine({ edge, nodes }: { edge: DiagramEdge; nodes: DiagramNode[] }) {
  const from = nodes.find(n => n.id === edge.from);
  const to = nodes.find(n => n.id === edge.to);
  if (!from || !to) return null;

  const x1 = (from.x ?? 0) + NODE_W / 2;
  const y1 = (from.y ?? 0) + NODE_H;
  const x2 = (to.x ?? 0) + NODE_W / 2;
  const y2 = to.y ?? 0;
  const d = bezierPath(x1, y1, x2, y2);
  const mx = (x1 + x2) / 2;
  const my = (y1 + y2) / 2 - 8;
  const dash = edge.style === 'dashed' ? '7,4' : edge.style === 'dotted' ? '2,4' : undefined;

  return (
    <g>
      <path d={d} fill="none" stroke="transparent" strokeWidth={12} />
      <path d={d} fill="none" stroke={C.edgeColor} strokeWidth={1.5} strokeDasharray={dash} strokeLinecap="round" markerEnd="url(#arrowhead)" />
      {edge.label && (
        <>
          <rect x={mx - 30} y={my - 11} width={60} height={19} rx={5} fill="white" stroke={C.slate300} strokeWidth={1} />
          <text x={mx} y={my + 4} textAnchor="middle" fontSize={10} fill={C.slate600} fontFamily="ui-sans-serif,system-ui,sans-serif" fontWeight="500">{edge.label}</text>
        </>
      )}
    </g>
  );
}

let _nodeSeq = 0;
let _edgeSeq = 0;

export function DiagramEditor({
  initialModel, onChange, onExport, height = 600,
  allowedExports, allowImport = true, variant = 'flowchart',
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
  const svgRef = useRef<SVGSVGElement>(null);

  const notify = useCallback((m: DiagramModel) => onChange?.(m), [onChange]);

  const toCanvas = useCallback((clientX: number, clientY: number) => {
    const rect = svgRef.current!.getBoundingClientRect();
    return {
      x: (clientX - rect.left - transform.x) / transform.scale,
      y: (clientY - rect.top - transform.y) / transform.scale,
    };
  }, [transform]);

  useEffect(() => {
    const el = svgRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const rect = el.getBoundingClientRect();
      const px = e.clientX - rect.left, py = e.clientY - rect.top;
      const delta = e.deltaY > 0 ? 0.9 : 1.1;
      setTransform(t => {
        const scale = Math.min(3, Math.max(0.15, t.scale * delta));
        return { scale, x: px - (px - t.x) * (scale / t.scale), y: py - (py - t.y) * (scale / t.scale) };
      });
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, []);

  // Port drag: start drawing a live edge
  const onPortMouseDown = (e: React.MouseEvent, nodeId: string) => {
    e.stopPropagation();
    const node = model.nodes.find(n => n.id === nodeId)!;
    const { x, y } = toCanvas(e.clientX, e.clientY);
    setLiveEdge({ fromId: nodeId, toX: x, toY: y });
  };

  const onNodeMouseDown = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (liveEdge) return; // port drag in progress — let onNodeMouseUp handle it
    setSelected(id);
    const node = model.nodes.find(n => n.id === id)!;
    setDrag({
      nodeId: id,
      ox: e.clientX - (transform.x + (node.x ?? 0) * transform.scale),
      oy: e.clientY - (transform.y + (node.y ?? 0) * transform.scale),
    });
  };

  const onNodeMouseUp = (e: React.MouseEvent, targetId: string) => {
    if (liveEdge && liveEdge.fromId !== targetId) {
      e.stopPropagation();
      const edgeId = `e${++_edgeSeq}`;
      const updated = { ...model, edges: [...model.edges, { id: edgeId, from: liveEdge.fromId, to: targetId }] };
      setModel(updated); notify(updated);
      setLiveEdge(null);
    }
  };

  const onSvgMouseDown = (e: React.MouseEvent) => {
    const el = e.target as SVGElement;
    const isBg = el === svgRef.current || el.dataset.bg === '1';
    if (isBg) {
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
      setTransform(t => ({ ...t, x: pan.tx + (e.clientX - pan.ox), y: pan.ty + (e.clientY - pan.oy) }));
    }
  };

  const onMouseUp = (e: React.MouseEvent) => {
    setDrag(null); setPan(null);
    if (liveEdge) setLiveEdge(null); // dropped on empty canvas — cancel
  };

  const onNodeDblClick = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    const node = model.nodes.find(n => n.id === id)!;
    setEditingId(id); setEditLabel(node.label);
  };

  const commitEdit = () => {
    if (!editingId) return;
    const updated = { ...model, nodes: model.nodes.map(n => n.id === editingId ? { ...n, label: editLabel } : n) };
    setModel(updated); notify(updated);
    setEditingId(null);
  };

  const defaultLabel = variant === 'question' ? 'New Question' : variant === 'journey' ? `Step ${model.nodes.length + 1}` : 'New Step';

  const addNode = () => {
    const id = `node${++_nodeSeq}`;
    const p = { x: snap(100 + Math.random() * 240), y: snap(100 + Math.random() * 180) };
    const updated = { ...model, nodes: [...model.nodes, { id, label: defaultLabel, shape: 'rectangle' as const, ...p }] };
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
      setModel({ ...m, nodes }); notify({ ...m, nodes });
    } catch (err) { alert(`Import failed: ${(err as Error).message}`); }
  }, [notify]);

  const handleStepEditorChange = useCallback((updated: DiagramModel) => {
    setModel(updated); notify(updated);
  }, [notify]);

  const cursorStyle = pan ? 'grabbing' : drag ? 'grabbing' : liveEdge ? 'crosshair' : 'default';

  const variantLabel = variant === 'question' ? 'Question' : variant === 'journey' ? 'Step' : 'Node';
  const colors = variantNodeColors(variant, false);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height, width: '100%', fontFamily: 'ui-sans-serif,system-ui,sans-serif', boxSizing: 'border-box', background: C.canvas }}>
      <Toolbar
        onExport={handleExport}
        onImport={allowImport ? handleImport : undefined}
        allowedExports={allowedExports}
        allowImport={allowImport}
      />

      {/* Controls bar */}
      <div style={{ display: 'flex', gap: 6, padding: '7px 14px', background: 'white', borderBottom: `1px solid ${C.slate300}`, alignItems: 'center', flexWrap: 'wrap' }}>
        <button onClick={addNode} style={ctrlBtn(colors.accent)}>
          <span style={{ fontSize: 15 }}>+</span> {variantLabel}
        </button>
        {selected && (
          <>
            <div style={{ width: 1, height: 20, background: C.slate300, margin: '0 2px' }} />
            <button onClick={deleteSelected} style={{ ...ctrlBtn('transparent'), color: '#ef4444', border: '1px solid #fca5a5' }}>
              Delete
            </button>
          </>
        )}
        {liveEdge && (
          <span style={{ fontSize: 11, color: C.portColor, fontWeight: 500, marginLeft: 4 }}>
            Drop on a node to connect — or release to cancel
          </span>
        )}
        <span style={{ marginLeft: 'auto', fontSize: 11, color: C.slate400, letterSpacing: 0.2 }}>
          drag port dot · scroll to zoom · drag canvas to pan · dbl-click to rename
        </span>
      </div>

      {/* Variant badge */}
      {variant !== 'flowchart' && (
        <div style={{ padding: '3px 14px', background: colors.fill, borderBottom: `1px solid ${colors.stroke}`, fontSize: 11, color: colors.accent, fontWeight: 600, letterSpacing: 0.4 }}>
          {variant === 'question' ? '? Question Flow — edges are answers' : '↗ Journey Map — drag nodes to sequence your steps'}
        </div>
      )}

      {/* Canvas + Sidebar */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
        <div style={{ flex: 1, overflow: 'hidden', position: 'relative', background: C.canvas }}>
          <svg
            ref={svgRef}
            width="100%"
            height="100%"
            style={{ display: 'block', cursor: cursorStyle, userSelect: 'none' }}
            onMouseDown={onSvgMouseDown}
            onMouseMove={onMouseMove}
            onMouseUp={onMouseUp}
            onMouseLeave={onMouseUp}
          >
            <defs>
              <pattern id="dots" width={GRID} height={GRID} patternUnits="userSpaceOnUse">
                <circle cx={GRID / 2} cy={GRID / 2} r={1} fill={C.dot} />
              </pattern>
              <filter id="nodeShadow" x="-15%" y="-15%" width="130%" height="140%">
                <feDropShadow dx="0" dy="2" stdDeviation="3" floodColor={C.slate800} floodOpacity="0.07" />
              </filter>
              <marker id="arrowhead" markerWidth="8" markerHeight="6" refX="7" refY="3" orient="auto" markerUnits="strokeWidth">
                <path d="M0,0 L8,3 L0,6 Z" fill={C.edgeColor} />
              </marker>
              <marker id="arrowLive" markerWidth="8" markerHeight="6" refX="7" refY="3" orient="auto" markerUnits="strokeWidth">
                <path d="M0,0 L8,3 L0,6 Z" fill={C.indigo} />
              </marker>
            </defs>

            <rect width="100%" height="100%" fill="url(#dots)" data-bg="1" />

            <g transform={`translate(${transform.x},${transform.y}) scale(${transform.scale})`}>
              {/* Edges */}
              {model.edges.map(e => <EdgeLine key={e.id} edge={e} nodes={model.nodes} />)}

              {/* Live edge preview */}
              {liveEdge && (() => {
                const fromNode = model.nodes.find(n => n.id === liveEdge.fromId)!;
                if (!fromNode) return null;
                const x1 = (fromNode.x ?? 0) + NODE_W / 2;
                const y1 = (fromNode.y ?? 0) + NODE_H;
                const d = bezierPath(x1, y1, liveEdge.toX, liveEdge.toY);
                return (
                  <path d={d} fill="none" stroke={C.indigo} strokeWidth={2} strokeDasharray="6,3" strokeLinecap="round" opacity={0.6} markerEnd="url(#arrowLive)" />
                );
              })()}

              {/* Nodes */}
              {model.nodes.map((node, idx) => {
                const isHovered = hoveredId === node.id;
                const colors = variantNodeColors(variant, selected === node.id);
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
                    <NodeShape
                      node={node}
                      selected={selected === node.id}
                      connecting={false}
                      variant={variant}
                      stepNumber={variant === 'journey' ? idx + 1 : undefined}
                      hovered={isHovered}
                    />

                    {/* Label */}
                    {editingId === node.id ? (
                      <foreignObject x={6} y={6} width={NODE_W - 12} height={NODE_H - 12}>
                        <input
                          // @ts-ignore
                          xmlns="http://www.w3.org/1999/xhtml"
                          autoFocus
                          value={editLabel}
                          onChange={e => setEditLabel(e.target.value)}
                          onBlur={commitEdit}
                          onKeyDown={e => { if (e.key === 'Enter') commitEdit(); if (e.key === 'Escape') setEditingId(null); }}
                          style={{
                            width: '100%', height: '100%', border: 'none', borderRadius: 6,
                            outline: `2px solid ${colors.accent}`, textAlign: 'center',
                            fontSize: 13, fontWeight: 500,
                            background: colors.fill,
                            boxSizing: 'border-box', padding: '0 6px', fontFamily: 'inherit', color: C.slate800,
                          }}
                        />
                      </foreignObject>
                    ) : (
                      <text
                        x={NODE_W / 2}
                        y={NODE_H / 2 + 5}
                        textAnchor="middle"
                        fontSize={13}
                        fontWeight="500"
                        fontFamily="ui-sans-serif,system-ui,sans-serif"
                        fill={colors.textColor}
                        style={{ pointerEvents: 'none', userSelect: 'none' }}
                      >
                        {node.label}
                      </text>
                    )}

                    {/* Output port dot — bottom center */}
                    <circle
                      cx={NODE_W / 2}
                      cy={NODE_H + 1}
                      r={6}
                      fill={colors.accent}
                      stroke="white"
                      strokeWidth={2}
                      style={{
                        cursor: 'crosshair',
                        opacity: isHovered || liveEdge?.fromId === node.id ? 1 : 0,
                        transition: 'opacity 0.15s',
                        pointerEvents: isHovered ? 'all' : 'none',
                        filter: 'drop-shadow(0 1px 3px rgba(0,0,0,0.2))',
                      }}
                      onMouseDown={e => onPortMouseDown(e, node.id)}
                    />

                    {/* Input port dot — top center (visible when dragging an edge) */}
                    {liveEdge && liveEdge.fromId !== node.id && (
                      <circle
                        cx={NODE_W / 2}
                        cy={-1}
                        r={6}
                        fill={colors.accent}
                        stroke="white"
                        strokeWidth={2}
                        style={{ cursor: 'crosshair', opacity: 0.85 }}
                      />
                    )}
                  </g>
                );
              })}
            </g>
          </svg>

          {model.nodes.length === 0 && (
            <div style={{
              position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column',
              alignItems: 'center', justifyContent: 'center', pointerEvents: 'none', gap: 8,
            }}>
              <div style={{ fontSize: 36, opacity: 0.15 }}>{variant === 'question' ? '?' : variant === 'journey' ? '↗' : '⬡'}</div>
              <div style={{ fontSize: 13, color: C.slate400, fontWeight: 500 }}>
                Click <strong style={{ color: colors.accent }}>+ {variantLabel}</strong> to start
              </div>
            </div>
          )}
        </div>

        {selected && (
          <StepEditor
            key={selected}
            nodeId={selected}
            model={model}
            onModelChange={handleStepEditorChange}
            variant={variant}
          />
        )}
      </div>

      <div style={{ padding: '4px 14px', fontSize: 11, color: C.slate400, background: 'white', borderTop: `1px solid ${C.slate300}`, display: 'flex', gap: 16 }}>
        <span>{model.nodes.length} {variantLabel.toLowerCase()}s</span>
        <span>{model.edges.length} connections</span>
        <span>{Math.round(transform.scale * 100)}% zoom</span>
        {selected && <span style={{ color: colors.accent }}>{model.nodes.find(n => n.id === selected)?.label}</span>}
      </div>
    </div>
  );
}

function ctrlBtn(accent: string): React.CSSProperties {
  return {
    display: 'inline-flex', alignItems: 'center', gap: 5,
    padding: '5px 12px', background: accent, color: accent === 'transparent' ? '#ef4444' : '#fff',
    border: accent === 'transparent' ? '1px solid #fca5a5' : 'none',
    borderRadius: 6, cursor: 'pointer', fontSize: 12,
    fontWeight: 500, fontFamily: 'inherit', letterSpacing: 0.2,
  };
}
