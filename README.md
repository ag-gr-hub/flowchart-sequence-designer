# flowchart-sequence-designer

A TypeScript-first Bun/npm package for building and editing flowchart and sequence diagrams — both programmatically via a fluent API and visually via a React drag-and-drop canvas editor.

## Install

```bash
bun add flowchart-sequence-designer
# or
npm install flowchart-sequence-designer
```

React 18+ is a peer dependency for the UI components. The core API has zero runtime dependencies.

---

## Programmatic API

### Flowchart

```ts
import { flowchart } from 'flowchart-sequence-designer';

const diagram = flowchart('Order Flow')
  .node('start',   'Start',           { shape: 'circle' })
  .node('check',   'Payment valid?',  { shape: 'diamond' })
  .node('success', 'Confirm order',   { shape: 'rectangle' })
  .node('fail',    'Reject',          { shape: 'rectangle' })
  .edge('start',   'check')
  .edge('check',   'success', { label: 'Yes' })
  .edge('check',   'fail',    { label: 'No' });

console.log(diagram.toMermaid());
```

#### Node shapes

| Shape | Description |
|---|---|
| `rectangle` | Standard process box (default) |
| `diamond` | Decision / branch |
| `circle` | Start or end terminal |
| `parallelogram` | Input / output |

#### Edge options

```ts
.edge(from, to, {
  label?: string,
  style?: 'solid' | 'dashed' | 'dotted',
  arrowhead?: 'arrow' | 'open' | 'none',
})
```

---

### Sequence diagram

```ts
import { sequence } from 'flowchart-sequence-designer';

const diagram = sequence('Auth Flow')
  .actor('User')
  .actor('Server')
  .message('User',   'Server', 'POST /login')
  .message('Server', 'User',   '200 OK + token', { style: 'dashed' });

console.log(diagram.toMermaid());
```

Actors auto-register from `message()` calls, so you can skip `.actor()` if you prefer.

---

### Export formats

Every builder exposes the same export methods:

```ts
diagram.toMermaid()   // string
diagram.toPlantUML()  // string
diagram.toJSON()      // string (serialised DiagramModel)
diagram.toSVG()       // string (SVG markup)
diagram.toPNG()       // Promise<Blob>  (browser only)
```

---

### Import

```ts
import { fromMermaid, fromJSON } from 'flowchart-sequence-designer';

const model = fromMermaid('graph TD; A-->B; B-->C');
const model2 = fromJSON(jsonString);
```

Round-trip fidelity: `fromMermaid(diagram.toMermaid())` produces an equivalent model.

---

### Working with the model directly

```ts
import { Model } from 'flowchart-sequence-designer';
import type { DiagramModel } from 'flowchart-sequence-designer';

const m = new Model({ type: 'flowchart', nodes: [], edges: [] });
m.addNode({ id: 'a', label: 'Step A', shape: 'rectangle' });
m.addNode({ id: 'b', label: 'Step B', shape: 'rectangle' });
m.addEdge({ id: 'e1', from: 'a', to: 'b', label: 'next' });
```

---

## React UI component

Import from the `/ui` sub-entry to keep React out of the bundle for non-UI consumers:

```tsx
import { DiagramEditor } from 'flowchart-sequence-designer/ui';
```

### Basic usage

```tsx
<DiagramEditor />
```

### All props

```tsx
<DiagramEditor
  initialModel={model}          // pre-load a DiagramModel
  onChange={(m) => save(m)}     // fires on every node/edge change
  onExport={(fmt, content) => …} // intercept exports instead of auto-downloading
  height="100%"                 // any CSS height (default: 600)
  variant="flowchart"           // 'flowchart' | 'question' | 'journey'
  theme="auto"                  // 'light' | 'dark' | 'auto'
  allowedExports={['json','svg']} // restrict visible export buttons
  allowImport={true}            // show/hide the Import button
  themeOverrides={{             // optional per-color overrides
    canvas: '#0b0f1a',
    nodeSelectedFill: '#1f2a44',
  }}
/>
```

---

### Diagram variants

| Variant | Description |
|---|---|
| `flowchart` | General purpose — any shapes, freeform connections |
| `question` | Each node is a question with lettered answer options (A, B, C…). Each answer has its own connection port. |
| `journey` | Numbered milestone steps — user path or process walkthrough |

---

### Editor features

**Canvas**
- Drag nodes to reposition (snaps to 24px grid)
- Scroll to zoom in/out
- Drag the canvas background to pan
- Double-click a node to rename it inline

**Connecting nodes**
- Hover a node to reveal the bottom port dot, then drag it to another node
- Question variant: each answer row has its own port dot — drag it to route that answer to a specific node

**Node Navigator (left panel)**
- Lists all nodes with shape badge, label, and connection counts
- Search/filter by name
- Click any row to jump to that node and center the canvas on it
- Collapses to a slim icon strip

**Step Editor (right panel)**
- Appears when a node is selected
- Edit the node name, change its shape
- Manage branches / answer options (add, remove, reorder)
- Question variant shows connection status per answer

**Context menu** (right-click)
- On canvas: Add node at cursor, Re-center, Undo, Redo
- On node: Rename, Duplicate, Disconnect all edges, Delete

**Keyboard shortcuts**

| Shortcut | Action |
|---|---|
| `Ctrl+Z` | Undo |
| `Ctrl+Y` / `Ctrl+Shift+Z` | Redo |
| `Ctrl+0` | Fit all nodes in view |

**Export / Import**
- Toolbar exports to Mermaid, PlantUML, JSON, SVG, PNG
- Import accepts Mermaid syntax or JSON

---

### Theming

```tsx
<DiagramEditor theme="dark" />    // force dark
<DiagramEditor theme="light" />   // force light
<DiagramEditor theme="auto" />    // follows system prefers-color-scheme (default)
```

To match the editor to a host application's brand, pass `themeOverrides` —
a `Partial<ThemeColors>` that is shallow-merged on top of the resolved
light/dark palette:

```tsx
import { DiagramEditor, type ThemeColors } from 'flowchart-sequence-designer/ui';

const brand: Partial<ThemeColors> = {
  canvas: '#0b1020',
  nodeFill: '#111a2e',
  nodeStroke: '#2b3a5a',
  nodeSelectedFill: '#1a2447',
  edgeColor: '#7b8aa6',
  textPrimary: '#e6edf7',
};

<DiagramEditor theme="dark" themeOverrides={brand} />;
```

Every field on `ThemeColors` (canvas, nodeFill, nodeStroke, edgeColor, panelBg,
inputBg, …) is overridable. Sequence diagrams accept the same prop with a
slightly different shape — `Partial<SequenceThemeColors>` — also exported from
`flowchart-sequence-designer/ui`.

---

### Restricting exports and import

```tsx
// Only allow JSON and SVG download
<DiagramEditor allowedExports={['json', 'svg']} />

// Hide the import button entirely
<DiagramEditor allowImport={false} />

// Handle exports yourself (e.g. send to an API)
<DiagramEditor
  onExport={(format, content) => {
    if (format === 'json') myApi.save(content as string);
  }}
/>
```

---

## Types

```ts
import type {
  DiagramModel,
  DiagramNode,
  DiagramEdge,
  DiagramVariant,
  DiagramType,
  NodeShape,
  ExportFormat,
  SequenceMessage,
} from 'flowchart-sequence-designer';
```

### `DiagramModel`

```ts
interface DiagramModel {
  type: 'flowchart' | 'sequence';
  title?: string;
  nodes: DiagramNode[];
  edges: DiagramEdge[];
  actors?: string[];           // sequence diagrams
  messages?: SequenceMessage[]; // sequence diagrams
}
```

### `DiagramNode`

```ts
interface DiagramNode {
  id: string;
  label: string;
  shape?: 'rectangle' | 'diamond' | 'circle' | 'parallelogram';
  x?: number;
  y?: number;
  metadata?: Record<string, unknown>;
  // question variant: metadata.answers = string[]
}
```

### `DiagramEdge`

```ts
interface DiagramEdge {
  id: string;
  from: string;
  to: string;
  label?: string;
  style?: 'solid' | 'dashed' | 'dotted';
  arrowhead?: 'arrow' | 'none' | 'open';
}
```

---

## Package structure

```
flowchart-sequence-designer/
├── dist/
│   ├── index.js / index.cjs / index.d.ts   ← core (no React)
│   └── ui/
│       └── index.js / index.cjs / index.d.ts ← React UI
└── src/
    ├── core/          # types, Model, FlowchartBuilder, SequenceBuilder
    ├── exporters/     # mermaid, plantuml, json, svg
    ├── importers/     # mermaid, json
    └── ui/            # DiagramEditor, StepEditor, Toolbar, NodeNavigator
```

The `"."` export gives you the core API; `"./ui"` gives you the React components. Consumers that only use the programmatic API never pull in React.

---

## Building from source

```bash
bun install
bun run build    # outputs to dist/
bun test         # runs the test suite
```
