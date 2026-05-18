import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Toolbar } from './Toolbar.js';
import { StepEditor } from './StepEditor.js';
import { SequenceEditor } from './SequenceEditor.js';
import { NodeNavigator } from './NodeNavigator.js';
import { DiagramCanvas } from './DiagramCanvas.js';
import type { CtxMenuState as CtxMenu } from './ContextMenu.js';
import { useHistory } from './hooks/useHistory.js';
import { usePrefersReducedMotion, useIsCoarsePointer } from './hooks/useSystemTheme.js';
import { useCanvasWheel } from './hooks/useCanvasWheel.js';
import { useCanvasTouch } from './hooks/useCanvasTouch.js';
import { useElementSize } from './hooks/useElementSize.js';
import { useEditorTheme } from './hooks/useEditorTheme.js';
import { useExporters } from './hooks/useExporters.js';
import { useImporter } from './hooks/useImporter.js';
import { useToast } from './hooks/useToast.js';
import { ToastContainer } from './ToastContainer.js';
import { useEditorKeyboard, type KeyCommand } from './hooks/useEditorKeyboard.js';
import { NODE_H, GRID, nodeWidth, nodeDims, snap } from './layout.js';
import { findSiblingSnap, type AlignGuideV, type AlignGuideH } from './alignment.js';
import { nearestInDirection } from './traversal.js';
import { presetFlowchartModel } from './presets.js';
import type {
  DiagramModel,
  DiagramNode,
  DiagramEdge,
  ExportFormat,
  DiagramVariant,
} from '../core/types.js';
import { nextId, makeIdSource } from '../core/ids.js';

// ── Theme ──────────────────────────────────────────────────────────────────
import {
  ACCENT as C,
  type ThemeColors,
  lightTheme,
  darkTheme,
  variantAccent,
  shadowColor as themeShadow,
  arrowColor as themeArrow,
} from './theme.js';
export type { ThemeColors } from './theme.js';

// Static styles hoisted to module scope.
const STYLE_SR_ONLY: React.CSSProperties = {
  position: 'absolute',
  width: 1,
  height: 1,
  padding: 0,
  margin: -1,
  overflow: 'hidden',
  clip: 'rect(0 0 0 0)',
  whiteSpace: 'nowrap',
  border: 0,
};
const STYLE_FLEX_ROW: React.CSSProperties = { flex: 1, display: 'flex', overflow: 'hidden' };

interface Transform {
  x: number;
  y: number;
  scale: number;
}
interface DragState {
  nodeId: string;
  ox: number;
  oy: number;
}
interface LiveEdge {
  fromId: string;
  fromX: number;
  fromY: number;
  exitDir: 'bottom' | 'right' | 'left';
  answerLabel?: string;
  toX: number;
  toY: number;
}

/**
 * Props for `<DiagramEditor>`. All fields are optional — mounting with no
 * props renders the flowchart preset on an `auto`-themed canvas with every
 * export format and import enabled.
 *
 * @property initialModel    Initial diagram. If a sequence model is passed,
 *                           rendering is delegated to `<SequenceEditor>`. If
 *                           omitted, `presetFlowchartModel(variant)` is used.
 * @property onChange        Fires after every committed mutation (undo/redo,
 *                           drag, label edit, etc.). Receives the new model.
 * @property onExport        Optional sink for exporter output. If omitted, the
 *                           editor triggers a browser download of `diagram.<ext>`.
 * @property height          Canvas height; accepts CSS units. Defaults to `600`.
 * @property allowedExports  Whitelist of export formats to show in the
 *                           toolbar. Defaults to all formats.
 * @property allowImport     Show the import button. Defaults to `true`.
 * @property variant         Initial variant when `initialModel` is omitted.
 *                           Ignored if `initialModel.variant` is set.
 * @property theme           `'light'`, `'dark'`, or `'auto'` (follow OS).
 *                           Defaults to `'auto'`.
 * @property themeOverrides  Per-property overrides on top of the resolved
 *                           palette. Useful for brand-matching without forking.
 */
export interface DiagramEditorProps {
  initialModel?: DiagramModel;
  onChange?: (model: DiagramModel) => void;
  onExport?: (format: ExportFormat, content: string | Blob) => void;
  height?: number | string;
  allowedExports?: ExportFormat[];
  allowImport?: boolean;
  variant?: DiagramVariant;
  theme?: 'light' | 'dark' | 'auto';
  themeOverrides?: Partial<ThemeColors>;
}

/**
 * The all-in-one editor component. Renders a smart router: if the supplied
 * `initialModel.type` is `sequence`, it delegates to `<SequenceEditor>` with
 * the same props pass-through. Otherwise it renders the flowchart editor.
 *
 * @example
 * ```tsx
 * import { DiagramEditor } from 'flowchart-sequence-designer/ui';
 *
 * export default function App() {
 *   return <DiagramEditor height={520} onChange={(m) => console.log(m)} />;
 * }
 * ```
 */
export function DiagramEditor(props: DiagramEditorProps) {
  // Delegate sequence diagrams to the dedicated SequenceEditor.
  if (props.initialModel?.type === 'sequence') {
    return (
      <SequenceEditor
        initialModel={props.initialModel}
        onChange={props.onChange}
        onExport={props.onExport}
        height={props.height}
        allowedExports={props.allowedExports}
        allowImport={props.allowImport}
        theme={props.theme}
        themeOverrides={props.themeOverrides}
      />
    );
  }
  return <FlowchartEditor {...props} />;
}

function FlowchartEditor({
  initialModel,
  onChange,
  onExport,
  height = 600,
  allowedExports,
  allowImport = true,
  variant = 'flowchart',
  theme = 'auto',
  themeOverrides,
}: DiagramEditorProps) {
  const base: DiagramModel = initialModel
    ? { ...initialModel, variant: initialModel.variant ?? variant }
    : presetFlowchartModel(variant);
  const notify = useCallback((m: DiagramModel) => onChange?.(m), [onChange]);
  const history = useHistory<DiagramModel>(base, notify);
  const { state: model, apply: applyModel, applyAndPush, undo, redo } = history;
  const { toasts, showToast, dismissToast } = useToast();
  const [transform, setTransform] = useState<Transform>({ x: 60, y: 60, scale: 1 });
  const [selected, setSelected] = useState<string | null>(null);
  const [selectedSet, setSelectedSet] = useState<Set<string>>(() => new Set());
  const [drag, setDrag] = useState<DragState | null>(null);
  const [pan, setPan] = useState<{ ox: number; oy: number; tx: number; ty: number } | null>(null);
  const [boxSel, setBoxSel] = useState<{
    sx: number;
    sy: number;
    cx: number;
    cy: number;
    additive: boolean;
  } | null>(null);
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
    setSelectedSet((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
        const last = next.size ? (Array.from(next)[next.size - 1] ?? null) : null;
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
  const { t, isDark } = useEditorTheme(theme, themeOverrides, {
    light: lightTheme,
    dark: darkTheme,
  });
  const isCoarse = useIsCoarsePointer();
  const portR = isCoarse ? 9 : 6;

  // Track the SVG element size for the minimap viewport overlay.
  const viewport = useElementSize(svgRef);

  const reCenter = useCallback(() => {
    if (!svgRef.current) return;
    const rect = svgRef.current.getBoundingClientRect();
    const W = rect.width,
      H = rect.height;
    if (model.nodes.length === 0) {
      setTransform({ x: W / 2, y: H / 2, scale: 1 });
      return;
    }
    let minX = Infinity,
      minY = Infinity,
      maxX = -Infinity,
      maxY = -Infinity;
    for (const n of model.nodes) {
      const nx = n.x ?? 0,
        ny = n.y ?? 0;
      const { w: nw, h: nh } = nodeDims(n, variant);
      minX = Math.min(minX, nx);
      minY = Math.min(minY, ny);
      maxX = Math.max(maxX, nx + nw);
      maxY = Math.max(maxY, ny + nh);
    }
    const pad = 48;
    const scaleX = (W - pad * 2) / (maxX - minX || 1);
    const scaleY = (H - pad * 2) / (maxY - minY || 1);
    const scale = Math.min(1.5, Math.max(0.2, Math.min(scaleX, scaleY)));
    const cx = (minX + maxX) / 2,
      cy = (minY + maxY) / 2;
    setTransform({ scale, x: W / 2 - cx * scale, y: H / 2 - cy * scale });
  }, [model.nodes, variant]);

  const jumpToNode = useCallback(
    (nodeId: string) => {
      const node = model.nodes.find((n) => n.id === nodeId);
      if (!node || !svgRef.current) return;
      const rect = svgRef.current.getBoundingClientRect();
      const { w: nw, h: nh } = nodeDims(node, variant);
      const cx = (node.x ?? 0) + nw / 2;
      const cy = (node.y ?? 0) + nh / 2;
      const scale = Math.min(Math.max(transform.scale, 0.8), 1.4);
      setTransform({ scale, x: rect.width / 2 - cx * scale, y: rect.height / 2 - cy * scale });
      selectOne(nodeId);
    },
    [model.nodes, variant, transform.scale, selectOne],
  );

  const duplicateIds = useCallback(
    (ids: string[]) => {
      if (ids.length === 0) return;
      const idSet = new Set(ids);
      const idMap = new Map<string, string>();
      const nextNode = makeIdSource('node', model.nodes);
      const nextEdge = makeIdSource('e', model.edges);
      const newNodes: DiagramNode[] = [];
      for (const oldId of ids) {
        const n = model.nodes.find((x) => x.id === oldId);
        if (!n) continue;
        const newId = nextNode();
        idMap.set(oldId, newId);
        newNodes.push({
          ...n,
          id: newId,
          label: ids.length === 1 ? n.label + ' (copy)' : n.label,
          x: (n.x ?? 0) + 32,
          y: (n.y ?? 0) + 32,
        });
      }
      const newEdges: DiagramEdge[] = [];
      for (const e of model.edges) {
        if (idSet.has(e.from) && idSet.has(e.to)) {
          newEdges.push({ ...e, id: nextEdge(), from: idMap.get(e.from)!, to: idMap.get(e.to)! });
        }
      }
      const m = {
        ...model,
        nodes: [...model.nodes, ...newNodes],
        edges: [...model.edges, ...newEdges],
      };
      applyAndPush(m);
      const newIds = newNodes.map((n) => n.id);
      setSelected(newIds[newIds.length - 1] ?? null);
      setSelectedSet(new Set(newIds));
    },
    [model, applyAndPush],
  );

  const duplicateNode = useCallback(
    (nodeId: string) => {
      duplicateIds([nodeId]);
    },
    [duplicateIds],
  );

  // Close context menu on any click
  useEffect(() => {
    if (!ctxMenu) return;
    const close = () => setCtxMenu(null);
    window.addEventListener('mousedown', close);
    return () => window.removeEventListener('mousedown', close);
  }, [ctxMenu]);

  // Global keyboard shortcuts
  const keyCommands: KeyCommand[] = [
    {
      match: (e) => (e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey,
      run: () => {
        undo();
        return true;
      },
    },
    {
      match: (e) => (e.ctrlKey || e.metaKey) && (e.key === 'y' || (e.shiftKey && e.key === 'z')),
      run: () => {
        redo();
        return true;
      },
    },
    {
      match: (e) => (e.ctrlKey || e.metaKey) && e.key === '0',
      run: () => {
        reCenter();
        return true;
      },
    },
    {
      match: (e) =>
        (e.ctrlKey || e.metaKey) && (e.key === 'd' || e.key === 'D') && selectedSet.size > 0,
      run: () => {
        duplicateIds(Array.from(selectedSet));
        return true;
      },
    },
    {
      match: (e) =>
        (e.ctrlKey || e.metaKey) && (e.key === 'c' || e.key === 'C') && selectedSet.size > 0,
      run: () => {
        const ids = new Set(selectedSet);
        const nodes = model.nodes.filter((n) => ids.has(n.id));
        const edges = model.edges.filter((ed) => ids.has(ed.from) && ids.has(ed.to));
        clipboardRef.current = {
          nodes: nodes.map((n) => ({ ...n })),
          edges: edges.map((ed) => ({ ...ed })),
        };
        return true;
      },
    },
    {
      match: (e) => (e.ctrlKey || e.metaKey) && (e.key === 'v' || e.key === 'V'),
      run: () => {
        const clip = clipboardRef.current;
        if (!clip || clip.nodes.length === 0) return false;
        const idMap = new Map<string, string>();
        const nextNode = makeIdSource('node', model.nodes);
        const nextEdge = makeIdSource('e', model.edges);
        const newNodes: DiagramNode[] = clip.nodes.map((n) => {
          const newId = nextNode();
          idMap.set(n.id, newId);
          return { ...n, id: newId, x: (n.x ?? 0) + 24, y: (n.y ?? 0) + 24 };
        });
        const newEdges: DiagramEdge[] = clip.edges.map((ed) => ({
          ...ed,
          id: nextEdge(),
          from: idMap.get(ed.from) ?? ed.from,
          to: idMap.get(ed.to) ?? ed.to,
        }));
        const m = {
          ...model,
          nodes: [...model.nodes, ...newNodes],
          edges: [...model.edges, ...newEdges],
        };
        applyAndPush(m);
        const newIds = newNodes.map((n) => n.id);
        setSelected(newIds[newIds.length - 1] ?? null);
        setSelectedSet(new Set(newIds));
        setAnnouncement(
          `Pasted ${newIds.length} ${variantLabel.toLowerCase()}${newIds.length === 1 ? '' : 's'}.`,
        );
        return true;
      },
    },
    {
      match: (e) => e.key === 'Escape',
      run: () => {
        if (ctxMenu) setCtxMenu(null);
        if (liveEdge) setLiveEdge(null);
        if (editingId) setEditingId(null);
        if (boxSel) setBoxSel(null);
        if (selectedSet.size > 0) clearSelection();
        return true;
      },
    },
    {
      match: (e) => (e.key === 'Delete' || e.key === 'Backspace') && selectedSet.size > 0,
      run: () => {
        const ids = new Set(selectedSet);
        const updated = {
          ...model,
          nodes: model.nodes.filter((n) => !ids.has(n.id)),
          edges: model.edges.filter((ed) => !ids.has(ed.from) && !ids.has(ed.to)),
        };
        applyAndPush(updated);
        clearSelection();
        setAnnouncement(
          `Deleted ${ids.size} ${variantLabel.toLowerCase()}${ids.size === 1 ? '' : 's'}.`,
        );
        return true;
      },
    },
    {
      match: (e) =>
        selectedSet.size > 0 &&
        e.altKey &&
        !!selected &&
        (e.key === 'ArrowUp' ||
          e.key === 'ArrowDown' ||
          e.key === 'ArrowLeft' ||
          e.key === 'ArrowRight'),
      run: (e) => {
        const dirKey =
          e.key === 'ArrowLeft'
            ? 'left'
            : e.key === 'ArrowRight'
              ? 'right'
              : e.key === 'ArrowUp'
                ? 'up'
                : ('down' as const);
        const origin = model.nodes.find((n) => n.id === selected);
        if (!origin) return false;
        const od = nodeDims(origin, variant);
        const ox = (origin.x ?? 0) + od.w / 2;
        const oy = (origin.y ?? 0) + od.h / 2;
        const candidates = model.nodes
          .filter((n) => n.id !== selected)
          .map((n) => {
            const d = nodeDims(n, variant);
            return { id: n.id, x: (n.x ?? 0) + d.w / 2, y: (n.y ?? 0) + d.h / 2 };
          });
        const nextNodeId = nearestInDirection(ox, oy, dirKey, candidates);
        if (nextNodeId) {
          selectOne(nextNodeId);
          setAnnouncement(`Selected ${model.nodes.find((n) => n.id === nextNodeId)?.label ?? ''}.`);
        }
        return true;
      },
    },
    {
      match: (e) =>
        selectedSet.size > 0 &&
        (e.key === 'ArrowUp' ||
          e.key === 'ArrowDown' ||
          e.key === 'ArrowLeft' ||
          e.key === 'ArrowRight'),
      run: (e) => {
        const dirKey =
          e.key === 'ArrowLeft'
            ? 'left'
            : e.key === 'ArrowRight'
              ? 'right'
              : e.key === 'ArrowUp'
                ? 'up'
                : ('down' as const);
        const step = e.shiftKey ? GRID * 4 : GRID;
        const dx = dirKey === 'left' ? -step : dirKey === 'right' ? step : 0;
        const dy = dirKey === 'up' ? -step : dirKey === 'down' ? step : 0;
        const ids = selectedSet;
        const updated = {
          ...model,
          nodes: model.nodes.map((n) =>
            ids.has(n.id) ? { ...n, x: snap((n.x ?? 0) + dx), y: snap((n.y ?? 0) + dy) } : n,
          ),
        };
        applyAndPush(updated);
        return true;
      },
    },
  ];
  useEditorKeyboard(keyCommands, [
    undo,
    redo,
    reCenter,
    selected,
    selectedSet,
    ctxMenu,
    liveEdge,
    editingId,
    boxSel,
    model,
    applyAndPush,
    duplicateNode,
    clearSelection,
  ]);

  const toCanvas = useCallback(
    (clientX: number, clientY: number) => {
      const rect = svgRef.current!.getBoundingClientRect();
      return {
        x: (clientX - rect.left - transform.x) / transform.scale,
        y: (clientY - rect.top - transform.y) / transform.scale,
      };
    },
    [transform],
  );

  useCanvasWheel(svgRef, setTransform);

  const onCanvasLongPress = useCallback((x: number, y: number) => {
    setCtxMenu({ x, y, nodeId: null });
  }, []);
  useCanvasTouch(svgRef, { transform, setTransform, onLongPress: onCanvasLongPress });

  const onPortMouseDown = (e: React.MouseEvent, nodeId: string) => {
    e.stopPropagation();
    const node = model.nodes.find((n) => n.id === nodeId)!;
    const { x, y } = toCanvas(e.clientX, e.clientY);
    const nW = nodeWidth(node.label);
    setLiveEdge({
      fromId: nodeId,
      fromX: (node.x ?? 0) + nW / 2,
      fromY: (node.y ?? 0) + NODE_H,
      exitDir: 'bottom',
      toX: x,
      toY: y,
    });
  };

  const onAnswerPortDown = (
    e: React.MouseEvent,
    nodeId: string,
    answer: string,
    portXInNode: number,
    portYInNode: number,
  ) => {
    e.stopPropagation();
    const node = model.nodes.find((n) => n.id === nodeId)!;
    const { x, y } = toCanvas(e.clientX, e.clientY);
    setLiveEdge({
      fromId: nodeId,
      fromX: (node.x ?? 0) + portXInNode,
      fromY: (node.y ?? 0) + portYInNode,
      exitDir: 'bottom',
      answerLabel: answer,
      toX: x,
      toY: y,
    });
  };

  const onNodeMouseDown = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (liveEdge) return;
    const node = model.nodes.find((n) => n.id === id)!;

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
        const n = model.nodes.find((x) => x.id === sid);
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
    setDrag({
      nodeId: id,
      ox: e.clientX - (transform.x + (node.x ?? 0) * transform.scale),
      oy: e.clientY - (transform.y + (node.y ?? 0) * transform.scale),
    });
  };

  const onNodeMouseUp = (e: React.MouseEvent, targetId: string) => {
    if (!liveEdge || liveEdge.fromId === targetId) return;
    e.stopPropagation();
    const label = liveEdge.answerLabel;
    let updated: DiagramModel;
    if (label) {
      const existing = model.edges.find((ex) => ex.from === liveEdge.fromId && ex.label === label);
      if (existing) {
        updated = {
          ...model,
          edges: model.edges.map((ex) => (ex.id === existing.id ? { ...ex, to: targetId } : ex)),
        };
      } else {
        updated = {
          ...model,
          edges: [
            ...model.edges,
            { id: nextId('e', model.edges), from: liveEdge.fromId, to: targetId, label },
          ],
        };
      }
    } else {
      updated = {
        ...model,
        edges: [
          ...model.edges,
          { id: nextId('e', model.edges), from: liveEdge.fromId, to: targetId },
        ],
      };
    }
    applyAndPush(updated);
    setLiveEdge(null);
  };

  const onSvgMouseDown = (e: React.MouseEvent) => {
    if (ctxMenu) {
      setCtxMenu(null);
      return;
    }
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
    e.preventDefault();
    e.stopPropagation();
    // Right-click on a node that is NOT already in the multi-selection collapses
    // selection to just this node (matches Figma / VS Code). Right-clicking a
    // node that IS part of a multi-selection keeps the group intact.
    if (!selectedSet.has(nodeId)) selectOne(nodeId);
    setCtxMenu({ x: e.clientX, y: e.clientY, nodeId });
  };

  const onMouseMove = (e: React.MouseEvent) => {
    if (liveEdge) {
      const { x, y } = toCanvas(e.clientX, e.clientY);
      setLiveEdge((le) => (le ? { ...le, toX: x, toY: y } : null));
      return;
    }
    if (waypointDrag) {
      const { x, y } = toCanvas(e.clientX, e.clientY);
      const wx = snap(x),
        wy = snap(y);
      const updated = {
        ...model,
        edges: model.edges.map((ed) =>
          ed.id === waypointDrag ? { ...ed, waypoint: { x: wx, y: wy } } : ed,
        ),
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
          nodes: model.nodes.map((n) => {
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
        const dragged = model.nodes.find((n) => n.id === drag.nodeId);
        if (!dragged) return;
        const { w: dW, h: dH } = nodeDims(dragged, variant);
        const others = model.nodes
          .filter((n) => n.id !== drag.nodeId)
          .map((n) => {
            const d = nodeDims(n, variant);
            return { x: n.x ?? 0, y: n.y ?? 0, w: d.w, h: d.h };
          });
        const snapResult = findSiblingSnap({ x: dx, y: dy, w: dW, h: dH }, others);
        setAlignGuides(
          snapResult.guideX || snapResult.guideY
            ? { x: snapResult.guideX, y: snapResult.guideY }
            : null,
        );
        const updated = {
          ...model,
          nodes: model.nodes.map((n) =>
            n.id === drag.nodeId ? { ...n, x: snapResult.x, y: snapResult.y } : n,
          ),
        };
        applyModel(updated);
      }
    } else if (pan) {
      setTransform((tr) => ({
        ...tr,
        x: pan.tx + (e.clientX - pan.ox),
        y: pan.ty + (e.clientY - pan.oy),
      }));
    } else if (boxSel) {
      setBoxSel((b) => (b ? { ...b, cx: e.clientX, cy: e.clientY } : null));
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
          const nx = n.x ?? 0,
            ny = n.y ?? 0;
          const { w: nw, h: nh } = nodeDims(n, variant);
          if (nx + nw >= cx1 && nx <= cx2 && ny + nh >= cy1 && ny <= cy2) hits.add(n.id);
        }
        const arr = Array.from(hits);
        setSelectedSet(hits);
        setSelected(arr.length ? (arr[arr.length - 1] ?? null) : null);
      }
      setBoxSel(null);
    }
    // Commit drag position to history so it can be undone.
    if (drag) applyAndPush(model);
    if (waypointDrag) {
      applyAndPush(model);
      setWaypointDrag(null);
    }
    groupDragOriginsRef.current = null;
    setAlignGuides(null);
    setDrag(null);
    setPan(null);
    if (liveEdge) setLiveEdge(null);
  };

  const onNodeDblClick = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    const node = model.nodes.find((n) => n.id === id)!;
    setEditingId(id);
    setEditLabel(node.label);
  };

  const commitEdit = () => {
    if (!editingId) return;
    const up = {
      ...model,
      nodes: model.nodes.map((n) => (n.id === editingId ? { ...n, label: editLabel } : n)),
    };
    applyAndPush(up);
    setEditingId(null);
  };

  const addNode = (atCanvasPos?: { x: number; y: number }) => {
    const id = nextId('node', model.nodes);
    const p = atCanvasPos
      ? { x: snap(atCanvasPos.x), y: snap(atCanvasPos.y) }
      : { x: snap(100 + Math.random() * 240), y: snap(100 + Math.random() * 180) };
    const label =
      variant === 'question'
        ? 'New Question'
        : variant === 'journey'
          ? `Step ${model.nodes.length + 1}`
          : 'New Step';
    const metadata = variant === 'question' ? { answers: [] } : undefined;
    const updated = {
      ...model,
      nodes: [...model.nodes, { id, label, shape: 'rectangle' as const, metadata, ...p }],
    };
    applyAndPush(updated);
    selectOne(id);
    setAnnouncement(`Added ${variantLabel.toLowerCase()} "${label}".`);
  };

  const deleteNode = (nodeId: string) => {
    const node = model.nodes.find((n) => n.id === nodeId);
    const updated = {
      ...model,
      nodes: model.nodes.filter((n) => n.id !== nodeId),
      edges: model.edges.filter((e) => e.from !== nodeId && e.to !== nodeId),
    };
    applyAndPush(updated);
    if (selectedSet.has(nodeId)) {
      const next = new Set(selectedSet);
      next.delete(nodeId);
      setSelectedSet(next);
      if (selected === nodeId)
        setSelected(next.size ? (Array.from(next)[next.size - 1] ?? null) : null);
    }
    if (node) setAnnouncement(`Deleted ${variantLabel.toLowerCase()} "${node.label}".`);
  };

  const deleteSelected = () => {
    if (selectedSet.size === 0) return;
    if (selectedSet.size === 1 && selected) {
      deleteNode(selected);
      return;
    }
    const ids = new Set(selectedSet);
    const updated = {
      ...model,
      nodes: model.nodes.filter((n) => !ids.has(n.id)),
      edges: model.edges.filter((ed) => !ids.has(ed.from) && !ids.has(ed.to)),
    };
    applyAndPush(updated);
    clearSelection();
    setAnnouncement(`Deleted ${ids.size} ${variantLabel.toLowerCase()}s.`);
  };

  const beginEditEdge = (edgeId: string) => {
    const edge = model.edges.find((e) => e.id === edgeId);
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
      edges: model.edges.map((e) =>
        e.id === editingEdgeId ? { ...e, ...(next ? { label: next } : { label: undefined }) } : e,
      ),
    };
    applyAndPush(updated);
    setEditingEdgeId(null);
  };

  const onEdgeContextMenu = (e: React.MouseEvent, edgeId: string) => {
    e.preventDefault();
    e.stopPropagation();
    setCtxMenu({ x: e.clientX, y: e.clientY, nodeId: null, edgeId });
  };

  const setEdgeStyle = (edgeId: string, style: 'solid' | 'dashed' | 'dotted') => {
    const updated = {
      ...model,
      edges: model.edges.map((e) => (e.id === edgeId ? { ...e, style } : e)),
    };
    applyAndPush(updated);
  };

  const setEdgeArrowhead = (edgeId: string, arrowhead: 'arrow' | 'none') => {
    const updated = {
      ...model,
      edges: model.edges.map((e) => (e.id === edgeId ? { ...e, arrowhead } : e)),
    };
    applyAndPush(updated);
  };

  const deleteEdge = (edgeId: string) => {
    const updated = { ...model, edges: model.edges.filter((e) => e.id !== edgeId) };
    applyAndPush(updated);
  };

  const resetEdgeRouting = (edgeId: string) => {
    const updated = {
      ...model,
      edges: model.edges.map((e) => {
        if (e.id !== edgeId) return e;
        const { waypoint: _ignored, ...rest } = e;
        void _ignored;
        return rest;
      }),
    };
    applyAndPush(updated);
  };

  const handleExport = useExporters(model, onExport, 'diagram', (msg) => showToast(msg, 'success'));

  const positionFlowchartNodes = useCallback(
    (m: DiagramModel): DiagramModel => ({
      ...m,
      nodes: m.nodes.map((n, i) => ({
        ...n,
        x: n.x ?? snap(80 + (i % 4) * 200),
        y: n.y ?? snap(80 + Math.floor(i / 4) * 140),
      })),
    }),
    [],
  );
  const handleImport = useImporter(applyAndPush, {
    transform: positionFlowchartNodes,
    onSuccess: (msg) => showToast(msg, 'success'),
    onError: (msg) => showToast(msg, 'error'),
  });

  const acc = variantAccent(variant, isDark);
  const variantLabel =
    variant === 'question' ? 'Question' : variant === 'journey' ? 'Step' : 'Node';
  const shadowClr = themeShadow(isDark);
  const arrowClr = themeArrow(isDark);
  const amberArrow = isDark ? C.amberDark : C.amber;

  return (
    <div
      className="fsd-editor"
      style={{
        display: 'flex',
        flexDirection: 'column',
        height,
        width: '100%',
        fontFamily: 'ui-sans-serif,system-ui,sans-serif',
        boxSizing: 'border-box',
        background: t.ctrlsBg,
        position: 'relative',
      }}
    >
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />
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
        .fsd-editor svg [role="button"]:focus-visible {
          outline: 2px solid ${acc.color};
          outline-offset: 3px;
        }
        .fsd-editor svg[role="application"]:focus-visible {
          outline: 2px solid ${acc.color};
          outline-offset: -2px;
        }
      `}</style>
      {/* Screen-reader live region — announces selection/add/delete actions. */}
      <div role="status" aria-live="polite" aria-atomic="true" style={STYLE_SR_ONLY}>
        {announcement}
      </div>
      <Toolbar
        onExport={handleExport}
        onImport={allowImport ? handleImport : undefined}
        allowedExports={allowedExports}
        allowImport={allowImport}
      />

      {/* Controls bar */}
      <div
        style={{
          display: 'flex',
          gap: 6,
          padding: '7px 14px',
          background: t.ctrlsBg,
          borderBottom: `1px solid ${t.ctrlsBorder}`,
          alignItems: 'center',
          flexWrap: 'wrap',
        }}
      >
        <button onClick={() => addNode()} style={ctrlBtn(acc.color, isDark)}>
          + {variantLabel}
        </button>
        {selectedSet.size > 0 && (
          <>
            <div style={{ width: 1, height: 20, background: t.ctrlsBorder, margin: '0 2px' }} />
            <button
              onClick={deleteSelected}
              style={{
                ...ctrlBtn('transparent', isDark),
                color: '#ef4444',
                border: `1px solid ${isDark ? '#7f1d1d' : '#fca5a5'}`,
              }}
            >
              {selectedSet.size > 1 ? `Delete (${selectedSet.size})` : 'Delete'}
            </button>
          </>
        )}
        {liveEdge && (
          <span style={{ fontSize: 11, color: acc.color, fontWeight: 600, marginLeft: 6 }}>
            {liveEdge.answerLabel
              ? `Routing "${liveEdge.answerLabel}" →`
              : 'Drop on a node to connect'}
            <span style={{ fontWeight: 400, color: t.textMuted, marginLeft: 6 }}>
              release to cancel
            </span>
          </span>
        )}
        <span style={{ marginLeft: 'auto', fontSize: 11, color: t.textMuted }}>
          {variant === 'question' ? 'drag answer port to connect · ' : 'drag port dot · '}scroll to
          zoom · drag to pan
        </span>
      </div>

      {variant !== 'flowchart' && (
        <div
          style={{
            padding: '3px 14px',
            background: acc.fill,
            borderBottom: `1px solid ${acc.border}`,
            fontSize: 11,
            color: acc.color,
            fontWeight: 600,
          }}
        >
          {variant === 'question'
            ? '? Question Flow — add answers in the panel, drag their port to connect'
            : '↗ Journey Map — numbered steps, drag port to sequence'}
        </div>
      )}

      <div style={STYLE_FLEX_ROW}>
        {/* Node navigator */}
        <NodeNavigator
          model={model}
          selected={selected}
          variant={variant}
          isDark={isDark}
          t={t}
          acc={acc}
          open={navOpen}
          onToggle={() => setNavOpen((v) => !v)}
          onSelect={jumpToNode}
        />

        <DiagramCanvas
          model={model}
          variant={variant}
          variantLabel={variantLabel}
          t={t}
          isDark={isDark}
          acc={acc}
          transform={transform}
          setTransform={setTransform}
          selected={selected}
          selectedSet={selectedSet}
          hoveredId={hoveredId}
          setHoveredId={setHoveredId}
          drag={drag}
          pan={pan}
          liveEdge={liveEdge}
          boxSel={boxSel}
          alignGuides={alignGuides}
          editingEdgeId={editingEdgeId}
          editEdgeLabel={editEdgeLabel}
          setEditEdgeLabel={setEditEdgeLabel}
          commitEdgeEdit={commitEdgeEdit}
          setEditingEdgeId={setEditingEdgeId}
          beginEditEdge={beginEditEdge}
          onEdgeContextMenu={onEdgeContextMenu}
          setWaypointDrag={setWaypointDrag}
          editingId={editingId}
          editLabel={editLabel}
          setEditLabel={setEditLabel}
          commitEdit={commitEdit}
          setEditingId={setEditingId}
          onNodeMouseDown={onNodeMouseDown}
          onNodeMouseUp={onNodeMouseUp}
          onNodeDblClick={onNodeDblClick}
          onNodeContextMenu={onNodeContextMenu}
          onPortMouseDown={onPortMouseDown}
          onAnswerPortDown={onAnswerPortDown}
          onSvgMouseDown={onSvgMouseDown}
          onMouseMove={onMouseMove}
          onMouseUp={onMouseUp}
          onSvgContextMenu={onSvgContextMenu}
          reducedMotion={reducedMotion}
          isCoarse={isCoarse}
          portR={portR}
          shadowClr={shadowClr}
          arrowClr={arrowClr}
          amberArrow={amberArrow}
          viewport={viewport}
          svgRef={svgRef}
          containerRef={containerRef}
          ctxMenu={ctxMenu}
          history={history}
          ctxEdgeStyle={
            (ctxMenu?.edgeId ? model.edges.find((e) => e.id === ctxMenu.edgeId) : undefined)
              ?.style ?? 'solid'
          }
          ctxEdgeArrow={
            ((ctxMenu?.edgeId ? model.edges.find((e) => e.id === ctxMenu.edgeId) : undefined)
              ?.arrowhead ?? 'arrow') as 'arrow' | 'none'
          }
          ctxEdgeHasWaypoint={
            !!(ctxMenu?.edgeId ? model.edges.find((e) => e.id === ctxMenu.edgeId) : undefined)
              ?.waypoint
          }
          onCtxUndo={() => {
            undo();
            setCtxMenu(null);
          }}
          onCtxRedo={() => {
            redo();
            setCtxMenu(null);
          }}
          onCtxReCenter={() => {
            reCenter();
            setCtxMenu(null);
          }}
          onCtxAddNode={() => {
            const rect = svgRef.current!.getBoundingClientRect();
            const cx = (ctxMenu!.x - rect.left - transform.x) / transform.scale;
            const cy = (ctxMenu!.y - rect.top - transform.y) / transform.scale;
            addNode({ x: cx, y: cy });
            setCtxMenu(null);
          }}
          onCtxDuplicate={() => {
            if (ctxMenu?.nodeId) {
              duplicateNode(ctxMenu.nodeId);
              setCtxMenu(null);
            }
          }}
          onCtxRename={() => {
            if (ctxMenu?.nodeId) {
              const node = model.nodes.find((n) => n.id === ctxMenu.nodeId)!;
              setEditingId(ctxMenu.nodeId);
              setEditLabel(node.label);
              setCtxMenu(null);
            }
          }}
          onCtxDelete={() => {
            if (ctxMenu?.nodeId) {
              deleteNode(ctxMenu.nodeId);
              setCtxMenu(null);
            }
          }}
          onCtxDisconnect={() => {
            if (ctxMenu?.nodeId) {
              const m = {
                ...model,
                edges: model.edges.filter(
                  (e) => e.from !== ctxMenu.nodeId && e.to !== ctxMenu.nodeId,
                ),
              };
              applyAndPush(m);
              setCtxMenu(null);
            }
          }}
          onCtxEdgeRename={() => {
            if (ctxMenu?.edgeId) {
              beginEditEdge(ctxMenu.edgeId);
              setCtxMenu(null);
            }
          }}
          onCtxEdgeStyle={(s) => {
            if (ctxMenu?.edgeId) {
              setEdgeStyle(ctxMenu.edgeId, s);
              setCtxMenu(null);
            }
          }}
          onCtxEdgeArrowhead={(a) => {
            if (ctxMenu?.edgeId) {
              setEdgeArrowhead(ctxMenu.edgeId, a);
              setCtxMenu(null);
            }
          }}
          onCtxEdgeDelete={() => {
            if (ctxMenu?.edgeId) {
              deleteEdge(ctxMenu.edgeId);
              setCtxMenu(null);
            }
          }}
          onCtxEdgeResetRouting={() => {
            if (ctxMenu?.edgeId) {
              resetEdgeRouting(ctxMenu.edgeId);
              setCtxMenu(null);
            }
          }}
        />

        {selected && (
          <StepEditor
            key={selected}
            nodeId={selected}
            model={model}
            onModelChange={(m) => {
              applyAndPush(m);
            }}
            variant={variant}
            isDark={isDark}
            t={t}
            acc={acc}
          />
        )}
      </div>

      <div
        style={{
          padding: '4px 14px',
          fontSize: 11,
          color: t.textMuted,
          background: t.statusBg,
          borderTop: `1px solid ${t.ctrlsBorder}`,
          display: 'flex',
          gap: 16,
          flexWrap: 'wrap',
          overflow: 'hidden',
          maxHeight: 28,
        }}
      >
        <span>
          {model.nodes.length} {variantLabel.toLowerCase()}s
        </span>
        <span>{model.edges.length} connections</span>
        <span>{Math.round(transform.scale * 100)}% zoom</span>
        <span
          style={{
            marginLeft: 'auto',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}
        >
          Ctrl+Z undo · Ctrl+Y redo · Ctrl+0 fit · Alt+Arrow traverse
        </span>
        {selected && (
          <span style={{ color: acc.color }}>
            {model.nodes.find((n) => n.id === selected)?.label}
          </span>
        )}
      </div>
    </div>
  );
}

function ctrlBtn(accent: string, isDark: boolean): React.CSSProperties {
  const isTransparent = accent === 'transparent';
  return {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 5,
    padding: '5px 12px',
    background: isTransparent ? 'transparent' : accent,
    color: isTransparent ? '#ef4444' : '#fff',
    border: isTransparent ? `1px solid ${isDark ? '#7f1d1d' : '#fca5a5'}` : 'none',
    borderRadius: 6,
    cursor: 'pointer',
    fontSize: 12,
    fontWeight: 500,
    fontFamily: 'inherit',
  };
}
