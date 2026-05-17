import { useState } from 'react';
import { DiagramEditor, SequenceEditor, presetSequenceModel } from 'flowchart-sequence-designer/ui';
import type { DiagramVariant } from 'flowchart-sequence-designer';
import { DocsPage } from './DocsPage';

type VariantKey = DiagramVariant | 'sequence';

const VARIANTS: { key: VariantKey; label: string; description: string }[] = [
  { key: 'flowchart', label: 'Flowchart',     description: 'General purpose — any shapes, any flow' },
  { key: 'question',  label: 'Question Flow', description: 'Each node is a question; answers are side-by-side' },
  { key: 'journey',   label: 'Journey Map',   description: 'Numbered milestone steps' },
  { key: 'sequence',  label: 'Sequence',      description: 'Actor lifelines + ordered messages' },
];

type Theme = 'light' | 'dark' | 'auto';
type Tab = VariantKey | 'docs';

export default function App() {
  const [tab, setTab] = useState<Tab>('flowchart');
  const [theme, setTheme] = useState<Theme>('auto');

  const variant: DiagramVariant =
    tab === 'docs' || tab === 'sequence' ? 'flowchart' : tab;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
      {/* Top nav */}
      <div style={{
        display: 'flex', gap: 0, background: '#0f172a',
        padding: '0 16px', alignItems: 'stretch', flexShrink: 0,
        borderBottom: '1px solid #1e293b',
      }}>
        <a
          href="https://github.com/ag-gr-hub/flowchart-sequence-designer"
          target="_blank"
          rel="noreferrer"
          style={{
            display: 'flex', alignItems: 'center', gap: 8, paddingRight: 20,
            color: '#f1f5f9', fontSize: 13, fontWeight: 700,
            fontFamily: 'ui-sans-serif,system-ui,sans-serif',
            borderRight: '1px solid #1e293b', textDecoration: 'none',
            marginRight: 8,
          }}
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="#94a3b8">
            <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0 0 16 8c0-4.42-3.58-8-8-8z"/>
          </svg>
          flowchart-sequence-designer
        </a>

        {VARIANTS.map(v => (
          <button
            key={v.key}
            onClick={() => setTab(v.key)}
            style={{
              padding: '10px 18px', background: 'none', border: 'none',
              borderBottom: tab === v.key ? '2px solid #4f46e5' : '2px solid transparent',
              cursor: 'pointer', color: tab === v.key ? '#f1f5f9' : '#64748b',
              fontSize: 12, fontWeight: tab === v.key ? 700 : 400,
              fontFamily: 'ui-sans-serif,system-ui,sans-serif',
              display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 2,
            }}
          >
            <span>{v.label}</span>
            <span style={{ fontSize: 10, opacity: 0.6 }}>{v.description}</span>
          </button>
        ))}

        {/* Docs tab */}
        <button
          onClick={() => setTab('docs')}
          style={{
            padding: '10px 18px', background: 'none', border: 'none',
            borderBottom: tab === 'docs' ? '2px solid #10b981' : '2px solid transparent',
            cursor: 'pointer', color: tab === 'docs' ? '#6ee7b7' : '#64748b',
            fontSize: 12, fontWeight: tab === 'docs' ? 700 : 400,
            fontFamily: 'ui-sans-serif,system-ui,sans-serif',
            display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 2,
          }}
        >
          <span>For Developers</span>
          <span style={{ fontSize: 10, opacity: 0.6 }}>API & programmatic usage</span>
        </button>

        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 4 }}>
          {tab !== 'docs' && (['light', 'auto', 'dark'] as Theme[]).map(t => (
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

      {tab === 'docs' ? (
        <DocsPage />
      ) : tab === 'sequence' ? (
        <SequenceEditor key="sequence" initialModel={presetSequenceModel()} theme={theme} height="100%" />
      ) : (
        <DiagramEditor key={variant} variant={variant} theme={theme} height="100%" />
      )}
    </div>
  );
}
