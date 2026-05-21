import React from 'react';
import { NodeShape, QuestionNode, EdgeLine } from './render.js';
import { Minimap } from './Minimap.js';
import { ContextMenu, type CtxMenuState as CtxMenu } from './ContextMenu.js';
import type { DiagramModel, DiagramNode, DiagramEdge, DiagramVariant } from '../core/types.js';
import type { ThemeColors, VariantAccent } from './theme.js';
import type { AlignGuideV, AlignGuideH } from './alignment.js';
import type { HistoryApi } from './hooks/useHistory.js';
import { NODE_H, GRID, nodeDims, bezierPath } from './layout.js';

// ── Hoisted static styles ──────────────────────────────────────────────────
const STYLE_LABEL: React.CSSProperties = { pointerEvents: 'none', userSelect: 'none' };
const STYLE_LIVE_PORT: React.CSSProperties = { opacity: 0.85, pointerEvents: 'none' };
const STYLE_NODE_GRAB: React.CSSProperties = { cursor: 'grab' };
const STYLE_NODE_GRABBING: React.CSSProperties = { cursor: 'grabbing' };
const STYLE_PORT_VISIBLE: React.CSSProperties = {
  cursor: 'crosshair',
  opacity: 1,
  transition: 'opacity 0.15s',
  pointerEvents: 'all',
  filter: 'drop-shadow(0 1px 3px rgba(0,0,0,0.25))',
};
const STYLE_PORT_HIDDEN: React.CSSProperties = {
  cursor: 'crosshair',
  opacity: 0,
  transition: 'opacity 0.15s',
  pointerEvents: 'none',
  filter: 'drop-shadow(0 1px 3px rgba(0,0,0,0.25))',
};

interface Transform {
  x: number;
  y: number;
  scale: number;
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
interface DragState {
  nodeId: string;
  ox: number;
  oy: number;
}

export interface DiagramCanvasProps {
  model: DiagramModel;
  variant: DiagramVariant;
  variantLabel: string;
  t: ThemeColors;
  isDark: boolean;
  acc: VariantAccent;
  transform: Transform;
  setTransform: React.Dispatch<React.SetStateAction<Transform>>;
  // Selection
  selected: string | null;
  selectedSet: Set<string>;
  hoveredId: string | null;
  setHoveredId: (id: string | null) => void;
  // Drag
  drag: DragState | null;
  pan: { ox: number; oy: number; tx: number; ty: number } | null;
  liveEdge: LiveEdge | null;
  boxSel: { sx: number; sy: number; cx: number; cy: number; additive: boolean } | null;
  // Align guides
  alignGuides: { x?: AlignGuideV; y?: AlignGuideH } | null;
  // Edge editing
  editingEdgeId: string | null;
  editEdgeLabel: string;
  setEditEdgeLabel: (v: string) => void;
  commitEdgeEdit: () => void;
  setEditingEdgeId: (v: string | null) => void;
  beginEditEdge: (edgeId: string) => void;
  onEdgeContextMenu: (e: React.MouseEvent, edgeId: string) => void;
  setWaypointDrag: (edgeId: string) => void;
  // Node editing
  editingId: string | null;
  editLabel: string;
  setEditLabel: (v: string) => void;
  commitEdit: () => void;
  setEditingId: (v: string | null) => void;
  // Node interactions
  onNodeMouseDown: (e: React.MouseEvent, id: string) => void;
  onNodeMouseUp: (e: React.MouseEvent, id: string) => void;
  onNodeDblClick: (e: React.MouseEvent, id: string) => void;
  onNodeContextMenu: (e: React.MouseEvent, id: string) => void;
  onPortMouseDown: (e: React.MouseEvent, nodeId: string) => void;
  onAnswerPortDown: (
    e: React.MouseEvent,
    nodeId: string,
    answer: string,
    portX: number,
    portY: number,
  ) => void;
  // SVG interactions
  onSvgMouseDown: (e: React.MouseEvent) => void;
  onMouseMove: (e: React.MouseEvent) => void;
  onMouseUp: () => void;
  onSvgContextMenu: (e: React.MouseEvent) => void;
  // Canvas features
  reducedMotion: boolean;
  isCoarse: boolean;
  portR: number;
  shadowClr: string;
  arrowClr: string;
  amberArrow: string;
  // Viewport (for minimap)
  viewport: { w: number; h: number };
  // Refs
  svgRef: React.RefObject<SVGSVGElement | null>;
  containerRef: React.RefObject<HTMLDivElement | null>;
  // Context menu
  ctxMenu: CtxMenu | null;
  history: Pick<HistoryApi<DiagramModel>, 'canUndo' | 'canRedo'>;
  onCtxUndo: () => void;
  onCtxRedo: () => void;
  onCtxReCenter: () => void;
  onCtxAddNode: () => void;
  onCtxDuplicate: () => void;
  onCtxRename: () => void;
  onCtxDelete: () => void;
  onCtxDisconnect: () => void;
  ctxEdgeStyle: 'solid' | 'dashed' | 'dotted';
  ctxEdgeArrow: 'arrow' | 'none';
  ctxEdgeHasWaypoint: boolean;
  onCtxEdgeRename: () => void;
  onCtxEdgeStyle: (s: 'solid' | 'dashed' | 'dotted') => void;
  onCtxEdgeArrowhead: (a: 'arrow' | 'none') => void;
  onCtxEdgeDelete: () => void;
  onCtxEdgeResetRouting: () => void;
}

/**
 * The SVG canvas layer of the flowchart editor — background grid, edges,
 * nodes, live-edge preview, alignment guides, box-select overlay, minimap,
 * and context menu. Extracted from `DiagramEditor` so the orchestrator
 * focuses on state + handlers while this component owns rendering.
 */
function DiagramCanvasBase(props: DiagramCanvasProps) {
  const {
    model,
    variant,
    variantLabel,
    t,
    isDark,
    acc,
    transform,
    setTransform,
    selected: _selected,
    selectedSet,
    hoveredId,
    setHoveredId,
    drag,
    pan,
    liveEdge,
    boxSel,
    alignGuides,
    editingEdgeId,
    editEdgeLabel,
    setEditEdgeLabel,
    commitEdgeEdit,
    setEditingEdgeId,
    beginEditEdge,
    onEdgeContextMenu,
    setWaypointDrag,
    editingId,
    editLabel,
    setEditLabel,
    commitEdit,
    setEditingId,
    onNodeMouseDown,
    onNodeMouseUp,
    onNodeDblClick,
    onNodeContextMenu,
    onPortMouseDown,
    onAnswerPortDown,
    onSvgMouseDown,
    onMouseMove,
    onMouseUp,
    onSvgContextMenu,
    reducedMotion,
    isCoarse,
    portR,
    shadowClr,
    arrowClr,
    amberArrow,
    viewport,
    svgRef,
    containerRef,
    ctxMenu,
    history,
    onCtxUndo,
    onCtxRedo,
    onCtxReCenter,
    onCtxAddNode,
    onCtxDuplicate,
    onCtxRename,
    onCtxDelete,
    onCtxDisconnect,
    ctxEdgeStyle,
    ctxEdgeArrow,
    ctxEdgeHasWaypoint,
    onCtxEdgeRename,
    onCtxEdgeStyle,
    onCtxEdgeArrowhead,
    onCtxEdgeDelete,
    onCtxEdgeResetRouting,
  } = props;

  return (
    <div
      ref={containerRef as React.RefObject<HTMLDivElement>}
      style={{ flex: 1, overflow: 'hidden', position: 'relative', background: t.canvas }}
    >
      <svg
        ref={svgRef as React.RefObject<SVGSVGElement>}
        width="100%"
        height="100%"
        role="application"
        aria-label={`${variantLabel} diagram editor. ${model.nodes.length} ${variantLabel.toLowerCase()}s, ${model.edges.length} connections. Scroll to zoom, drag to pan, click a ${variantLabel.toLowerCase()} to select.`}
        tabIndex={0}
        style={{
          display: 'block',
          cursor: pan ? 'grabbing' : drag ? 'grabbing' : liveEdge ? 'crosshair' : 'default',
          userSelect: 'none',
          outline: 'none',
        }}
        onMouseDown={onSvgMouseDown}
        onMouseMove={onMouseMove}
        onMouseUp={onMouseUp}
        onMouseLeave={onMouseUp}
        onContextMenu={onSvgContextMenu}
      >
        <defs>
          <style>
            {reducedMotion
              ? `
            .edge-flow { stroke-dasharray: 0; }
            .edge-flow-amber { stroke-dasharray: 0; }
            .edge-live { stroke-dasharray: 4 4; }
          `
              : `
            @keyframes edgeFlow { to { stroke-dashoffset: -13; } }
            @keyframes edgeFlowFast { to { stroke-dashoffset: -13; } }
            .edge-flow { stroke-dasharray: 8 5; animation: edgeFlow 0.9s linear infinite; }
            .edge-flow-amber { stroke-dasharray: 6 4; animation: edgeFlowFast 0.65s linear infinite; }
            .edge-live { stroke-dasharray: 7 5; animation: edgeFlow 0.55s linear infinite; }
          `}
          </style>
          <pattern id="dots" width={GRID} height={GRID} patternUnits="userSpaceOnUse">
            <circle cx={GRID / 2} cy={GRID / 2} r={1.1} fill={t.dot} />
          </pattern>
          <filter id="nodeShadow" x="-25%" y="-25%" width="150%" height="160%">
            <feDropShadow dx="0" dy="3" stdDeviation="5" floodColor={shadowClr} floodOpacity="1" />
          </filter>
          <marker
            id="arrowhead"
            markerWidth="9"
            markerHeight="7"
            refX="8"
            refY="3.5"
            orient="auto"
            markerUnits="strokeWidth"
          >
            <path d="M0,0.5 L9,3.5 L0,6.5 L2.2,3.5 Z" fill={arrowClr} />
          </marker>
          <marker
            id="arrowAmber"
            markerWidth="9"
            markerHeight="7"
            refX="8"
            refY="3.5"
            orient="auto"
            markerUnits="strokeWidth"
          >
            <path d="M0,0.5 L9,3.5 L0,6.5 L2.2,3.5 Z" fill={amberArrow} />
          </marker>
          <marker
            id="arrowLive"
            markerWidth="9"
            markerHeight="7"
            refX="8"
            refY="3.5"
            orient="auto"
            markerUnits="strokeWidth"
          >
            <path d="M0,0.5 L9,3.5 L0,6.5 L2.2,3.5 Z" fill={acc.color} />
          </marker>
        </defs>

        <rect width="100%" height="100%" fill="url(#dots)" data-bg="1" />

        <g transform={`translate(${transform.x},${transform.y}) scale(${transform.scale})`}>
          {model.edges.map((e) => (
            <EdgeLine
              key={e.id}
              edge={e}
              nodes={model.nodes}
              variant={variant}
              t={t}
              isDark={isDark}
              acc={acc}
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

          {liveEdge &&
            (() => {
              const d = bezierPath(
                liveEdge.fromX,
                liveEdge.fromY,
                liveEdge.toX,
                liveEdge.toY,
                liveEdge.exitDir,
              );
              return (
                <path
                  d={d}
                  fill="none"
                  stroke={acc.color}
                  strokeWidth={2}
                  strokeLinecap="round"
                  className="edge-live"
                  opacity={0.8}
                  markerEnd="url(#arrowLive)"
                />
              );
            })()}

          {alignGuides?.x && (
            <line
              x1={alignGuides.x.pos}
              x2={alignGuides.x.pos}
              y1={alignGuides.x.minY}
              y2={alignGuides.x.maxY}
              stroke={acc.color}
              strokeWidth={1 / transform.scale}
              strokeDasharray={`${4 / transform.scale} ${3 / transform.scale}`}
              opacity={0.85}
              pointerEvents="none"
            />
          )}
          {alignGuides?.y && (
            <line
              y1={alignGuides.y.pos}
              y2={alignGuides.y.pos}
              x1={alignGuides.y.minX}
              x2={alignGuides.y.maxX}
              stroke={acc.color}
              strokeWidth={1 / transform.scale}
              strokeDasharray={`${4 / transform.scale} ${3 / transform.scale}`}
              opacity={0.85}
              pointerEvents="none"
            />
          )}

          {model.nodes.map((node, idx) => {
            const isHovered = hoveredId === node.id;
            const isQuestion = variant === 'question';
            const { w: nW } = nodeDims(node, variant);
            const isSelected = selectedSet.has(node.id);

            return (
              <g
                key={node.id}
                transform={`translate(${node.x ?? 0},${node.y ?? 0})`}
                role="button"
                tabIndex={0}
                aria-label={`${variantLabel} ${variant === 'journey' ? idx + 1 + ': ' : ''}${node.label}${isSelected ? ', selected' : ''}`}
                style={drag?.nodeId === node.id ? STYLE_NODE_GRABBING : STYLE_NODE_GRAB}
                onMouseDown={(e) => onNodeMouseDown(e, node.id)}
                onMouseUp={(e) => onNodeMouseUp(e, node.id)}
                onDoubleClick={(e) => onNodeDblClick(e, node.id)}
                onContextMenu={(e) => onNodeContextMenu(e, node.id)}
                onMouseEnter={() => setHoveredId(node.id)}
                onMouseLeave={() => setHoveredId(null)}
                onFocus={() => setHoveredId(node.id)}
                onBlur={() => setHoveredId(null)}
                onKeyDown={(e) => {
                  if (e.key === 'F2' || (e.key === 'Enter' && !e.ctrlKey && !e.metaKey)) {
                    e.preventDefault();
                    setEditingId(node.id);
                    setEditLabel(node.label);
                  }
                }}
              >
                <title>{`${variantLabel}: ${node.label}`}</title>
                {isQuestion ? (
                  <QuestionNode
                    node={node}
                    selected={isSelected}
                    edges={model.edges}
                    isDark={isDark}
                    onAnswerPortDown={onAnswerPortDown}
                    qW={nW}
                  />
                ) : (
                  <>
                    <NodeShape
                      node={node}
                      selected={isSelected}
                      variant={variant}
                      stepNumber={variant === 'journey' ? idx + 1 : undefined}
                      t={t}
                      isDark={isDark}
                      w={nW}
                    />
                    {editingId === node.id ? (
                      <foreignObject x={6} y={6} width={nW - 12} height={NODE_H - 12}>
                        <input
                          autoFocus
                          value={editLabel}
                          onChange={(e) => setEditLabel(e.target.value)}
                          onBlur={commitEdit}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') commitEdit();
                            if (e.key === 'Escape') setEditingId(null);
                          }}
                          style={{
                            width: '100%',
                            height: '100%',
                            border: 'none',
                            borderRadius: 6,
                            outline: `2px solid ${acc.color}`,
                            textAlign: 'center',
                            fontSize: 13,
                            fontWeight: 500,
                            background: t.inputBg,
                            boxSizing: 'border-box',
                            padding: '0 6px',
                            fontFamily: 'inherit',
                            color: t.inputText,
                          }}
                        />
                      </foreignObject>
                    ) : (
                      <text
                        x={nW / 2}
                        y={NODE_H / 2 + 5}
                        textAnchor="middle"
                        fontSize={13}
                        fontWeight="500"
                        fontFamily="ui-sans-serif,system-ui,sans-serif"
                        fill={isSelected ? acc.color : t.textPrimary}
                        style={STYLE_LABEL}
                      >
                        {node.label}
                      </text>
                    )}
                    <circle
                      cx={nW / 2}
                      cy={NODE_H + 1}
                      r={portR}
                      fill={acc.color}
                      stroke={isDark ? '#0f172a' : 'white'}
                      strokeWidth={2}
                      style={isHovered || isCoarse ? STYLE_PORT_VISIBLE : STYLE_PORT_HIDDEN}
                      onMouseDown={(e) => onPortMouseDown(e, node.id)}
                    />
                  </>
                )}

                {liveEdge && liveEdge.fromId !== node.id && (
                  <circle
                    cx={nW / 2}
                    cy={-1}
                    r={portR}
                    fill={acc.color}
                    stroke={isDark ? '#0f172a' : 'white'}
                    strokeWidth={2}
                    style={STYLE_LIVE_PORT}
                  />
                )}
              </g>
            );
          })}
        </g>
      </svg>

      {boxSel &&
        Math.abs(boxSel.cx - boxSel.sx) + Math.abs(boxSel.cy - boxSel.sy) > 4 &&
        containerRef.current &&
        (() => {
          const rect = containerRef.current.getBoundingClientRect();
          const left = Math.min(boxSel.sx, boxSel.cx) - rect.left;
          const top = Math.min(boxSel.sy, boxSel.cy) - rect.top;
          const w = Math.abs(boxSel.cx - boxSel.sx);
          const h = Math.abs(boxSel.cy - boxSel.sy);
          return (
            <div
              style={{
                position: 'absolute',
                left,
                top,
                width: w,
                height: h,
                border: `1px dashed ${acc.color}`,
                background: isDark ? 'rgba(99,102,241,0.10)' : 'rgba(99,102,241,0.08)',
                pointerEvents: 'none',
                borderRadius: 4,
              }}
            />
          );
        })()}

      {model.nodes.length === 0 && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            pointerEvents: 'none',
            gap: 8,
          }}
        >
          <div style={{ fontSize: 36, opacity: 0.1, color: t.textPrimary }}>
            {variant === 'question' ? '?' : variant === 'journey' ? '↗' : '⬡'}
          </div>
          <div style={{ fontSize: 13, color: t.textMuted, fontWeight: 500 }}>
            Click <strong style={{ color: acc.color }}>+ {variantLabel}</strong> to start
          </div>
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
            setTransform((tr) => ({
              ...tr,
              x: viewport.w / 2 - cx * tr.scale,
              y: viewport.h / 2 - cy * tr.scale,
            }));
          }}
        />
      )}

      {ctxMenu && (
        <ContextMenu
          x={ctxMenu.x}
          y={ctxMenu.y}
          nodeId={ctxMenu.nodeId}
          edgeId={ctxMenu.edgeId}
          isDark={isDark}
          t={t}
          acc={acc}
          canUndo={history.canUndo}
          canRedo={history.canRedo}
          onUndo={onCtxUndo}
          onRedo={onCtxRedo}
          onReCenter={onCtxReCenter}
          onAddNode={onCtxAddNode}
          onDuplicate={onCtxDuplicate}
          onRename={onCtxRename}
          onDelete={onCtxDelete}
          onDisconnect={onCtxDisconnect}
          currentEdgeStyle={ctxEdgeStyle}
          currentEdgeArrow={ctxEdgeArrow}
          edgeHasWaypoint={ctxEdgeHasWaypoint}
          onEdgeRename={onCtxEdgeRename}
          onEdgeStyle={onCtxEdgeStyle}
          onEdgeArrowhead={onCtxEdgeArrowhead}
          onEdgeDelete={onCtxEdgeDelete}
          onEdgeResetRouting={onCtxEdgeResetRouting}
          containerRef={containerRef}
        />
      )}
    </div>
  );
}
export const DiagramCanvas = React.memo(DiagramCanvasBase);
