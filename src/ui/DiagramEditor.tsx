import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Toolbar } from './Toolbar.js';
import { StepEditor } from './StepEditor.js';
import type { DiagramModel, DiagramNode, DiagramEdge, ExportFormat } from '../core/types.js';
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
  slate300: '#cbd5e1',
  slate400: '#94a3b8',
  slate600: '#475569',
  slate800: '#1e293b',
  nodeFill: '#ffffff',
  nodeSelectedFill: '#f5f3ff',
  canvas: '#f8fafc',
  dot: '#dde3ed',
  edgeColor: '#94a3b8',
  connectColor: '#06b6d4',
};

interface Transform { x: number; y: number; scale: number }
interface DragState { nodeId: string; ox: number; oy: number }
interface ConnectState { fromId: string }

interface DiagramEditorProps {
  initialModel?: DiagramModel;
  onChange?: (model: DiagramModel) => void;
  onExport?: (format: ExportFormat, content: string | Blob) => void;
  height?: number | string;
  allowedExports?: ExportFormat[];
  allowImport?: boolean;
}

function snap(v: number) { return Math.round(v / GRID) * GRID; }

function bezierPath(x1: number, y1: number, x2: number, y2: number): string {
  const dy = Math.abs(y2 - y1);
  const curve = Math.max(50, dy * 0.55);
  return `M ${x1} ${y1} C ${x1} ${y1 + curve}, ${x2} ${y2 - curve}, ${x2} ${y2}`;
}

function NodeShape({ node, selected, connecting }: { node: DiagramNode; selected: boolean; connecting: boolean }) {
  const cx = NODE_W / 2, cy = NODE_H / 2;
  const isConnecting = connecting;
  const strokeColor = isConnecting ? C.connectColor : selected ? C.indigo : C.slate300;
  const strokeW = selected || isConnecting ? 2 : 1.5;
  const fill = selected ? C.nodeSelectedFill : C.nodeFill;

  // Glow ring behind selected node
  const glow = (selected || isConnecting) && (
    <g style={{ filter: `blur(6px)` }}>
      {node.shape === 'circle' ? (
        <circle cx={cx} cy={cy} r={NODE_H / 2 + 4} fill={isConnecting ? 'rgba(6,182,212,0.3)' : C.indigoGlow} />
      ) : node.shape === 'diamond' ? (
        <polygon
          points={`${cx},${-6} ${NODE_W + 6},${cy} ${cx},${NODE_H + 6} ${-6},${cy}`}
          fill={isConnecting ? 'rgba(6,182,212,0.3)' : C.indigoGlow}
        />
      ) : (
        <rect x={-4} y={-4} width={NODE_W + 8} height={NODE_H + 8} rx={16} fill={isConnecting ? 'rgba(6,182,212,0.3)' : C.indigoGlow} />
      )}
    </g>
  );

  switch (node.shape) {
    case 'diamond': {
      const pts = `${cx},0 ${NODE_W},${cy} ${cx},${NODE_H} 0,${cy}`;
      return <>{glow}<polygon points={pts} fill={fill} stroke={strokeColor} strokeWidth={strokeW} filter="url(#nodeShadow)" /></>;
    }
    case 'circle': {
      const r = NODE_H / 2 - 1;
      return <>{glow}<circle cx={cx} cy={cy} r={r} fill={fill} stroke={strokeColor} strokeWidth={strokeW} filter="url(#nodeShadow)" /></>;
    }
    case 'parallelogram':
      return <>{glow}<polygon points={`14,0 ${NODE_W},0 ${NODE_W - 14},${NODE_H} 0,${NODE_H}`} fill={fill} stroke={strokeColor} strokeWidth={strokeW} filter="url(#nodeShadow)" /></>;
    default:
      return <>{glow}<rect width={NODE_W} height={NODE_H} rx={12} fill={fill} stroke={strokeColor} strokeWidth={strokeW} filter="url(#nodeShadow)" /></>;
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
      {/* Wider invisible hit area */}
      <path d={d} fill="none" stroke="transparent" strokeWidth={12} />
      <path
        d={d}
        fill="none"
        stroke={C.edgeColor}
        strokeWidth={1.5}
        strokeDasharray={dash}
        strokeLinecap="round"
        markerEnd="url(#arrowhead)"
      />
      {edge.label && (
        <>
          <rect x={mx - 28} y={my - 10} width={56} height={18} rx={4} fill="white" stroke={C.slate300} strokeWidth={1} />
          <text x={mx} y={my + 4} textAnchor="middle" fontSize={10} fill={C.slate600} fontFamily="ui-sans-serif,system-ui,sans-serif" fontWeight="500">
            {edge.label}
          </text>
        </>
      )}
    </g>
  );
}

let _nodeSeq = 0;
let _edgeSeq = 0;

export function DiagramEditor({ initialModel, onChange, onExport, height = 600, allowedExports, allowImport = true }: DiagramEditorProps) {
  const base: DiagramModel = initialModel ?? { type: 'flowchart', nodes: [], edges: [] };
  const [model, setModel] = useState<DiagramModel>(base);
  const [transform, setTransform] = useState<Transform>({ x: 60, y: 60, scale: 1 });
  const [selected, setSelected] = useState<string | null>(null);
  const [drag, setDrag] = useState<DragState | null>(null);
  const [pan, setPan] = useState<{ ox: number; oy: number; tx: number; ty: number } | null>(null);
  const [connecting, setConnecting] = useState<ConnectState | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editLabel, setEditLabel] = useState('');
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  const notify = useCallback((m: DiagramModel) => onChange?.(m), [onChange]);

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

  const onNodeMouseDown = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (connecting) {
      if (connecting.fromId === id) { setConnecting(null); return; }
      const edgeId = `e${++_edgeSeq}`;
      const updated = { ...model, edges: [...model.edges, { id: edgeId, from: connecting.fromId, to: id }] };
      setModel(updated); notify(updated);
      setConnecting(null);
      return;
    }
    setSelected(id);
    const node = model.nodes.find(n => n.id === id)!;
    setDrag({ nodeId: id, ox: e.clientX - (node.x ?? 0) * transform.scale, oy: e.clientY - (node.y ?? 0) * transform.scale });
  };

  const onSvgMouseDown = (e: React.MouseEvent) => {
    const tag = (e.target as Element).tagName;
    const isBg = e.target === svgRef.current || tag === 'circle' && (e.target as SVGElement).dataset.bg || tag === 'rect' && (e.target as SVGElement).dataset.bg;
    if (isBg) {
      setSelected(null);
      setConnecting(null);
      setPan({ ox: e.clientX, oy: e.clientY, tx: transform.x, ty: transform.y });
    }
  };

  const onMouseMove = (e: React.MouseEvent) => {
    if (drag) {
      const x = snap((e.clientX - drag.ox - transform.x) / transform.scale);
      const y = snap((e.clientY - drag.oy - transform.y) / transform.scale);
      const updated = { ...model, nodes: model.nodes.map(n => n.id === drag.nodeId ? { ...n, x, y } : n) };
      setModel(updated); notify(updated);
    } else if (pan) {
      setTransform(t => ({ ...t, x: pan.tx + (e.clientX - pan.ox), y: pan.ty + (e.clientY - pan.oy) }));
    }
  };

  const onMouseUp = () => { setDrag(null); setPan(null); };

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

  const addNode = () => {
    const id = `node${++_nodeSeq}`;
    const p = { x: snap(100 + Math.random() * 240), y: snap(100 + Math.random() * 180) };
    const updated = { ...model, nodes: [...model.nodes, { id, label: 'New Step', shape: 'rectangle' as const, ...p }] };
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
      const updated = { ...m, nodes };
      setModel(updated); notify(updated);
    } catch (err) { alert(`Import failed: ${(err as Error).message}`); }
  }, [notify]);

  const handleStepEditorChange = useCallback((updated: DiagramModel) => {
    setModel(updated); notify(updated);
  }, [notify]);

  const cursorStyle = pan ? 'grabbing' : drag ? 'grabbing' : connecting ? 'crosshair' : 'default';

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
        <button onClick={addNode} style={ctrlBtn(C.indigo)}>
          <span style={{ fontSize: 15, lineHeight: 1 }}>+</span> Node
        </button>
        {selected && (
          <>
            <div style={{ width: 1, height: 20, background: C.slate300, margin: '0 2px' }} />
            <button
              onClick={() => setConnecting(c => c ? null : { fromId: selected })}
              style={ctrlBtn(connecting ? C.connectColor : C.slate600)}
            >
              {connecting ? '↗ Connecting…' : '↗ Connect'}
            </button>
            <button onClick={deleteSelected} style={{ ...ctrlBtn('#ef4444'), background: 'transparent', color: '#ef4444', border: '1px solid #fca5a5' }}>
              Delete
            </button>
          </>
        )}
        {connecting && (
          <span style={{ fontSize: 11, color: C.connectColor, marginLeft: 4, fontWeight: 500 }}>
            Click any node to draw an edge
          </span>
        )}
        <span style={{ marginLeft: 'auto', fontSize: 11, color: C.slate400, letterSpacing: 0.2 }}>
          scroll to zoom · drag to pan · double-click to rename
        </span>
      </div>

      {/* Canvas + Sidebar */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
        <div style={{ flex: 1, overflow: 'hidden', position: 'relative', background: C.canvas }}>
          <svg
            ref={svgRef}
            width="100%"
            height="100%"
            style={{ display: 'block', cursor: cursorStyle }}
            onMouseDown={onSvgMouseDown}
            onMouseMove={onMouseMove}
            onMouseUp={onMouseUp}
            onMouseLeave={onMouseUp}
          >
            <defs>
              {/* Dot grid */}
              <pattern id="dots" width={GRID} height={GRID} patternUnits="userSpaceOnUse">
                <circle cx={GRID / 2} cy={GRID / 2} r={1} fill={C.dot} />
              </pattern>

              {/* Node drop shadow */}
              <filter id="nodeShadow" x="-15%" y="-15%" width="130%" height="140%">
                <feDropShadow dx="0" dy="2" stdDeviation="3" floodColor={C.slate800} floodOpacity="0.07" />
              </filter>

              {/* Arrowhead */}
              <marker id="arrowhead" markerWidth="8" markerHeight="6" refX="7" refY="3" orient="auto" markerUnits="strokeWidth">
                <path d="M0,0 L8,3 L0,6 Z" fill={C.edgeColor} />
              </marker>
            </defs>

            {/* Background */}
            <rect width="100%" height="100%" fill="url(#dots)" data-bg="1" />

            <g transform={`translate(${transform.x},${transform.y}) scale(${transform.scale})`}>
              {/* Edges rendered below nodes */}
              {model.edges.map(e => <EdgeLine key={e.id} edge={e} nodes={model.nodes} />)}

              {/* Nodes */}
              {model.nodes.map(node => (
                <g
                  key={node.id}
                  transform={`translate(${node.x ?? 0},${node.y ?? 0})`}
                  style={{ cursor: drag?.nodeId === node.id ? 'grabbing' : 'grab' }}
                  onMouseDown={e => onNodeMouseDown(e, node.id)}
                  onDoubleClick={e => onNodeDblClick(e, node.id)}
                  onMouseEnter={() => setHoveredId(node.id)}
                  onMouseLeave={() => setHoveredId(null)}
                >
                  <NodeShape
                    node={node}
                    selected={selected === node.id}
                    connecting={connecting?.fromId === node.id}
                  />
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
                          outline: `2px solid ${C.indigo}`, textAlign: 'center',
                          fontSize: 13, fontWeight: 500, background: '#ede9fe',
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
                      fill={selected === node.id ? C.indigo : C.slate800}
                      style={{ pointerEvents: 'none', userSelect: 'none' }}
                    >
                      {node.label}
                    </text>
                  )}
                </g>
              ))}
            </g>
          </svg>

          {/* Empty state hint */}
          {model.nodes.length === 0 && (
            <div style={{
              position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column',
              alignItems: 'center', justifyContent: 'center', pointerEvents: 'none', gap: 8,
            }}>
              <div style={{ fontSize: 36, opacity: 0.15 }}>⬡</div>
              <div style={{ fontSize: 13, color: C.slate400, fontWeight: 500 }}>Click <strong style={{ color: C.indigo }}>+ Node</strong> to start building</div>
            </div>
          )}
        </div>

        {/* Step Editor */}
        {selected && (
          <StepEditor
            key={selected}
            nodeId={selected}
            model={model}
            onModelChange={handleStepEditorChange}
          />
        )}
      </div>

      {/* Status bar */}
      <div style={{ padding: '4px 14px', fontSize: 11, color: C.slate400, background: 'white', borderTop: `1px solid ${C.slate300}`, display: 'flex', gap: 16 }}>
        <span>{model.nodes.length} nodes</span>
        <span>{model.edges.length} edges</span>
        <span>{Math.round(transform.scale * 100)}% zoom</span>
        {selected && <span style={{ color: C.indigo }}>{model.nodes.find(n => n.id === selected)?.label}</span>}
      </div>
    </div>
  );
}

function ctrlBtn(accent: string): React.CSSProperties {
  return {
    display: 'inline-flex', alignItems: 'center', gap: 5,
    padding: '5px 12px', background: accent, color: '#fff',
    border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 12,
    fontWeight: 500, fontFamily: 'inherit', letterSpacing: 0.2,
  };
}
