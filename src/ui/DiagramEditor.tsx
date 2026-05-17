import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Toolbar } from './Toolbar.js';
import { StepEditor } from './StepEditor.js';
import { SequenceEditor } from './SequenceEditor.js';
import { Minimap } from './Minimap.js';
import { NodeNavigator } from './NodeNavigator.js';
import { ContextMenu, type CtxMenuState as CtxMenu } from './ContextMenu.js';
import { NodeShape, QuestionNode, EdgeLine } from './render.js';
import { useHistory } from './hooks/useHistory.js';
import { useIsDark, usePrefersReducedMotion, useIsCoarsePointer } from './hooks/useSystemTheme.js';
import { useCanvasWheel } from './hooks/useCanvasWheel.js';
import { useCanvasTouch } from './hooks/useCanvasTouch.js';
import { useElementSize } from './hooks/useElementSize.js';
import {
  NODE_H,
  GRID,
  nodeWidth,
  nodeDims,
  snap,
  bezierPath,
} from './layout.js';
import { findSiblingSnap, type AlignGuideV, type AlignGuideH } from './alignment.js';
import { nearestInDirection } from './traversal.js';
import { presetFlowchartModel } from './presets.js';
import type { DiagramModel, DiagramNode, DiagramEdge, ExportFormat, DiagramVariant } from '../core/types.js';
import { nextId, makeIdSource } from '../core/ids.js';
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
    : presetFlowchartModel(variant);
  const notify = useCallback((m: DiagramModel) => onChange?.(m), [onChange]);
  const history = useHistory<DiagramModel>(base, notify);
  const { state: model, apply: applyModel, applyAndPush, undo, redo } = history;
  const [transform, setTransform] = useState<Transform>({ x: 60, y: 60, scale: 1 });
  const [selected, setSelected] = useState<string | null>(null);
  const [selectedSet, setSelectedSet] = useState<Set<string>>(() => new Set());
  const [drag, setDrag] = useState<DragState | null>(null);
  const [pan, setPan] = useState<{ ox: number; oy: number; tx: number; ty: number } | null>(null);
  const [boxSel, setBoxSel] = useState<{ sx: number; sy: number; cx: number; cy: number; additive: boolean } | null>(null);
  const [liveEdge, setLiveEdge] = useState<LiveEdge | null>(null);
  const [alignGuides, setAlignGuides] = useState<{ x?: AlignGuideV; y?: AlignGuideH } | null>(null);
  const [waypointDrag, setWaypointDrag] = useState<string | null>(null);
  const groupDragOriginsRef = useRef<Map<string, { ox: number; oy: number }> | null>(null);
  const clipboardRef = useRef<{ nodes: DiagramNode[]; edges: DiagramEdge[] } | null>(null);

  const selectOne = useCallback((id: string | null) => {
    setSelected(id);
    setSelectedSet(id ? new Set([id]) : new Set());
  }, []);

  const toggleSelect = useCallback((id: string) => {
    setSelectedSet(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
        const last = next.size ? Array.from(next)[next.size - 1] : null;
        setSelected(last);
      } else {
        next.add(id);
        setSelected(id);
      }
      return next;
    });
  }, []);

  const clearSelection = useCallback(() => {
    setSelected(null);
    setSelectedSet(new Set());
  }, []);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editLabel, setEditLabel] = useState('');
  const [editingEdgeId, setEditingEdgeId] = useState<string | null>(null);
  const [editEdgeLabel, setEditEdgeLabel] = useState('');
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [ctxMenu, setCtxMenu] = useState<CtxMenu | null>(null);
  const [navOpen, setNavOpen] = useState(true);
  const [announcement, setAnnouncement] = useState('');
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const reducedMotion = usePrefersReducedMotion();
  const isDark = useIsDark(theme);
  const isCoarse = useIsCoarsePointer();
  const portR = isCoarse ? 9 : 6;

  // Track the SVG element size for the minimap viewport overlay.
  const viewport = useElementSize(svgRef);

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
      const { w: nw, h: nh } = nodeDims(n, variant);
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
    const { w: nw, h: nh } = nodeDims(node, variant);
    const cx = (node.x ?? 0) + nw / 2;
    const cy = (node.y ?? 0) + nh / 2;
    const scale = Math.min(Math.max(transform.scale, 0.8), 1.4);
    setTransform({ scale, x: rect.width / 2 - cx * scale, y: rect.height / 2 - cy * scale });
    selectOne(nodeId);
  }, [model.nodes, variant, transform.scale, selectOne]);

  const duplicateIds = useCallback((ids: string[]) => {
    if (ids.length === 0) return;
    const idSet = new Set(ids);
    const idMap = new Map<string, string>();
    const nextNode = makeIdSource('node', model.nodes);
    const nextEdge = makeIdSource('e', model.edges);
    const newNodes: DiagramNode[] = [];
    for (const oldId of ids) {
      const n = model.nodes.find(x => x.id === oldId);
      if (!n) continue;
      const newId = nextNode();
      idMap.set(oldId, newId);
      newNodes.push({
        ...n, id: newId,
        label: ids.length === 1 ? n.label + ' (copy)' : n.label,
        x: (n.x ?? 0) + 32, y: (n.y ?? 0) + 32,
      });
    }
    const newEdges: DiagramEdge[] = [];
    for (const e of model.edges) {
      if (idSet.has(e.from) && idSet.has(e.to)) {
        newEdges.push({ ...e, id: nextEdge(), from: idMap.get(e.from)!, to: idMap.get(e.to)! });
      }
    }
    const m = { ...model, nodes: [...model.nodes, ...newNodes], edges: [...model.edges, ...newEdges] };
    applyAndPush(m);
    const newIds = newNodes.map(n => n.id);
    setSelected(newIds[newIds.length - 1] ?? null);
    setSelectedSet(new Set(newIds));
  }, [model, applyAndPush]);

  const duplicateNode = useCallback((nodeId: string) => { duplicateIds([nodeId]); }, [duplicateIds]);

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
        if (selectedSet.size > 0) { e.preventDefault(); duplicateIds(Array.from(selectedSet)); }
        return;
      }

      if (ctrl && (e.key === 'c' || e.key === 'C')) {
        if (selectedSet.size > 0) {
          e.preventDefault();
          const ids = new Set(selectedSet);
          const nodes = model.nodes.filter(n => ids.has(n.id));
          const edges = model.edges.filter(ed => ids.has(ed.from) && ids.has(ed.to));
          clipboardRef.current = {
            nodes: nodes.map(n => ({ ...n })),
            edges: edges.map(ed => ({ ...ed })),
          };
        }
        return;
      }
      if (ctrl && (e.key === 'v' || e.key === 'V')) {
        const clip = clipboardRef.current;
        if (clip && clip.nodes.length > 0) {
          e.preventDefault();
          const idMap = new Map<string, string>();
          const nextNode = makeIdSource('node', model.nodes);
          const nextEdge = makeIdSource('e', model.edges);
          const newNodes: DiagramNode[] = clip.nodes.map(n => {
            const newId = nextNode();
            idMap.set(n.id, newId);
            return { ...n, id: newId, x: (n.x ?? 0) + 24, y: (n.y ?? 0) + 24 };
          });
          const newEdges: DiagramEdge[] = clip.edges.map(ed => ({
            ...ed, id: nextEdge(),
            from: idMap.get(ed.from) ?? ed.from,
            to: idMap.get(ed.to) ?? ed.to,
          }));
          const m = { ...model, nodes: [...model.nodes, ...newNodes], edges: [...model.edges, ...newEdges] };
          applyAndPush(m);
          const newIds = newNodes.map(n => n.id);
          setSelected(newIds[newIds.length - 1]);
          setSelectedSet(new Set(newIds));
          setAnnouncement(`Pasted ${newIds.length} ${variantLabel.toLowerCase()}${newIds.length === 1 ? '' : 's'}.`);
        }
        return;
      }

      if (e.key === 'Escape') {
        if (ctxMenu) setCtxMenu(null);
        if (liveEdge) setLiveEdge(null);
        if (editingId) setEditingId(null);
        if (boxSel) setBoxSel(null);
        if (selectedSet.size > 0) clearSelection();
        return;
      }

      if ((e.key === 'Delete' || e.key === 'Backspace') && selectedSet.size > 0) {
        e.preventDefault();
        const ids = new Set(selectedSet);
        const updated = {
          ...model,
          nodes: model.nodes.filter(n => !ids.has(n.id)),
          edges: model.edges.filter(ed => !ids.has(ed.from) && !ids.has(ed.to)),
        };
        applyAndPush(updated);
        clearSelection();
        setAnnouncement(`Deleted ${ids.size} ${variantLabel.toLowerCase()}${ids.size === 1 ? '' : 's'}.`);
        return;
      }

      if (selectedSet.size > 0 && (e.key === 'ArrowUp' || e.key === 'ArrowDown' || e.key === 'ArrowLeft' || e.key === 'ArrowRight')) {
        const dirKey = e.key === 'ArrowLeft' ? 'left' : e.key === 'ArrowRight' ? 'right' : e.key === 'ArrowUp' ? 'up' : 'down';

        // Alt+Arrow → traverse the graph: jump selection to the nearest neighbor in that direction.
        if (e.altKey && selected) {
          e.preventDefault();
          const origin = model.nodes.find(n => n.id === selected);
          if (!origin) return;
          const od = nodeDims(origin, variant);
          const ox = (origin.x ?? 0) + od.w / 2;
          const oy = (origin.y ?? 0) + od.h / 2;
          const candidates = model.nodes
            .filter(n => n.id !== selected)
            .map(n => {
              const d = nodeDims(n, variant);
              return { id: n.id, x: (n.x ?? 0) + d.w / 2, y: (n.y ?? 0) + d.h / 2 };
            });
          const nextId = nearestInDirection(ox, oy, dirKey, candidates);
          if (nextId) {
            selectOne(nextId);
            setAnnouncement(`Selected ${model.nodes.find(n => n.id === nextId)?.label ?? ''}.`);
          }
          return;
        }

        e.preventDefault();
        const step = e.shiftKey ? GRID * 4 : GRID;
        const dx = dirKey === 'left' ? -step : dirKey === 'right' ? step : 0;
        const dy = dirKey === 'up' ? -step : dirKey === 'down' ? step : 0;
        const ids = selectedSet;
        const updated = {
          ...model,
          nodes: model.nodes.map(n => ids.has(n.id)
            ? { ...n, x: snap((n.x ?? 0) + dx), y: snap((n.y ?? 0) + dy) }
            : n),
        };
        applyAndPush(updated);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [undo, redo, reCenter, selected, selectedSet, ctxMenu, liveEdge, editingId, boxSel, model, applyAndPush, duplicateNode, clearSelection]);

  const toCanvas = useCallback((clientX: number, clientY: number) => {
    const rect = svgRef.current!.getBoundingClientRect();
    return { x: (clientX - rect.left - transform.x) / transform.scale, y: (clientY - rect.top - transform.y) / transform.scale };
  }, [transform]);

  useCanvasWheel(svgRef, setTransform);

  const onCanvasLongPress = useCallback((x: number, y: number) => {
    setCtxMenu({ x, y, nodeId: null });
  }, []);
  useCanvasTouch(svgRef, { transform, setTransform, onLongPress: onCanvasLongPress });

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
    const node = model.nodes.find(n => n.id === id)!;

    if (e.shiftKey) {
      toggleSelect(id);
      return;
    }

    const inSet = selectedSet.has(id);
    if (inSet && selectedSet.size > 1) {
      // Group drag: keep selection, set primary to this node, record origins for every selected node.
      setSelected(id);
      const origins = new Map<string, { ox: number; oy: number }>();
      for (const sid of selectedSet) {
        const n = model.nodes.find(x => x.id === sid);
        if (!n) continue;
        origins.set(sid, {
          ox: e.clientX - (transform.x + (n.x ?? 0) * transform.scale),
          oy: e.clientY - (transform.y + (n.y ?? 0) * transform.scale),
        });
      }
      groupDragOriginsRef.current = origins;
    } else {
      selectOne(id);
      groupDragOriginsRef.current = null;
    }
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
        updated = { ...model, edges: [...model.edges, { id: nextId('e', model.edges), from: liveEdge.fromId, to: targetId, label }] };
      }
    } else {
      updated = { ...model, edges: [...model.edges, { id: nextId('e', model.edges), from: liveEdge.fromId, to: targetId }] };
    }
    applyAndPush(updated);
    setLiveEdge(null);
  };

  const onSvgMouseDown = (e: React.MouseEvent) => {
    if (ctxMenu) { setCtxMenu(null); return; }
    if ((e.target as SVGElement).dataset.bg === '1' || e.target === svgRef.current) {
      if (e.shiftKey) {
        // Shift+drag on empty canvas = box-select. Existing selection is preserved (additive).
        setBoxSel({ sx: e.clientX, sy: e.clientY, cx: e.clientX, cy: e.clientY, additive: true });
      } else {
        clearSelection();
        setPan({ ox: e.clientX, oy: e.clientY, tx: transform.x, ty: transform.y });
      }
    }
  };

  const onSvgContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    setCtxMenu({ x: e.clientX, y: e.clientY, nodeId: null });
  };

  const onNodeContextMenu = (e: React.MouseEvent, nodeId: string) => {
    e.preventDefault(); e.stopPropagation();
    // Right-click on a node that is NOT already in the multi-selection collapses
    // selection to just this node (matches Figma / VS Code). Right-clicking a
    // node that IS part of a multi-selection keeps the group intact.
    if (!selectedSet.has(nodeId)) selectOne(nodeId);
    setCtxMenu({ x: e.clientX, y: e.clientY, nodeId });
  };

  const onMouseMove = (e: React.MouseEvent) => {
    if (liveEdge) {
      const { x, y } = toCanvas(e.clientX, e.clientY);
      setLiveEdge(le => le ? { ...le, toX: x, toY: y } : null);
      return;
    }
    if (waypointDrag) {
      const { x, y } = toCanvas(e.clientX, e.clientY);
      const wx = snap(x), wy = snap(y);
      const updated = {
        ...model,
        edges: model.edges.map(ed => ed.id === waypointDrag ? { ...ed, waypoint: { x: wx, y: wy } } : ed),
      };
      applyModel(updated);
      return;
    }
    if (drag) {
      const dx = snap((e.clientX - drag.ox - transform.x) / transform.scale);
      const dy = snap((e.clientY - drag.oy - transform.y) / transform.scale);
      const origins = groupDragOriginsRef.current;
      if (origins && origins.size > 1) {
        const updated = {
          ...model,
          nodes: model.nodes.map(n => {
            const o = origins.get(n.id);
            if (!o) return n;
            return {
              ...n,
              x: snap((e.clientX - o.ox - transform.x) / transform.scale),
              y: snap((e.clientY - o.oy - transform.y) / transform.scale),
            };
          }),
        };
        applyModel(updated);
      } else {
        const dragged = model.nodes.find(n => n.id === drag.nodeId);
        if (!dragged) return;
        const { w: dW, h: dH } = nodeDims(dragged, variant);
        const others = model.nodes
          .filter(n => n.id !== drag.nodeId)
          .map(n => {
            const d = nodeDims(n, variant);
            return { x: n.x ?? 0, y: n.y ?? 0, w: d.w, h: d.h };
          });
        const snapResult = findSiblingSnap({ x: dx, y: dy, w: dW, h: dH }, others);
        setAlignGuides(snapResult.guideX || snapResult.guideY ? { x: snapResult.guideX, y: snapResult.guideY } : null);
        const updated = { ...model, nodes: model.nodes.map(n => n.id === drag.nodeId ? { ...n, x: snapResult.x, y: snapResult.y } : n) };
        applyModel(updated);
      }
    } else if (pan) {
      setTransform(tr => ({ ...tr, x: pan.tx + (e.clientX - pan.ox), y: pan.ty + (e.clientY - pan.oy) }));
    } else if (boxSel) {
      setBoxSel(b => b ? { ...b, cx: e.clientX, cy: e.clientY } : null);
    }
  };

  const onMouseUp = () => {
    if (boxSel) {
      const dragged = Math.abs(boxSel.cx - boxSel.sx) > 3 || Math.abs(boxSel.cy - boxSel.sy) > 3;
      if (dragged && svgRef.current) {
        const rect = svgRef.current.getBoundingClientRect();
        const x1 = Math.min(boxSel.sx, boxSel.cx) - rect.left;
        const y1 = Math.min(boxSel.sy, boxSel.cy) - rect.top;
        const x2 = Math.max(boxSel.sx, boxSel.cx) - rect.left;
        const y2 = Math.max(boxSel.sy, boxSel.cy) - rect.top;
        // Box edges → canvas coords
        const cx1 = (x1 - transform.x) / transform.scale;
        const cy1 = (y1 - transform.y) / transform.scale;
        const cx2 = (x2 - transform.x) / transform.scale;
        const cy2 = (y2 - transform.y) / transform.scale;
        const hits = new Set<string>(boxSel.additive ? selectedSet : []);
        for (const n of model.nodes) {
          const nx = n.x ?? 0, ny = n.y ?? 0;
          const { w: nw, h: nh } = nodeDims(n, variant);
          if (nx + nw >= cx1 && nx <= cx2 && ny + nh >= cy1 && ny <= cy2) hits.add(n.id);
        }
        const arr = Array.from(hits);
        setSelectedSet(hits);
        setSelected(arr.length ? arr[arr.length - 1] : null);
      }
      setBoxSel(null);
    }
    // Commit drag position to history so it can be undone.
    if (drag) applyAndPush(model);
    if (waypointDrag) { applyAndPush(model); setWaypointDrag(null); }
    groupDragOriginsRef.current = null;
    setAlignGuides(null);
    setDrag(null); setPan(null);
    if (liveEdge) setLiveEdge(null);
  };

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
    const id = nextId('node', model.nodes);
    const p = atCanvasPos
      ? { x: snap(atCanvasPos.x), y: snap(atCanvasPos.y) }
      : { x: snap(100 + Math.random() * 240), y: snap(100 + Math.random() * 180) };
    const label = variant === 'question' ? 'New Question' : variant === 'journey' ? `Step ${model.nodes.length + 1}` : 'New Step';
    const metadata = variant === 'question' ? { answers: [] } : undefined;
    const updated = { ...model, nodes: [...model.nodes, { id, label, shape: 'rectangle' as const, metadata, ...p }] };
    applyAndPush(updated); selectOne(id);
    setAnnouncement(`Added ${variantLabel.toLowerCase()} "${label}".`);
  };

  const deleteNode = (nodeId: string) => {
    const node = model.nodes.find(n => n.id === nodeId);
    const updated = { ...model, nodes: model.nodes.filter(n => n.id !== nodeId), edges: model.edges.filter(e => e.from !== nodeId && e.to !== nodeId) };
    applyAndPush(updated);
    if (selectedSet.has(nodeId)) {
      const next = new Set(selectedSet); next.delete(nodeId);
      setSelectedSet(next);
      if (selected === nodeId) setSelected(next.size ? Array.from(next)[next.size - 1] : null);
    }
    if (node) setAnnouncement(`Deleted ${variantLabel.toLowerCase()} "${node.label}".`);
  };

  const deleteSelected = () => {
    if (selectedSet.size === 0) return;
    if (selectedSet.size === 1 && selected) { deleteNode(selected); return; }
    const ids = new Set(selectedSet);
    const updated = {
      ...model,
      nodes: model.nodes.filter(n => !ids.has(n.id)),
      edges: model.edges.filter(ed => !ids.has(ed.from) && !ids.has(ed.to)),
    };
    applyAndPush(updated);
    clearSelection();
    setAnnouncement(`Deleted ${ids.size} ${variantLabel.toLowerCase()}s.`);
  };

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

  const resetEdgeRouting = (edgeId: string) => {
    const updated = {
      ...model,
      edges: model.edges.map(e => {
        if (e.id !== edgeId) return e;
        const { waypoint: _ignored, ...rest } = e;
        void _ignored;
        return rest;
      }),
    };
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
    <div className="fsd-editor" style={{ display: 'flex', flexDirection: 'column', height, width: '100%', fontFamily: 'ui-sans-serif,system-ui,sans-serif', boxSizing: 'border-box', background: t.ctrlsBg }}>
      <style>{`
        .fsd-editor button:focus-visible,
        .fsd-editor input:focus-visible,
        .fsd-editor textarea:focus-visible,
        .fsd-editor select:focus-visible,
        .fsd-editor [role="button"]:focus-visible {
          outline: 2px solid ${acc.color};
          outline-offset: 2px;
          border-radius: 6px;
        }
        .fsd-editor svg[role="application"]:focus-visible {
          outline: 2px solid ${acc.color};
          outline-offset: -2px;
        }
      `}</style>
      {/* Screen-reader live region — announces selection/add/delete actions. */}
      <div
        role="status" aria-live="polite" aria-atomic="true"
        style={{ position: 'absolute', width: 1, height: 1, padding: 0, margin: -1, overflow: 'hidden', clip: 'rect(0 0 0 0)', whiteSpace: 'nowrap', border: 0 }}
      >{announcement}</div>
      <Toolbar onExport={handleExport} onImport={allowImport ? handleImport : undefined} allowedExports={allowedExports} allowImport={allowImport} />

      {/* Controls bar */}
      <div style={{ display: 'flex', gap: 6, padding: '7px 14px', background: t.ctrlsBg, borderBottom: `1px solid ${t.ctrlsBorder}`, alignItems: 'center', flexWrap: 'wrap' }}>
        <button onClick={() => addNode()} style={ctrlBtn(acc.color, isDark)}>+ {variantLabel}</button>
        {selectedSet.size > 0 && (
          <>
            <div style={{ width: 1, height: 20, background: t.ctrlsBorder, margin: '0 2px' }} />
            <button onClick={deleteSelected} style={{ ...ctrlBtn('transparent', isDark), color: '#ef4444', border: `1px solid ${isDark ? '#7f1d1d' : '#fca5a5'}` }}>
              {selectedSet.size > 1 ? `Delete (${selectedSet.size})` : 'Delete'}
            </button>
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
                  onWaypointDown={(ev, edgeId) => setWaypointDrag(edgeId)}
                />
              ))}

              {liveEdge && (() => {
                const d = bezierPath(liveEdge.fromX, liveEdge.fromY, liveEdge.toX, liveEdge.toY, liveEdge.exitDir);
                return <path d={d} fill="none" stroke={acc.color} strokeWidth={2} strokeLinecap="round" className="edge-live" opacity={0.8} markerEnd="url(#arrowLive)" />;
              })()}

              {alignGuides?.x && (
                <line
                  x1={alignGuides.x.pos} x2={alignGuides.x.pos}
                  y1={alignGuides.x.minY} y2={alignGuides.x.maxY}
                  stroke={acc.color} strokeWidth={1 / transform.scale}
                  strokeDasharray={`${4 / transform.scale} ${3 / transform.scale}`}
                  opacity={0.85} pointerEvents="none"
                />
              )}
              {alignGuides?.y && (
                <line
                  y1={alignGuides.y.pos} y2={alignGuides.y.pos}
                  x1={alignGuides.y.minX} x2={alignGuides.y.maxX}
                  stroke={acc.color} strokeWidth={1 / transform.scale}
                  strokeDasharray={`${4 / transform.scale} ${3 / transform.scale}`}
                  opacity={0.85} pointerEvents="none"
                />
              )}

              {model.nodes.map((node, idx) => {
                const isHovered = hoveredId === node.id;
                const isQuestion = variant === 'question';
                const { w: nW, h: nH } = nodeDims(node, variant);
                const isSelected = selectedSet.has(node.id);

                return (
                  <g
                    key={node.id}
                    transform={`translate(${node.x ?? 0},${node.y ?? 0})`}
                    role="button"
                    aria-label={`${variantLabel} ${variant === 'journey' ? idx + 1 + ': ' : ''}${node.label}${isSelected ? ', selected' : ''}`}
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
                      <QuestionNode node={node} selected={isSelected} edges={model.edges} isDark={isDark} onAnswerPortDown={onAnswerPortDown} qW={nW} />
                    ) : (
                      <>
                        <NodeShape node={node} selected={isSelected} variant={variant} stepNumber={variant === 'journey' ? idx + 1 : undefined} t={t} isDark={isDark} w={nW} />
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
                          <text x={nW / 2} y={NODE_H / 2 + 5} textAnchor="middle" fontSize={13} fontWeight="500" fontFamily="ui-sans-serif,system-ui,sans-serif" fill={isSelected ? acc.color : t.textPrimary} style={{ pointerEvents: 'none', userSelect: 'none' }}>
                            {node.label}
                          </text>
                        )}
                        <circle
                          cx={nW / 2} cy={NODE_H + 1} r={portR}
                          fill={acc.color} stroke={isDark ? '#0f172a' : 'white'} strokeWidth={2}
                          style={{ cursor: 'crosshair', opacity: isHovered || isCoarse ? 1 : 0, transition: 'opacity 0.15s', pointerEvents: (isHovered || isCoarse) ? 'all' : 'none', filter: 'drop-shadow(0 1px 3px rgba(0,0,0,0.25))' }}
                          onMouseDown={e => onPortMouseDown(e, node.id)}
                        />
                      </>
                    )}

                    {liveEdge && liveEdge.fromId !== node.id && (
                      <circle cx={nW / 2} cy={-1} r={portR} fill={acc.color} stroke={isDark ? '#0f172a' : 'white'} strokeWidth={2} style={{ opacity: 0.85, pointerEvents: 'none' }} />
                    )}
                  </g>
                );
              })}
            </g>
          </svg>

          {boxSel && Math.abs(boxSel.cx - boxSel.sx) + Math.abs(boxSel.cy - boxSel.sy) > 4 && containerRef.current && (() => {
            const rect = containerRef.current.getBoundingClientRect();
            const left = Math.min(boxSel.sx, boxSel.cx) - rect.left;
            const top = Math.min(boxSel.sy, boxSel.cy) - rect.top;
            const w = Math.abs(boxSel.cx - boxSel.sx);
            const h = Math.abs(boxSel.cy - boxSel.sy);
            return (
              <div
                style={{
                  position: 'absolute', left, top, width: w, height: h,
                  border: `1px dashed ${acc.color}`,
                  background: isDark ? 'rgba(99,102,241,0.10)' : 'rgba(99,102,241,0.08)',
                  pointerEvents: 'none', borderRadius: 4,
                }}
              />
            );
          })()}

          {model.nodes.length === 0 && (
            <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none', gap: 8 }}>
              <div style={{ fontSize: 36, opacity: 0.1, color: t.textPrimary }}>{variant === 'question' ? '?' : variant === 'journey' ? '↗' : '⬡'}</div>
              <div style={{ fontSize: 13, color: t.textMuted, fontWeight: 500 }}>Click <strong style={{ color: acc.color }}>+ {variantLabel}</strong> to start</div>
            </div>
          )}

          {model.nodes.length > 0 && viewport.w > 0 && (
            <Minimap
              model={model}
              viewportW={viewport.w}
              viewportH={viewport.h}
              transform={transform}
              isDark={isDark}
              accentColor={acc.color}
              measureNode={(n) => nodeDims(n, variant)}
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
              edgeHasWaypoint={!!ctxEdge?.waypoint}
              onEdgeRename={() => { if (ctxMenu.edgeId) { beginEditEdge(ctxMenu.edgeId); setCtxMenu(null); } }}
              onEdgeStyle={(s) => { if (ctxMenu.edgeId) { setEdgeStyle(ctxMenu.edgeId, s); setCtxMenu(null); } }}
              onEdgeArrowhead={(a) => { if (ctxMenu.edgeId) { setEdgeArrowhead(ctxMenu.edgeId, a); setCtxMenu(null); } }}
              onEdgeDelete={() => { if (ctxMenu.edgeId) { deleteEdge(ctxMenu.edgeId); setCtxMenu(null); } }}
              onEdgeResetRouting={() => { if (ctxMenu.edgeId) { resetEdgeRouting(ctxMenu.edgeId); setCtxMenu(null); } }}
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
        <span style={{ marginLeft: 'auto' }}>Ctrl+Z undo · Ctrl+Y redo · Ctrl+0 fit · Alt+Arrow traverse</span>
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
