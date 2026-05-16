import React from 'react';
import type { ExportFormat } from '../core/types.js';

interface ToolbarProps {
  onExport: (format: ExportFormat) => void;
  onImport?: (mermaid: string) => void;
}

const FORMATS: ExportFormat[] = ['mermaid', 'plantuml', 'json', 'svg', 'png'];

export function Toolbar({ onExport, onImport }: ToolbarProps) {
  const handleImport = () => {
    const text = prompt('Paste Mermaid or JSON:');
    if (text && onImport) onImport(text);
  };

  return (
    <div style={{ display: 'flex', gap: 8, padding: '8px 12px', background: '#f5f5f5', borderBottom: '1px solid #ddd', flexWrap: 'wrap' }}>
      {onImport && (
        <button onClick={handleImport} style={btnStyle('#6c757d')}>
          Import
        </button>
      )}
      {FORMATS.map(fmt => (
        <button key={fmt} onClick={() => onExport(fmt)} style={btnStyle('#0066cc')}>
          Export {fmt.toUpperCase()}
        </button>
      ))}
    </div>
  );
}

function btnStyle(bg: string): React.CSSProperties {
  return {
    padding: '5px 12px',
    background: bg,
    color: '#fff',
    border: 'none',
    borderRadius: 4,
    cursor: 'pointer',
    fontSize: 13,
  };
}
