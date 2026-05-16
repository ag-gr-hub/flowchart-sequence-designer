import { useState } from 'react';

const GITHUB = 'https://github.com/ag-gr-hub/flowchart-sequence-designer';
const NPM = 'https://www.npmjs.com/package/flowchart-sequence-designer';

// ── tiny syntax-highlight helpers ────────────────────────────────────────────
const KW = (s: string) => <span style={{ color: '#c792ea' }}>{s}</span>;
const STR = (s: string) => <span style={{ color: '#c3e88d' }}>{s}</span>;
const CMT = (s: string) => <span style={{ color: '#546e7a', fontStyle: 'italic' }}>{s}</span>;
const FN = (s: string) => <span style={{ color: '#82aaff' }}>{s}</span>;
const TY = (s: string) => <span style={{ color: '#ffcb6b' }}>{s}</span>;
const OP = (s: string) => <span style={{ color: '#89ddff' }}>{s}</span>;
const NUM = (s: string) => <span style={{ color: '#f78c6c' }}>{s}</span>;

// ── copy-to-clipboard button ──────────────────────────────────────────────────
function CopyBtn({ text }: { text: string }) {
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

// ── code block ────────────────────────────────────────────────────────────────
function Code({ children, raw }: { children: React.ReactNode; raw: string }) {
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

// ── section header ────────────────────────────────────────────────────────────
function Section({ id, title, badge, children }: { id: string; title: string; badge?: string; children: React.ReactNode }) {
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

function P({ children }: { children: React.ReactNode }) {
  return <p style={{ color: '#94a3b8', lineHeight: 1.75, marginBottom: 12, fontSize: 14 }}>{children}</p>;
}

function PropRow({ name, type, def, desc }: { name: string; type: string; def?: string; desc: string }) {
  return (
    <tr>
      <td style={{ padding: '8px 12px', fontFamily: 'ui-monospace,monospace', fontSize: 12, color: '#a5b4fc', borderBottom: '1px solid #1e293b' }}>{name}</td>
      <td style={{ padding: '8px 12px', fontFamily: 'ui-monospace,monospace', fontSize: 12, color: '#ffcb6b', borderBottom: '1px solid #1e293b' }}>{type}</td>
      <td style={{ padding: '8px 12px', fontFamily: 'ui-monospace,monospace', fontSize: 12, color: '#64748b', borderBottom: '1px solid #1e293b' }}>{def ?? '—'}</td>
      <td style={{ padding: '8px 12px', fontSize: 13, color: '#94a3b8', borderBottom: '1px solid #1e293b' }}>{desc}</td>
    </tr>
  );
}

// ── nav sidebar ───────────────────────────────────────────────────────────────
const NAV = [
  { id: 'install', label: 'Install' },
  { id: 'flowchart-api', label: 'Flowchart API' },
  { id: 'sequence-api', label: 'Sequence API' },
  { id: 'model-api', label: 'Model (low-level)' },
  { id: 'import', label: 'Import' },
  { id: 'export', label: 'Export formats' },
  { id: 'react-ui', label: 'React UI' },
  { id: 'props', label: 'Component props' },
  { id: 'types', label: 'TypeScript types' },
];

export function DocsPage() {
  return (
    <div style={{
      display: 'flex', flex: 1, overflow: 'hidden',
      background: '#0a0f1a',
      fontFamily: 'ui-sans-serif,system-ui,sans-serif',
    }}>
      {/* Sidebar nav */}
      <nav style={{
        width: 200, flexShrink: 0, borderRight: '1px solid #1e293b',
        overflowY: 'auto', padding: '28px 0',
        background: '#0d1421',
      }}>
        <div style={{ padding: '0 16px 16px', fontSize: 10, fontWeight: 700, color: '#475569', letterSpacing: 1, textTransform: 'uppercase' }}>
          Documentation
        </div>
        {NAV.map(n => (
          <a
            key={n.id}
            href={`#${n.id}`}
            style={{
              display: 'block', padding: '7px 20px',
              fontSize: 13, color: '#64748b', textDecoration: 'none',
              borderLeft: '2px solid transparent',
              transition: 'color 0.15s',
            }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = '#cbd5e1'; }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = '#64748b'; }}
          >
            {n.label}
          </a>
        ))}
        <div style={{ height: 1, background: '#1e293b', margin: '16px 16px' }} />
        <a href={GITHUB} target="_blank" rel="noreferrer"
          style={{ display: 'block', padding: '7px 20px', fontSize: 13, color: '#64748b', textDecoration: 'none' }}>
          ↗ GitHub
        </a>
        <a href={NPM} target="_blank" rel="noreferrer"
          style={{ display: 'block', padding: '7px 20px', fontSize: 13, color: '#64748b', textDecoration: 'none' }}>
          ↗ npm
        </a>
      </nav>

      {/* Main content */}
      <main style={{ flex: 1, overflowY: 'auto', padding: '40px 56px 80px' }}>
        {/* Hero */}
        <div style={{ marginBottom: 48 }}>
          <h1 style={{ fontSize: 28, fontWeight: 800, color: '#f8fafc', margin: '0 0 10px' }}>
            flowchart-sequence-designer
          </h1>
          <p style={{ color: '#64748b', fontSize: 15, lineHeight: 1.6, maxWidth: 600 }}>
            A TypeScript-first package for building and editing flowchart and sequence diagrams — programmatically via a fluent API, or visually via a React drag-and-drop canvas.
          </p>
          <div style={{ display: 'flex', gap: 10, marginTop: 16 }}>
            <a href={GITHUB} target="_blank" rel="noreferrer" style={linkPillStyle('#1e293b', '#94a3b8')}>GitHub →</a>
            <a href={NPM} target="_blank" rel="noreferrer" style={linkPillStyle('#1e293b', '#94a3b8')}>npm →</a>
          </div>
        </div>

        {/* ── Install ── */}
        <Section id="install" title="Install">
          <P>Zero runtime dependencies for the core API. React 18+ is a peer dependency only if you use the UI component.</P>
          <Code raw={`bun add flowchart-sequence-designer\n# or\nnpm install flowchart-sequence-designer`}>
            {KW('bun')} add flowchart-sequence-designer{'\n'}
            {CMT('# or')}{'\n'}
            {KW('npm')} install flowchart-sequence-designer
          </Code>
        </Section>

        {/* ── Flowchart API ── */}
        <Section id="flowchart-api" title="Flowchart API" badge="programmatic">
          <P>Build a diagram with a fluent chainable API. Nodes and edges are validated at call time.</P>
          <Code raw={`import { flowchart } from 'flowchart-sequence-designer';

const diagram = flowchart('Order Flow')
  .node('start',   'Start',          { shape: 'circle' })
  .node('check',   'Payment valid?', { shape: 'diamond' })
  .node('success', 'Confirm order',  { shape: 'rectangle' })
  .node('fail',    'Reject',         { shape: 'rectangle' })
  .edge('start',   'check')
  .edge('check',   'success', { label: 'Yes' })
  .edge('check',   'fail',    { label: 'No' });

console.log(diagram.toMermaid());
// → graph TD; start((Start))-->check{Payment valid?}; ...`}>
            {KW('import')} {'{ '}{FN('flowchart')}{' }'} {KW('from')} {STR("'flowchart-sequence-designer'")};{'\n\n'}
            {KW('const')} diagram {OP('=')} {FN('flowchart')}({STR("'Order Flow'")}{'\n'}
            {'  .'}{FN('node')}({STR("'start'")},   {STR("'Start'")},          {'{ shape: '}{STR("'circle'")}{' }'}){'\n'}
            {'  .'}{FN('node')}({STR("'check'")},   {STR("'Payment valid?'")}, {'{ shape: '}{STR("'diamond'")}{' }'}){'\n'}
            {'  .'}{FN('node')}({STR("'success'")}, {STR("'Confirm order'")},  {'{ shape: '}{STR("'rectangle'")}{' }'}){'\n'}
            {'  .'}{FN('node')}({STR("'fail'")},    {STR("'Reject'")},         {'{ shape: '}{STR("'rectangle'")}{' }'}){'\n'}
            {'  .'}{FN('edge')}({STR("'start'")},   {STR("'check'")}){'\n'}
            {'  .'}{FN('edge')}({STR("'check'")},   {STR("'success'")}, {'{ label: '}{STR("'Yes'")}{' }'}){'\n'}
            {'  .'}{FN('edge')}({STR("'check'")},   {STR("'fail'")},    {'{ label: '}{STR("'No'")}{' }'}){';'}{'\n\n'}
            {FN('console')}.{FN('log')}(diagram.{FN('toMermaid')}());{'\n'}
            {CMT('// → graph TD; start((Start))-->check{...}; ...')}
          </Code>

          <h3 style={{ fontSize: 14, fontWeight: 600, color: '#cbd5e1', marginBottom: 8 }}>Node shapes</h3>
          <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 20, fontSize: 13 }}>
            <thead>
              <tr style={{ background: '#0d1117' }}>
                <th style={thStyle}>Shape</th>
                <th style={thStyle}>Description</th>
              </tr>
            </thead>
            <tbody>
              {[
                ['rectangle', 'Standard process box (default)'],
                ['diamond', 'Decision / branch'],
                ['circle', 'Start or end terminal'],
                ['parallelogram', 'Input / output'],
              ].map(([s, d]) => (
                <tr key={s}>
                  <td style={{ ...tdStyle, fontFamily: 'ui-monospace,monospace', color: '#a5b4fc' }}>{s}</td>
                  <td style={tdStyle}>{d}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <h3 style={{ fontSize: 14, fontWeight: 600, color: '#cbd5e1', marginBottom: 8 }}>Edge options</h3>
          <Code raw={`.edge(from, to, {\n  label?: string,\n  style?: 'solid' | 'dashed' | 'dotted',\n  arrowhead?: 'arrow' | 'open' | 'none',\n})`}>
            .{FN('edge')}(from, to, {'{'}{'\n'}
            {'  '}{TY('label')}{OP('?')}: {TY('string')},{'\n'}
            {'  '}{TY('style')}{OP('?')}: {STR("'solid'")} {OP('|')} {STR("'dashed'")} {OP('|')} {STR("'dotted'")},{'\n'}
            {'  '}{TY('arrowhead')}{OP('?')}: {STR("'arrow'")} {OP('|')} {STR("'open'")} {OP('|')} {STR("'none'")},{'\n'}
            {'}'})
          </Code>
        </Section>

        {/* ── Sequence API ── */}
        <Section id="sequence-api" title="Sequence API" badge="programmatic">
          <P>Model actor-to-actor message flows. Actors auto-register from <code style={inlineCode}>.message()</code> calls — you can skip <code style={inlineCode}>.actor()</code> if you prefer.</P>
          <Code raw={`import { sequence } from 'flowchart-sequence-designer';

const diagram = sequence('Auth Flow')
  .actor('User')
  .actor('Server')
  .message('User',   'Server', 'POST /login')
  .message('Server', 'User',   '200 OK + token', { style: 'dashed' });

console.log(diagram.toMermaid());`}>
            {KW('import')} {'{ '}{FN('sequence')}{' }'} {KW('from')} {STR("'flowchart-sequence-designer'")};{'\n\n'}
            {KW('const')} diagram {OP('=')} {FN('sequence')}({STR("'Auth Flow'")}){'\n'}
            {'  .'}{FN('actor')}({STR("'User'")}){'\n'}
            {'  .'}{FN('actor')}({STR("'Server'")}){'\n'}
            {'  .'}{FN('message')}({STR("'User'")},   {STR("'Server'")}, {STR("'POST /login'")}){'\n'}
            {'  .'}{FN('message')}({STR("'Server'")}, {STR("'User'")},   {STR("'200 OK + token'")}, {'{ style: '}{STR("'dashed'")}{' }'}){';'}{'\n\n'}
            {FN('console')}.{FN('log')}(diagram.{FN('toMermaid')}());
          </Code>
        </Section>

        {/* ── Model ── */}
        <Section id="model-api" title="Model — low-level API" badge="programmatic">
          <P>Work directly with the mutable graph model when you need fine-grained control — useful for incremental updates or building on top of the library.</P>
          <Code raw={`import { Model } from 'flowchart-sequence-designer';
import type { DiagramModel } from 'flowchart-sequence-designer';

const m = new Model({ type: 'flowchart', nodes: [], edges: [] });
m.addNode({ id: 'a', label: 'Step A', shape: 'rectangle' });
m.addNode({ id: 'b', label: 'Step B', shape: 'rectangle' });
m.addEdge({ id: 'e1', from: 'a', to: 'b', label: 'next' });

console.log(m.toMermaid());`}>
            {KW('import')} {'{ '}{FN('Model')}{' }'} {KW('from')} {STR("'flowchart-sequence-designer'")};{'\n'}
            {KW('import')} {KW('type')} {'{ '}{TY('DiagramModel')}{' }'} {KW('from')} {STR("'flowchart-sequence-designer'")};{'\n\n'}
            {KW('const')} m {OP('=')} {KW('new')} {FN('Model')}({'{ type: '}{STR("'flowchart'")}{', nodes: [], edges: [] }'});{'\n'}
            m.{FN('addNode')}({'{ id: '}{STR("'a'")}{', label: '}{STR("'Step A'")}{', shape: '}{STR("'rectangle'")}{' }'});{'\n'}
            m.{FN('addNode')}({'{ id: '}{STR("'b'")}{', label: '}{STR("'Step B'")}{', shape: '}{STR("'rectangle'")}{' }'});{'\n'}
            m.{FN('addEdge')}({'{ id: '}{STR("'e1'")}{', from: '}{STR("'a'")}{', to: '}{STR("'b'")}{', label: '}{STR("'next'")}{' }'});{'\n\n'}
            {FN('console')}.{FN('log')}(m.{FN('toMermaid')}());
          </Code>
        </Section>

        {/* ── Import ── */}
        <Section id="import" title="Import">
          <P>Parse existing Mermaid or JSON into a live model. Round-trip fidelity is guaranteed: <code style={inlineCode}>fromMermaid(diagram.toMermaid())</code> produces an equivalent model.</P>
          <Code raw={`import { fromMermaid, fromJSON } from 'flowchart-sequence-designer';

// Parse a Mermaid string
const model = fromMermaid('graph TD; A-->B; B-->C');

// Parse JSON (from a previous .toJSON() call)
const model2 = fromJSON(jsonString);`}>
            {KW('import')} {'{ '}{FN('fromMermaid')}, {FN('fromJSON')}{' }'} {KW('from')} {STR("'flowchart-sequence-designer'")};{'\n\n'}
            {CMT('// Parse a Mermaid string')}{'\n'}
            {KW('const')} model {OP('=')} {FN('fromMermaid')}({STR("'graph TD; A-->B; B-->C'")});{'\n\n'}
            {CMT('// Parse JSON (from a previous .toJSON() call)')}{'\n'}
            {KW('const')} model2 {OP('=')} {FN('fromJSON')}(jsonString);
          </Code>
        </Section>

        {/* ── Export ── */}
        <Section id="export" title="Export formats">
          <P>Every builder exposes the same export methods. <code style={inlineCode}>toPNG()</code> is browser-only (uses the Canvas API).</P>
          <Code raw={`diagram.toMermaid()   // → string
diagram.toPlantUML()  // → string
diagram.toJSON()      // → string  (serialised DiagramModel)
diagram.toSVG()       // → string  (SVG markup)
diagram.toPNG()       // → Promise<Blob>  (browser only)`}>
            diagram.{FN('toMermaid')}()   {CMT('// → string')}{'\n'}
            diagram.{FN('toPlantUML')}()  {CMT('// → string')}{'\n'}
            diagram.{FN('toJSON')}()      {CMT('// → string  (serialised DiagramModel)')}{'\n'}
            diagram.{FN('toSVG')}()       {CMT('// → string  (SVG markup)')}{'\n'}
            diagram.{FN('toPNG')}()       {CMT('// → Promise<Blob>  (browser only)')}
          </Code>
        </Section>

        {/* ── React UI ── */}
        <Section id="react-ui" title="React UI component" badge="UI">
          <P>Import from <code style={inlineCode}>flowchart-sequence-designer/ui</code> to keep React out of the bundle for non-UI consumers. The component is a self-contained SVG canvas — no additional CSS import needed.</P>
          <Code raw={`import { DiagramEditor } from 'flowchart-sequence-designer/ui';

// Drop it anywhere — works with zero config
<DiagramEditor />

// Pre-load a model and listen for changes
<DiagramEditor
  initialModel={model}
  onChange={(updated) => save(updated)}
/>

// Full control
<DiagramEditor
  initialModel={model}
  onChange={(m) => save(m)}
  onExport={(fmt, content) => myApi.save(content)}
  height="100%"
  variant="question"
  theme="dark"
  allowedExports={['json', 'svg']}
  allowImport={false}
/>`}>
            {KW('import')} {'{ '}{FN('DiagramEditor')}{' }'} {KW('from')} {STR("'flowchart-sequence-designer/ui'")};{'\n\n'}
            {CMT('// Drop it anywhere — works with zero config')}{'\n'}
            {OP('<')}{TY('DiagramEditor')}{OP(' />')}{'\n\n'}
            {CMT('// Pre-load a model and listen for changes')}{'\n'}
            {OP('<')}{TY('DiagramEditor')}{'\n'}
            {'  '}initialModel{OP('=')}{'{'}model{'}'}{'\n'}
            {'  '}onChange{OP('=')}{'{'}(updated) {OP('=>')} {FN('save')}(updated){'}'}{'\n'}
            {OP('/>')}{'\n\n'}
            {CMT('// Full control')}{'\n'}
            {OP('<')}{TY('DiagramEditor')}{'\n'}
            {'  '}initialModel{OP('=')}{'{'}model{'}'}{'\n'}
            {'  '}onChange{OP('=')}{'{'}(m) {OP('=>')} {FN('save')}(m){'}'}{'\n'}
            {'  '}onExport{OP('=')}{'{'}(fmt, content) {OP('=>')} myApi.{FN('save')}(content){'}'}{'\n'}
            {'  '}height{OP('=')}{STR('"100%"')}{'\n'}
            {'  '}variant{OP('=')}{STR('"question"')}{'\n'}
            {'  '}theme{OP('=')}{STR('"dark"')}{'\n'}
            {'  '}allowedExports{OP('=')}{'{'}[{STR("'json'")}, {STR("'svg'")}]{'}'}{'\n'}
            {'  '}allowImport{OP('=')}{'{'}false{'}'}{'\n'}
            {OP('/>')}
          </Code>

          <h3 style={{ fontSize: 14, fontWeight: 600, color: '#cbd5e1', marginBottom: 8 }}>Variants</h3>
          <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 24, fontSize: 13 }}>
            <thead>
              <tr style={{ background: '#0d1117' }}>
                <th style={thStyle}>Variant</th>
                <th style={thStyle}>Description</th>
              </tr>
            </thead>
            <tbody>
              {[
                ['flowchart', 'General purpose — any shapes, freeform connections'],
                ['question', 'Each node is a question with lettered answer cards, each with its own connection port'],
                ['journey', 'Numbered milestone steps — user path or process walkthrough'],
              ].map(([v, d]) => (
                <tr key={v}>
                  <td style={{ ...tdStyle, fontFamily: 'ui-monospace,monospace', color: '#a5b4fc' }}>{v}</td>
                  <td style={tdStyle}>{d}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Section>

        {/* ── Props ── */}
        <Section id="props" title="Component props">
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ background: '#0d1117' }}>
                <th style={thStyle}>Prop</th>
                <th style={thStyle}>Type</th>
                <th style={thStyle}>Default</th>
                <th style={thStyle}>Description</th>
              </tr>
            </thead>
            <tbody>
              <PropRow name="initialModel" type="DiagramModel" desc="Pre-load a diagram model into the editor" />
              <PropRow name="onChange" type="(m: DiagramModel) => void" desc="Fires on every node/edge mutation" />
              <PropRow name="onExport" type="(fmt, content) => void" desc="Intercept exports instead of auto-downloading" />
              <PropRow name="height" type="string" def='"600"' desc="Any CSS height value" />
              <PropRow name="variant" type="DiagramVariant" def='"flowchart"' desc='"flowchart" | "question" | "journey"' />
              <PropRow name="theme" type="string" def='"auto"' desc='"light" | "dark" | "auto" (follows system)' />
              <PropRow name="allowedExports" type="ExportFormat[]" desc="Restrict visible export buttons" />
              <PropRow name="allowImport" type="boolean" def="true" desc="Show/hide the Import button" />
            </tbody>
          </table>
        </Section>

        {/* ── Types ── */}
        <Section id="types" title="TypeScript types">
          <Code raw={`import type {
  DiagramModel,
  DiagramNode,
  DiagramEdge,
  DiagramVariant,   // 'flowchart' | 'question' | 'journey'
  DiagramType,      // 'flowchart' | 'sequence'
  NodeShape,        // 'rectangle' | 'diamond' | 'circle' | 'parallelogram'
  ExportFormat,     // 'mermaid' | 'plantuml' | 'json' | 'svg' | 'png'
  SequenceMessage,
} from 'flowchart-sequence-designer';`}>
            {KW('import')} {KW('type')} {'{'}{'\n'}
            {'  '}{TY('DiagramModel')},{'\n'}
            {'  '}{TY('DiagramNode')},{'\n'}
            {'  '}{TY('DiagramEdge')},{'\n'}
            {'  '}{TY('DiagramVariant')},   {CMT("// 'flowchart' | 'question' | 'journey'")}{'\n'}
            {'  '}{TY('DiagramType')},      {CMT("// 'flowchart' | 'sequence'")}{'\n'}
            {'  '}{TY('NodeShape')},        {CMT("// 'rectangle' | 'diamond' | 'circle' | 'parallelogram'")}{'\n'}
            {'  '}{TY('ExportFormat')},     {CMT("// 'mermaid' | 'plantuml' | 'json' | 'svg' | 'png'")}{'\n'}
            {'  '}{TY('SequenceMessage')},{'\n'}
            {'}'} {KW('from')} {STR("'flowchart-sequence-designer'")};
          </Code>

          <h3 style={{ fontSize: 14, fontWeight: 600, color: '#cbd5e1', marginBottom: 8 }}>DiagramNode</h3>
          <Code raw={`interface DiagramNode {
  id: string;
  label: string;
  shape?: NodeShape;
  x?: number;
  y?: number;
  metadata?: Record<string, unknown>;
  // question variant: metadata.answers = string[]
}`}>
            {KW('interface')} {TY('DiagramNode')} {'{'}{'\n'}
            {'  '}{TY('id')}: {TY('string')};{'\n'}
            {'  '}{TY('label')}: {TY('string')};{'\n'}
            {'  '}{TY('shape')}{OP('?')}: {TY('NodeShape')};{'\n'}
            {'  '}{TY('x')}{OP('?')}: {TY('number')}; {TY('y')}{OP('?')}: {TY('number')};{'\n'}
            {'  '}{TY('metadata')}{OP('?')}: {TY('Record')}{OP('<')}{TY('string')}, {TY('unknown')}{OP('>')};{'\n'}
            {'  '}{CMT('// question variant: metadata.answers = string[]')}{'\n'}
            {'}'}
          </Code>

          <h3 style={{ fontSize: 14, fontWeight: 600, color: '#cbd5e1', marginBottom: 8 }}>DiagramEdge</h3>
          <Code raw={`interface DiagramEdge {
  id: string;
  from: string;
  to: string;
  label?: string;
  style?: 'solid' | 'dashed' | 'dotted';
  arrowhead?: 'arrow' | 'none' | 'open';
}`}>
            {KW('interface')} {TY('DiagramEdge')} {'{'}{'\n'}
            {'  '}{TY('id')}: {TY('string')};{'\n'}
            {'  '}{TY('from')}: {TY('string')}; {TY('to')}: {TY('string')};{'\n'}
            {'  '}{TY('label')}{OP('?')}: {TY('string')};{'\n'}
            {'  '}{TY('style')}{OP('?')}: {STR("'solid'")} {OP('|')} {STR("'dashed'")} {OP('|')} {STR("'dotted'")};{'\n'}
            {'  '}{TY('arrowhead')}{OP('?')}: {STR("'arrow'")} {OP('|')} {STR("'none'")} {OP('|')} {STR("'open'")};{'\n'}
            {'}'}
          </Code>
        </Section>
      </main>
    </div>
  );
}

// ── shared styles ─────────────────────────────────────────────────────────────
const thStyle: React.CSSProperties = {
  padding: '8px 12px', textAlign: 'left', fontSize: 11, fontWeight: 600,
  color: '#64748b', borderBottom: '1px solid #1e293b', textTransform: 'uppercase', letterSpacing: 0.5,
};
const tdStyle: React.CSSProperties = {
  padding: '8px 12px', color: '#94a3b8', borderBottom: '1px solid #0f172a',
};
const inlineCode: React.CSSProperties = {
  fontFamily: 'ui-monospace,monospace', fontSize: '0.85em',
  background: '#1e293b', padding: '1px 5px', borderRadius: 4, color: '#a5b4fc',
};
function linkPillStyle(bg: string, color: string): React.CSSProperties {
  return {
    display: 'inline-block', padding: '6px 14px', background: bg,
    border: '1px solid #334155', borderRadius: 8, color, fontSize: 12,
    textDecoration: 'none', fontWeight: 500,
  };
}
