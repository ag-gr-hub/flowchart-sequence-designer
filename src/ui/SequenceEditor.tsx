import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { DiagramModel, SequenceMessage, ExportFormat } from '../core/types.js';
import { Toolbar } from './Toolbar.js';
import { useEditorTheme } from './hooks/useEditorTheme.js';
import { useExporters } from './hooks/useExporters.js';
import { useImporter } from './hooks/useImporter.js';
import { presetSequenceModel } from './presets.js';
import { nextId } from '../core/ids.js';

const INDIGO = '#4f46e5';
const INDIGO_SOFT = '#eef2ff';

/**
 * Color palette for `<SequenceEditor>`. Sequence diagrams use a smaller
 * token set than flowcharts — there are no node shapes to color, but there
 * are `lifeline`, `arrow`, and `actor*` tokens that flowcharts don't need.
 *
 * Token groups:
 * - `canvas` / `dot` — background and dot-grid color.
 * - `panel*` / `ctrls*` / `input*` / `card*` — chrome around the canvas.
 * - `text*` — type ramp (primary > secondary > muted).
 * - `lifeline` — vertical actor lifeline color.
 * - `arrow` — message arrow + label color.
 * - `actorFill` / `actorStroke` / `actorText` — actor header box.
 */
export interface SequenceThemeColors {
  canvas: string; dot: string;
  panelBg: string; panelBorder: string;
  ctrlsBg: string; ctrlsBorder: string;
  inputBg: string; inputBorder: string; inputText: string;
  textPrimary: string; textSecondary: string; textMuted: string;
  cardBg: string; cardBorder: string;
  lifeline: string; arrow: string;
  actorFill: string; actorStroke: string; actorText: string;
}

const lightTheme: SequenceThemeColors = {
  canvas: '#fafbfc',
  dot: '#dbe3ee',
  panelBg: '#ffffff',
  panelBorder: '#e2e8f0',
  ctrlsBg: '#ffffff',
  ctrlsBorder: '#cbd5e1',
  inputBg: '#f8fafc',
  inputBorder: '#e2e8f0',
  inputText: '#1e293b',
  textPrimary: '#1e293b',
  textSecondary: '#475569',
  textMuted: '#94a3b8',
  cardBg: '#ffffff',
  cardBorder: '#e2e8f0',
  lifeline: '#cbd5e1',
  arrow: '#64748b',
  actorFill: '#f5f3ff',
  actorStroke: '#c7d2fe',
  actorText: '#4338ca',
};
const darkTheme: SequenceThemeColors = {
  canvas: '#0f172a',
  dot: '#1e293b',
  panelBg: '#1e293b',
  panelBorder: '#334155',
  ctrlsBg: '#0f172a',
  ctrlsBorder: '#1e293b',
  inputBg: '#0f172a',
  inputBorder: '#334155',
  inputText: '#e2e8f0',
  textPrimary: '#f1f5f9',
  textSecondary: '#94a3b8',
  textMuted: '#475569',
  cardBg: '#0f172a',
  cardBorder: '#334155',
  lifeline: '#334155',
  arrow: '#64748b',
  actorFill: '#1e1b4b',
  actorStroke: 'rgba(99,102,241,0.45)',
  actorText: '#a5b4fc',
};

// Layout
const HEADER_H = 64;       // height of actor box
const HEADER_PAD = 24;     // top padding before headers start
const COL_MIN = 160;       // min column width
const ROW_H = 64;          // vertical spacing per message
const SIDE_PAD = 40;       // left/right padding

/**
 * Props for `<SequenceEditor>`. Mirrors `DiagramEditorProps` minus the
 * flowchart-only `variant` field; the theme override type is the
 * sequence-specific palette.
 *
 * @property initialModel    Initial sequence model. Defaults to
 *                           `presetSequenceModel()` if omitted or if a
 *                           non-sequence model is passed.
 * @property onChange        Fires after every committed mutation.
 * @property onExport        Optional sink for exporter output. If omitted, the
 *                           editor triggers a browser download of `sequence.<ext>`.
 * @property height          Canvas height; accepts CSS units. Defaults to `600`.
 * @property allowedExports  Whitelist of export formats. Defaults to all.
 * @property allowImport     Show the import button. Defaults to `true`.
 * @property theme           `'light'`, `'dark'`, or `'auto'` (follow OS).
 * @property themeOverrides  Per-property overrides on top of the resolved
 *                           sequence palette. `themeOverrides` passed to
 *                           `<DiagramEditor>` is forwarded here when
 *                           `type === 'sequence'`.
 */
export interface SequenceEditorProps {
  initialModel?: DiagramModel;
  onChange?: (model: DiagramModel) => void;
  onExport?: (format: ExportFormat, content: string | Blob) => void;
  height?: number | string;
  allowedExports?: ExportFormat[];
  allowImport?: boolean;
  theme?: 'light' | 'dark' | 'auto';
  themeOverrides?: Partial<SequenceThemeColors>;
}

interface DragState {
  id: string;
  startY: number;       // clientY at mousedown (page-space)
  originalIdx: number;  // index in messages[] at drag start
  targetIdx: number;    // current preview position
  active: boolean;      // true once the cursor moves > DRAG_THRESHOLD
}
const DRAG_THRESHOLD = 5;

function ensureSequenceModel(m?: DiagramModel): DiagramModel {
  if (m && m.type === 'sequence') {
    return { ...m, actors: m.actors ?? [], messages: m.messages ?? [] };
  }
  return presetSequenceModel();
}

/**
 * Sequence-diagram specialization of the editor. Accepts the same props as
 * `<DiagramEditor>` but renders a swim-lane layout with drag-to-reorder
 * messages and inline label editing.
 *
 * @example
 * ```tsx
 * import { SequenceEditor, presetSequenceModel } from 'flowchart-sequence-designer/ui';
 *
 * <SequenceEditor initialModel={presetSequenceModel()} theme="dark" />
 * ```
 */
export function SequenceEditor({
  initialModel, onChange, onExport, height = 600,
  allowedExports, allowImport = true, theme = 'auto',
  themeOverrides,
}: SequenceEditorProps) {
  const [model, setModel] = useState<DiagramModel>(() => ensureSequenceModel(initialModel));
  const [selected, setSelected] = useState<string | null>(null);
  const [drag, setDrag] = useState<DragState | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editLabel, setEditLabel] = useState('');
  const historyRef = useRef<DiagramModel[]>([ensureSequenceModel(initialModel)]);
  const historyIdxRef = useRef(0);
  const svgRef = useRef<SVGSVGElement>(null);

  const { t, isDark } = useEditorTheme(theme, themeOverrides, { light: lightTheme, dark: darkTheme });

  const actors = model.actors ?? [];
  const messages = model.messages ?? [];

  // Column width sized to the longest actor name.
  const colW = useMemo(() => {
    const longest = actors.reduce((m, a) => Math.max(m, a.length), 6);
    return Math.max(COL_MIN, longest * 9 + 40);
  }, [actors]);

  const totalW = SIDE_PAD * 2 + Math.max(1, actors.length) * colW;
  const totalH = HEADER_PAD + HEADER_H + 32 + messages.length * ROW_H + 48;

  const actorX = (name: string) => {
    const idx = actors.indexOf(name);
    if (idx < 0) return SIDE_PAD + colW / 2;
    return SIDE_PAD + idx * colW + colW / 2;
  };
  const msgY = (idx: number) => HEADER_PAD + HEADER_H + 40 + idx * ROW_H;

  const pushHistory = useCallback((m: DiagramModel) => {
    const stack = historyRef.current.slice(0, historyIdxRef.current + 1);
    stack.push(m);
    if (stack.length > 80) stack.shift();
    historyRef.current = stack;
    historyIdxRef.current = stack.length - 1;
  }, []);

  const applyAndPush = useCallback((m: DiagramModel) => {
    setModel(m); onChange?.(m); pushHistory(m);
  }, [onChange, pushHistory]);

  const undo = useCallback(() => {
    if (historyIdxRef.current <= 0) return;
    historyIdxRef.current--;
    const m = historyRef.current[historyIdxRef.current];
    setModel(m); onChange?.(m);
  }, [onChange]);

  const redo = useCallback(() => {
    if (historyIdxRef.current >= historyRef.current.length - 1) return;
    historyIdxRef.current++;
    const m = historyRef.current[historyIdxRef.current];
    setModel(m); onChange?.(m);
  }, [onChange]);

  const addActor = () => {
    const name = `Actor${actors.length + 1}`;
    applyAndPush({ ...model, actors: [...actors, name] });
  };

  const renameActor = (oldName: string, newName: string) => {
    if (!newName || newName === oldName || actors.includes(newName)) return;
    applyAndPush({
      ...model,
      actors: actors.map(a => a === oldName ? newName : a),
      messages: messages.map(m => ({
        ...m,
        from: m.from === oldName ? newName : m.from,
        to: m.to === oldName ? newName : m.to,
      })),
    });
  };

  const removeActor = (name: string) => {
    applyAndPush({
      ...model,
      actors: actors.filter(a => a !== name),
      messages: messages.filter(m => m.from !== name && m.to !== name),
    });
  };

  const addMessage = () => {
    if (actors.length < 1) {
      // Need at least one actor; create a sensible default pair.
      const a = `Actor${actors.length + 1}`;
      const b = `Actor${actors.length + 2}`;
      applyAndPush({
        ...model,
        actors: [...actors, a, b],
        messages: [...messages, { id: nextId('m', messages), from: a, to: b, label: 'message', style: 'solid' }],
      });
      return;
    }
    const from = actors[0];
    const to = actors[Math.min(1, actors.length - 1)] ?? from;
    applyAndPush({
      ...model,
      messages: [...messages, { id: nextId('m', messages), from, to, label: 'message', style: 'solid' }],
    });
  };

  const updateMessage = (id: string, patch: Partial<SequenceMessage>) => {
    applyAndPush({
      ...model,
      messages: messages.map(m => m.id === id ? { ...m, ...patch } : m),
    });
  };

  const removeMessage = (id: string) => {
    applyAndPush({ ...model, messages: messages.filter(m => m.id !== id) });
    if (selected === id) setSelected(null);
  };

  const reorderMessage = useCallback((id: string, toIdx: number) => {
    const fromIdx = messages.findIndex(m => m.id === id);
    if (fromIdx < 0 || toIdx === fromIdx) return;
    const next = messages.slice();
    const [moved] = next.splice(fromIdx, 1);
    next.splice(toIdx, 0, moved);
    applyAndPush({ ...model, messages: next });
  }, [messages, model, applyAndPush]);

  // ── Keyboard ────────────────────────────────────────────────────────────
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tgt = e.target as HTMLElement | null;
      if (tgt && (tgt.tagName === 'INPUT' || tgt.tagName === 'TEXTAREA' || tgt.isContentEditable)) return;
      const ctrl = e.ctrlKey || e.metaKey;
      if (ctrl && e.key === 'z') { e.preventDefault(); undo(); return; }
      if (ctrl && (e.key === 'y' || (e.shiftKey && e.key === 'z'))) { e.preventDefault(); redo(); return; }
      if (e.key === 'Escape') { setSelected(null); setEditingId(null); return; }
      if ((e.key === 'Delete' || e.key === 'Backspace') && selected) {
        e.preventDefault();
        removeMessage(selected);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [undo, redo, selected]);

  // ── Export / import ─────────────────────────────────────────────────────
  const handleExport = useExporters(model, onExport, 'sequence');
  const handleImport = useImporter(applyAndPush, {
    expectedType: 'sequence',
    transform: ensureSequenceModel,
  });

  // ── Drag-to-reorder ─────────────────────────────────────────────────────
  // Mousedown seeds drag state but does NOT mark it active — that flips on
  // first move past DRAG_THRESHOLD so a click doesn't reorder. We mutate the
  // model exactly once on mouseup; intermediate moves only update preview
  // state, so the history stack stays clean and rows can't cascade.
  const onRowMouseDown = (e: React.MouseEvent, id: string) => {
    const tag = (e.target as HTMLElement).tagName;
    if (tag === 'INPUT' || tag === 'BUTTON' || tag === 'SELECT') return;
    const idx = messages.findIndex(m => m.id === id);
    if (idx < 0) return;
    e.preventDefault();
    setSelected(id);
    setDrag({ id, startY: e.clientY, originalIdx: idx, targetIdx: idx, active: false });
  };

  useEffect(() => {
    if (!drag) return;
    const baseY = HEADER_PAD + HEADER_H + 40;
    const onMove = (ev: MouseEvent) => {
      const dy = ev.clientY - drag.startY;
      if (!drag.active && Math.abs(dy) < DRAG_THRESHOLD) return;
      const svg = svgRef.current;
      if (!svg) return;
      const rect = svg.getBoundingClientRect();
      const yInSvg = ev.clientY - rect.top;
      const raw = Math.floor((yInSvg - baseY + ROW_H / 2) / ROW_H);
      const next = Math.max(0, Math.min(messages.length - 1, raw));
      if (next === drag.targetIdx && drag.active) return;
      setDrag({ ...drag, active: true, targetIdx: next });
    };
    const onUp = () => {
      if (drag.active && drag.targetIdx !== drag.originalIdx) {
        reorderMessage(drag.id, drag.targetIdx);
      }
      setDrag(null);
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
  }, [drag, messages.length, reorderMessage]);

  // Visual order during a drag: messages stay in model order, only the
  // dragged row is virtually relocated. Real array isn't touched until mouseup.
  const visualMessages = useMemo(() => {
    if (!drag?.active) return messages;
    const idx = messages.findIndex(m => m.id === drag.id);
    if (idx < 0) return messages;
    const next = messages.slice();
    const [moved] = next.splice(idx, 1);
    next.splice(drag.targetIdx, 0, moved);
    return next;
  }, [messages, drag]);

  // ── Render ──────────────────────────────────────────────────────────────
  const selectedMsg = selected ? messages.find(m => m.id === selected) : null;

  return (
    <div style={{
      display: 'flex', flexDirection: 'column', height, width: '100%',
      fontFamily: 'ui-sans-serif,system-ui,sans-serif', background: t.ctrlsBg,
    }}>
      <Toolbar onExport={handleExport} onImport={allowImport ? handleImport : undefined} allowedExports={allowedExports} allowImport={allowImport} />

      {/* Controls */}
      <div style={{
        display: 'flex', gap: 8, padding: '7px 14px',
        background: t.ctrlsBg, borderBottom: `1px solid ${t.ctrlsBorder}`,
        alignItems: 'center', flexWrap: 'wrap',
      }}>
        <button onClick={addActor} style={primaryBtn()}>+ Actor</button>
        <button onClick={addMessage} style={primaryBtn()}>+ Message</button>
        <div style={{ width: 1, height: 18, background: t.ctrlsBorder, margin: '0 4px' }} />
        <button onClick={undo} style={ghostBtn(t)} title="Undo (Ctrl+Z)">↶</button>
        <button onClick={redo} style={ghostBtn(t)} title="Redo (Ctrl+Y)">↷</button>
        <span style={{ marginLeft: 'auto', fontSize: 11, color: t.textMuted }}>
          {actors.length} actor{actors.length === 1 ? '' : 's'} · {messages.length} message{messages.length === 1 ? '' : 's'} · drag a row to reorder
        </span>
      </div>

      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
        {/* Canvas */}
        <div style={{ flex: 1, overflow: 'auto', background: t.canvas, position: 'relative' }}>
          {actors.length === 0 && messages.length === 0 ? (
            <div style={{
              position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column',
              alignItems: 'center', justifyContent: 'center', gap: 10,
              color: t.textMuted, pointerEvents: 'none',
            }}>
              <div style={{ fontSize: 36, opacity: 0.15, color: t.textPrimary }}>↔</div>
              <div style={{ fontSize: 13, fontWeight: 500 }}>
                Click <strong style={{ color: INDIGO }}>+ Actor</strong> then <strong style={{ color: INDIGO }}>+ Message</strong> to start
              </div>
            </div>
          ) : (
            <svg
              ref={svgRef}
              width={totalW} height={totalH}
              style={{ display: 'block', cursor: drag?.active ? 'grabbing' : 'default', userSelect: 'none' }}
            >
              <defs>
                <pattern id="seqdots" x="0" y="0" width="24" height="24" patternUnits="userSpaceOnUse">
                  <circle cx={12} cy={12} r={1.1} fill={t.dot} />
                </pattern>
                <filter id="seqShadow" x="-20%" y="-20%" width="140%" height="140%">
                  <feDropShadow dx={0} dy={3} stdDeviation={5} floodColor={isDark ? 'rgba(0,0,0,0.5)' : 'rgba(15,23,42,0.09)'} />
                </filter>
                <marker id="seqArrow" markerWidth={9} markerHeight={7} refX={8.5} refY={3.5} orient="auto" markerUnits="strokeWidth">
                  <path d="M0,0.5 L9,3.5 L0,6.5 L2.2,3.5 Z" fill={t.arrow} />
                </marker>
              </defs>

              <rect width={totalW} height={totalH} fill="url(#seqdots)" />

              {/* Lifelines */}
              {actors.map(name => {
                const x = actorX(name);
                const top = HEADER_PAD + HEADER_H;
                return (
                  <line
                    key={`life-${name}`}
                    x1={x} x2={x}
                    y1={top + 4} y2={totalH - 24}
                    stroke={t.lifeline} strokeWidth={1.25} strokeDasharray="5 5"
                  />
                );
              })}

              {/* Messages (arrows + label rows) — rendered in visual order
                  so the dragged row previews its new slot without mutating
                  the underlying messages array until the user releases. */}
              {visualMessages.map((msg, idx) => {
                const y = msgY(idx);
                const fromX = actorX(msg.from);
                const toX = actorX(msg.to);
                const selectedHere = selected === msg.id;
                const isDragging = drag?.active && drag.id === msg.id;
                const isSelf = msg.from === msg.to;
                const stroke = selectedHere ? INDIGO : t.arrow;
                const dash = msg.style === 'dashed' ? '6,4' : undefined;
                const cursor = drag?.active ? 'grabbing' : 'grab';
                const groupOpacity = isDragging ? 0.85 : 1;

                if (isSelf) {
                  const startX = fromX;
                  const loopW = 36;
                  const loopY = y - 6;
                  const d = `M ${startX} ${loopY} C ${startX + loopW} ${loopY}, ${startX + loopW} ${loopY + 24}, ${startX} ${loopY + 24}`;
                  return (
                    <g key={msg.id} onMouseDown={(e) => onRowMouseDown(e, msg.id)} style={{ cursor, opacity: groupOpacity }}>
                      {(selectedHere || isDragging) && (
                        <rect x={SIDE_PAD - 8} y={y - 22} width={totalW - (SIDE_PAD - 8) * 2} height={ROW_H - 12} rx={10}
                          fill={INDIGO_SOFT} opacity={isDark ? 0.18 : 0.6} />
                      )}
                      <path d={d} fill="none" stroke={stroke} strokeWidth={1.5} strokeDasharray={dash} markerEnd="url(#seqArrow)" />
                      <text x={startX + loopW + 8} y={loopY + 16} fontSize={11} fill={selectedHere ? INDIGO : t.textPrimary} fontWeight={500}>
                        {msg.label}
                      </text>
                    </g>
                  );
                }

                const labelX = (fromX + toX) / 2;
                return (
                  <g key={msg.id} onMouseDown={(e) => onRowMouseDown(e, msg.id)} style={{ cursor, opacity: groupOpacity }}>
                    {(selectedHere || isDragging) && (
                      <rect x={SIDE_PAD - 8} y={y - 22} width={totalW - (SIDE_PAD - 8) * 2} height={ROW_H - 12} rx={10}
                        fill={INDIGO_SOFT} opacity={isDark ? 0.18 : 0.6} />
                    )}
                    <line x1={fromX} y1={y} x2={toX} y2={y} stroke={stroke} strokeWidth={1.5} strokeDasharray={dash} markerEnd="url(#seqArrow)" />
                    <rect x={labelX - estimateW(msg.label) / 2 - 6} y={y - 18} width={estimateW(msg.label) + 12} height={18} rx={6}
                      fill={t.canvas} stroke={selectedHere ? INDIGO : t.cardBorder} strokeWidth={selectedHere ? 1.25 : 1} />
                    <text x={labelX} y={y - 5} textAnchor="middle" fontSize={11} fill={selectedHere ? INDIGO : t.textPrimary} fontWeight={500}>
                      {msg.label}
                    </text>
                  </g>
                );
              })}

              {/* Actor headers (rendered last so they overlay lifelines cleanly) */}
              {actors.map(name => {
                const x = actorX(name);
                const w = colW - 24;
                return (
                  <g key={`hdr-${name}`}>
                    <rect x={x - w / 2} y={HEADER_PAD} width={w} height={HEADER_H} rx={12}
                      fill={t.actorFill} stroke={t.actorStroke} strokeWidth={1.25} filter="url(#seqShadow)" />
                    {editingId === name ? (
                      <foreignObject x={x - w / 2 + 8} y={HEADER_PAD + 16} width={w - 16} height={32}>
                        <input
                          autoFocus
                          defaultValue={name}
                          onBlur={(e) => { renameActor(name, e.currentTarget.value.trim()); setEditingId(null); }}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') { renameActor(name, (e.target as HTMLInputElement).value.trim()); setEditingId(null); }
                            if (e.key === 'Escape') setEditingId(null);
                          }}
                          style={{
                            width: '100%', height: '100%', border: 'none', borderRadius: 6,
                            outline: `2px solid ${INDIGO}`, textAlign: 'center', fontSize: 13,
                            fontWeight: 600, background: t.inputBg, color: t.inputText,
                            boxSizing: 'border-box', padding: '0 6px', fontFamily: 'inherit',
                          }}
                        />
                      </foreignObject>
                    ) : (
                      <text
                        x={x} y={HEADER_PAD + HEADER_H / 2 + 4} textAnchor="middle"
                        fontSize={13} fontWeight={700} fill={t.actorText}
                        style={{ cursor: 'pointer', userSelect: 'none' }}
                        onDoubleClick={() => setEditingId(name)}
                      >
                        {name}
                      </text>
                    )}
                    <circle
                      cx={x + w / 2 - 12} cy={HEADER_PAD + 14} r={9}
                      fill="transparent"
                      style={{ cursor: 'pointer' }}
                      onClick={() => removeActor(name)}
                    >
                      <title>Remove actor</title>
                    </circle>
                    <text x={x + w / 2 - 12} y={HEADER_PAD + 18} textAnchor="middle" fontSize={12}
                      fill={t.textMuted} style={{ pointerEvents: 'none', userSelect: 'none' }}>×</text>
                  </g>
                );
              })}
            </svg>
          )}
        </div>

        {/* Side panel */}
        {selectedMsg && (
          <div style={{
            width: 280, flexShrink: 0,
            background: t.panelBg, borderLeft: `1px solid ${t.panelBorder}`,
            padding: '14px 16px', overflowY: 'auto',
          }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: t.textMuted, textTransform: 'uppercase', letterSpacing: 0.7, marginBottom: 10 }}>Message</div>

            <Label t={t}>Label</Label>
            <input
              value={editLabel || selectedMsg.label}
              onChange={(e) => setEditLabel(e.target.value)}
              onFocus={() => setEditLabel(selectedMsg.label)}
              onBlur={() => { if (editLabel && editLabel !== selectedMsg.label) updateMessage(selectedMsg.id, { label: editLabel }); setEditLabel(''); }}
              onKeyDown={(e) => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur(); }}
              style={input(t)}
            />

            <Label t={t}>From</Label>
            <select value={selectedMsg.from} onChange={(e) => updateMessage(selectedMsg.id, { from: e.target.value })} style={input(t)}>
              {actors.map(a => <option key={a} value={a}>{a}</option>)}
            </select>

            <Label t={t}>To</Label>
            <select value={selectedMsg.to} onChange={(e) => updateMessage(selectedMsg.id, { to: e.target.value })} style={input(t)}>
              {actors.map(a => <option key={a} value={a}>{a}</option>)}
            </select>

            <Label t={t}>Style</Label>
            <div style={{ display: 'flex', gap: 6 }}>
              {(['solid', 'dashed'] as const).map(s => (
                <button
                  key={s}
                  onClick={() => updateMessage(selectedMsg.id, { style: s })}
                  style={{
                    flex: 1, padding: '6px 10px',
                    border: `1.5px solid ${selectedMsg.style === s || (!selectedMsg.style && s === 'solid') ? INDIGO : t.inputBorder}`,
                    background: selectedMsg.style === s || (!selectedMsg.style && s === 'solid') ? INDIGO_SOFT : t.inputBg,
                    color: selectedMsg.style === s || (!selectedMsg.style && s === 'solid') ? INDIGO : t.textPrimary,
                    borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
                  }}
                >
                  {s === 'solid' ? '── solid' : '─ ─ dashed'}
                </button>
              ))}
            </div>

            <div style={{ height: 14 }} />
            <button
              onClick={() => removeMessage(selectedMsg.id)}
              style={{ ...ghostBtn(t), width: '100%', color: '#ef4444', border: `1px solid ${isDark ? '#7f1d1d' : '#fca5a5'}` }}
            >Delete message</button>
          </div>
        )}
      </div>

      <div style={{
        padding: '4px 14px', fontSize: 11, color: t.textMuted, background: t.canvas,
        borderTop: `1px solid ${t.ctrlsBorder}`, display: 'flex', gap: 16,
      }}>
        <span>{actors.length} actors</span>
        <span>{messages.length} messages</span>
        <span style={{ marginLeft: 'auto' }}>double-click actor to rename · drag a row to reorder</span>
      </div>
    </div>
  );
}

function estimateW(text: string, pxPerChar = 7): number {
  return text.length * pxPerChar;
}

function primaryBtn(): React.CSSProperties {
  return {
    padding: '6px 12px', background: INDIGO, color: '#fff', border: 'none',
    borderRadius: 8, cursor: 'pointer', fontSize: 12, fontWeight: 600, fontFamily: 'inherit',
  };
}
function ghostBtn(t: typeof lightTheme): React.CSSProperties {
  return {
    padding: '5px 10px', background: 'transparent', color: t.textSecondary,
    border: `1px solid ${t.ctrlsBorder}`, borderRadius: 7, cursor: 'pointer',
    fontSize: 12, fontWeight: 500, fontFamily: 'inherit',
  };
}
function input(t: typeof lightTheme): React.CSSProperties {
  return {
    width: '100%', boxSizing: 'border-box', padding: '6px 10px',
    border: `1.5px solid ${t.inputBorder}`, borderRadius: 7,
    background: t.inputBg, color: t.inputText, fontSize: 12,
    fontFamily: 'inherit', outline: 'none', marginBottom: 12,
  };
}

function Label({ t, children }: { t: typeof lightTheme; children: React.ReactNode }) {
  return (
    <div style={{ fontSize: 10, fontWeight: 700, color: t.textMuted, textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 4 }}>
      {children}
    </div>
  );
}

