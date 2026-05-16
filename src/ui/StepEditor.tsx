import React, { useEffect, useRef, useState } from 'react';
import type { DiagramModel, DiagramNode, DiagramEdge, NodeShape } from '../core/types.js';

interface StepEditorProps {
  nodeId: string;
  model: DiagramModel;
  onModelChange: (model: DiagramModel) => void;
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

export function StepEditor({ nodeId, model, onModelChange }: StepEditorProps) {
  const node = model.nodes.find(n => n.id === nodeId);
  const [label, setLabel] = useState(node?.label ?? '');
  const [addingBranch, setAddingBranch] = useState(false);
  const [branchMode, setBranchMode] = useState<'new' | 'existing'>('new');
  const [branchLabel, setBranchLabel] = useState('');
  const [branchEdgeLabel, setBranchEdgeLabel] = useState('');
  const [branchTarget, setBranchTarget] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setLabel(node?.label ?? '');
    setAddingBranch(false);
    setBranchLabel('');
    setBranchEdgeLabel('');
    setBranchTarget('');
    setTimeout(() => inputRef.current?.focus(), 50);
  }, [nodeId]);

  if (!node) return null;

  const outEdges = model.edges.filter(e => e.from === nodeId);
  const otherNodes = model.nodes.filter(n => n.id !== nodeId);

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

  return (
    <div style={styles.panel}>
      {/* Header */}
      <div style={styles.header}>
        <div style={styles.headerDot} />
        <span>Step Editor</span>
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

        {/* Shape */}
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
                    background: active ? C.indigo : C.slate100,
                    color: active ? '#fff' : C.slate700,
                    border: active ? `1.5px solid ${C.indigo}` : `1.5px solid ${C.slate200}`,
                  }}
                >
                  <span style={{ fontSize: 16, lineHeight: 1 }}>{s.icon}</span>
                  <span style={{ fontSize: 11, fontWeight: 500 }}>{s.label}</span>
                </button>
              );
            })}
          </div>
        </section>

        {/* Branches */}
        <section style={{ ...styles.section, flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
            <label style={{ ...styles.fieldLabel, margin: 0 }}>Branches</label>
            <span style={{ fontSize: 11, color: C.slate400, background: C.slate100, padding: '1px 7px', borderRadius: 99, fontWeight: 600 }}>
              {outEdges.length}
            </span>
          </div>

          {outEdges.length === 0 && !addingBranch && (
            <div style={styles.emptyHint}>No outgoing branches yet</div>
          )}

          {outEdges.map(edge => {
            const target = model.nodes.find(n => n.id === edge.to);
            return (
              <div key={edge.id} style={styles.branchCard}>
                <div style={styles.branchAccent} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: C.slate700, marginBottom: 5, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    → {target?.label ?? edge.to}
                  </div>
                  <input
                    value={edge.label ?? ''}
                    onChange={e => updateEdgeLabel(edge.id, e.target.value)}
                    placeholder="Label this edge…"
                    style={{ ...styles.input, fontSize: 11, padding: '4px 8px' }}
                  />
                </div>
                <button onClick={() => removeEdge(edge.id)} style={styles.removeBtn} title="Remove">✕</button>
              </div>
            );
          })}

          {/* Add branch form */}
          {addingBranch ? (
            <div style={styles.addForm}>
              <div style={{ display: 'flex', gap: 6, marginBottom: 10 }}>
                {(['new', 'existing'] as const).map(mode => (
                  <button
                    key={mode}
                    onClick={() => setBranchMode(mode)}
                    style={{
                      flex: 1, padding: '5px 0', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 11, fontWeight: 600,
                      background: branchMode === mode ? C.indigo : C.slate200,
                      color: branchMode === mode ? '#fff' : C.slate600,
                    }}
                  >
                    {mode === 'new' ? '+ New node' : 'Existing'}
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
                <button onClick={addBranch} style={styles.addBtn}>Add branch</button>
                <button onClick={() => setAddingBranch(false)} style={styles.cancelBtn}>Cancel</button>
              </div>
            </div>
          ) : (
            <button onClick={() => setAddingBranch(true)} style={styles.addBranchTrigger}>
              <span style={{ fontSize: 16, lineHeight: 1 }}>+</span>
              Add Branch
            </button>
          )}
        </section>
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
