import {
  Section, P, Code, PropRow, HowToTable, Kbd,
  KW, STR, CMT, FN, TY, OP,
  inlineCode, thStyle, tdStyle, linkPillStyle,
} from './docs-primitives';
import { FlowchartGuide, QuestionGuide, JourneyGuide, SequenceGuide } from './DiagramGuides';

const GITHUB = 'https://github.com/ag-gr-hub/flowchart-sequence-designer';
const NPM = 'https://www.npmjs.com/package/flowchart-sequence-designer';

// ── nav sidebar ───────────────────────────────────────────────────────────────
type NavEntry = { id: string; label: string } | { group: string };

const NAV: NavEntry[] = [
  { id: 'install', label: 'Install' },
  { group: 'Diagram guides' },
  { id: 'flowchart-guide', label: 'Flowchart' },
  { id: 'question-guide', label: 'Question' },
  { id: 'journey-guide', label: 'Journey' },
  { id: 'sequence-guide', label: 'Sequence' },
  { group: 'Builder APIs' },
  { id: 'flowchart-api', label: 'flowchart()' },
  { id: 'sequence-api', label: 'sequence()' },
  { id: 'model-api', label: 'Model (low-level)' },
  { group: 'Reference' },
  { id: 'import', label: 'Import' },
  { id: 'export', label: 'Export formats' },
  { id: 'presets', label: 'Presets' },
  { id: 'react-ui', label: 'React UI' },
  { id: 'theming', label: 'Theming' },
  { id: 'a11y', label: 'Accessibility & touch' },
  { id: 'shortcuts', label: 'Keyboard shortcuts' },
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
        width: 220, flexShrink: 0, borderRight: '1px solid #1e293b',
        overflowY: 'auto', padding: '28px 0',
        background: '#0d1421',
      }}>
        <div style={{ padding: '0 16px 16px', fontSize: 10, fontWeight: 700, color: '#475569', letterSpacing: 1, textTransform: 'uppercase' }}>
          Documentation
        </div>
        {NAV.map((n, i) => {
          if ('group' in n) {
            return (
              <div key={`g-${i}`} style={{
                padding: '14px 16px 4px', fontSize: 10, fontWeight: 700,
                color: '#475569', letterSpacing: 1, textTransform: 'uppercase',
              }}>
                {n.group}
              </div>
            );
          }
          return (
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
          );
        })}
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
        {/* Supported Frameworks */}
        <div style={{ marginBottom: 32, padding: '16px 20px', background: '#0d1421', border: '1px solid #1e293b', borderRadius: 10 }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: '#475569', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 10 }}>
            Supported Frameworks
          </div>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            <a href="https://ag-gr-hub.github.io/flowchart-sequence-designer/"
              style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '6px 14px', background: '#4f46e520', border: '1px solid #4f46e5', borderRadius: 8, color: '#a5b4fc', fontSize: 12, fontWeight: 600, textDecoration: 'none' }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="12" r="2"/><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8z" opacity="0"/><path d="M12 21.5c1.1 0 3.24-2.03 4.17-5.5H7.83c.93 3.47 3.07 5.5 4.17 5.5M7.83 8C6.93 11.47 6.93 12.53 7.83 16h8.34c.9-3.47.9-4.53 0-8H7.83z" opacity="0"/><ellipse cx="12" cy="12" rx="11" ry="4.2" fill="none" stroke="currentColor" strokeWidth="1"/><ellipse cx="12" cy="12" rx="11" ry="4.2" fill="none" stroke="currentColor" strokeWidth="1" transform="rotate(60 12 12)"/><ellipse cx="12" cy="12" rx="11" ry="4.2" fill="none" stroke="currentColor" strokeWidth="1" transform="rotate(120 12 12)"/></svg>
              React (current)
            </a>
            <a href="https://ag-gr-hub.github.io/flowchart-sequence-designer-angular/"
              style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '6px 14px', background: '#1e293b', border: '1px solid #334155', borderRadius: 8, color: '#94a3b8', fontSize: 12, fontWeight: 500, textDecoration: 'none' }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2L2 7l1.63 14.27L12 22l8.37-3.73L22 7L12 2zm0 2.21l6.9 3.33-.98 8.56L12 19.77l-5.92-3.67-.98-8.56L12 4.21z"/></svg>
              Angular
            </a>
          </div>
        </div>

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
          <P>
            Four diagram types ship in one package — pick the one that fits the story you're telling.
            Each gets its own deep-dive guide below.
          </P>
        </Section>

        {/* ── Diagram guides (one per variant) ── */}
        <FlowchartGuide />
        <QuestionGuide />
        <JourneyGuide />
        <SequenceGuide />

        {/* ── Flowchart API ── */}
        <Section id="flowchart-api" title="flowchart() — builder reference" badge="programmatic">
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
            {KW('const')} diagram {OP('=')} {FN('flowchart')}({STR("'Order Flow'")}){'\n'}
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
        <Section id="sequence-api" title="sequence() — builder reference" badge="programmatic">
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
          <P>Parse existing Mermaid or JSON into a live model. Round-trip fidelity is guaranteed: <code style={inlineCode}>fromMermaid(diagram.toMermaid())</code> produces an equivalent model. The editor's <strong>↑ Import</strong> button opens a modal with paste + file upload that calls these under the hood.</P>
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

          <h3 style={{ fontSize: 14, fontWeight: 600, color: '#cbd5e1', marginBottom: 8, marginTop: 20 }}>Round-trip rules</h3>
          <P>The five formats trade fidelity for portability. Use this table to pick the one that matches what you need.</P>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, marginBottom: 20 }}>
            <thead>
              <tr style={{ background: '#0d1117' }}>
                <th style={thStyle}>Format</th>
                <th style={thStyle}>Round-trip</th>
                <th style={thStyle}>Preserved</th>
                <th style={thStyle}>Dropped</th>
              </tr>
            </thead>
            <tbody>
              {[
                ['JSON', 'full', 'every field — variant, metadata, waypoint, x/y, arrowheads, message order', 'nothing'],
                ['Mermaid (flowchart)', 'partial', 'shapes, labels, connectors (-->, -.->, ---, -.-), edge labels, subgraph → metadata.group', 'positions, waypoint, metadata.answers, variant. Dotted collapses to dashed.'],
                ['Mermaid (sequence)', 'partial', 'actor order, message arrows (->>, -->>), labels', 'message metadata, styling overrides'],
                ['PlantUML (flowchart)', 'export-only', 'edge styles (--> / -[dashed]-> / -[dotted]->), labels, node ids', 'shape distinctions, positions, metadata, variant'],
                ['PlantUML (sequence)', 'export-only', 'actor order, message style (->, -->), labels', '—'],
                ['SVG', 'export-only (rendered)', 'full visual parity with the canvas', '—'],
                ['PNG (browser-only)', 'export-only (rendered)', 'same as SVG, rasterized at devicePixelRatio', '—'],
              ].map(([fmt, rt, kept, dropped]) => (
                <tr key={fmt}>
                  <td style={{ ...tdStyle, fontFamily: 'ui-monospace,monospace', color: '#a5b4fc', whiteSpace: 'nowrap' }}>{fmt}</td>
                  <td style={{ ...tdStyle, fontWeight: 500, color: '#cbd5e1' }}>{rt}</td>
                  <td style={tdStyle}>{kept}</td>
                  <td style={tdStyle}>{dropped}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <P>If you need 100% fidelity, use JSON. If you need a format GitHub renders inline in markdown, use Mermaid. If you need a polished image for docs, use SVG or PNG.</P>
        </Section>

        {/* ── Presets ── */}
        <Section id="presets" title="Presets & empty models">
          <P>The editor mounts with a real working diagram so consumers immediately see styled nodes and edges. Reach for <code style={inlineCode}>emptyModel(type)</code> to start blank, or call a <code style={inlineCode}>preset*Model()</code> helper from your own code to hydrate the same example data.</P>
          <Code raw={`import {
  presetFlowchartModel,
  presetSequenceModel,
  emptyModel,
} from 'flowchart-sequence-designer/ui';

presetFlowchartModel('flowchart')  // 6-node order flow with one decision
presetFlowchartModel('question')   // 1-question / 3-answer router
presetFlowchartModel('journey')    // 5-step onboarding sequence
presetSequenceModel()              // 3-actor login handshake

emptyModel('flowchart')                  // blank flowchart
emptyModel('flowchart', 'journey')       // blank journey-variant flowchart
emptyModel('sequence')                   // blank sequence diagram`}>
            {KW('import')} {'{'}{'\n'}
            {'  '}{FN('presetFlowchartModel')},{'\n'}
            {'  '}{FN('presetSequenceModel')},{'\n'}
            {'  '}{FN('emptyModel')},{'\n'}
            {'}'} {KW('from')} {STR("'flowchart-sequence-designer/ui'")};{'\n\n'}
            {FN('presetFlowchartModel')}({STR("'flowchart'")})  {CMT('// 6-node order flow')}{'\n'}
            {FN('presetFlowchartModel')}({STR("'question'")})   {CMT('// 1-question / 3-answer router')}{'\n'}
            {FN('presetFlowchartModel')}({STR("'journey'")})    {CMT('// 5-step onboarding')}{'\n'}
            {FN('presetSequenceModel')}()              {CMT('// 3-actor login handshake')}{'\n\n'}
            {FN('emptyModel')}({STR("'flowchart'")}){'\n'}
            {FN('emptyModel')}({STR("'flowchart'")}, {STR("'journey'")}){'\n'}
            {FN('emptyModel')}({STR("'sequence'")})
          </Code>
          <P>All presets return a deep clone — mutate the result freely without affecting future calls.</P>
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

        {/* ── Theming ── */}
        <Section id="theming" title="Theming" badge="UI">
          <P>The editor ships with a slate-based light/dark palette and follows the OS preference by default. To brand-match without forking, pass <code style={inlineCode}>themeOverrides</code> — a <code style={inlineCode}>Partial&lt;ThemeColors&gt;</code> shallow-merged on top of the resolved palette.</P>
          <Code raw={`import { DiagramEditor, type ThemeColors } from 'flowchart-sequence-designer/ui';

const brand: Partial<ThemeColors> = {
  canvas: '#0b1020',
  nodeFill: '#111a2e',
  nodeStroke: '#2b3a5a',
  nodeSelectedFill: '#1a2447',
  edgeColor: '#7b8aa6',
  textPrimary: '#e6edf7',
};

<DiagramEditor theme="dark" themeOverrides={brand} />;`}>
            {KW('import')} {'{ '}{FN('DiagramEditor')}, {KW('type')} {TY('ThemeColors')}{' }'} {KW('from')} {STR("'flowchart-sequence-designer/ui'")};{'\n\n'}
            {KW('const')} brand: {TY('Partial')}{OP('<')}{TY('ThemeColors')}{OP('>')} {OP('=')} {'{'}{'\n'}
            {'  '}canvas: {STR("'#0b1020'")},{'\n'}
            {'  '}nodeFill: {STR("'#111a2e'")},{'\n'}
            {'  '}nodeStroke: {STR("'#2b3a5a'")},{'\n'}
            {'  '}nodeSelectedFill: {STR("'#1a2447'")},{'\n'}
            {'  '}edgeColor: {STR("'#7b8aa6'")},{'\n'}
            {'  '}textPrimary: {STR("'#e6edf7'")},{'\n'}
            {'};'}{'\n\n'}
            {OP('<')}{TY('DiagramEditor')} theme{OP('=')}{STR('"dark"')} themeOverrides{OP('=')}{'{'}brand{'}'} {OP('/>')};
          </Code>

          <h3 style={{ fontSize: 14, fontWeight: 600, color: '#cbd5e1', marginBottom: 8, marginTop: 16 }}>ThemeColors tokens (flowchart)</h3>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, marginBottom: 24 }}>
            <thead>
              <tr style={{ background: '#0d1117' }}>
                <th style={thStyle}>Token group</th>
                <th style={thStyle}>Members</th>
                <th style={thStyle}>Where it shows up</th>
              </tr>
            </thead>
            <tbody>
              {[
                ['Canvas', 'canvas, dot', 'Background + dot grid'],
                ['Nodes', 'nodeFill, nodeStroke, nodeSelectedFill', 'Node body, border, selection tint'],
                ['Edges', 'edgeColor', 'Edge stroke + arrowhead'],
                ['Type ramp', 'textPrimary, textSecondary, textMuted', 'Labels, hints, secondary text'],
                ['Chrome — panel', 'panelBg, panelBorder', 'Side panel surface'],
                ['Chrome — controls', 'ctrlsBg, ctrlsBorder', 'Toolbar, zoom controls'],
                ['Chrome — input', 'inputBg, inputBorder, inputText', 'Form fields in the side panel'],
                ['Chrome — card', 'cardBg, cardBorder', 'Answer rows, branch rows'],
                ['Chrome — section', 'sectionBorder', 'Divider between panel sections'],
                ['Buttons', 'btnSecBg, btnSecText, shapeBtnBg, shapeBtnBorder', 'Secondary buttons, shape picker'],
                ['Accents', 'addFormBg, bannerBg, labelText, hintText, statusBg', 'Add-form backdrop, validation banner'],
              ].map(([g, m, w]) => (
                <tr key={g}>
                  <td style={{ ...tdStyle, fontWeight: 500, color: '#cbd5e1', whiteSpace: 'nowrap' }}>{g}</td>
                  <td style={{ ...tdStyle, fontFamily: 'ui-monospace,monospace', color: '#a5b4fc' }}>{m}</td>
                  <td style={tdStyle}>{w}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <h3 style={{ fontSize: 14, fontWeight: 600, color: '#cbd5e1', marginBottom: 8 }}>SequenceThemeColors tokens (sequence)</h3>
          <P>The sequence editor accepts the same prop with a slightly different shape: <code style={inlineCode}>Partial&lt;SequenceThemeColors&gt;</code>. It drops node-specific tokens and adds <code style={inlineCode}>lifeline</code>, <code style={inlineCode}>arrow</code>, and <code style={inlineCode}>actorFill / actorStroke / actorText</code> for the swim-lane elements.</P>
        </Section>

        {/* ── Accessibility & touch ── */}
        <Section id="a11y" title="Accessibility & touch" badge="UI">
          <P>The editor is keyboard-first and screen-reader-aware. Every interaction reachable by mouse has a keyboard equivalent; every state change announces via a polite <code style={inlineCode}>aria-live</code> region.</P>

          <h3 style={{ fontSize: 14, fontWeight: 600, color: '#cbd5e1', marginBottom: 8, marginTop: 16 }}>Keyboard navigation</h3>
          <P>Every node, port, and toolbar control is reachable with <Kbd>Tab</Kbd>; selection moves with <Kbd>Arrow</Kbd> keys (1 grid unit, or 4 with <Kbd>Shift</Kbd>); <Kbd>Alt+Arrow</Kbd> traverses the graph to the nearest connected neighbor in that direction. The focus ring is visible at all times — no <em>:focus</em> hiding. See <a href="#shortcuts" style={{ color: '#a5b4fc' }}>Keyboard shortcuts</a> for the full list.</P>

          <h3 style={{ fontSize: 14, fontWeight: 600, color: '#cbd5e1', marginBottom: 8 }}>ARIA roles</h3>
          <P>The canvas is an <code style={inlineCode}>application</code> region with an <code style={inlineCode}>aria-label</code>; selection, add, and delete actions update an <code style={inlineCode}>aria-live="polite"</code> status region announced as "Selected {'{label}'}", "Added node {'{label}'}", etc. The toolbar uses native <code style={inlineCode}>{'<button>'}</code> elements with explicit labels.</P>

          <h3 style={{ fontSize: 14, fontWeight: 600, color: '#cbd5e1', marginBottom: 8 }}>Reduced motion</h3>
          <P>The animated edge-flow dash honours <code style={inlineCode}>prefers-reduced-motion</code> — when set, the dash freezes and the canvas renders with no animation.</P>

          <h3 style={{ fontSize: 14, fontWeight: 600, color: '#cbd5e1', marginBottom: 8 }}>Touch</h3>
          <HowToTable rows={[
            ['Pan', <>One-finger drag on the canvas background.</>],
            ['Zoom', <>Two-finger pinch.</>],
            ['Context menu', <>Long-press (~550 ms) on the canvas or on a node.</>],
            ['Larger hit targets', <>Port circles auto-enlarge on coarse-pointer devices (24 px vs. 14 px on mouse).</>],
            ['Drag node', <>Press and drag the node body. The 8 px drag threshold lets you tap to select without nudging.</>],
          ]} />
        </Section>

        {/* ── Shortcuts ── */}
        <Section id="shortcuts" title="Keyboard shortcuts" badge="UI">
          <P>Every editor shortcut is keyboard-only — the same actions are also reachable via right-click menus and toolbar buttons.</P>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, marginBottom: 12 }}>
            <thead>
              <tr style={{ background: '#0d1117' }}>
                <th style={thStyle}>Shortcut</th>
                <th style={thStyle}>Action</th>
              </tr>
            </thead>
            <tbody>
              {[
                ['Ctrl+Z', 'Undo'],
                ['Ctrl+Y / Ctrl+Shift+Z', 'Redo'],
                ['Ctrl+0', 'Fit all nodes in view'],
                ['Ctrl+C / Ctrl+V', 'Copy / paste selection (internal edges preserved, +24 px offset)'],
                ['Ctrl+D', 'Duplicate selection'],
                ['Delete / Backspace', 'Remove selection'],
                ['Escape', 'Deselect, cancel edge drag, close context menu'],
                ['Arrow keys', 'Nudge selection 1 grid unit (Shift = 4 units)'],
                ['Alt+Arrow', 'Traverse to nearest node in that direction'],
                ['Shift+click', 'Toggle a node in/out of selection'],
                ['Shift+drag (canvas)', 'Box-select — adds intersected nodes to selection'],
                ['Double-click edge label', 'Rename edge label inline'],
                ['Drag edge midpoint', 'Route edge through a waypoint'],
              ].map(([k, a]) => (
                <tr key={k}>
                  <td style={{ ...tdStyle, fontFamily: 'ui-monospace,monospace', color: '#a5b4fc', whiteSpace: 'nowrap' }}>{k}</td>
                  <td style={tdStyle}>{a}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <P><strong style={{ color: '#cbd5e1' }}>Touch:</strong> one-finger pan, two-finger pinch-zoom, long-press (~550 ms) opens the canvas context menu. Port circles are larger on coarse-pointer devices.</P>
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
              <PropRow name="themeOverrides" type="Partial<ThemeColors>" desc="Brand-match the editor by overriding any palette entries" />
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
  waypoint?: { x: number; y: number };
}`}>
            {KW('interface')} {TY('DiagramEdge')} {'{'}{'\n'}
            {'  '}{TY('id')}: {TY('string')};{'\n'}
            {'  '}{TY('from')}: {TY('string')}; {TY('to')}: {TY('string')};{'\n'}
            {'  '}{TY('label')}{OP('?')}: {TY('string')};{'\n'}
            {'  '}{TY('style')}{OP('?')}: {STR("'solid'")} {OP('|')} {STR("'dashed'")} {OP('|')} {STR("'dotted'")};{'\n'}
            {'  '}{TY('arrowhead')}{OP('?')}: {STR("'arrow'")} {OP('|')} {STR("'none'")} {OP('|')} {STR("'open'")};{'\n'}
            {'  '}{TY('waypoint')}{OP('?')}: {'{ '}{TY('x')}: {TY('number')}; {TY('y')}: {TY('number')} {'}'};{'\n'}
            {'}'}
          </Code>
        </Section>
      </main>
    </div>
  );
}
