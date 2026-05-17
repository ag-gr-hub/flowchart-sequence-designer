import React, { useState } from 'react';
import type { DiagramNode, DiagramEdge, DiagramVariant } from '../core/types.js';
import {
  NODE_H,
  Q_BASE_H,
  Q_ANS_ROW_H,
  Q_CARD_PAD,
  estimateTextW,
  nodeWidth,
  answerCardW,
  questionNodeW,
  questionNodeH,
  bezierPath,
  bezierPathVia,
} from './layout.js';
import { ACCENT as C, variantAccent, type ThemeColors } from './theme.js';

// ── Standard node shape ────────────────────────────────────────────────────
export function NodeShape({ node, selected, variant, stepNumber, t, isDark, w }: {
  node: DiagramNode; selected: boolean; variant: DiagramVariant;
  stepNumber?: number; t: ThemeColors; isDark: boolean; w: number;
}) {
  const acc = variantAccent(variant, isDark);
  const cx = w / 2, cy = NODE_H / 2;
  const stroke = selected ? acc.color : t.nodeStroke;
  const fill = selected ? t.nodeSelectedFill : t.nodeFill;
  const sw = selected ? 1.75 : 1.25;

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

export function QuestionNode({ node, selected, edges, isDark, onAnswerPortDown, qW }: {
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

  const portRowY = Q_BASE_H + Q_ANS_ROW_H - 8;

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
      <rect width={qW} height={totalH} rx={14} fill={nodeBg} stroke={nodeBorder} strokeWidth={selected ? 2 : 1.5} filter="url(#nodeShadow)" />
      <clipPath id={`qhdr-${node.id}`}>
        <rect width={qW} height={Q_BASE_H} rx={14} />
      </clipPath>
      <rect width={qW} height={Q_BASE_H} fill={amberSoft} clipPath={`url(#qhdr-${node.id})`} />
      <rect x={0} y={0} width={4} height={Q_BASE_H} rx={2} fill={amber} />
      <rect x={12} y={14} width={28} height={28} rx={8} fill={amber} />
      <text x={26} y={33} textAnchor="middle" fontSize={15} fontWeight="900" fill="white" style={{ pointerEvents: 'none', userSelect: 'none' }}>?</text>
      <text style={{ pointerEvents: 'none', userSelect: 'none' }}
        fontFamily="ui-sans-serif,system-ui,sans-serif">
        <tspan x={50} y={27} fontSize={9} fontWeight={700} fill={textSub} letterSpacing={0.6} textAnchor="start">QUESTION</tspan>
        <tspan x={50} dy={15} fontSize={13} fontWeight={700} fill={selected ? amber : textMain} textAnchor="start">
          {node.label}
        </tspan>
      </text>
      <line x1={0} y1={Q_BASE_H} x2={qW} y2={Q_BASE_H} stroke={amberLine} strokeWidth={1} />
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
            <rect x={cardX} y={cardY} width={cW} height={cardH} rx={8}
              fill={connected ? cardBgConnected : cardBg}
              stroke={connected ? amber : cardBorder} strokeWidth={connected ? 1.5 : 1} />
            <rect x={cx - 11} y={cardY + 7} width={22} height={22} rx={6}
              fill={connected ? amber : (isDark ? '#1e293b' : '#fef3c7')} />
            <text x={cx} y={cardY + 22} textAnchor="middle" fontSize={10} fontWeight={800}
              fill={connected ? '#fff' : amber}
              style={{ pointerEvents: 'none', userSelect: 'none' }}>
              {letter}
            </text>
            <text x={cx} y={cardY + 46} textAnchor="middle" fontSize={11} fontWeight={500}
              fill={connected ? (isDark ? '#fef3c7' : '#92400e') : textAns}
              fontFamily="ui-sans-serif,system-ui,sans-serif"
              style={{ pointerEvents: 'none', userSelect: 'none' }}>
              {displayAns}
            </text>
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
export function EdgeLine({ edge, nodes, variant, t, isDark, acc, editing, editValue, onEditChange, onEditCommit, onEditCancel, onDoubleClick, onContextMenu, onWaypointDown }: {
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
  onWaypointDown?: (e: React.MouseEvent, edgeId: string) => void;
}) {
  const [hovered, setHovered] = useState(false);
  const from = nodes.find(n => n.id === edge.from);
  const to = nodes.find(n => n.id === edge.to);
  if (!from || !to) return null;

  let x1: number, y1: number, exitDir: 'bottom' | 'right' | 'left' = 'bottom';
  const amberColor = isDark ? C.amberDark : C.amber;

  if (variant === 'question') {
    const answers: string[] = (from.metadata?.answers as string[] | undefined) ?? [];
    const idx = answers.indexOf(edge.label ?? '');
    if (idx >= 0) {
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
  const wp = edge.waypoint;
  const d = wp ? bezierPathVia(x1, y1, wp.x, wp.y, x2, y2) : bezierPath(x1, y1, x2, y2, exitDir);
  // Handle position: at the waypoint when set; otherwise at the natural midpoint of the cubic.
  const hx = wp ? wp.x : (x1 + x2) / 2;
  const hy = wp ? wp.y : (y1 + y2) / 2;
  const mx = hx, my = hy - 8;
  const dash = edge.style === 'dashed' ? '7 4' : edge.style === 'dotted' ? '2 4' : undefined;
  const edgeClr = variant === 'question' ? amberColor : t.edgeColor;

  const isAmber = variant === 'question';
  const labelW = edge.label ? Math.max(60, Math.ceil(estimateTextW(edge.label, 7) + 18)) : 60;
  const showHandle = !!onWaypointDown && (hovered || !!wp);
  // The `edge-flow` / `edge-flow-amber` classes apply an animated flowing
  // dasharray for solid edges. When the user explicitly picks `dashed` or
  // `dotted`, honor that pattern statically — the animation would override
  // it and confuse the chosen meaning.
  const flowClass = dash ? undefined : isAmber ? 'edge-flow-amber' : 'edge-flow';
  return (
    <g
      onDoubleClick={(e) => { e.stopPropagation(); onDoubleClick?.(edge.id); }}
      onContextMenu={(e) => { onContextMenu?.(e, edge.id); }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <path d={d} fill="none" stroke="transparent" strokeWidth={14} style={{ cursor: 'pointer' }} />
      <path
        d={d} fill="none" stroke={edgeClr}
        strokeWidth={isAmber ? 2 : 1.5}
        strokeLinecap="round"
        className={flowClass}
        strokeDasharray={dash}
        markerEnd={isAmber ? 'url(#arrowAmber)' : 'url(#arrowhead)'}
        opacity={isAmber ? 0.85 : 0.9}
        style={{ pointerEvents: 'none' }}
      />
      {showHandle && (
        <circle
          cx={hx} cy={hy} r={wp ? 5 : 4}
          fill={wp ? acc.color : (isDark ? '#1e293b' : '#fff')}
          stroke={acc.color} strokeWidth={1.5}
          style={{ cursor: 'grab', filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.25))' }}
          onMouseDown={(e) => { e.stopPropagation(); onWaypointDown?.(e, edge.id); }}
        />
      )}
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
