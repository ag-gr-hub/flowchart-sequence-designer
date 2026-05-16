import { useState } from 'react';
import { DiagramEditor } from 'flowchart-sequence-designer/ui';
import type { DiagramVariant } from 'flowchart-sequence-designer';

const VARIANTS: { key: DiagramVariant; label: string; description: string }[] = [
  { key: 'flowchart', label: 'Flowchart', description: 'General purpose — any shapes, any flow' },
  { key: 'question', label: 'Question Flow', description: 'Each node is a question; answers are side-by-side' },
  { key: 'journey', label: 'Journey Map', description: 'Numbered milestone steps' },
];

type Theme = 'light' | 'dark' | 'auto';

export default function App() {
  const [variant, setVariant] = useState<DiagramVariant>('flowchart');
  const [theme, setTheme] = useState<Theme>('auto');

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
      <div style={{
        display: 'flex', gap: 0, background: '#0f172a',
        padding: '0 16px', alignItems: 'stretch', flexShrink: 0,
      }}>
        <span style={{
          display: 'flex', alignItems: 'center', paddingRight: 16,
          color: '#f1f5f9', fontSize: 13, fontWeight: 700,
          fontFamily: 'ui-sans-serif,system-ui,sans-serif',
          borderRight: '1px solid #1e293b',
        }}>
          flowchart-sequence-designer
        </span>

        {VARIANTS.map(v => (
          <button
            key={v.key}
            onClick={() => setVariant(v.key)}
            style={{
              padding: '10px 18px', background: 'none', border: 'none',
              borderBottom: variant === v.key ? '2px solid #4f46e5' : '2px solid transparent',
              cursor: 'pointer', color: variant === v.key ? '#f1f5f9' : '#64748b',
              fontSize: 12, fontWeight: variant === v.key ? 700 : 400,
              fontFamily: 'ui-sans-serif,system-ui,sans-serif',
              display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 2,
            }}
          >
            <span>{v.label}</span>
            <span style={{ fontSize: 10, opacity: 0.6 }}>{v.description}</span>
          </button>
        ))}

        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 4 }}>
          {(['light', 'auto', 'dark'] as Theme[]).map(t => (
            <button
              key={t}
              onClick={() => setTheme(t)}
              style={{
                padding: '4px 10px',
                background: theme === t ? 'rgba(79,70,229,0.25)' : 'none',
                border: theme === t ? '1px solid #4f46e5' : '1px solid transparent',
                borderRadius: 6, cursor: 'pointer',
                color: theme === t ? '#a5b4fc' : '#475569',
                fontSize: 11, fontWeight: theme === t ? 600 : 400,
                fontFamily: 'ui-sans-serif,system-ui,sans-serif',
              }}
            >
              {t === 'light' ? '☀ Light' : t === 'dark' ? '☾ Dark' : '⊙ Auto'}
            </button>
          ))}
        </div>
      </div>

      <DiagramEditor key={variant} variant={variant} theme={theme} height="100%" />
    </div>
  );
}
