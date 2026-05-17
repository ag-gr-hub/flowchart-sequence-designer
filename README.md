# flowchart-sequence-designer

A TypeScript-first Bun/npm package for building and editing flowchart and sequence diagrams — both programmatically via a fluent API and visually via a React drag-and-drop canvas editor.

**🔗 [Live demo & developer docs →](https://ag-gr-hub.github.io/flowchart-sequence-designer/)**
Open it to drive the editor, switch variants (Flowchart / Question / Journey / Sequence), and copy the same API snippets shown below straight from the docs tab. Every variant boots with a working sample diagram so you can poke without any setup.

## Quick start

```tsx
import { DiagramEditor } from 'flowchart-sequence-designer/ui';

export default function App() {
  return <DiagramEditor height={520} onChange={(m) => console.log(m)} />;
}
```

That's it — no provider, no theme setup, no required props. The editor
mounts with a sample diagram, a working toolbar, undo/redo, drag-to-pan,
scroll-to-zoom, and export buttons for Mermaid / PlantUML / JSON / SVG /
PNG. Pass `theme="dark"` or `themeOverrides={…}` to brand-match, or
`initialModel={emptyModel('flowchart')}` to start blank.

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

### Exporter / importer round-trip rules

The five export formats trade fidelity for portability. Use this table to
pick the one that matches what you need:

| Format | Round-trip | Preserved | Dropped or lossy |
|---|---|---|---|
| **JSON** | ✅ full | every field — `variant`, `metadata`, `waypoint`, x/y positions, edge arrowheads, message order | nothing |
| **Mermaid (flowchart)** | partial | node shapes (`[]` `{}` `(())` `[/]`), labels, edge connectors (`-->`, `-.->`, `---`, `-.-`), edge labels, `subgraph` → `metadata.group` | positions, `waypoint`, `metadata.answers`, `variant`. Dotted edges collapse to dashed. |
| **Mermaid (sequence)** | partial | actor order, message arrows (`->>`, `-->>`), labels | message metadata, styling overrides |
| **PlantUML (flowchart)** | export-only | edge styles (`-->` / `-[dashed]->` / `-[dotted]->`), labels, node id | shape distinctions (PlantUML state-diagram syntax is coarser), positions, `metadata`, `variant` |
| **PlantUML (sequence)** | export-only | actor order, message style (`->`, `-->`), labels | – |
| **SVG** | export-only (rendered) | full visual parity with the canvas — same dot grid, same edge curves, same node styling | – |
| **PNG** | export-only (rendered, **browser-only**) | same as SVG, rasterized at `devicePixelRatio` | – |

If you need 100% round-trip fidelity, use JSON. If you need a format that
GitHub renders inline in markdown, use Mermaid. If you need a polished
image for documentation, use SVG or PNG.

---

### Presets

```ts
import {
  presetFlowchartModel,
  presetSequenceModel,
  emptyModel,
} from 'flowchart-sequence-designer/ui';

presetFlowchartModel('flowchart')  // 6-node order flow with one decision
presetFlowchartModel('question')   // 1-question / 3-answer router
presetFlowchartModel('journey')    // 5-step onboarding sequence
presetSequenceModel()              // 3-actor login handshake

emptyModel('flowchart')            // { type:'flowchart', variant:'flowchart', nodes:[], edges:[] }
emptyModel('flowchart', 'journey') // same with variant: 'journey'
emptyModel('sequence')             // { type:'sequence', nodes:[], edges:[], actors:[], messages:[] }
```

All presets return a deep clone — mutate the result freely.

---

### Working with the model directly

```ts
import { Model } from 'flowchart-sequence-designer';

const m = new Model('flowchart');         // new Model(type, title?, variant?)
m.addNode({ id: 'a', label: 'Step A', shape: 'rectangle' });
m.addNode({ id: 'b', label: 'Step B', shape: 'rectangle' });
m.addEdge({ id: 'e1', from: 'a', to: 'b', label: 'next' });

// Rehydrate from a saved DiagramModel:
// const m2 = Model.fromData(savedJson);
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

Mounted without an `initialModel` the editor boots with a small working
sample diagram for the chosen `variant` — a 6-node order-flow for
`flowchart`, a role-picker for `question`, a 5-step onboarding for
`journey`, and a 3-actor login handshake for the `SequenceEditor`. This
gives anyone evaluating the package something to interact with from the
first render. To start blank instead:

```tsx
import { DiagramEditor, emptyModel } from 'flowchart-sequence-designer/ui';

<DiagramEditor initialModel={emptyModel('flowchart')} />
```

The presets are also exported in case you want to hydrate them from your
own code: `presetFlowchartModel(variant?)` and `presetSequenceModel()`.

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
- Scroll to zoom in/out (pinch to zoom on touch)
- Drag the canvas background to pan (one-finger pan on touch)
- Double-click a node to rename it inline
- Dashed alignment guides appear when a dragged node lines up with a sibling's edge or center, and it snaps within 4 px
- Bottom-right minimap — click or drag to pan the viewport
- Accessibility: every node, port, and control is keyboard-reachable with a visible focus ring; selection / add / delete actions announce via an `aria-live` status region; the edge-flow animation honours `prefers-reduced-motion`

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
- On edge: Style (solid/dashed/dotted), Arrowhead, Reset routing, Delete
- On touch devices: long-press the canvas (~550ms) opens the canvas menu

**Keyboard shortcuts**

| Shortcut | Action |
|---|---|
| `Ctrl+Z` | Undo |
| `Ctrl+Y` / `Ctrl+Shift+Z` | Redo |
| `Ctrl+0` | Fit all nodes in view |
| `Ctrl+C` / `Ctrl+V` | Copy and paste the current selection (internal edges preserved, +24 px offset on paste) |
| `Ctrl+D` | Duplicate the current selection |
| `Delete` / `Backspace` | Remove the current selection |
| `Escape` | Deselect, cancel in-flight edge drag, close context menu |
| `Arrow` keys | Nudge selection by 1 grid unit (Shift = 4 units) |
| `Alt+Arrow` | Traverse to the nearest node in that direction from the current selection |
| `Shift+click` | Toggle a node in/out of the current selection |
| `Shift+drag` (empty canvas) | Box-select — add every intersected node to the selection |
| Double-click edge label | Rename the edge label inline |
| Drag edge midpoint | Route the edge through a waypoint (right-click → Reset routing to clear) |

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

### SequenceEditor

`<DiagramEditor>` auto-delegates to `<SequenceEditor>` when handed a
sequence model, but you can also mount it directly to avoid the
type-check redirect:

```tsx
import { SequenceEditor, presetSequenceModel } from 'flowchart-sequence-designer/ui';

<SequenceEditor
  initialModel={presetSequenceModel()}
  height={520}
  theme="dark"
  onChange={(m) => save(m)}
/>
```

**SequenceEditor props** (mirrors `DiagramEditorProps` minus `variant`):

| Prop | Type | Default | Notes |
|---|---|---|---|
| `initialModel` | `DiagramModel` | preset | Must have `type: 'sequence'`. Falls back to the preset if a non-sequence model is passed. |
| `onChange` | `(m: DiagramModel) => void` | – | Fires on every committed mutation. |
| `onExport` | `(format, content) => void` | download | Receives string for text formats, `Blob` for PNG. |
| `height` | `number \| string` | `600` | Any CSS height. |
| `allowedExports` | `ExportFormat[]` | all | Whitelist of toolbar export buttons. |
| `allowImport` | `boolean` | `true` | Show the Import button. |
| `theme` | `'light' \| 'dark' \| 'auto'` | `'auto'` | `auto` follows OS `prefers-color-scheme`. |
| `themeOverrides` | `Partial<SequenceThemeColors>` | – | Per-property palette overrides. |

**Sequence-specific interactions:**
- Drag a message row by its handle to reorder messages.
- Double-click a message label to rename inline.
- Drag the column header of an actor to reorder lifelines.

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

### Core entry (`flowchart-sequence-designer`)

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
  ValidationError,
} from 'flowchart-sequence-designer';

import {
  Model,                 // class — build / query / validate diagrams
  flowchart,             // fluent FlowchartBuilder factory
  sequence,              // fluent SequenceBuilder factory
  toMermaid, fromMermaid,
  toPlantUML,
  toJSON, fromJSON,
  toSVG, toPNG,
} from 'flowchart-sequence-designer';
```

### UI entry (`flowchart-sequence-designer/ui`)

```ts
import {
  DiagramEditor,         // flowchart / question / journey editor
  SequenceEditor,        // sequence diagram editor
  Toolbar,               // standalone toolbar (used internally)
  StepEditor,            // node property panel (used internally)
  presetFlowchartModel,  // starter model for flowchart variants
  presetSequenceModel,   // starter model for sequence
  emptyModel,            // blank model factory
} from 'flowchart-sequence-designer/ui';

import type {
  DiagramEditorProps,
  SequenceEditorProps,
  ThemeColors,           // flowchart theme palette
  SequenceThemeColors,   // sequence theme palette
} from 'flowchart-sequence-designer/ui';
```

### `DiagramModel`

```ts
interface DiagramModel {
  type: 'flowchart' | 'sequence';
  variant?: DiagramVariant;    // 'flowchart' | 'question' | 'journey' (flowchart-type only)
  title?: string;
  nodes: DiagramNode[];        // always present (empty array for sequence models)
  edges: DiagramEdge[];        // always present (empty array for sequence models)
  actors?: string[];           // sequence models only — ordered actor names
  messages?: SequenceMessage[]; // sequence models only — ordered messages
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
  waypoint?: { x: number; y: number }; // manual routing point (JSON only)
}
```

### `SequenceMessage`

```ts
interface SequenceMessage {
  id: string;
  from: string;            // actor name
  to: string;              // actor name
  label: string;
  style?: 'solid' | 'dashed';
}
```

### `ValidationError`

```ts
interface ValidationError {
  kind: 'dangling-from' | 'dangling-to' | 'duplicate-node-id' | 'duplicate-edge-id';
  id: string;
  message: string;
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
    ├── exporters/     # mermaid, plantuml, json, svg, png
    ├── importers/     # mermaid, json
    └── ui/            # DiagramEditor, SequenceEditor, Toolbar, hooks
```

The `"."` export gives you the core API; `"./ui"` gives you the React components. Consumers that only use the programmatic API never pull in React.

---

## Building from source

```bash
bun install
bun run build    # outputs to dist/
bun test         # runs the test suite
```
