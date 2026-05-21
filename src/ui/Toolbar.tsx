import React, { useState } from 'react';
import { ImportDialog } from './ImportDialog.js';
import { darkTheme, ACCENT } from './theme.js';
import type { ExportFormat } from '../core/types.js';

const ALL_FORMATS: { key: ExportFormat; label: string }[] = [
  { key: 'mermaid', label: 'Mermaid' },
  { key: 'plantuml', label: 'PlantUML' },
  { key: 'json', label: 'JSON' },
  { key: 'svg', label: 'SVG' },
  { key: 'png', label: 'PNG' },
];

interface ToolbarProps {
  onExport: (format: ExportFormat) => void;
  onImport?: (text: string) => void;
  allowedExports?: ExportFormat[];
  allowImport?: boolean;
}

function ToolbarBase({ onExport, onImport, allowedExports, allowImport = true }: ToolbarProps) {
  const [importOpen, setImportOpen] = useState(false);
  const formats = allowedExports
    ? ALL_FORMATS.filter((f) => allowedExports.includes(f.key))
    : ALL_FORMATS;

  return (
    <div style={bar}>
      <div style={brand}>
        <div style={brandDot} />
        <span>flowchart</span>
        <span style={{ color: darkTheme.textSecondary, fontWeight: 400 }}>/</span>
        <span style={{ color: ACCENT.indigo }}>designer</span>
      </div>

      <div style={divider} />

      <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
        {allowImport && onImport && (
          <button onClick={() => setImportOpen(true)} aria-label="Import diagram" style={ghostBtn}>
            ↑ Import
          </button>
        )}
        {formats.length > 0 && (
          <>
            <span style={{ fontSize: 11, color: darkTheme.inputText, margin: '0 4px' }}>
              Export →
            </span>
            {formats.map((f) => (
              <button
                key={f.key}
                onClick={() => onExport(f.key)}
                aria-label={`Export as ${f.label}`}
                style={exportBtn}
              >
                {f.label}
              </button>
            ))}
          </>
        )}
      </div>
      {onImport && (
        <ImportDialog open={importOpen} onClose={() => setImportOpen(false)} onImport={onImport} />
      )}
    </div>
  );
}

// Toolbar is intentionally always-dark chrome regardless of editor theme — it
// reads from `darkTheme` directly rather than threading a runtime theme prop.
const bar: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 10,
  padding: '0 14px',
  height: 44,
  background: darkTheme.panelBg,
  borderBottom: `1px solid ${darkTheme.panelBorder}`,
  flexShrink: 0,
};
const brand: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 5,
  fontSize: 13,
  fontWeight: 700,
  color: darkTheme.textPrimary,
  letterSpacing: 0.2,
  fontFamily: 'ui-monospace,monospace',
};
const brandDot: React.CSSProperties = {
  width: 7,
  height: 7,
  borderRadius: '50%',
  background: ACCENT.indigo,
  boxShadow: `0 0 6px ${ACCENT.indigoLight}`,
};
const divider: React.CSSProperties = {
  width: 1,
  height: 20,
  background: darkTheme.panelBorder,
  margin: '0 4px',
};
const ghostBtn: React.CSSProperties = {
  padding: '4px 10px',
  background: 'transparent',
  color: darkTheme.textSecondary,
  border: `1px solid ${darkTheme.panelBorder}`,
  borderRadius: 6,
  cursor: 'pointer',
  fontSize: 11,
  fontWeight: 500,
  fontFamily: 'inherit',
  letterSpacing: 0.2,
};
const exportBtn: React.CSSProperties = {
  padding: '4px 10px',
  background: ACCENT.indigoSoftBg,
  color: ACCENT.indigoText,
  border: `1px solid ${ACCENT.indigoSoftBorder}`,
  borderRadius: 6,
  cursor: 'pointer',
  fontSize: 11,
  fontWeight: 600,
  fontFamily: 'ui-monospace,monospace',
  letterSpacing: 0.3,
};
export const Toolbar = React.memo(ToolbarBase);
