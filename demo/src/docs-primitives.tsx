/**
 * Demo-site documentation primitives.
 *
 * Shared UI helpers used across all demo pages (DocsPage, DiagramGuides, etc.)
 * to render consistent syntax-highlighted code, tables, headings, and
 * keyboard-shortcut badges. All styling is inline (dark-theme only).
 */
import { useState } from 'react';

/** Syntax-highlight token helpers — wrap text in a colored span. */
export const KW = (s: string) => <span style={{ color: '#c792ea' }}>{s}</span>;
export const STR = (s: string) => <span style={{ color: '#c3e88d' }}>{s}</span>;
export const CMT = (s: string) => <span style={{ color: '#546e7a', fontStyle: 'italic' }}>{s}</span>;
export const FN = (s: string) => <span style={{ color: '#82aaff' }}>{s}</span>;
export const TY = (s: string) => <span style={{ color: '#ffcb6b' }}>{s}</span>;
export const OP = (s: string) => <span style={{ color: '#89ddff' }}>{s}</span>;
export const NUM = (s: string) => <span style={{ color: '#f78c6c' }}>{s}</span>;

/** Copy-to-clipboard button positioned in the top-right of a code block. */
export function CopyBtn({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={() => { navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 1800); }}
      style={{
        position: 'absolute', top: 10, right: 10,
        background: copied ? '#10b981' : '#1e293b',
        border: '1px solid #334155', borderRadius: 6, padding: '3px 10px',
        color: copied ? '#fff' : '#94a3b8', fontSize: 11, cursor: 'pointer',
        transition: 'background 0.2s, color 0.2s',
        fontFamily: 'ui-sans-serif,system-ui,sans-serif',
      }}
    >{copied ? '✓ Copied' : 'Copy'}</button>
  );
}

/** Fenced code block with syntax-highlighted children and a Copy button. */
export function Code({ children, raw }: { children: React.ReactNode; raw: string }) {
  return (
    <div style={{ position: 'relative', margin: '12px 0 24px' }}>
      <CopyBtn text={raw} />
      <pre style={{
        background: '#0d1117', border: '1px solid #21262d', borderRadius: 10,
        padding: '18px 20px', overflowX: 'auto', margin: 0,
        fontFamily: '"Fira Code","Cascadia Code",ui-monospace,monospace',
        fontSize: 13, lineHeight: 1.7, color: '#cdd9e5',
      }}>
        <code>{children}</code>
      </pre>
    </div>
  );
}

/** Documentation section with an anchor `id`, heading, and optional badge. */
export function Section({ id, title, badge, children }: { id: string; title: string; badge?: string; children: React.ReactNode }) {
  return (
    <section id={id} style={{ marginBottom: 56 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
        <h2 style={{ fontSize: 20, fontWeight: 700, color: '#f1f5f9', margin: 0 }}>{title}</h2>
        {badge && (
          <span style={{
            background: '#10b98122', color: '#6ee7b7', border: '1px solid #10b98155',
            borderRadius: 20, padding: '2px 10px', fontSize: 11, fontWeight: 600,
          }}>{badge}</span>
        )}
      </div>
      {children}
    </section>
  );
}

/** Paragraph with muted text. */
export function P({ children }: { children: React.ReactNode }) {
  return <p style={{ color: '#94a3b8', lineHeight: 1.75, marginBottom: 12, fontSize: 14 }}>{children}</p>;
}

/** Sub-heading (h3) for use inside a Section. */
export function H3({ children }: { children: React.ReactNode }) {
  return <h3 style={{ fontSize: 14, fontWeight: 600, color: '#cbd5e1', margin: '20px 0 8px' }}>{children}</h3>;
}

/** Numbered step list. */
export function Steps({ items }: { items: React.ReactNode[] }) {
  return (
    <ol style={{ color: '#94a3b8', lineHeight: 1.75, fontSize: 14, paddingLeft: 22, marginBottom: 16 }}>
      {items.map((node, i) => (
        <li key={i} style={{ marginBottom: 6 }}>{node}</li>
      ))}
    </ol>
  );
}

/** Two-column "Goal → How" table for quick-reference guides. */
export function HowToTable({ rows }: { rows: [string, React.ReactNode][] }) {
  return (
    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, marginBottom: 16 }}>
      <thead>
        <tr style={{ background: '#0d1117' }}>
          <th style={thStyle}>Goal</th>
          <th style={thStyle}>How</th>
        </tr>
      </thead>
      <tbody>
        {rows.map(([goal, how], i) => (
          <tr key={i}>
            <td style={{ ...tdStyle, fontWeight: 500, color: '#cbd5e1', width: 220 }}>{goal}</td>
            <td style={tdStyle}>{how}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

/** Props-table row: name, type, default, description — used for API reference. */
export function PropRow({ name, type, def, desc }: { name: string; type: string; def?: string; desc: string }) {
  return (
    <tr>
      <td style={{ padding: '8px 12px', fontFamily: 'ui-monospace,monospace', fontSize: 12, color: '#a5b4fc', borderBottom: '1px solid #1e293b' }}>{name}</td>
      <td style={{ padding: '8px 12px', fontFamily: 'ui-monospace,monospace', fontSize: 12, color: '#ffcb6b', borderBottom: '1px solid #1e293b' }}>{type}</td>
      <td style={{ padding: '8px 12px', fontFamily: 'ui-monospace,monospace', fontSize: 12, color: '#64748b', borderBottom: '1px solid #1e293b' }}>{def ?? '—'}</td>
      <td style={{ padding: '8px 12px', fontSize: 13, color: '#94a3b8', borderBottom: '1px solid #1e293b' }}>{desc}</td>
    </tr>
  );
}

export const thStyle: React.CSSProperties = {
  padding: '8px 12px', textAlign: 'left', fontSize: 11, fontWeight: 600,
  color: '#64748b', borderBottom: '1px solid #1e293b', textTransform: 'uppercase', letterSpacing: 0.5,
};
export const tdStyle: React.CSSProperties = {
  padding: '8px 12px', color: '#94a3b8', borderBottom: '1px solid #0f172a',
};
export const inlineCode: React.CSSProperties = {
  fontFamily: 'ui-monospace,monospace', fontSize: '0.85em',
  background: '#1e293b', padding: '1px 5px', borderRadius: 4, color: '#a5b4fc',
};
export function linkPillStyle(bg: string, color: string): React.CSSProperties {
  return {
    display: 'inline-block', padding: '6px 14px', background: bg,
    border: '1px solid #334155', borderRadius: 8, color, fontSize: 12,
    textDecoration: 'none', fontWeight: 500,
  };
}

/** Keyboard shortcut badge styled as a physical key cap. */
export function Kbd({ children }: { children: React.ReactNode }) {
  return (
    <kbd style={{
      fontFamily: 'ui-monospace,monospace', fontSize: '0.82em',
      background: '#1e293b', border: '1px solid #334155',
      padding: '1px 6px', borderRadius: 4, color: '#cbd5e1',
    }}>{children}</kbd>
  );
}
