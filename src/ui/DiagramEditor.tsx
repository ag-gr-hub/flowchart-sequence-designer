import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Toolbar } from './Toolbar.js';
import { StepEditor } from './StepEditor.js';
import { SequenceEditor } from './SequenceEditor.js';
import { Minimap } from './Minimap.js';
import { NodeNavigator } from './NodeNavigator.js';
import { ContextMenu, type CtxMenuState as CtxMenu } from './ContextMenu.js';
import { NodeShape, QuestionNode, EdgeLine } from './render.js';
import { useHistory } from './hooks/useHistory.js';
import { useIsDark, usePrefersReducedMotion } from './hooks/useSystemTheme.js';
import {
  NODE_H,
  GRID,
  nodeWidth,
  questionNodeW,
  questionNodeH,
  snap,
  bezierPath,
} from './layout.js';
import type { DiagramModel, DiagramNode, DiagramEdge, ExportFormat, DiagramVariant } from '../core/types.js';
import { toMermaid } from '../exporters/mermaid.js';
import { toPlantUML } from '../exporters/plantuml.js';
import { toJSON } from '../exporters/json.js';
import { toSVG, toPNG } from '../exporters/svg.js';
import { fromMermaid } from '../importers/mermaid.js';
import { fromJSON } from '../importers/json.js';

// ── Theme ──────────────────────────────────────────────────────────────────
import { ACCENT as C, type ThemeColors, lightTheme, darkTheme, variantAccent } from './theme.js';
export type { ThemeColors } from './theme.js';

interface Transform { x: number; y: number; scale: number }
interface DragState { nodeId: string; ox: number; oy: number }
interface LiveEdge {
  fromId: string; fromX: number; fromY: number;
  exitDir: 'bottom' | 'right' | 'left'; answerLabel?: string; toX: number; toY: number;
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
  /**
   * Override individual colors in the resolved theme. Applied on top of the
   * built-in light/dark palette. Useful for matching the editor to a host
   * application's brand without forking the component.
   */
  themeOverrides?: Partial<ThemeColors>;
}



let _nodeSeq = 0;
let _edgeSeq = 0;

export function DiagramEditor(props: DiagramEditorProps) {
  // Delegate sequence diagrams to the dedicated SequenceEditor.
  if (props.initialModel?.type === 'sequence') {
    return <SequenceEditor
      initialModel={props.initialModel}
      onChange={props.onChange}
      onExport={props.onExport}
      height={props.height}
      allowedExports={props.allowedExports}
      allowImport={props.allowImport}
      theme={props.theme}
      themeOverrides={props.themeOverrides}
    />;
  }
  return <FlowchartEditor {...props} />;
}

function FlowchartEditor({
  initialModel, onChange, onExport, height = 600,
  allowedExports, allowImport = true, variant = 'flowchart', theme = 'auto',
  themeOverrides,
}: DiagramEditorProps) {
  const base: DiagramModel = initialModel
    ? { ...initialModel, variant: initialModel.variant ?? variant }
    : { type: 'flowchart', variant, nodes: [], edges: [] };
  const notify = useCallback((m: DiagramModel) => onChange?.(m), [onChange]);
  const history = useHistory<DiagramModel>(base, notify);
  const { state: model, apply: applyModel, applyAndPush, undo, redo } = history;
  const [transform, setTransform] = useState<Transform>({ x: 60, y: 60, scale: 1 });
  const [selected, setSelected] = useState<string | null>(null);
  const [drag, setDrag] = useState<DragState | null>(null);
  const [pan, setPan] = useState<{ ox: number; oy: number; tx: number; ty: number } | null>(null);
  const [liveEdge, setLiveEdge] = useState<LiveEdge | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editLabel, setEditLabel] = useState('');
  const [editingEdgeId, setEditingEdgeId] = useState<string | null>(null);
  const [editEdgeLabel, setEditEdgeLabel] = useState('');
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [ctxMenu, setCtxMenu] = useState<CtxMenu | null>(null);
  const [navOpen, setNavOpen] = useState(true);
  const [viewport, setViewport] = useState<{ w: number; h: number }>({ w: 0, h: 0 });
  const [announcement, setAnnouncement] = useState('');
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const reducedMotion = usePrefersReducedMotion();
  const isDark = useIsDark(theme);

  // Track the SVG element size for the minimap viewport overlay.
  useEffect(() => {
    if (!svgRef.current || typeof ResizeObserver === 'undefined') return;
    const el = svgRef.current;
    const ro = new ResizeObserver(() => {
      const r = el.getBoundingClientRect();
      setViewport({ w: r.width, h: r.height });
    });
    ro.observe(el);
    const r = el.getBoundingClientRect();
    setViewport({ w: r.width, h: r.height });
    return () => ro.disconnect();
  }, []);

  const t = useMemo<ThemeColors>(
    () => ({ ...(isDark ? darkTheme : lightTheme), ...(themeOverrides ?? {}) }),
    [isDark, themeOverrides],
  );


  const reCenter = useCallback(() => {
    if (!svgRef.current) return;
    const rect = svgRef.current.getBoundingClientRect();
    const W = rect.width, H = rect.height;
    if (model.nodes.length === 0) { setTransform({ x: W / 2, y: H / 2, scale: 1 }); return; }
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (const n of model.nodes) {
      const nx = n.x ?? 0, ny = n.y ?? 0;
      const nw = variant === 'question' ? questionNodeW(n) : nodeWidth(n.label);
      const nh = variant === 'question' ? questionNodeH((n.metadata?.answers as string[] | undefined) ?? []) : NODE_H;
      minX = Math.min(minX, nx); minY = Math.min(minY, ny);
      maxX = Math.max(maxX, nx + nw); maxY = Math.max(maxY, ny + nh);
    }
    const pad = 48;
    const scaleX = (W - pad * 2) / (maxX - minX || 1);
    const scaleY = (H - pad * 2) / (maxY - minY || 1);
    const scale = Math.min(1.5, Math.max(0.2, Math.min(scaleX, scaleY)));
    const cx = (minX + maxX) / 2, cy = (minY + maxY) / 2;
    setTransform({ scale, x: W / 2 - cx * scale, y: H / 2 - cy * scale });
  }, [model.nodes, variant]);

  const jumpToNode = useCallback((nodeId: string) => {
    const node = model.nodes.find(n => n.id === nodeId);
    if (!node || !svgRef.current) return;
    const rect = svgRef.current.getBoundingClientRect();
    const nw = variant === 'question' ? questionNodeW(node) : nodeWidth(node.label);
    const nh = variant === 'question' ? questionNodeH((node.metadata?.answers as string[] | undefined) ?? []) : NODE_H;
    const cx = (node.x ?? 0) + nw / 2;
    const cy = (node.y ?? 0) + nh / 2;
    const scale = Math.min(Math.max(transform.scale, 0.8), 1.4);
    setTransform({ scale, x: rect.width / 2 - cx * scale, y: rect.height / 2 - cy * scale });
    setSelected(nodeId);
  }, [model.nodes, variant, transform.scale]);

  const duplicateNode = useCallback((nodeId: string) => {
    const node = model.nodes.find(n => n.id === nodeId);
    if (!node) return;
    const id = `node${++_nodeSeq}`;
    const copy = { ...node, id, label: node.label + ' (copy)', x: (node.x ?? 0) + 32, y: (node.y ?? 0) + 32 };
    const m = { ...model, nodes: [...model.nodes, copy] };
    applyAndPush(m); setSelected(id);
  }, [model, applyAndPush]);

  // Close context menu on any click
  useEffect(() => {
    if (!ctxMenu) return;
    const close = () => setCtxMenu(null);
    window.addEventListener('mousedown', close);
    return () => window.removeEventListener('mousedown', close);
  }, [ctxMenu]);

  // Global keyboard shortcuts
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      // Don't hijack keys when the user is typing in an input / textarea / contentEditable.
      const tgt = e.target as HTMLElement | null;
      if (tgt && (tgt.tagName === 'INPUT' || tgt.tagName === 'TEXTAREA' || tgt.isContentEditable)) return;

      const ctrl = e.ctrlKey || e.metaKey;
      if (ctrl && e.key === 'z') { e.preventDefault(); undo(); return; }
      if (ctrl && (e.key === 'y' || (e.shiftKey && e.key === 'z'))) { e.preventDefault(); redo(); return; }
      if (ctrl && e.key === '0') { e.preventDefault(); reCenter(); return; }
      if (ctrl && (e.key === 'd' || e.key === 'D')) {
        if (selected) { e.preventDefault(); duplicateNode(selected); }
        return;
      }

      if (e.key === 'Escape') {
        if (ctxMenu) setCtxMenu(null);
        if (liveEdge) setLiveEdge(null);
        if (editingId) setEditingId(null);
        if (selected) setSelected(null);
        return;
      }

      if ((e.key === 'Delete' || e.key === 'Backspace') && selected) {
        e.preventDefault();
        deleteNode(selected);
        return;
      }

      if (selected && (e.key === 'ArrowUp' || e.key === 'ArrowDown' || e.key === 'ArrowLeft' || e.key === 'ArrowRight')) {
        e.preventDefault();
        const step = e.shiftKey ? GRID * 4 : GRID;
        const dx = e.key === 'ArrowLeft' ? -step : e.key === 'ArrowRight' ? step : 0;
        const dy = e.key === 'ArrowUp' ? -step : e.key === 'ArrowDown' ? step : 0;
        const updated = {
          ...model,
          nodes: model.nodes.map(n => n.id === selected
            ? { ...n, x: snap((n.x ?? 0) + dx), y: snap((n.y ?? 0) + dy) }
            : n),
        };
        applyAndPush(updated);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [undo, redo, reCenter, selected, ctxMenu, liveEdge, editingId, model, applyAndPush, duplicateNode]);

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

  // Touch: single-finger pan on empty canvas; two-finger pinch zoom anywhere.
  // Node drag and live-edge drag stay on mouse handlers (touch on nodes maps
  // through React synthetic events naturally for the down/up lifecycle).
  useEffect(() => {
    const el = svgRef.current;
    if (!el) return;
    let touchPan: { ox: number; oy: number; tx: number; ty: number } | null = null;
    let pinch: { dist: number; cx: number; cy: number; scale: number; tx: number; ty: number } | null = null;

    const dist = (a: Touch, b: Touch) => Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY);

    const onStart = (e: TouchEvent) => {
      if (e.touches.length === 2) {
        e.preventDefault();
        const [a, b] = [e.touches[0], e.touches[1]];
        const rect = el.getBoundingClientRect();
        pinch = {
          dist: dist(a, b),
          cx: (a.clientX + b.clientX) / 2 - rect.left,
          cy: (a.clientY + b.clientY) / 2 - rect.top,
          scale: transform.scale, tx: transform.x, ty: transform.y,
        };
        touchPan = null;
        return;
      }
      if (e.touches.length === 1) {
        const target = e.target as SVGElement | null;
        // Only start a pan when the touch begins on the background pattern or the SVG itself.
        if (target?.dataset.bg !== '1' && target !== el) return;
        const t0 = e.touches[0];
        touchPan = { ox: t0.clientX, oy: t0.clientY, tx: transform.x, ty: transform.y };
      }
    };
    const onMove = (e: TouchEvent) => {
      if (pinch && e.touches.length === 2) {
        e.preventDefault();
        const [a, b] = [e.touches[0], e.touches[1]];
        const ratio = dist(a, b) / pinch.dist;
        const scale = Math.min(3, Math.max(0.15, pinch.scale * ratio));
        setTransform({
          scale,
          x: pinch.cx - (pinch.cx - pinch.tx) * (scale / pinch.scale),
          y: pinch.cy - (pinch.cy - pinch.ty) * (scale / pinch.scale),
        });
        return;
      }
      if (touchPan && e.touches.length === 1) {
        e.preventDefault();
        const t0 = e.touches[0];
        setTransform(tr => ({ ...tr, x: touchPan!.tx + (t0.clientX - touchPan!.ox), y: touchPan!.ty + (t0.clientY - touchPan!.oy) }));
      }
    };
    const onEnd = (e: TouchEvent) => {
      if (e.touches.length === 0) { touchPan = null; pinch = null; }
      if (e.touches.length === 1) pinch = null;
    };
    el.addEventListener('touchstart', onStart, { passive: false });
    el.addEventListener('touchmove', onMove, { passive: false });
    el.addEventListener('touchend', onEnd);
    el.addEventListener('touchcancel', onEnd);
    return () => {
      el.removeEventListener('touchstart', onStart);
      el.removeEventListener('touchmove', onMove);
      el.removeEventListener('touchend', onEnd);
      el.removeEventListener('touchcancel', onEnd);
    };
  }, [transform.scale, transform.x, transform.y]);

  const onPortMouseDown = (e: React.MouseEvent, nodeId: string) => {
    e.stopPropagation();
    const node = model.nodes.find(n => n.id === nodeId)!;
    const { x, y } = toCanvas(e.clientX, e.clientY);
    const nW = nodeWidth(node.label);
    setLiveEdge({ fromId: nodeId, fromX: (node.x ?? 0) + nW / 2, fromY: (node.y ?? 0) + NODE_H, exitDir: 'bottom', toX: x, toY: y });
  };

  const onAnswerPortDown = (e: React.MouseEvent, nodeId: string, answer: string, portXInNode: number, portYInNode: number) => {
    e.stopPropagation();
    const node = model.nodes.find(n => n.id === nodeId)!;
    const { x, y } = toCanvas(e.clientX, e.clientY);
    setLiveEdge({ fromId: nodeId, fromX: (node.x ?? 0) + portXInNode, fromY: (node.y ?? 0) + portYInNode, exitDir: 'bottom', answerLabel: answer, toX: x, toY: y });
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
    let updated: DiagramModel;
    if (label) {
      const existing = model.edges.find(ex => ex.from === liveEdge.fromId && ex.label === label);
      if (existing) {
        updated = { ...model, edges: model.edges.map(ex => ex.id === existing.id ? { ...ex, to: targetId } : ex) };
      } else {
        updated = { ...model, edges: [...model.edges, { id: `e${++_edgeSeq}`, from: liveEdge.fromId, to: targetId, label }] };
      }
    } else {
      updated = { ...model, edges: [...model.edges, { id: `e${++_edgeSeq}`, from: liveEdge.fromId, to: targetId }] };
    }
    applyAndPush(updated);
    setLiveEdge(null);
  };

  const onSvgMouseDown = (e: React.MouseEvent) => {
    if (ctxMenu) { setCtxMenu(null); return; }
    if ((e.target as SVGElement).dataset.bg === '1' || e.target === svgRef.current) {
      setSelected(null);
      setPan({ ox: e.clientX, oy: e.clientY, tx: transform.x, ty: transform.y });
    }
  };

  const onSvgContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    setCtxMenu({ x: e.clientX, y: e.clientY, nodeId: null });
  };

  const onNodeContextMenu = (e: React.MouseEvent, nodeId: string) => {
    e.preventDefault(); e.stopPropagation();
    setSelected(nodeId);
    setCtxMenu({ x: e.clientX, y: e.clientY, nodeId });
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
      applyModel(updated);
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
    const up = { ...model, nodes: model.nodes.map(n => n.id === editingId ? { ...n, label: editLabel } : n) };
    applyAndPush(up);
    setEditingId(null);
  };

  const addNode = (atCanvasPos?: { x: number; y: number }) => {
    const id = `node${++_nodeSeq}`;
    const p = atCanvasPos
      ? { x: snap(atCanvasPos.x), y: snap(atCanvasPos.y) }
      : { x: snap(100 + Math.random() * 240), y: snap(100 + Math.random() * 180) };
    const label = variant === 'question' ? 'New Question' : variant === 'journey' ? `Step ${model.nodes.length + 1}` : 'New Step';
    const metadata = variant === 'question' ? { answers: [] } : undefined;
    const updated = { ...model, nodes: [...model.nodes, { id, label, shape: 'rectangle' as const, metadata, ...p }] };
    applyAndPush(updated); setSelected(id);
    setAnnouncement(`Added ${variantLabel.toLowerCase()} "${label}".`);
  };

  const deleteNode = (nodeId: string) => {
    const node = model.nodes.find(n => n.id === nodeId);
    const updated = { ...model, nodes: model.nodes.filter(n => n.id !== nodeId), edges: model.edges.filter(e => e.from !== nodeId && e.to !== nodeId) };
    applyAndPush(updated); if (selected === nodeId) setSelected(null);
    if (node) setAnnouncement(`Deleted ${variantLabel.toLowerCase()} "${node.label}".`);
  };

  const deleteSelected = () => { if (selected) deleteNode(selected); };

  const beginEditEdge = (edgeId: string) => {
    const edge = model.edges.find(e => e.id === edgeId);
    if (!edge) return;
    // Question-variant edge labels mirror an answer card; editing them on the canvas
    // would desync the card so we ignore the double-click for that variant.
    if (variant === 'question') return;
    setEditingEdgeId(edgeId);
    setEditEdgeLabel(edge.label ?? '');
  };

  const commitEdgeEdit = () => {
    if (!editingEdgeId) return;
    const next = editEdgeLabel.trim();
    const updated = {
      ...model,
      edges: model.edges.map(e => e.id === editingEdgeId
        ? { ...e, ...(next ? { label: next } : { label: undefined }) }
        : e),
    };
    applyAndPush(updated);
    setEditingEdgeId(null);
  };

  const onEdgeContextMenu = (e: React.MouseEvent, edgeId: string) => {
    e.preventDefault(); e.stopPropagation();
    setCtxMenu({ x: e.clientX, y: e.clientY, nodeId: null, edgeId });
  };

  const setEdgeStyle = (edgeId: string, style: 'solid' | 'dashed' | 'dotted') => {
    const updated = { ...model, edges: model.edges.map(e => e.id === edgeId ? { ...e, style } : e) };
    applyAndPush(updated);
  };

  const setEdgeArrowhead = (edgeId: string, arrowhead: 'arrow' | 'none') => {
    const updated = { ...model, edges: model.edges.map(e => e.id === edgeId ? { ...e, arrowhead } : e) };
    applyAndPush(updated);
  };

  const deleteEdge = (edgeId: string) => {
    const updated = { ...model, edges: model.edges.filter(e => e.id !== edgeId) };
    applyAndPush(updated);
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
      const updated = { ...m, nodes }; applyAndPush(updated);
    } catch (err) { alert(`Import failed: ${(err as Error).message}`); }
  }, [applyAndPush]);

  const acc = variantAccent(variant, isDark);
  const variantLabel = variant === 'question' ? 'Question' : variant === 'journey' ? 'Step' : 'Node';
  const shadowColor = isDark ? 'rgba(0,0,0,0.55)' : 'rgba(15,23,42,0.09)';
  const arrowColor = isDark ? '#64748b' : '#94a3b8';
  const amberArrow = isDark ? C.amberDark : C.amber;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height, width: '100%', fontFamily: 'ui-sans-serif,system-ui,sans-serif', boxSizing: 'border-box', background: t.ctrlsBg }}>
      {/* Screen-reader live region — announces selection/add/delete actions. */}
      <div
        role="status" aria-live="polite" aria-atomic="true"
        style={{ position: 'absolute', width: 1, height: 1, padding: 0, margin: -1, overflow: 'hidden', clip: 'rect(0 0 0 0)', whiteSpace: 'nowrap', border: 0 }}
      >{announcement}</div>
      <Toolbar onExport={handleExport} onImport={allowImport ? handleImport : undefined} allowedExports={allowedExports} allowImport={allowImport} />

      {/* Controls bar */}
      <div style={{ display: 'flex', gap: 6, padding: '7px 14px', background: t.ctrlsBg, borderBottom: `1px solid ${t.ctrlsBorder}`, alignItems: 'center', flexWrap: 'wrap' }}>
        <button onClick={() => addNode()} style={ctrlBtn(acc.color, isDark)}>+ {variantLabel}</button>
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
        {/* Node navigator */}
        <NodeNavigator
          model={model} selected={selected} variant={variant}
          isDark={isDark} t={t} acc={acc}
          open={navOpen} onToggle={() => setNavOpen(v => !v)}
          onSelect={jumpToNode}
        />

        <div ref={containerRef} style={{ flex: 1, overflow: 'hidden', position: 'relative', background: t.canvas }}>
          <svg
            ref={svgRef}
            width="100%" height="100%"
            role="application"
            aria-label={`${variantLabel} diagram editor. ${model.nodes.length} ${variantLabel.toLowerCase()}s, ${model.edges.length} connections. Scroll to zoom, drag to pan, click a ${variantLabel.toLowerCase()} to select.`}
            tabIndex={0}
            style={{ display: 'block', cursor: pan ? 'grabbing' : drag ? 'grabbing' : liveEdge ? 'crosshair' : 'default', userSelect: 'none', outline: 'none' }}
            onMouseDown={onSvgMouseDown}
            onMouseMove={onMouseMove}
            onMouseUp={onMouseUp}
            onMouseLeave={onMouseUp}
            onContextMenu={onSvgContextMenu}
          >
            <defs>
              <style>{reducedMotion ? `
                .edge-flow { stroke-dasharray: 0; }
                .edge-flow-amber { stroke-dasharray: 0; }
                .edge-live { stroke-dasharray: 4 4; }
              ` : `
                @keyframes edgeFlow { to { stroke-dashoffset: -13; } }
                @keyframes edgeFlowFast { to { stroke-dashoffset: -13; } }
                .edge-flow { stroke-dasharray: 8 5; animation: edgeFlow 0.9s linear infinite; }
                .edge-flow-amber { stroke-dasharray: 6 4; animation: edgeFlowFast 0.65s linear infinite; }
                .edge-live { stroke-dasharray: 7 5; animation: edgeFlow 0.55s linear infinite; }
              `}</style>
              <pattern id="dots" width={GRID} height={GRID} patternUnits="userSpaceOnUse">
                <circle cx={GRID / 2} cy={GRID / 2} r={1.1} fill={t.dot} />
              </pattern>
              <filter id="nodeShadow" x="-25%" y="-25%" width="150%" height="160%">
                <feDropShadow dx="0" dy="3" stdDeviation="5" floodColor={shadowColor} floodOpacity="1" />
              </filter>
              <marker id="arrowhead" markerWidth="9" markerHeight="7" refX="8" refY="3.5" orient="auto" markerUnits="strokeWidth">
                <path d="M0,0.5 L9,3.5 L0,6.5 L2.2,3.5 Z" fill={arrowColor} />
              </marker>
              <marker id="arrowAmber" markerWidth="9" markerHeight="7" refX="8" refY="3.5" orient="auto" markerUnits="strokeWidth">
                <path d="M0,0.5 L9,3.5 L0,6.5 L2.2,3.5 Z" fill={amberArrow} />
              </marker>
              <marker id="arrowLive" markerWidth="9" markerHeight="7" refX="8" refY="3.5" orient="auto" markerUnits="strokeWidth">
                <path d="M0,0.5 L9,3.5 L0,6.5 L2.2,3.5 Z" fill={acc.color} />
              </marker>
            </defs>

            <rect width="100%" height="100%" fill="url(#dots)" data-bg="1" />

            <g transform={`translate(${transform.x},${transform.y}) scale(${transform.scale})`}>
              {model.edges.map(e => (
                <EdgeLine
                  key={e.id} edge={e} nodes={model.nodes} variant={variant} t={t} isDark={isDark} acc={acc}
                  editing={editingEdgeId === e.id}
                  editValue={editEdgeLabel}
                  onEditChange={setEditEdgeLabel}
                  onEditCommit={commitEdgeEdit}
                  onEditCancel={() => setEditingEdgeId(null)}
                  onDoubleClick={beginEditEdge}
                  onContextMenu={onEdgeContextMenu}
                />
              ))}

              {liveEdge && (() => {
                const d = bezierPath(liveEdge.fromX, liveEdge.fromY, liveEdge.toX, liveEdge.toY, liveEdge.exitDir);
                return <path d={d} fill="none" stroke={acc.color} strokeWidth={2} strokeLinecap="round" className="edge-live" opacity={0.8} markerEnd="url(#arrowLive)" />;
              })()}

              {model.nodes.map((node, idx) => {
                const isHovered = hoveredId === node.id;
                const isQuestion = variant === 'question';
                const nW = isQuestion ? questionNodeW(node) : nodeWidth(node.label);
                const nH = isQuestion ? questionNodeH((node.metadata?.answers as string[] | undefined) ?? []) : NODE_H;

                return (
                  <g
                    key={node.id}
                    transform={`translate(${node.x ?? 0},${node.y ?? 0})`}
                    role="button"
                    aria-label={`${variantLabel} ${variant === 'journey' ? idx + 1 + ': ' : ''}${node.label}${selected === node.id ? ', selected' : ''}`}
                    style={{ cursor: drag?.nodeId === node.id ? 'grabbing' : 'grab' }}
                    onMouseDown={e => onNodeMouseDown(e, node.id)}
                    onMouseUp={e => onNodeMouseUp(e, node.id)}
                    onDoubleClick={e => onNodeDblClick(e, node.id)}
                    onContextMenu={e => onNodeContextMenu(e, node.id)}
                    onMouseEnter={() => setHoveredId(node.id)}
                    onMouseLeave={() => setHoveredId(null)}
                  >
                    <title>{`${variantLabel}: ${node.label}`}</title>
                    {isQuestion ? (
                      <QuestionNode node={node} selected={selected === node.id} edges={model.edges} isDark={isDark} onAnswerPortDown={onAnswerPortDown} qW={nW} />
                    ) : (
                      <>
                        <NodeShape node={node} selected={selected === node.id} variant={variant} stepNumber={variant === 'journey' ? idx + 1 : undefined} t={t} isDark={isDark} w={nW} />
                        {editingId === node.id ? (
                          <foreignObject x={6} y={6} width={nW - 12} height={NODE_H - 12}>
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
                          <text x={nW / 2} y={NODE_H / 2 + 5} textAnchor="middle" fontSize={13} fontWeight="500" fontFamily="ui-sans-serif,system-ui,sans-serif" fill={selected === node.id ? acc.color : t.textPrimary} style={{ pointerEvents: 'none', userSelect: 'none' }}>
                            {node.label}
                          </text>
                        )}
                        <circle
                          cx={nW / 2} cy={NODE_H + 1} r={6}
                          fill={acc.color} stroke={isDark ? '#0f172a' : 'white'} strokeWidth={2}
                          style={{ cursor: 'crosshair', opacity: isHovered ? 1 : 0, transition: 'opacity 0.15s', pointerEvents: isHovered ? 'all' : 'none', filter: 'drop-shadow(0 1px 3px rgba(0,0,0,0.25))' }}
                          onMouseDown={e => onPortMouseDown(e, node.id)}
                        />
                      </>
                    )}

                    {liveEdge && liveEdge.fromId !== node.id && (
                      <circle cx={nW / 2} cy={-1} r={6} fill={acc.color} stroke={isDark ? '#0f172a' : 'white'} strokeWidth={2} style={{ opacity: 0.85, pointerEvents: 'none' }} />
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

          {model.nodes.length > 0 && viewport.w > 0 && (
            <Minimap
              model={model}
              variant={variant}
              viewportW={viewport.w}
              viewportH={viewport.h}
              transform={transform}
              isDark={isDark}
              accentColor={acc.color}
              measureNode={(n) => {
                const w = variant === 'question' ? questionNodeW(n) : nodeWidth(n.label);
                const h = variant === 'question' ? questionNodeH((n.metadata?.answers as string[] | undefined) ?? []) : NODE_H;
                return { w, h };
              }}
              onCenterOn={(cx, cy) => {
                setTransform(tr => ({ ...tr, x: viewport.w / 2 - cx * tr.scale, y: viewport.h / 2 - cy * tr.scale }));
              }}
            />
          )}

          {/* Context menu */}
          {ctxMenu && (() => {
            const ctxEdge = ctxMenu.edgeId ? model.edges.find(e => e.id === ctxMenu.edgeId) : undefined;
            return <ContextMenu
              x={ctxMenu.x} y={ctxMenu.y}
              nodeId={ctxMenu.nodeId} edgeId={ctxMenu.edgeId}
              isDark={isDark} t={t} acc={acc}
              canUndo={history.canUndo}
              canRedo={history.canRedo}
              onUndo={() => { undo(); setCtxMenu(null); }}
              onRedo={() => { redo(); setCtxMenu(null); }}
              onReCenter={() => { reCenter(); setCtxMenu(null); }}
              onAddNode={() => {
                const rect = svgRef.current!.getBoundingClientRect();
                const cx = (ctxMenu.x - rect.left - transform.x) / transform.scale;
                const cy = (ctxMenu.y - rect.top - transform.y) / transform.scale;
                addNode({ x: cx, y: cy }); setCtxMenu(null);
              }}
              onDuplicate={() => { if (ctxMenu.nodeId) { duplicateNode(ctxMenu.nodeId); setCtxMenu(null); } }}
              onRename={() => {
                if (ctxMenu.nodeId) {
                  const node = model.nodes.find(n => n.id === ctxMenu.nodeId)!;
                  setEditingId(ctxMenu.nodeId); setEditLabel(node.label); setCtxMenu(null);
                }
              }}
              onDelete={() => { if (ctxMenu.nodeId) { deleteNode(ctxMenu.nodeId); setCtxMenu(null); } }}
              onDisconnect={() => {
                if (ctxMenu.nodeId) {
                  const m = { ...model, edges: model.edges.filter(e => e.from !== ctxMenu.nodeId && e.to !== ctxMenu.nodeId) };
                  applyAndPush(m); setCtxMenu(null);
                }
              }}
              currentEdgeStyle={ctxEdge?.style ?? 'solid'}
              currentEdgeArrow={ctxEdge?.arrowhead ?? 'arrow'}
              onEdgeRename={() => { if (ctxMenu.edgeId) { beginEditEdge(ctxMenu.edgeId); setCtxMenu(null); } }}
              onEdgeStyle={(s) => { if (ctxMenu.edgeId) { setEdgeStyle(ctxMenu.edgeId, s); setCtxMenu(null); } }}
              onEdgeArrowhead={(a) => { if (ctxMenu.edgeId) { setEdgeArrowhead(ctxMenu.edgeId, a); setCtxMenu(null); } }}
              onEdgeDelete={() => { if (ctxMenu.edgeId) { deleteEdge(ctxMenu.edgeId); setCtxMenu(null); } }}
              containerRef={containerRef}
            />;
          })()}
        </div>

        {selected && (
          <StepEditor key={selected} nodeId={selected} model={model} onModelChange={m => { applyAndPush(m); }} variant={variant} isDark={isDark} t={t} acc={acc} />
        )}
      </div>

      <div style={{ padding: '4px 14px', fontSize: 11, color: t.textMuted, background: t.statusBg, borderTop: `1px solid ${t.ctrlsBorder}`, display: 'flex', gap: 16 }}>
        <span>{model.nodes.length} {variantLabel.toLowerCase()}s</span>
        <span>{model.edges.length} connections</span>
        <span>{Math.round(transform.scale * 100)}% zoom</span>
        <span style={{ marginLeft: 'auto' }}>Ctrl+Z undo · Ctrl+Y redo · Ctrl+0 fit</span>
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
