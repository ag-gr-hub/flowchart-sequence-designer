import {
  Section, P, Code, PropRow,
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
  { id: 'react-ui', label: 'React UI' },
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
