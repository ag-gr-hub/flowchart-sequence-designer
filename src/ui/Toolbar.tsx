import React from 'react';
import type { ExportFormat } from '../core/types.js';

interface ToolbarProps {
  onExport: (format: ExportFormat) => void;
  onImport?: (mermaid: string) => void;
}

const FORMATS: { key: ExportFormat; label: string }[] = [
  { key: 'mermaid', label: 'Mermaid' },
  { key: 'plantuml', label: 'PlantUML' },
  { key: 'json', label: 'JSON' },
  { key: 'svg', label: 'SVG' },
  { key: 'png', label: 'PNG' },
];

export function Toolbar({ onExport, onImport }: ToolbarProps) {
  const handleImport = () => {
    const text = prompt('Paste Mermaid or JSON:');
    if (text && onImport) onImport(text);
  };

  return (
    <div style={bar}>
      <div style={brand}>
        <div style={brandDot} />
        <span>flowchart</span>
        <span style={{ color: '#94a3b8', fontWeight: 400 }}>/</span>
        <span style={{ color: '#4f46e5' }}>designer</span>
      </div>

      <div style={divider} />

      <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
        {onImport && (
          <button onClick={handleImport} style={ghostBtn}>
            ↑ Import
          </button>
        )}
        <span style={{ fontSize: 11, color: '#cbd5e1', margin: '0 4px' }}>Export →</span>
        {FORMATS.map(f => (
          <button key={f.key} onClick={() => onExport(f.key)} style={exportBtn}>
            {f.label}
          </button>
        ))}
      </div>
    </div>
  );
}

const bar: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 10,
  padding: '0 14px',
  height: 44,
  background: '#1e293b',
  borderBottom: '1px solid #334155',
  flexShrink: 0,
};
const brand: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 5,
  fontSize: 13,
  fontWeight: 700,
  color: '#f1f5f9',
  letterSpacing: 0.2,
  fontFamily: 'ui-monospace,monospace',
};
const brandDot: React.CSSProperties = {
  width: 7,
  height: 7,
  borderRadius: '50%',
  background: '#4f46e5',
  boxShadow: '0 0 6px #818cf8',
};
const divider: React.CSSProperties = {
  width: 1,
  height: 20,
  background: '#334155',
  margin: '0 4px',
};
const ghostBtn: React.CSSProperties = {
  padding: '4px 10px',
  background: 'transparent',
  color: '#94a3b8',
  border: '1px solid #334155',
  borderRadius: 6,
  cursor: 'pointer',
  fontSize: 11,
  fontWeight: 500,
  fontFamily: 'inherit',
  letterSpacing: 0.2,
};
const exportBtn: React.CSSProperties = {
  padding: '4px 10px',
  background: 'rgba(79,70,229,0.15)',
  color: '#a5b4fc',
  border: '1px solid rgba(79,70,229,0.3)',
  borderRadius: 6,
  cursor: 'pointer',
  fontSize: 11,
  fontWeight: 600,
  fontFamily: 'ui-monospace,monospace',
  letterSpacing: 0.3,
};
