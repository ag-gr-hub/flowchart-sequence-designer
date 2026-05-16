import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Toolbar } from './Toolbar.js';
import { StepEditor } from './StepEditor.js';
import { SequenceEditor } from './SequenceEditor.js';
import { Minimap } from './Minimap.js';
import { useHistory } from './hooks/useHistory.js';
import { useIsDark, usePrefersReducedMotion } from './hooks/useSystemTheme.js';
import {
  NODE_H,
  Q_BASE_H,
  Q_ANS_ROW_H,
  GRID,
  Q_CARD_PAD,
  estimateTextW,
  nodeWidth,
  answerCardW,
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

// ── Standard node shape ────────────────────────────────────────────────────
function NodeShape({ node, selected, variant, stepNumber, t, isDark, w }: {
  node: DiagramNode; selected: boolean; variant: DiagramVariant;
  stepNumber?: number; t: ThemeColors; isDark: boolean; w: number;
}) {
  const acc = variantAccent(variant, isDark);
  const cx = w / 2, cy = NODE_H / 2;
  const stroke = selected ? acc.color : t.nodeStroke;
  const fill = selected ? t.nodeSelectedFill : t.nodeFill;
  const sw = selected ? 1.75 : 1.25;

  // Selected: soft outer halo (blurred stroke) + crisp inner ring
  const glow = selected && (
    <>
      {node.shape === 'circle' ? (
        <>
          <circle cx={cx} cy={cy} r={NODE_H / 2 + 3} fill="none" stroke={acc.color} strokeWidth={6} opacity={0.18} style={{ filter: 'blur(4px)' }} />
          <circle cx={cx} cy={cy} r={NODE_H / 2 + 1.5} fill="none" stroke={acc.color} strokeWidth={1} opacity={0.55} />
        </>
      ) : node.shape === 'diamond' ? (
        <>
          <polygon points={`${cx},${-5} ${w + 5},${cy} ${cx},${NODE_H + 5} ${-5},${cy}`}
            fill="none" stroke={acc.color} strokeWidth={6} opacity={0.18} style={{ filter: 'blur(4px)' }} />
          <polygon points={`${cx},${-2} ${w + 2},${cy} ${cx},${NODE_H + 2} ${-2},${cy}`}
            fill="none" stroke={acc.color} strokeWidth={1} opacity={0.55} />
        </>
      ) : (
        <>
          <rect x={-4} y={-4} width={w + 8} height={NODE_H + 8} rx={18}
            fill="none" stroke={acc.color} strokeWidth={6} opacity={0.18} style={{ filter: 'blur(4px)' }} />
          <rect x={-1.5} y={-1.5} width={w + 3} height={NODE_H + 3} rx={15.5}
            fill="none" stroke={acc.color} strokeWidth={1} opacity={0.5} />
        </>
      )}
    </>
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
      const pts = `${cx},0 ${w},${cy} ${cx},${NODE_H} 0,${cy}`;
      return <>{glow}<polygon points={pts} fill={fill} stroke={stroke} strokeWidth={sw} filter="url(#nodeShadow)" />{badge}</>;
    }
    case 'circle':
      return <>{glow}<circle cx={cx} cy={cy} r={NODE_H / 2 - 1} fill={fill} stroke={stroke} strokeWidth={sw} filter="url(#nodeShadow)" />{badge}</>;
    case 'parallelogram':
      return <>{glow}<polygon points={`14,0 ${w},0 ${w - 14},${NODE_H} 0,${NODE_H}`} fill={fill} stroke={stroke} strokeWidth={sw} filter="url(#nodeShadow)" />{badge}</>;
    default:
      return <>{glow}<rect width={w} height={NODE_H} rx={14} fill={fill} stroke={stroke} strokeWidth={sw} filter="url(#nodeShadow)" />{badge}</>;
  }
}

// ── Question node ──────────────────────────────────────────────────────────
const ANSWER_LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';

function QuestionNode({ node, selected, edges, isDark, onAnswerPortDown, qW }: {
  node: DiagramNode; selected: boolean; edges: DiagramEdge[];
  isDark: boolean; qW: number;
  onAnswerPortDown: (e: React.MouseEvent, nodeId: string, answer: string, portX: number, portY: number) => void;
}) {
  const answers: string[] = (node.metadata?.answers as string[] | undefined) ?? [];
  const totalH = questionNodeH(answers);
  const amber = isDark ? C.amberDark : C.amber;
  const amberSoft = isDark ? 'rgba(251,191,36,0.14)' : '#fef9ee';
  const amberLine = isDark ? 'rgba(251,191,36,0.18)' : '#fde68a';
  const nodeBg = isDark ? '#1e293b' : '#ffffff';
  const nodeBorder = selected ? amber : (isDark ? 'rgba(251,191,36,0.25)' : '#fde68a');
  const cardBg = isDark ? '#0f172a' : '#fffdf7';
  const cardBgConnected = isDark ? 'rgba(251,191,36,0.12)' : '#fef3c7';
  const cardBorder = isDark ? '#1e293b' : '#fde68a';
  const textMain = isDark ? '#f1f5f9' : '#1e293b';
  const textSub = isDark ? '#64748b' : '#94a3b8';
  const textAns = isDark ? '#cbd5e1' : '#374151';

  // Port row y (bottom of answer section, shared by all cards)
  const portRowY = Q_BASE_H + Q_ANS_ROW_H - 8;

  // Selected: soft outer halo + crisp inner ring (matches NodeShape treatment)
  const glow = selected && (
    <>
      <rect x={-4} y={-4} width={qW + 8} height={totalH + 8} rx={18}
        fill="none" stroke={amber} strokeWidth={6} opacity={0.2}
        style={{ filter: 'blur(4px)' }} />
      <rect x={-1.5} y={-1.5} width={qW + 3} height={totalH + 3} rx={15.5}
        fill="none" stroke={amber} strokeWidth={1} opacity={0.55} />
    </>
  );

  return (
    <>
      {glow}

      {/* Card body */}
      <rect width={qW} height={totalH} rx={14} fill={nodeBg} stroke={nodeBorder} strokeWidth={selected ? 2 : 1.5} filter="url(#nodeShadow)" />

      {/* Header tinted zone */}
      <clipPath id={`qhdr-${node.id}`}>
        <rect width={qW} height={Q_BASE_H} rx={14} />
      </clipPath>
      <rect width={qW} height={Q_BASE_H} fill={amberSoft} clipPath={`url(#qhdr-${node.id})`} />

      {/* Amber left accent bar */}
      <rect x={0} y={0} width={4} height={Q_BASE_H} rx={2} fill={amber} />

      {/* "?" badge */}
      <rect x={12} y={14} width={28} height={28} rx={8} fill={amber} />
      <text x={26} y={33} textAnchor="middle" fontSize={15} fontWeight="900" fill="white" style={{ pointerEvents: 'none', userSelect: 'none' }}>?</text>

      {/* Question label */}
      <text style={{ pointerEvents: 'none', userSelect: 'none' }}
        fontFamily="ui-sans-serif,system-ui,sans-serif">
        <tspan x={50} y={27} fontSize={9} fontWeight={700} fill={textSub} letterSpacing={0.6} textAnchor="start">QUESTION</tspan>
        <tspan x={50} dy={15} fontSize={13} fontWeight={700} fill={selected ? amber : textMain} textAnchor="start">
          {node.label}
        </tspan>
      </text>

      {/* Divider */}
      <line x1={0} y1={Q_BASE_H} x2={qW} y2={Q_BASE_H} stroke={amberLine} strokeWidth={1} />

      {/* Empty state */}
      {answers.length === 0 && (
        <>
          <text x={qW / 2} y={Q_BASE_H + 22} textAnchor="middle" fontSize={10} fill={amber} opacity={0.4} fontWeight={600} style={{ pointerEvents: 'none', userSelect: 'none' }}>
            No answers yet
          </text>
          <text x={qW / 2} y={Q_BASE_H + 36} textAnchor="middle" fontSize={9} fill={textSub} opacity={0.7} style={{ pointerEvents: 'none', userSelect: 'none' }}>
            Open panel → Add Answer
          </text>
        </>
      )}

      {/* Answer cards — side by side in one row */}
      {answers.map((ans, i) => {
        const prevW = answers.slice(0, i).reduce((s, a) => s + answerCardW(a) + Q_CARD_PAD, 0);
        const cW = answerCardW(ans);
        const cardX = Q_CARD_PAD + prevW;
        const cardY = Q_BASE_H + 7;
        const cardH = Q_ANS_ROW_H - 20;
        const cx = cardX + cW / 2;
        const connected = edges.some(e => e.from === node.id && e.label === ans);
        const letter = i < 26 ? ANSWER_LETTERS[i] : `${i + 1}`;
        const maxChars = Math.max(2, Math.floor((cW - 20) / 7.5));
        const displayAns = ans.length > maxChars ? ans.slice(0, maxChars - 1) + '…' : ans;

        return (
          <g key={ans + i}>
            {/* Card */}
            <rect x={cardX} y={cardY} width={cW} height={cardH} rx={8}
              fill={connected ? cardBgConnected : cardBg}
              stroke={connected ? amber : cardBorder} strokeWidth={connected ? 1.5 : 1} />

            {/* Letter badge — top center */}
            <rect x={cx - 11} y={cardY + 7} width={22} height={22} rx={6}
              fill={connected ? amber : (isDark ? '#1e293b' : '#fef3c7')} />
            <text x={cx} y={cardY + 22} textAnchor="middle" fontSize={10} fontWeight={800}
              fill={connected ? '#fff' : amber}
              style={{ pointerEvents: 'none', userSelect: 'none' }}>
              {letter}
            </text>

            {/* Answer text — below badge, centered */}
            <text x={cx} y={cardY + 46} textAnchor="middle" fontSize={11} fontWeight={500}
              fill={connected ? (isDark ? '#fef3c7' : '#92400e') : textAns}
              fontFamily="ui-sans-serif,system-ui,sans-serif"
              style={{ pointerEvents: 'none', userSelect: 'none' }}>
              {displayAns}
            </text>

            {/* Port nub — bottom center of this card */}
            <circle
              cx={cx} cy={portRowY} r={7}
              fill={connected ? amber : (isDark ? '#0f172a' : '#fff')}
              stroke={amber} strokeWidth={1.5}
              style={{ cursor: 'crosshair', filter: 'drop-shadow(0 1px 3px rgba(0,0,0,0.18))' }}
              onMouseDown={e => onAnswerPortDown(e, node.id, ans, cx, portRowY)}
            />
            <path
              d={`M ${cx - 3} ${portRowY - 2} L ${cx} ${portRowY + 2} L ${cx + 3} ${portRowY - 2}`}
              fill="none" stroke={connected ? '#fff' : amber} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round"
              style={{ pointerEvents: 'none' }}
            />
          </g>
        );
      })}
    </>
  );
}

// ── Edge ───────────────────────────────────────────────────────────────────
function EdgeLine({ edge, nodes, variant, t, isDark, acc, editing, editValue, onEditChange, onEditCommit, onEditCancel, onDoubleClick, onContextMenu }: {
  edge: DiagramEdge; nodes: DiagramNode[]; variant: DiagramVariant;
  t: ThemeColors; isDark: boolean;
  acc: { color: string };
  editing?: boolean;
  editValue?: string;
  onEditChange?: (v: string) => void;
  onEditCommit?: () => void;
  onEditCancel?: () => void;
  onDoubleClick?: (edgeId: string) => void;
  onContextMenu?: (e: React.MouseEvent, edgeId: string) => void;
}) {
  const from = nodes.find(n => n.id === edge.from);
  const to = nodes.find(n => n.id === edge.to);
  if (!from || !to) return null;

  let x1: number, y1: number, exitDir: 'bottom' | 'right' | 'left' = 'bottom';
  const amberColor = isDark ? C.amberDark : C.amber;

  if (variant === 'question') {
    const answers: string[] = (from.metadata?.answers as string[] | undefined) ?? [];
    const idx = answers.indexOf(edge.label ?? '');
    if (idx >= 0) {
      // x = left edge of cards + sum of previous card widths + gaps + half this card's width
      const prevW = answers.slice(0, idx).reduce((s, a) => s + answerCardW(a) + Q_CARD_PAD, 0);
      const cW = answerCardW(answers[idx]);
      x1 = (from.x ?? 0) + Q_CARD_PAD + prevW + cW / 2;
      y1 = (from.y ?? 0) + Q_BASE_H + Q_ANS_ROW_H - 8;
      exitDir = 'bottom';
    } else {
      const fqW = questionNodeW(from);
      x1 = (from.x ?? 0) + fqW / 2;
      y1 = (from.y ?? 0) + questionNodeH(answers);
    }
  } else {
    const fnW = nodeWidth(from.label);
    x1 = (from.x ?? 0) + fnW / 2;
    y1 = (from.y ?? 0) + NODE_H;
  }

  const toW = variant === 'question' ? questionNodeW(to) : nodeWidth(to.label);
  const x2 = (to.x ?? 0) + toW / 2;
  const y2 = to.y ?? 0;
  const d = bezierPath(x1, y1, x2, y2, exitDir);
  const mx = (x1 + x2) / 2, my = (y1 + y2) / 2 - 8;
  const dash = edge.style === 'dashed' ? '7,4' : edge.style === 'dotted' ? '2,4' : undefined;
  const edgeClr = variant === 'question' ? amberColor : t.edgeColor;

  const isAmber = variant === 'question';
  const labelW = edge.label ? Math.max(60, Math.ceil(estimateTextW(edge.label, 7) + 18)) : 60;
  void dash; // dash style currently overridden by edge-flow animation class
  return (
    <g
      onDoubleClick={(e) => { e.stopPropagation(); onDoubleClick?.(edge.id); }}
      onContextMenu={(e) => { onContextMenu?.(e, edge.id); }}
    >
      {/* Wider transparent hit area */}
      <path d={d} fill="none" stroke="transparent" strokeWidth={14} style={{ cursor: 'pointer' }} />
      {/* Animated flowing dash line */}
      <path
        d={d} fill="none" stroke={edgeClr}
        strokeWidth={isAmber ? 2 : 1.5}
        strokeLinecap="round"
        className={isAmber ? 'edge-flow-amber' : 'edge-flow'}
        markerEnd={isAmber ? 'url(#arrowAmber)' : 'url(#arrowhead)'}
        opacity={isAmber ? 0.85 : 0.9}
        style={{ pointerEvents: 'none' }}
      />
      {editing && !isAmber ? (
        <foreignObject x={mx - labelW / 2} y={my - 12} width={labelW} height={22}>
          <input
            // @ts-ignore
            xmlns="http://www.w3.org/1999/xhtml" autoFocus
            value={editValue ?? ''}
            onChange={(e) => onEditChange?.(e.target.value)}
            onBlur={() => onEditCommit?.()}
            onKeyDown={(e) => {
              if (e.key === 'Enter') { e.preventDefault(); onEditCommit?.(); }
              if (e.key === 'Escape') { e.preventDefault(); onEditCancel?.(); }
            }}
            onMouseDown={(e) => e.stopPropagation()}
            style={{
              width: '100%', height: '100%', border: 'none', borderRadius: 6,
              outline: `2px solid ${acc.color}`,
              textAlign: 'center', fontSize: 10, fontWeight: 500,
              background: t.inputBg, color: t.inputText,
              boxSizing: 'border-box', padding: '0 6px', fontFamily: 'inherit',
            }}
          />
        </foreignObject>
      ) : edge.label && !isAmber ? (
        <>
          <rect x={mx - labelW / 2} y={my - 11} width={labelW} height={19} rx={5}
            fill={t.panelBg} stroke={t.cardBorder} strokeWidth={1}
            style={{ cursor: 'text' }} />
          <text x={mx} y={my + 4} textAnchor="middle" fontSize={10} fill={t.textSecondary}
            fontFamily="ui-sans-serif,system-ui,sans-serif" fontWeight="500"
            style={{ pointerEvents: 'none', userSelect: 'none' }}>{edge.label}</text>
        </>
      ) : null}
    </g>
  );
}

// ── Node Navigator ─────────────────────────────────────────────────────────
interface NodeNavigatorProps {
  model: DiagramModel;
  selected: string | null;
  variant: DiagramVariant;
  isDark: boolean;
  t: ThemeColors;
  acc: { color: string; fill: string; border: string };
  open: boolean;
  onToggle(): void;
  onSelect(nodeId: string): void;
}

function NodeNavigator({ model, selected, variant, isDark, t, acc, open, onToggle, onSelect }: NodeNavigatorProps) {
  const [search, setSearch] = useState('');

  const shapeIcon = (node: DiagramNode) => {
    if (variant === 'question') return '?';
    if (variant === 'journey') return '↗';
    switch (node.shape) {
      case 'diamond': return '◇';
      case 'circle': return '○';
      case 'parallelogram': return '▱';
      default: return '▭';
    }
  };

  const filtered = model.nodes.filter(n =>
    n.label.toLowerCase().includes(search.toLowerCase())
  );

  const inEdges = (id: string) => model.edges.filter(e => e.to === id).length;
  const outEdges = (id: string) => model.edges.filter(e => e.from === id).length;

  if (!open) {
    return (
      <div style={{
        width: 36, flexShrink: 0,
        background: t.panelBg, borderRight: `1px solid ${t.panelBorder}`,
        display: 'flex', flexDirection: 'column', alignItems: 'center', paddingTop: 8, gap: 6,
      }}>
        <button
          onClick={onToggle}
          title="Open node list"
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: t.textMuted, padding: 6, borderRadius: 6, fontSize: 14, lineHeight: 1 }}
        >☰</button>
        <div style={{ fontSize: 10, color: t.textMuted, fontWeight: 700, writingMode: 'vertical-rl', transform: 'rotate(180deg)', letterSpacing: 0.5 }}>
          {model.nodes.length}
        </div>
      </div>
    );
  }

  return (
    <div style={{
      width: 216, flexShrink: 0,
      background: t.panelBg, borderRight: `1px solid ${t.panelBorder}`,
      display: 'flex', flexDirection: 'column', overflow: 'hidden',
    }}>
      {/* Header */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '10px 12px', borderBottom: `1px solid ${t.panelBorder}`, flexShrink: 0,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ fontSize: 11, fontWeight: 700, color: t.textSecondary, textTransform: 'uppercase', letterSpacing: 0.7 }}>
            {variant === 'question' ? 'Questions' : variant === 'journey' ? 'Steps' : 'Nodes'}
          </span>
          <span style={{
            fontSize: 10, fontWeight: 700, color: t.textMuted,
            background: isDark ? '#0f172a' : '#f1f5f9',
            padding: '1px 6px', borderRadius: 99,
          }}>{model.nodes.length}</span>
        </div>
        <button
          onClick={onToggle}
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: t.textMuted, padding: '2px 4px', borderRadius: 4, fontSize: 13, lineHeight: 1 }}
          title="Collapse"
        >‹</button>
      </div>

      {/* Search */}
      <div style={{ padding: '8px 10px', borderBottom: `1px solid ${t.sectionBorder}`, flexShrink: 0 }}>
        <div style={{ position: 'relative' }}>
          <span style={{ position: 'absolute', left: 8, top: '50%', transform: 'translateY(-50%)', fontSize: 11, color: t.textMuted, pointerEvents: 'none' }}>⌕</span>
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search…"
            style={{
              width: '100%', padding: '5px 8px 5px 24px',
              border: `1.5px solid ${t.inputBorder}`, borderRadius: 7,
              fontSize: 12, background: t.inputBg, color: t.inputText,
              outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit',
            }}
          />
        </div>
      </div>

      {/* Node list */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '6px 8px', display: 'flex', flexDirection: 'column', gap: 2 }}>
        {filtered.length === 0 && (
          <div style={{ textAlign: 'center', padding: '20px 0', fontSize: 12, color: t.textMuted, fontStyle: 'italic' }}>
            {model.nodes.length === 0 ? 'No nodes yet' : 'No matches'}
          </div>
        )}
        {filtered.map((node, idx) => {
          const isSelected = selected === node.id;
          const answers = (node.metadata?.answers as string[] | undefined) ?? [];
          return (
            <button
              key={node.id}
              onClick={() => onSelect(node.id)}
              style={{
                display: 'flex', alignItems: 'center', gap: 8,
                width: '100%', padding: '7px 8px', textAlign: 'left',
                background: isSelected ? acc.fill : 'transparent',
                border: isSelected ? `1.5px solid ${acc.border}` : '1.5px solid transparent',
                borderRadius: 8, cursor: 'pointer', fontFamily: 'inherit',
                transition: 'background 0.1s',
              }}
              onMouseEnter={e => { if (!isSelected) (e.currentTarget as HTMLElement).style.background = isDark ? '#334155' : '#f1f5f9'; }}
              onMouseLeave={e => { if (!isSelected) (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
            >
              {/* Shape/number badge */}
              <div style={{
                width: 22, height: 22, borderRadius: 6, flexShrink: 0,
                background: isSelected ? acc.color : (isDark ? '#334155' : '#e2e8f0'),
                color: isSelected ? '#fff' : t.textMuted,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: variant === 'journey' ? 9 : 11, fontWeight: 700,
              }}>
                {variant === 'journey' ? idx + 1 : shapeIcon(node)}
              </div>

              {/* Label + meta */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{
                  fontSize: 12, fontWeight: isSelected ? 600 : 400,
                  color: isSelected ? acc.color : t.textPrimary,
                  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                  lineHeight: 1.3,
                }}>{node.label}</div>
                <div style={{ fontSize: 10, color: t.textMuted, lineHeight: 1.2, marginTop: 1 }}>
                  {variant === 'question'
                    ? `${answers.length} answer${answers.length !== 1 ? 's' : ''}`
                    : `${inEdges(node.id)}↓ ${outEdges(node.id)}→`}
                </div>
              </div>

              {/* Jump arrow */}
              {isSelected && <span style={{ fontSize: 10, color: acc.color, flexShrink: 0 }}>◉</span>}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ── Context menu ───────────────────────────────────────────────────────────
interface CtxMenuProps {
  x: number; y: number; nodeId: string | null; edgeId?: string | null;
  isDark: boolean; t: ThemeColors; acc: { color: string };
  canUndo: boolean; canRedo: boolean;
  onUndo(): void; onRedo(): void; onReCenter(): void; onAddNode(): void;
  onDuplicate(): void; onRename(): void; onDelete(): void; onDisconnect(): void;
  onEdgeRename?(): void;
  onEdgeStyle?(style: 'solid' | 'dashed' | 'dotted'): void;
  onEdgeArrowhead?(arrow: 'arrow' | 'none'): void;
  onEdgeDelete?(): void;
  currentEdgeStyle?: 'solid' | 'dashed' | 'dotted';
  currentEdgeArrow?: 'arrow' | 'none' | 'open';
  containerRef: React.RefObject<HTMLDivElement | null>;
}

function ContextMenu({ x, y, nodeId, edgeId, isDark, t, acc, canUndo, canRedo, onUndo, onRedo, onReCenter, onAddNode, onDuplicate, onRename, onDelete, onDisconnect, onEdgeRename, onEdgeStyle, onEdgeArrowhead, onEdgeDelete, currentEdgeStyle, currentEdgeArrow, containerRef }: CtxMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState({ x, y });

  useEffect(() => {
    if (!menuRef.current || !containerRef.current) return;
    const m = menuRef.current.getBoundingClientRect();
    const c = containerRef.current.getBoundingClientRect();
    let nx = x, ny = y;
    if (nx + m.width > c.right - 8) nx = x - m.width;
    if (ny + m.height > c.bottom - 8) ny = y - m.height;
    setPos({ x: nx, y: ny });
  }, [x, y, containerRef]);

  const bg = isDark ? '#1e293b' : '#ffffff';
  const border = isDark ? '#334155' : '#e2e8f0';
  const hoverBg = isDark ? '#334155' : '#f1f5f9';
  const dividerColor = isDark ? '#334155' : '#f1f5f9';
  const text = t.textPrimary;
  const muted = t.textMuted;

  const item = (label: string, onClick: () => void, color?: string, disabled?: boolean): React.ReactNode => (
    <button
      key={label}
      onClick={disabled ? undefined : onClick}
      style={{
        display: 'flex', alignItems: 'center', gap: 10,
        width: '100%', padding: '7px 14px', background: 'none', border: 'none',
        textAlign: 'left', cursor: disabled ? 'default' : 'pointer',
        fontSize: 12, fontFamily: 'ui-sans-serif,system-ui,sans-serif',
        color: disabled ? muted : (color ?? text),
        opacity: disabled ? 0.4 : 1,
        borderRadius: 6,
      }}
      onMouseEnter={e => { if (!disabled) (e.currentTarget as HTMLElement).style.background = hoverBg; }}
      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'none'; }}
    >
      {label}
    </button>
  );

  const divider = <div style={{ height: 1, background: dividerColor, margin: '4px 0' }} />;

  return (
    <div
      ref={menuRef}
      onMouseDown={e => e.stopPropagation()}
      style={{
        position: 'fixed', left: pos.x, top: pos.y, zIndex: 9999,
        background: bg, border: `1px solid ${border}`,
        borderRadius: 10, padding: '5px 0', minWidth: 180,
        boxShadow: isDark ? '0 8px 32px rgba(0,0,0,0.5)' : '0 8px 32px rgba(0,0,0,0.12)',
        fontFamily: 'ui-sans-serif,system-ui,sans-serif',
      }}
    >
      {edgeId ? (
        <>
          <div style={{ padding: '4px 14px 6px', fontSize: 10, fontWeight: 700, color: muted, textTransform: 'uppercase', letterSpacing: 0.8 }}>Edge</div>
          {item('Rename label (dbl-click)', () => onEdgeRename?.())}
          {divider}
          <div style={{ padding: '4px 14px 2px', fontSize: 9, fontWeight: 700, color: muted, textTransform: 'uppercase', letterSpacing: 0.8 }}>Style</div>
          {item(`Solid${currentEdgeStyle === 'solid' || !currentEdgeStyle ? ' ✓' : ''}`, () => onEdgeStyle?.('solid'))}
          {item(`Dashed${currentEdgeStyle === 'dashed' ? ' ✓' : ''}`, () => onEdgeStyle?.('dashed'))}
          {item(`Dotted${currentEdgeStyle === 'dotted' ? ' ✓' : ''}`, () => onEdgeStyle?.('dotted'))}
          {divider}
          <div style={{ padding: '4px 14px 2px', fontSize: 9, fontWeight: 700, color: muted, textTransform: 'uppercase', letterSpacing: 0.8 }}>Arrowhead</div>
          {item(`Arrow${currentEdgeArrow !== 'none' ? ' ✓' : ''}`, () => onEdgeArrowhead?.('arrow'))}
          {item(`None${currentEdgeArrow === 'none' ? ' ✓' : ''}`, () => onEdgeArrowhead?.('none'))}
          {divider}
          {item('Delete edge', () => onEdgeDelete?.(), '#ef4444')}
        </>
      ) : nodeId ? (
        <>
          <div style={{ padding: '4px 14px 6px', fontSize: 10, fontWeight: 700, color: muted, textTransform: 'uppercase', letterSpacing: 0.8 }}>Node</div>
          {item('Rename (dbl-click)', onRename)}
          {item('Duplicate', onDuplicate)}
          {item('Disconnect all edges', onDisconnect)}
          {divider}
          {item('Delete node', onDelete, '#ef4444')}
        </>
      ) : (
        <>
          <div style={{ padding: '4px 14px 6px', fontSize: 10, fontWeight: 700, color: muted, textTransform: 'uppercase', letterSpacing: 0.8 }}>Canvas</div>
          {item('Add node here', onAddNode, acc.color)}
          {item('Re-center (Ctrl+0)', onReCenter)}
          {divider}
          {item('Undo (Ctrl+Z)', onUndo, undefined, !canUndo)}
          {item('Redo (Ctrl+Y)', onRedo, undefined, !canRedo)}
        </>
      )}
    </div>
  );
}

let _nodeSeq = 0;
let _edgeSeq = 0;

interface CtxMenu {
  x: number; y: number;             // screen position
  nodeId: string | null;            // set = node right-click
  edgeId?: string | null;           // set = edge right-click
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
