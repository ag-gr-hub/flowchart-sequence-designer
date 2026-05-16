import React, { useEffect, useRef, useState } from 'react';
import type { DiagramModel, DiagramNode, DiagramEdge, NodeShape, DiagramVariant } from '../core/types.js';
import type { ThemeColors } from './DiagramEditor.js';

interface AccentColors { color: string; fill: string; border: string; glow: string }

interface StepEditorProps {
  nodeId: string;
  model: DiagramModel;
  onModelChange: (model: DiagramModel) => void;
  variant?: DiagramVariant;
  isDark?: boolean;
  t?: ThemeColors;
  acc?: AccentColors;
}

const SHAPES: { key: NodeShape; label: string; icon: string }[] = [
  { key: 'rectangle', label: 'Box', icon: '▭' },
  { key: 'diamond', label: 'Decision', icon: '◇' },
  { key: 'circle', label: 'Circle', icon: '○' },
  { key: 'parallelogram', label: 'I/O', icon: '▱' },
];

let _edgeSeq = 200;
let _nodeSeq = 200;

export function StepEditor({ nodeId, model, onModelChange, variant = 'flowchart', isDark = false, t, acc }: StepEditorProps) {
  const isQuestion = variant === 'question';
  const branchTerm = isQuestion ? 'Answer' : 'Branch';

  // Fallback colors when used standalone (without DiagramEditor theme)
  const panelBg = t?.panelBg ?? (isDark ? '#1e293b' : '#ffffff');
  const panelBorder = t?.panelBorder ?? (isDark ? '#334155' : '#e2e8f0');
  const sectionBorder = t?.sectionBorder ?? (isDark ? '#0f172a' : '#f1f5f9');
  const inputBg = t?.inputBg ?? (isDark ? '#0f172a' : '#f8fafc');
  const inputBorder = t?.inputBorder ?? (isDark ? '#334155' : '#e2e8f0');
  const inputText = t?.inputText ?? (isDark ? '#e2e8f0' : '#1e293b');
  const cardBg = t?.cardBg ?? (isDark ? '#0f172a' : '#f8fafc');
  const cardBorder = t?.cardBorder ?? (isDark ? '#334155' : '#e2e8f0');
  const labelText = t?.labelText ?? (isDark ? '#475569' : '#94a3b8');
  const textPrimary = t?.textPrimary ?? (isDark ? '#f1f5f9' : '#1e293b');
  const textSecondary = t?.textSecondary ?? (isDark ? '#94a3b8' : '#475569');
  const textMuted = t?.textMuted ?? (isDark ? '#475569' : '#94a3b8');
  const shapeBtnBg = t?.shapeBtnBg ?? (isDark ? '#0f172a' : '#f1f5f9');
  const shapeBtnBorder = t?.shapeBtnBorder ?? (isDark ? '#334155' : '#e2e8f0');
  const btnSecBg = t?.btnSecBg ?? (isDark ? '#334155' : '#e2e8f0');
  const btnSecText = t?.btnSecText ?? (isDark ? '#94a3b8' : '#475569');
  const addFormBg = t?.addFormBg ?? (isDark ? '#1e1b4b' : '#f5f3ff');

  const accentColor = acc?.color ?? (variant === 'question' ? '#d97706' : variant === 'journey' ? '#059669' : '#4f46e5');
  const accentLight = acc?.fill ?? (variant === 'question' ? '#fef3c7' : variant === 'journey' ? '#d1fae5' : '#e0e7ff');
  const accentBorder = acc?.border ?? (variant === 'question' ? '#fcd34d' : variant === 'journey' ? '#6ee7b7' : '#c7d2fe');

  const node = model.nodes.find(n => n.id === nodeId);
  const [label, setLabel] = useState(node?.label ?? '');
  const [addingBranch, setAddingBranch] = useState(false);
  const [branchMode, setBranchMode] = useState<'new' | 'existing'>('new');
  const [branchLabel, setBranchLabel] = useState('');
  const [branchEdgeLabel, setBranchEdgeLabel] = useState('');
  const [branchTarget, setBranchTarget] = useState('');
  const [newAnswer, setNewAnswer] = useState('');
  const [addingAnswer, setAddingAnswer] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setLabel(node?.label ?? '');
    setAddingBranch(false);
    setAddingAnswer(false);
    setBranchLabel(''); setBranchEdgeLabel(''); setBranchTarget(''); setNewAnswer('');
    setTimeout(() => inputRef.current?.focus(), 50);
  }, [nodeId]);

  if (!node) return null;

  const outEdges = model.edges.filter(e => e.from === nodeId);
  const otherNodes = model.nodes.filter(n => n.id !== nodeId);
  const answers: string[] = (node.metadata?.answers as string[] | undefined) ?? [];

  const commitLabel = () => {
    if (label === node.label || !label.trim()) return;
    onModelChange({ ...model, nodes: model.nodes.map(n => n.id === nodeId ? { ...n, label: label.trim() } : n) });
  };

  const setShape = (shape: NodeShape) => {
    onModelChange({ ...model, nodes: model.nodes.map(n => n.id === nodeId ? { ...n, shape } : n) });
  };

  const removeEdge = (edgeId: string) => {
    onModelChange({ ...model, edges: model.edges.filter(e => e.id !== edgeId) });
  };

  const updateEdgeLabel = (edgeId: string, val: string) => {
    onModelChange({ ...model, edges: model.edges.map(e => e.id === edgeId ? { ...e, label: val || undefined } : e) });
  };

  const addBranch = () => {
    if (branchMode === 'new') {
      if (!branchLabel.trim()) return;
      const newId = `node${++_nodeSeq}`;
      const newNode: DiagramNode = { id: newId, label: branchLabel.trim(), shape: 'rectangle', x: (node.x ?? 0) + 200, y: (node.y ?? 0) + 20 + outEdges.length * 100 };
      const newEdge: DiagramEdge = { id: `e${++_edgeSeq}`, from: nodeId, to: newId, label: branchEdgeLabel.trim() || undefined };
      onModelChange({ ...model, nodes: [...model.nodes, newNode], edges: [...model.edges, newEdge] });
    } else {
      if (!branchTarget || model.edges.some(e => e.from === nodeId && e.to === branchTarget)) return;
      const newEdge: DiagramEdge = { id: `e${++_edgeSeq}`, from: nodeId, to: branchTarget, label: branchEdgeLabel.trim() || undefined };
      onModelChange({ ...model, edges: [...model.edges, newEdge] });
    }
    setBranchLabel(''); setBranchEdgeLabel(''); setBranchTarget(''); setAddingBranch(false);
  };

  const addAnswer = () => {
    const trimmed = newAnswer.trim();
    if (!trimmed || answers.includes(trimmed)) return;
    const updated = [...answers, trimmed];
    onModelChange({ ...model, nodes: model.nodes.map(n => n.id === nodeId ? { ...n, metadata: { ...(n.metadata ?? {}), answers: updated } } : n) });
    setNewAnswer(''); setAddingAnswer(false);
  };

  const removeAnswer = (ans: string) => {
    const updated = answers.filter(a => a !== ans);
    const updatedEdges = model.edges.filter(e => !(e.from === nodeId && e.label === ans));
    onModelChange({
      ...model,
      nodes: model.nodes.map(n => n.id === nodeId ? { ...n, metadata: { ...(n.metadata ?? {}), answers: updated } } : n),
      edges: updatedEdges,
    });
  };

  const moveAnswer = (idx: number, dir: -1 | 1) => {
    const next = idx + dir;
    if (next < 0 || next >= answers.length) return;
    const arr = [...answers];
    [arr[idx], arr[next]] = [arr[next], arr[idx]];
    onModelChange({ ...model, nodes: model.nodes.map(n => n.id === nodeId ? { ...n, metadata: { ...(n.metadata ?? {}), answers: arr } } : n) });
  };

  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '7px 10px',
    border: `1.5px solid ${inputBorder}`,
    borderRadius: 8, fontSize: 13, outline: 'none',
    boxSizing: 'border-box', fontFamily: 'inherit',
    color: inputText, background: inputBg,
    transition: 'border-color 0.15s',
  };

  const addBtnStyle: React.CSSProperties = {
    flex: 1, padding: '7px 0', background: accentColor, color: '#fff',
    border: 'none', borderRadius: 7, cursor: 'pointer', fontSize: 12, fontWeight: 600, fontFamily: 'inherit',
  };

  const cancelBtnStyle: React.CSSProperties = {
    padding: '7px 14px', background: btnSecBg, color: btnSecText,
    border: 'none', borderRadius: 7, cursor: 'pointer', fontSize: 12, fontFamily: 'inherit',
  };

  const addTriggerStyle: React.CSSProperties = {
    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
    marginTop: 10, width: '100%', padding: '8px 0', background: 'transparent',
    color: accentColor, border: `1.5px dashed ${accentBorder}`,
    borderRadius: 8, cursor: 'pointer', fontSize: 12, fontWeight: 600, fontFamily: 'inherit',
  };

  return (
    <div style={{ width: 272, minWidth: 272, background: panelBg, borderLeft: `1px solid ${panelBorder}`, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      {/* Header */}
      <div style={{
        padding: '12px 16px', fontWeight: 700, fontSize: 12, letterSpacing: 0.8,
        textTransform: 'uppercase', color: accentColor,
        borderBottom: `1px solid ${accentBorder}`, background: accentLight,
        display: 'flex', alignItems: 'center', gap: 8,
      }}>
        <div style={{ width: 6, height: 6, borderRadius: '50%', background: accentColor }} />
        <span>{isQuestion ? 'Question Editor' : variant === 'journey' ? 'Step Editor' : 'Step Editor'}</span>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
        {/* Name */}
        <section style={{ padding: '14px 16px', borderBottom: `1px solid ${sectionBorder}` }}>
          <label style={{ display: 'block', fontSize: 10, fontWeight: 700, color: labelText, marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.8 }}>Name</label>
          <input
            ref={inputRef}
            value={label}
            onChange={e => setLabel(e.target.value)}
            onBlur={commitLabel}
            onKeyDown={e => e.key === 'Enter' && commitLabel()}
            style={inputStyle}
            placeholder="Step name…"
          />
        </section>

        {/* Shape (hidden for question variant) */}
        {!isQuestion && (
          <section style={{ padding: '14px 16px', borderBottom: `1px solid ${sectionBorder}` }}>
            <label style={{ display: 'block', fontSize: 10, fontWeight: 700, color: labelText, marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.8 }}>Shape</label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
              {SHAPES.map(s => {
                const active = (node.shape ?? 'rectangle') === s.key;
                return (
                  <button key={s.key} onClick={() => setShape(s.key)} style={{
                    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
                    padding: '8px 6px', borderRadius: 8, cursor: 'pointer', transition: 'all 0.15s',
                    background: active ? accentColor : shapeBtnBg,
                    color: active ? '#fff' : textSecondary,
                    border: active ? `1.5px solid ${accentColor}` : `1.5px solid ${shapeBtnBorder}`,
                  }}>
                    <span style={{ fontSize: 16, lineHeight: 1 }}>{s.icon}</span>
                    <span style={{ fontSize: 11, fontWeight: 500 }}>{s.label}</span>
                  </button>
                );
              })}
            </div>
          </section>
        )}

        {/* Question variant: Answers */}
        {isQuestion && (
          <section style={{ padding: '14px 16px', borderBottom: `1px solid ${sectionBorder}`, flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
              <label style={{ display: 'block', fontSize: 10, fontWeight: 700, color: labelText, textTransform: 'uppercase', letterSpacing: 0.8 }}>Answers</label>
              <span style={{ fontSize: 11, color: textMuted, background: isDark ? '#0f172a' : '#f1f5f9', padding: '1px 7px', borderRadius: 99, fontWeight: 600 }}>{answers.length}</span>
            </div>

            {answers.length === 0 && !addingAnswer && (
              <div style={{ fontSize: 12, color: textMuted, textAlign: 'center', padding: '16px 0', fontStyle: 'italic' }}>No answers yet — add one below</div>
            )}

            {answers.map((ans, i) => {
              const connected = model.edges.some(e => e.from === nodeId && e.label === ans);
              const targetNode = model.nodes.find(n => { const e = model.edges.find(ex => ex.from === nodeId && ex.label === ans); return e && n.id === e.to; });
              return (
                <div key={ans + i} style={{ display: 'flex', alignItems: 'flex-start', gap: 0, marginBottom: 8, borderRadius: 10, border: `1.5px solid ${cardBorder}`, overflow: 'hidden', background: cardBg }}>
                  <div style={{ width: 4, alignSelf: 'stretch', background: accentColor, flexShrink: 0 }} />
                  <div style={{ flex: 1, minWidth: 0, padding: '8px 10px' }}>
                    <div style={{ fontSize: 12, fontWeight: 600, color: textPrimary, marginBottom: connected ? 3 : 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{ans}</div>
                    {connected && targetNode && <div style={{ fontSize: 11, color: accentColor, opacity: 0.85 }}>→ {targetNode.label}</div>}
                    {!connected && <div style={{ fontSize: 10, color: textMuted, fontStyle: 'italic' }}>drag port to connect</div>}
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', padding: '4px 2px', gap: 2 }}>
                    <button onClick={() => moveAnswer(i, -1)} disabled={i === 0} style={{ background: 'none', border: 'none', color: textMuted, cursor: 'pointer', fontSize: 11, padding: '2px 4px', opacity: i === 0 ? 0.3 : 1 }}>↑</button>
                    <button onClick={() => moveAnswer(i, 1)} disabled={i === answers.length - 1} style={{ background: 'none', border: 'none', color: textMuted, cursor: 'pointer', fontSize: 11, padding: '2px 4px', opacity: i === answers.length - 1 ? 0.3 : 1 }}>↓</button>
                  </div>
                  <button onClick={() => removeAnswer(ans)} style={{ background: 'none', border: 'none', color: textMuted, cursor: 'pointer', fontSize: 12, padding: '8px 10px', flexShrink: 0 }} title="Remove">✕</button>
                </div>
              );
            })}

            {addingAnswer ? (
              <div style={{ marginTop: 10, background: addFormBg, borderRadius: 10, padding: 12, border: `1.5px solid ${accentBorder}` }}>
                <input autoFocus value={newAnswer} onChange={e => setNewAnswer(e.target.value)} onKeyDown={e => e.key === 'Enter' && addAnswer()} placeholder="Answer text…" style={{ ...inputStyle, marginBottom: 8 }} />
                <div style={{ display: 'flex', gap: 6 }}>
                  <button onClick={addAnswer} style={addBtnStyle}>Add Answer</button>
                  <button onClick={() => { setAddingAnswer(false); setNewAnswer(''); }} style={cancelBtnStyle}>Cancel</button>
                </div>
              </div>
            ) : (
              <button onClick={() => setAddingAnswer(true)} style={addTriggerStyle}>
                <span style={{ fontSize: 16, lineHeight: 1 }}>+</span> Add Answer
              </button>
            )}

            {answers.length > 0 && (
              <div style={{ marginTop: 12, padding: '8px 10px', background: isDark ? 'rgba(251,191,36,0.06)' : '#fef9f0', borderRadius: 8, border: `1px solid ${accentBorder}` }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: accentColor, textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 4 }}>How to connect</div>
                <div style={{ fontSize: 11, color: textSecondary, lineHeight: 1.5 }}>Hover the question node on the canvas — drag an answer's port dot to any other node.</div>
              </div>
            )}
          </section>
        )}

        {/* Non-question: Branches */}
        {!isQuestion && (
          <section style={{ padding: '14px 16px', borderBottom: `1px solid ${sectionBorder}`, flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
              <label style={{ display: 'block', fontSize: 10, fontWeight: 700, color: labelText, textTransform: 'uppercase', letterSpacing: 0.8 }}>Branches</label>
              <span style={{ fontSize: 11, color: textMuted, background: isDark ? '#0f172a' : '#f1f5f9', padding: '1px 7px', borderRadius: 99, fontWeight: 600 }}>{outEdges.length}</span>
            </div>

            {outEdges.length === 0 && !addingBranch && (
              <div style={{ fontSize: 12, color: textMuted, textAlign: 'center', padding: '16px 0', fontStyle: 'italic' }}>No outgoing connections yet</div>
            )}

            {outEdges.map(edge => {
              const target = model.nodes.find(n => n.id === edge.to);
              return (
                <div key={edge.id} style={{ display: 'flex', alignItems: 'flex-start', gap: 0, marginBottom: 8, borderRadius: 10, border: `1.5px solid ${cardBorder}`, overflow: 'hidden', background: cardBg }}>
                  <div style={{ width: 4, alignSelf: 'stretch', background: accentColor, flexShrink: 0 }} />
                  <div style={{ flex: 1, minWidth: 0, padding: '8px 10px' }}>
                    <div style={{ fontSize: 12, fontWeight: 600, color: textPrimary, marginBottom: 5, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>→ {target?.label ?? edge.to}</div>
                    <input value={edge.label ?? ''} onChange={e => updateEdgeLabel(edge.id, e.target.value)} placeholder="Edge label (optional)" style={{ ...inputStyle, fontSize: 11, padding: '4px 8px' }} />
                  </div>
                  <button onClick={() => removeEdge(edge.id)} style={{ background: 'none', border: 'none', color: textMuted, cursor: 'pointer', fontSize: 12, padding: '8px 10px', flexShrink: 0 }} title="Remove">✕</button>
                </div>
              );
            })}

            {addingBranch ? (
              <div style={{ marginTop: 10, background: addFormBg, borderRadius: 10, padding: 12, border: `1.5px solid ${accentBorder}` }}>
                <div style={{ display: 'flex', gap: 6, marginBottom: 10 }}>
                  {(['new', 'existing'] as const).map(mode => (
                    <button key={mode} onClick={() => setBranchMode(mode)} style={{
                      flex: 1, padding: '5px 0', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 11, fontWeight: 600,
                      background: branchMode === mode ? accentColor : btnSecBg,
                      color: branchMode === mode ? '#fff' : btnSecText,
                    }}>
                      {mode === 'new' ? `+ New step` : 'Existing step'}
                    </button>
                  ))}
                </div>
                {branchMode === 'new' ? (
                  <input autoFocus value={branchLabel} onChange={e => setBranchLabel(e.target.value)} onKeyDown={e => e.key === 'Enter' && addBranch()} placeholder="New step name…" style={{ ...inputStyle, marginBottom: 6 }} />
                ) : (
                  <select value={branchTarget} onChange={e => setBranchTarget(e.target.value)} style={{ ...inputStyle, marginBottom: 6, appearance: 'none' }}>
                    <option value="">Choose a step…</option>
                    {otherNodes.map(n => <option key={n.id} value={n.id}>{n.label}</option>)}
                  </select>
                )}
                <input value={branchEdgeLabel} onChange={e => setBranchEdgeLabel(e.target.value)} placeholder="Edge label (optional)" style={{ ...inputStyle, marginBottom: 10 }} />
                <div style={{ display: 'flex', gap: 6 }}>
                  <button onClick={addBranch} style={addBtnStyle}>Add {branchTerm}</button>
                  <button onClick={() => setAddingBranch(false)} style={cancelBtnStyle}>Cancel</button>
                </div>
              </div>
            ) : (
              <button onClick={() => setAddingBranch(true)} style={addTriggerStyle}>
                <span style={{ fontSize: 16, lineHeight: 1 }}>+</span> Add {branchTerm}
              </button>
            )}
          </section>
        )}
      </div>
    </div>
  );
}
