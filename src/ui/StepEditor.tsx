import React, { useEffect, useRef, useState } from 'react';
import type { DiagramModel, DiagramNode, DiagramEdge, NodeShape, DiagramVariant } from '../core/types.js';

interface StepEditorProps {
  nodeId: string;
  model: DiagramModel;
  onModelChange: (model: DiagramModel) => void;
  variant?: DiagramVariant;
}

const SHAPES: { key: NodeShape; label: string; icon: string }[] = [
  { key: 'rectangle', label: 'Box', icon: '▭' },
  { key: 'diamond', label: 'Decision', icon: '◇' },
  { key: 'circle', label: 'Circle', icon: '○' },
  { key: 'parallelogram', label: 'I/O', icon: '▱' },
];

const C = {
  indigo: '#4f46e5',
  indigoMid: '#6366f1',
  indigoLight: '#e0e7ff',
  slate100: '#f1f5f9',
  slate200: '#e2e8f0',
  slate300: '#cbd5e1',
  slate400: '#94a3b8',
  slate600: '#475569',
  slate700: '#334155',
  slate800: '#1e293b',
  red: '#ef4444',
  redLight: '#fee2e2',
};

let _edgeSeq = 200;
let _nodeSeq = 200;

export function StepEditor({ nodeId, model, onModelChange, variant = 'flowchart' }: StepEditorProps) {
  const isQuestion = variant === 'question';
  const branchTerm = isQuestion ? 'Answer' : 'Branch';
  const branchesLabel = isQuestion ? 'Answers' : 'Branches';
  const edgeLabelHint = isQuestion ? 'Answer text…' : 'Label this edge…';
  const accentColor = variant === 'question' ? '#d97706' : variant === 'journey' ? '#059669' : '#4f46e5';
  const accentLight = variant === 'question' ? '#fef3c7' : variant === 'journey' ? '#d1fae5' : '#e0e7ff';
  const accentBorder = variant === 'question' ? '#fcd34d' : variant === 'journey' ? '#6ee7b7' : '#c7d2fe';
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
    setBranchLabel('');
    setBranchEdgeLabel('');
    setBranchTarget('');
    setNewAnswer('');
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
      const newNode: DiagramNode = {
        id: newId,
        label: branchLabel.trim(),
        shape: 'rectangle',
        x: (node.x ?? 0) + 200,
        y: (node.y ?? 0) + 20 + outEdges.length * 100,
      };
      const newEdge: DiagramEdge = { id: `e${++_edgeSeq}`, from: nodeId, to: newId, label: branchEdgeLabel.trim() || undefined };
      onModelChange({ ...model, nodes: [...model.nodes, newNode], edges: [...model.edges, newEdge] });
    } else {
      if (!branchTarget) return;
      if (model.edges.some(e => e.from === nodeId && e.to === branchTarget)) return;
      const newEdge: DiagramEdge = { id: `e${++_edgeSeq}`, from: nodeId, to: branchTarget, label: branchEdgeLabel.trim() || undefined };
      onModelChange({ ...model, edges: [...model.edges, newEdge] });
    }
    setBranchLabel(''); setBranchEdgeLabel(''); setBranchTarget(''); setAddingBranch(false);
  };

  // Question variant: answer management
  const addAnswer = () => {
    if (!newAnswer.trim()) return;
    const trimmed = newAnswer.trim();
    if (answers.includes(trimmed)) return;
    const updatedAnswers = [...answers, trimmed];
    onModelChange({
      ...model,
      nodes: model.nodes.map(n => n.id === nodeId ? { ...n, metadata: { ...(n.metadata ?? {}), answers: updatedAnswers } } : n),
    });
    setNewAnswer('');
    setAddingAnswer(false);
  };

  const removeAnswer = (ans: string) => {
    const updatedAnswers = answers.filter(a => a !== ans);
    // Also remove any edge that was labeled with this answer
    const updatedEdges = model.edges.filter(e => !(e.from === nodeId && e.label === ans));
    onModelChange({
      ...model,
      nodes: model.nodes.map(n => n.id === nodeId ? { ...n, metadata: { ...(n.metadata ?? {}), answers: updatedAnswers } } : n),
      edges: updatedEdges,
    });
  };

  const moveAnswer = (idx: number, dir: -1 | 1) => {
    const next = idx + dir;
    if (next < 0 || next >= answers.length) return;
    const arr = [...answers];
    [arr[idx], arr[next]] = [arr[next], arr[idx]];
    onModelChange({
      ...model,
      nodes: model.nodes.map(n => n.id === nodeId ? { ...n, metadata: { ...(n.metadata ?? {}), answers: arr } } : n),
    });
  };

  return (
    <div style={styles.panel}>
      {/* Header */}
      <div style={{ ...styles.header, color: accentColor, borderBottomColor: accentBorder, background: accentLight }}>
        <div style={{ ...styles.headerDot, background: accentColor }} />
        <span>{isQuestion ? 'Question Editor' : variant === 'journey' ? 'Step Editor' : 'Step Editor'}</span>
      </div>

      <div style={styles.scrollArea}>
        {/* Name */}
        <section style={styles.section}>
          <label style={styles.fieldLabel}>Name</label>
          <input
            ref={inputRef}
            value={label}
            onChange={e => setLabel(e.target.value)}
            onBlur={commitLabel}
            onKeyDown={e => e.key === 'Enter' && commitLabel()}
            style={styles.input}
            placeholder="Step name…"
          />
        </section>

        {/* Shape (hidden for question variant) */}
        {!isQuestion && (
          <section style={styles.section}>
            <label style={styles.fieldLabel}>Shape</label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
              {SHAPES.map(s => {
                const active = (node.shape ?? 'rectangle') === s.key;
                return (
                  <button
                    key={s.key}
                    onClick={() => setShape(s.key)}
                    style={{
                      ...styles.shapeBtn,
                      background: active ? accentColor : C.slate100,
                      color: active ? '#fff' : C.slate700,
                      border: active ? `1.5px solid ${accentColor}` : `1.5px solid ${C.slate200}`,
                    }}
                  >
                    <span style={{ fontSize: 16, lineHeight: 1 }}>{s.icon}</span>
                    <span style={{ fontSize: 11, fontWeight: 500 }}>{s.label}</span>
                  </button>
                );
              })}
            </div>
          </section>
        )}

        {/* Question variant: Answers list (manage metadata.answers) */}
        {isQuestion && (
          <section style={{ ...styles.section, flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
              <label style={{ ...styles.fieldLabel, margin: 0 }}>Answers</label>
              <span style={{ fontSize: 11, color: C.slate400, background: C.slate100, padding: '1px 7px', borderRadius: 99, fontWeight: 600 }}>
                {answers.length}
              </span>
            </div>

            {answers.length === 0 && !addingAnswer && (
              <div style={styles.emptyHint}>No answers yet — add one below</div>
            )}

            {answers.map((ans, i) => {
              const connected = model.edges.some(e => e.from === nodeId && e.label === ans);
              const targetNode = model.nodes.find(n => {
                const edge = model.edges.find(e => e.from === nodeId && e.label === ans);
                return edge && n.id === edge.to;
              });
              return (
                <div key={ans + i} style={styles.branchCard}>
                  <div style={{ ...styles.branchAccent, background: accentColor }} />
                  <div style={{ flex: 1, minWidth: 0, padding: '8px 8px 8px 0' }}>
                    <div style={{ fontSize: 12, fontWeight: 600, color: C.slate700, marginBottom: connected ? 3 : 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {ans}
                    </div>
                    {connected && targetNode && (
                      <div style={{ fontSize: 11, color: accentColor, opacity: 0.8 }}>→ {targetNode.label}</div>
                    )}
                    {!connected && (
                      <div style={{ fontSize: 10, color: C.slate400, fontStyle: 'italic' }}>drag port on canvas to connect</div>
                    )}
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', padding: '4px 2px', gap: 2 }}>
                    <button onClick={() => moveAnswer(i, -1)} disabled={i === 0} style={{ ...styles.microBtn, opacity: i === 0 ? 0.3 : 1 }}>↑</button>
                    <button onClick={() => moveAnswer(i, 1)} disabled={i === answers.length - 1} style={{ ...styles.microBtn, opacity: i === answers.length - 1 ? 0.3 : 1 }}>↓</button>
                  </div>
                  <button onClick={() => removeAnswer(ans)} style={styles.removeBtn} title="Remove">✕</button>
                </div>
              );
            })}

            {addingAnswer ? (
              <div style={{ ...styles.addForm, background: '#fffbeb', border: `1.5px solid ${accentBorder}` }}>
                <input
                  autoFocus
                  value={newAnswer}
                  onChange={e => setNewAnswer(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && addAnswer()}
                  placeholder="Answer text…"
                  style={{ ...styles.input, marginBottom: 8 }}
                />
                <div style={{ display: 'flex', gap: 6 }}>
                  <button onClick={addAnswer} style={{ ...styles.addBtn, background: accentColor }}>Add Answer</button>
                  <button onClick={() => { setAddingAnswer(false); setNewAnswer(''); }} style={styles.cancelBtn}>Cancel</button>
                </div>
              </div>
            ) : (
              <button onClick={() => setAddingAnswer(true)} style={{ ...styles.addBranchTrigger, color: accentColor, borderColor: accentBorder }}>
                <span style={{ fontSize: 16, lineHeight: 1 }}>+</span>
                Add Answer
              </button>
            )}

            {answers.length > 0 && (
              <div style={{ marginTop: 12, padding: '8px 10px', background: '#fef9f0', borderRadius: 8, border: `1px solid ${accentBorder}` }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: accentColor, textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 4 }}>How to connect</div>
                <div style={{ fontSize: 11, color: C.slate600, lineHeight: 1.5 }}>
                  Hover over the question node on the canvas to see answer ports. Drag a port dot to another node to connect it.
                </div>
              </div>
            )}
          </section>
        )}

        {/* Non-question: Branches / outgoing edges */}
        {!isQuestion && (
          <section style={{ ...styles.section, flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
              <label style={{ ...styles.fieldLabel, margin: 0 }}>{branchesLabel}</label>
              <span style={{ fontSize: 11, color: C.slate400, background: C.slate100, padding: '1px 7px', borderRadius: 99, fontWeight: 600 }}>
                {outEdges.length}
              </span>
            </div>

            {outEdges.length === 0 && !addingBranch && (
              <div style={styles.emptyHint}>No outgoing connections yet</div>
            )}

            {outEdges.map(edge => {
              const target = model.nodes.find(n => n.id === edge.to);
              return (
                <div key={edge.id} style={styles.branchCard}>
                  <div style={{ ...styles.branchAccent, background: accentColor }} />
                  <div style={{ flex: 1, minWidth: 0, padding: '8px 8px 8px 0' }}>
                    <div style={{ fontSize: 12, fontWeight: 600, color: C.slate700, marginBottom: 5, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      → {target?.label ?? edge.to}
                    </div>
                    <input
                      value={edge.label ?? ''}
                      onChange={e => updateEdgeLabel(edge.id, e.target.value)}
                      placeholder={edgeLabelHint}
                      style={{ ...styles.input, fontSize: 11, padding: '4px 8px' }}
                    />
                  </div>
                  <button onClick={() => removeEdge(edge.id)} style={styles.removeBtn} title="Remove">✕</button>
                </div>
              );
            })}

            {addingBranch ? (
              <div style={styles.addForm}>
                <div style={{ display: 'flex', gap: 6, marginBottom: 10 }}>
                  {(['new', 'existing'] as const).map(mode => (
                    <button
                      key={mode}
                      onClick={() => setBranchMode(mode)}
                      style={{
                        flex: 1, padding: '5px 0', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 11, fontWeight: 600,
                        background: branchMode === mode ? accentColor : C.slate200,
                        color: branchMode === mode ? '#fff' : C.slate600,
                      }}
                    >
                      {mode === 'new' ? `+ New ${branchTerm.toLowerCase()}` : 'Existing step'}
                    </button>
                  ))}
                </div>

                {branchMode === 'new' ? (
                  <input
                    autoFocus
                    value={branchLabel}
                    onChange={e => setBranchLabel(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && addBranch()}
                    placeholder="New step name…"
                    style={{ ...styles.input, marginBottom: 6 }}
                  />
                ) : (
                  <select
                    value={branchTarget}
                    onChange={e => setBranchTarget(e.target.value)}
                    style={{ ...styles.input, marginBottom: 6, appearance: 'none', WebkitAppearance: 'none' as any }}
                  >
                    <option value="">Choose a step…</option>
                    {otherNodes.map(n => <option key={n.id} value={n.id}>{n.label}</option>)}
                  </select>
                )}

                <input
                  value={branchEdgeLabel}
                  onChange={e => setBranchEdgeLabel(e.target.value)}
                  placeholder="Edge label (optional)"
                  style={{ ...styles.input, marginBottom: 10 }}
                />

                <div style={{ display: 'flex', gap: 6 }}>
                  <button onClick={addBranch} style={{ ...styles.addBtn, background: accentColor }}>Add {branchTerm}</button>
                  <button onClick={() => setAddingBranch(false)} style={styles.cancelBtn}>Cancel</button>
                </div>
              </div>
            ) : (
              <button onClick={() => setAddingBranch(true)} style={{ ...styles.addBranchTrigger, color: accentColor, borderColor: accentBorder }}>
                <span style={{ fontSize: 16, lineHeight: 1 }}>+</span>
                Add {branchTerm}
              </button>
            )}
          </section>
        )}
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  panel: {
    width: 272,
    minWidth: 272,
    background: '#fff',
    borderLeft: '1px solid #e2e8f0',
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
  },
  header: {
    padding: '12px 16px',
    fontWeight: 700,
    fontSize: 12,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    color: '#4f46e5',
    borderBottom: '1px solid #e0e7ff',
    background: '#fafafe',
    display: 'flex',
    alignItems: 'center',
    gap: 8,
  },
  headerDot: {
    width: 6,
    height: 6,
    borderRadius: '50%',
    background: '#4f46e5',
  },
  scrollArea: {
    flex: 1,
    overflowY: 'auto',
    display: 'flex',
    flexDirection: 'column',
  },
  section: {
    padding: '14px 16px',
    borderBottom: '1px solid #f1f5f9',
  },
  fieldLabel: {
    display: 'block',
    fontSize: 10,
    fontWeight: 700,
    color: '#94a3b8',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  input: {
    width: '100%',
    padding: '7px 10px',
    border: '1.5px solid #e2e8f0',
    borderRadius: 8,
    fontSize: 13,
    outline: 'none',
    boxSizing: 'border-box',
    fontFamily: 'inherit',
    color: '#1e293b',
    background: '#f8fafc',
    transition: 'border-color 0.15s',
  },
  shapeBtn: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 4,
    padding: '8px 6px',
    borderRadius: 8,
    cursor: 'pointer',
    transition: 'all 0.15s',
  },
  emptyHint: {
    fontSize: 12,
    color: '#94a3b8',
    textAlign: 'center',
    padding: '16px 0',
    fontStyle: 'italic',
  },
  branchCard: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: 0,
    marginBottom: 8,
    borderRadius: 10,
    border: '1.5px solid #e2e8f0',
    overflow: 'hidden',
    background: '#f8fafc',
  },
  branchAccent: {
    width: 4,
    alignSelf: 'stretch',
    background: '#4f46e5',
    flexShrink: 0,
  },
  removeBtn: {
    background: 'none',
    border: 'none',
    color: '#94a3b8',
    cursor: 'pointer',
    fontSize: 12,
    padding: '8px 10px',
    flexShrink: 0,
    transition: 'color 0.15s',
  },
  microBtn: {
    background: 'none',
    border: 'none',
    color: '#94a3b8',
    cursor: 'pointer',
    fontSize: 11,
    padding: '2px 4px',
    lineHeight: 1,
  },
  addForm: {
    marginTop: 10,
    background: '#f5f3ff',
    borderRadius: 10,
    padding: 12,
    border: '1.5px solid #e0e7ff',
  },
  addBtn: {
    flex: 1,
    padding: '7px 0',
    background: '#4f46e5',
    color: '#fff',
    border: 'none',
    borderRadius: 7,
    cursor: 'pointer',
    fontSize: 12,
    fontWeight: 600,
    fontFamily: 'inherit',
  },
  cancelBtn: {
    padding: '7px 14px',
    background: '#e2e8f0',
    color: '#475569',
    border: 'none',
    borderRadius: 7,
    cursor: 'pointer',
    fontSize: 12,
    fontFamily: 'inherit',
  },
  addBranchTrigger: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: 10,
    width: '100%',
    padding: '8px 0',
    background: 'transparent',
    color: '#4f46e5',
    border: '1.5px dashed #c7d2fe',
    borderRadius: 8,
    cursor: 'pointer',
    fontSize: 12,
    fontWeight: 600,
    fontFamily: 'inherit',
    transition: 'all 0.15s',
  },
};
