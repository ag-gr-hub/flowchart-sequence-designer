import React, { useMemo } from 'react';
import type { DiagramModel, SequenceMessage } from '../core/types.js';
import type { SequenceThemeColors } from './SequenceEditor.js';
import { shadowColor as themeShadow } from './theme.js';

// Layout constants (mirrored from SequenceEditor for now — shared reference).
const HEADER_H = 64;
const HEADER_PAD = 24;
const ROW_H = 64;
const SIDE_PAD = 40;

const INDIGO = '#4f46e5';
const INDIGO_SOFT = '#eef2ff';

// Hoisted static styles.
const STYLE_SEQ_GRAB: React.CSSProperties = { cursor: 'grab' };
const STYLE_SEQ_GRABBING: React.CSSProperties = { cursor: 'grabbing' };
const STYLE_SEQ_ACTOR_TEXT: React.CSSProperties = { cursor: 'pointer', userSelect: 'none' };
const STYLE_SEQ_REMOVE_BTN: React.CSSProperties = { cursor: 'pointer' };
const STYLE_SEQ_REMOVE_ICON: React.CSSProperties = { pointerEvents: 'none', userSelect: 'none' };
const STYLE_SEQ_DRAGGING: React.CSSProperties = { opacity: 0.85 };

interface DragState {
  id: string;
  startY: number;
  originalIdx: number;
  targetIdx: number;
  active: boolean;
}

export interface SequenceCanvasProps {
  model: DiagramModel;
  actors: string[];
  messages: SequenceMessage[];
  t: SequenceThemeColors;
  isDark: boolean;
  colW: number;
  totalW: number;
  totalH: number;
  actorX: (name: string) => number;
  msgY: (idx: number) => number;
  // Selection / editing
  selected: string | null;
  editingId: string | null;
  setEditingId: (id: string | null) => void;
  // Drag
  drag: DragState | null;
  onRowMouseDown: (e: React.MouseEvent, id: string) => void;
  // Actor actions
  renameActor: (oldName: string, newName: string) => void;
  removeActor: (name: string) => void;
  // Ref
  svgRef: React.RefObject<SVGSVGElement | null>;
}

function estimateW(text: string, pxPerChar = 7): number {
  return text.length * pxPerChar;
}

/**
 * SVG canvas layer of the sequence editor — lifelines, message arrows,
 * actor headers, and the dot-grid background. Extracted from
 * `SequenceEditor` so the orchestrator focuses on state + handlers.
 */
export function SequenceCanvas(props: SequenceCanvasProps) {
  const {
    model: _model,
    actors,
    messages,
    t,
    isDark,
    colW,
    totalW,
    totalH,
    actorX,
    msgY,
    selected,
    editingId,
    setEditingId,
    drag,
    onRowMouseDown,
    renameActor,
    removeActor,
    svgRef,
  } = props;

  // Visual order during a drag: the dragged row is virtually relocated.
  const visualMessages = useMemo(() => {
    if (!drag?.active) return messages;
    const idx = messages.findIndex((m) => m.id === drag.id);
    if (idx < 0) return messages;
    const next = messages.slice();
    const [moved] = next.splice(idx, 1);
    next.splice(drag.targetIdx, 0, moved!);
    return next;
  }, [messages, drag]);

  if (actors.length === 0 && messages.length === 0) {
    return (
      <div
        style={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 10,
          color: t.textMuted,
          pointerEvents: 'none',
        }}
      >
        <div style={{ fontSize: 36, opacity: 0.15, color: t.textPrimary }}>↔</div>
        <div style={{ fontSize: 13, fontWeight: 500 }}>
          Click <strong style={{ color: INDIGO }}>+ Actor</strong> then{' '}
          <strong style={{ color: INDIGO }}>+ Message</strong> to start
        </div>
      </div>
    );
  }

  return (
    <svg
      ref={svgRef as React.RefObject<SVGSVGElement>}
      width={totalW}
      height={totalH}
      style={{
        display: 'block',
        cursor: drag?.active ? 'grabbing' : 'default',
        userSelect: 'none',
      }}
    >
      <defs>
        <pattern id="seqdots" x="0" y="0" width="24" height="24" patternUnits="userSpaceOnUse">
          <circle cx={12} cy={12} r={1.1} fill={t.dot} />
        </pattern>
        <filter id="seqShadow" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx={0} dy={3} stdDeviation={5} floodColor={themeShadow(isDark)} />
        </filter>
        <marker
          id="seqArrow"
          markerWidth={9}
          markerHeight={7}
          refX={8.5}
          refY={3.5}
          orient="auto"
          markerUnits="strokeWidth"
        >
          <path d="M0,0.5 L9,3.5 L0,6.5 L2.2,3.5 Z" fill={t.arrow} />
        </marker>
      </defs>

      <rect width={totalW} height={totalH} fill="url(#seqdots)" />

      {/* Lifelines */}
      {actors.map((name) => {
        const x = actorX(name);
        const top = HEADER_PAD + HEADER_H;
        return (
          <line
            key={`life-${name}`}
            x1={x}
            x2={x}
            y1={top + 4}
            y2={totalH - 24}
            stroke={t.lifeline}
            strokeWidth={1.25}
            strokeDasharray="5 5"
          />
        );
      })}

      {/* Messages */}
      {visualMessages.map((msg, idx) => {
        const y = msgY(idx);
        const fromX = actorX(msg.from);
        const toX = actorX(msg.to);
        const selectedHere = selected === msg.id;
        const isDragging = drag?.active && drag.id === msg.id;
        const isSelf = msg.from === msg.to;
        const stroke = selectedHere ? INDIGO : t.arrow;
        const dash = msg.style === 'dashed' ? '6,4' : undefined;
        const cursorStyle = drag?.active ? STYLE_SEQ_GRABBING : STYLE_SEQ_GRAB;
        const groupStyle = isDragging ? { ...cursorStyle, ...STYLE_SEQ_DRAGGING } : cursorStyle;

        if (isSelf) {
          const startX = fromX;
          const loopW = 36;
          const loopY = y - 6;
          const d = `M ${startX} ${loopY} C ${startX + loopW} ${loopY}, ${startX + loopW} ${loopY + 24}, ${startX} ${loopY + 24}`;
          return (
            <g key={msg.id} onMouseDown={(e) => onRowMouseDown(e, msg.id)} style={groupStyle}>
              {(selectedHere || isDragging) && (
                <rect
                  x={SIDE_PAD - 8}
                  y={y - 22}
                  width={totalW - (SIDE_PAD - 8) * 2}
                  height={ROW_H - 12}
                  rx={10}
                  fill={INDIGO_SOFT}
                  opacity={isDark ? 0.18 : 0.6}
                />
              )}
              <path
                d={d}
                fill="none"
                stroke={stroke}
                strokeWidth={1.5}
                strokeDasharray={dash}
                markerEnd="url(#seqArrow)"
              />
              <text
                x={startX + loopW + 8}
                y={loopY + 16}
                fontSize={11}
                fill={selectedHere ? INDIGO : t.textPrimary}
                fontWeight={500}
              >
                {msg.label}
              </text>
            </g>
          );
        }

        const labelX = (fromX + toX) / 2;
        return (
          <g key={msg.id} onMouseDown={(e) => onRowMouseDown(e, msg.id)} style={groupStyle}>
            {(selectedHere || isDragging) && (
              <rect
                x={SIDE_PAD - 8}
                y={y - 22}
                width={totalW - (SIDE_PAD - 8) * 2}
                height={ROW_H - 12}
                rx={10}
                fill={INDIGO_SOFT}
                opacity={isDark ? 0.18 : 0.6}
              />
            )}
            <line
              x1={fromX}
              y1={y}
              x2={toX}
              y2={y}
              stroke={stroke}
              strokeWidth={1.5}
              strokeDasharray={dash}
              markerEnd="url(#seqArrow)"
            />
            <rect
              x={labelX - estimateW(msg.label) / 2 - 6}
              y={y - 18}
              width={estimateW(msg.label) + 12}
              height={18}
              rx={6}
              fill={t.canvas}
              stroke={selectedHere ? INDIGO : t.cardBorder}
              strokeWidth={selectedHere ? 1.25 : 1}
            />
            <text
              x={labelX}
              y={y - 5}
              textAnchor="middle"
              fontSize={11}
              fill={selectedHere ? INDIGO : t.textPrimary}
              fontWeight={500}
            >
              {msg.label}
            </text>
          </g>
        );
      })}

      {/* Actor headers */}
      {actors.map((name) => {
        const x = actorX(name);
        const w = colW - 24;
        return (
          <g key={`hdr-${name}`}>
            <rect
              x={x - w / 2}
              y={HEADER_PAD}
              width={w}
              height={HEADER_H}
              rx={12}
              fill={t.actorFill}
              stroke={t.actorStroke}
              strokeWidth={1.25}
              filter="url(#seqShadow)"
            />
            {editingId === name ? (
              <foreignObject x={x - w / 2 + 8} y={HEADER_PAD + 16} width={w - 16} height={32}>
                <input
                  autoFocus
                  defaultValue={name}
                  onBlur={(e) => {
                    renameActor(name, e.currentTarget.value.trim());
                    setEditingId(null);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      renameActor(name, (e.target as HTMLInputElement).value.trim());
                      setEditingId(null);
                    }
                    if (e.key === 'Escape') setEditingId(null);
                  }}
                  style={{
                    width: '100%',
                    height: '100%',
                    border: 'none',
                    borderRadius: 6,
                    outline: `2px solid ${INDIGO}`,
                    textAlign: 'center',
                    fontSize: 13,
                    fontWeight: 600,
                    background: t.inputBg,
                    color: t.inputText,
                    boxSizing: 'border-box',
                    padding: '0 6px',
                    fontFamily: 'inherit',
                  }}
                />
              </foreignObject>
            ) : (
              <text
                x={x}
                y={HEADER_PAD + HEADER_H / 2 + 4}
                textAnchor="middle"
                fontSize={13}
                fontWeight={700}
                fill={t.actorText}
                role="button"
                tabIndex={0}
                aria-label={`Actor ${name} — press Enter or F2 to rename`}
                style={STYLE_SEQ_ACTOR_TEXT}
                onDoubleClick={() => setEditingId(name)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === 'F2') {
                    e.preventDefault();
                    setEditingId(name);
                  }
                }}
              >
                {name}
              </text>
            )}
            <circle
              cx={x + w / 2 - 12}
              cy={HEADER_PAD + 14}
              r={9}
              fill="transparent"
              role="button"
              tabIndex={0}
              aria-label={`Remove actor ${name}`}
              style={STYLE_SEQ_REMOVE_BTN}
              onClick={() => removeActor(name)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  removeActor(name);
                }
              }}
            >
              <title>Remove actor {name}</title>
            </circle>
            <text
              x={x + w / 2 - 12}
              y={HEADER_PAD + 18}
              textAnchor="middle"
              fontSize={12}
              fill={t.textMuted}
              style={STYLE_SEQ_REMOVE_ICON}
            >
              ×
            </text>
          </g>
        );
      })}
    </svg>
  );
}
