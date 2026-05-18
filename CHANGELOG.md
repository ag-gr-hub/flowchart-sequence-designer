# Changelog

All notable changes to `flowchart-sequence-designer` are documented here.
Format: [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).
Versioning: [Semantic Versioning](https://semver.org/).

## [Unreleased]

## [1.2.2] - 2026-05-18

### Fixed
- Resolved all CodeQL security alerts: incomplete multi-character sanitization
  (while loops), polynomial regex backtracking (bounded quantifiers, negated
  character classes), and unused variable warnings.
- Fixed ESLint `no-useless-escape` error in mermaid parser EDGE_RE.

## [1.2.1] - 2026-05-18

### Fixed
- Bumped Vite in demo from ^5.4.2 to ^6.4.2 to resolve CVE-2026-39365
  (path traversal in optimized deps `.map` handling).
- Fixed CI publish workflow: added `actions/setup-node` with `registry-url`
  for proper npm authentication, and `contents: write` permission for
  GitHub Release creation.

## [1.2.0] - 2026-05-18

### Added
- Input sanitization module (`src/core/sanitize.ts`): `sanitizeLabel()`,
  `sanitizeURL()`, `sanitizeForSVG()` — strips HTML tags, dangerous URI
  schemes, event handlers, and control characters.
- Resource exhaustion limits: MAX_NODES=500, MAX_EDGES=2000, MAX_ACTORS=100,
  MAX_MESSAGES=2000, MAX_IMPORT_LENGTH=2MB.
- JSON importer validates schema and strips `__proto__`/`constructor`/`prototype`
  keys to prevent prototype pollution.
- `SECURITY.md` — vulnerability disclosure policy.
- ESLint + Prettier dev tooling with flat config.
- CI pipeline: typecheck, lint, format check, test, build, bundle size gate.
- CodeQL weekly security scanning + on PRs.
- Auto-publish to npm on `v*` tag push (with GitHub Release).
- Dependabot for npm + GitHub Actions dependencies (weekly).
- `noUncheckedIndexedAccess` in tsconfig for stricter type safety.
- CSP meta tag in demo site.
- 28 new security tests (105 total).

## [1.1.0] - 2026-05-17

### Added
- Toast notification system (`useToast` hook + `ToastContainer`) for
  import/export success/failure feedback in both editors. Replaces silent
  failures and `alert()` with auto-dismissing colored toasts.
- Keyboard accessibility on SVG canvas nodes (`DiagramCanvas`): nodes are
  now focusable (`tabIndex=0`) with visual focus highlight, F2/Enter to
  rename in-place. Delete handled by existing global keyboard handler.
- Keyboard accessibility on sequence actors (`SequenceCanvas`): actor text
  is focusable with F2/Enter rename activation and keyboard-accessible
  remove button.
- ARIA labels on all Toolbar export/import buttons.
- Focus-visible CSS rings for SVG `[role="button"]` elements in both
  DiagramEditor and SequenceEditor.
- `className="fsd-seq-editor"` on SequenceEditor root for CSS targeting.
- JSDoc comments on all `demo/src/docs-primitives.tsx` helper components.
- `themeOverrides` prop on `DiagramEditor` and `SequenceEditor` — a
  `Partial<ThemeColors>` (or `Partial<SequenceThemeColors>`) shallow-merged on
  top of the resolved light/dark palette so consumers can match the editor to
  their brand without forking. `ThemeColors` and `SequenceThemeColors` are now
  exported from `flowchart-sequence-designer/ui`.
- Multi-selection on the canvas. `Shift+click` a node to toggle it in/out of
  the selection. `Shift+drag` on the empty canvas runs a box-select (adds
  every intersected node to the current selection). `Delete`, `Ctrl+D`, and
  arrow-key nudging now apply to every selected node. Dragging any selected
  node moves the whole group. The Delete button in the controls bar shows the
  current count when more than one node is selected.
- `Ctrl+C` / `Ctrl+V` copy and paste. Copy snapshots the selected nodes plus
  the edges that connect them, paste materializes fresh IDs offset by 24px
  and re-selects the new nodes.
- Alignment guides and snap-to-sibling. When dragging a single node, dashed
  indigo guide lines appear whenever its left/center/right or top/middle/
  bottom edge lines up with another node, and the position snaps within a
  4-pixel threshold. Group drags preserve relative offsets and skip the snap.
- Edge waypoint rerouting. Hover an edge to reveal a handle at its midpoint;
  drag it to set a manual routing waypoint and the edge re-renders as two
  smooth bezier segments through that point. `DiagramEdge.waypoint` is
  persisted in JSON exports and ignored by the Mermaid / PlantUML serializers
  (those formats don't encode routing). Right-click an edge → "Reset routing"
  to clear the waypoint.
- Touch long-press opens the canvas context menu (Add node here, Re-center,
  Undo, Redo). Significant finger movement cancels the gesture.
- Port circles grow from 6 to 9 px on `(pointer: coarse)` devices and stay
  permanently visible (instead of fading in on hover) so they're tappable on
  touch.
- `Alt+Arrow` traverses the graph from the currently selected node — picks the
  nearest sibling in the chosen direction (45° cone, Euclidean nearest). Plain
  arrow keys still nudge as before; the `Alt` modifier disambiguates.
- Focus-visible outlines on every focusable control inside the editor (buttons,
  inputs, role="button" nodes, the canvas itself) using the active accent
  color, so keyboard users always see where focus lives.
- `bun run analyze` — esbuild-metafile bundle analyzer that prints minified
  bundle size + top input contributors per entry point, and writes
  `dist/.metafile-{core,ui}.json` for a visual treemap on
  esbuild.github.io/analyze. Useful before shipping any bundle-shape change.
- Built-in sample diagrams. `DiagramEditor` and `SequenceEditor` now fall
  back to a small working preset when mounted without `initialModel` — a
  6-node order-flow for the flowchart variant, a 3-answer role picker for
  question, a 5-step onboarding for journey, and a 3-actor login handshake
  for sequence. New exports `presetFlowchartModel(variant?)`,
  `presetSequenceModel()`, and `emptyModel(type, variant?)` (the latter is
  the opt-out for consumers who explicitly want a blank canvas).
- Demo (live site) gains a Sequence tab so all four variants are
  reachable from the same nav, each booting with its preset diagram.
- Import dialog. Clicking **↑ Import** in the toolbar now opens a proper
  modal with a paste-area, a file picker (`.json` / `.mmd` / `.mermaid` /
  `.txt`), live format detection (`{` → JSON, otherwise Mermaid), error
  feedback, focus trap, and Esc/backdrop dismissal. Replaces the previous
  `window.prompt()` one-liner that couldn't fit a multi-line Mermaid graph
  or accept file uploads at all.

### Changed
- Internal refactor: the 1500-line `DiagramEditor.tsx` monolith is split into
  focused modules (`layout.ts`, `theme.ts`, `render.tsx`, `NodeNavigator.tsx`,
  `ContextMenu.tsx`, `hooks/useHistory.ts`, `hooks/useSystemTheme.ts`). No
  public API or visual change — the file is now ~770 lines and the render
  layer can be imported in isolation.
- Further refactor: extracted three more canvas hooks —
  `hooks/useCanvasWheel.ts` (cursor-anchored zoom), `hooks/useCanvasTouch.ts`
  (pan/pinch/long-press), and `hooks/useElementSize.ts` (ResizeObserver
  viewport tracking) — and added a `nodeDims(node, variant)` helper to
  `layout.ts` that collapses the repeated `variant === 'question' ? ... : ...`
  width/height ternary. `DiagramEditor.tsx` is now ~990 lines.
- Extracted `useEditorKeyboard` hook from both `DiagramEditor` and
  `SequenceEditor` — declarative `KeyCommand[]` pattern replaces monolithic
  `useEffect` keyboard handlers. Each command is independently testable.
- Moved `arrowColor()` and `shadowColor()` derivation into `theme.ts` as
  reusable functions; both editors import them instead of inline-deriving hex
  values from the dark-mode flag.
- Hoisted static inline `style={{}}` objects out of SVG `.map()` render hot
  paths in both editors. Static styles are now module-level constants; dynamic
  ones remain per-render but no longer allocate inside the loop.
- Extracted `DiagramCanvas` (346 LOC) and `SequenceCanvas` (234 LOC) from
  their parent editors. Each editor is now an orchestrator (state + handlers)
  while the canvas component owns all SVG rendering. `DiagramEditor.tsx` is
  now ~836 lines; `SequenceEditor.tsx` is ~476 lines.

### Fixed
- Sequence diagram new-message ID collision. `addMessage()` minted IDs from
  a module-level counter starting at zero, so the first added message got
  `m1` — the same ID as the preset's first message. Selection state holds
  one ID, so clicking the new row highlighted both rows that shared the
  collided ID. Replaced with `nextMsgId(messages)` which scans existing
  IDs matching `/^m(\d+)$/` and returns `m{max+1}`, eliminating any chance
  of collision with the preset or with imported diagrams.
- Sequence diagram message reorder. The previous drag handler ran
  `reorderMessage` (which mutates the model + pushes history) on every
  mouse-move tick, so a single drag could cascade through neighboring rows,
  swap labels onto the wrong lifeline, and clog the undo stack with hundreds
  of intermediate states. The new implementation seeds drag state on
  mousedown, waits for a 5-pixel threshold before activating, renders the
  dragged row in a virtual "preview" position via `useMemo` without touching
  `messages`, and commits the reorder exactly once on mouseup. Window-level
  `mousemove`/`mouseup` listeners replace the SVG-scoped handlers, so
  releasing outside the canvas still ends the drag cleanly.
- Node drag operations now push to the undo history. Previously the drag
  mutated state directly and was lost on `Ctrl+Z`.
- Edge `style: 'dashed'` and `style: 'dotted'` now render with the correct
  dash pattern on the canvas. The previous render path computed the pattern
  but discarded it — the animated `edge-flow` class overrode the value with
  its own dasharray, so every edge looked solid regardless of style. The
  animation now only runs on edges whose style is `'solid'` (the default);
  explicitly dashed/dotted edges render statically with the user's chosen
  pattern. Mermaid / PlantUML / JSON / SVG export already serialized the
  style correctly — this was a canvas-only regression.

## [1.0.0] - 2026-05-16

First stable release. The package is now published on npm and considered
production-ready for the documented surface area.

### Added
- `LICENSE` (MIT).
- `CHANGELOG.md`, `CONTRIBUTING.md`, `CODE_OF_CONDUCT.md`.
- GitHub issue templates and pull request template.
- CI workflow that runs `bun test`, typecheck, and build on every push and PR.
- `repository`, `bugs`, `homepage` metadata in `package.json`.
- `sideEffects: false` for better tree-shaking.
- `Model.validate()` returns structural problems (dangling edge refs, duplicate IDs)
  without throwing — used by tooling and surfaced in the editor UI.
- `Model.setVariant()` and persistent `variant` field on `DiagramModel` so the UI
  variant (flowchart / question / journey) survives JSON round-trips.
- Mermaid importer now strips `%% comments`, `mermaid.initialize(...)` blocks,
  `classDef` / `class` / `style` / `linkStyle` / `click` directives, and parses
  `subgraph` blocks by tagging contained nodes with `metadata.group`.
- Redesigned SVG canvas: smooth cubic-bezier edges, dot grid, drop shadows,
  glowing selection ring, indigo/slate palette. `StepEditor` matches with
  indigo accent and softer card styling.

### Changed
- `Model.addEdge()` now throws on edges that reference unknown source/target
  node IDs (previously accepted silently). Use `Model.validate()` to inspect
  imported data without throwing.
- SVG / PNG exporter rewritten to mirror the canvas visuals — question nodes,
  dynamic widths, bezier edges, dot grid, and drop shadows. Previously exports
  used a primitive BFS grid layout with straight lines and no question-node
  support.

### Fixed
- Mermaid exporter now emits `-.->` for dashed/dotted edges (previously
  collapsed all styles to `-->`). PlantUML exporter emits `-[dashed]->` and
  `-[dotted]->` for non-solid styles.
- Mermaid importer edge regex anchors correctly so node IDs containing `{[(`
  characters no longer bleed into the connector.

## [0.1.0] - 2026-05

### Added
- Initial release.
- Programmatic API: `flowchart()`, `sequence()`, `Model` class.
- Exporters: Mermaid, PlantUML, JSON, SVG, PNG.
- Importers: Mermaid, JSON.
- React UI: `DiagramEditor` component with pan/zoom canvas, drag-to-connect, undo/redo, context menu, node navigator, light/dark/auto theme.
- Diagram variants: `flowchart`, `question`, `journey`.
- GitHub Pages live demo with developer docs.

[Unreleased]: https://github.com/ag-gr-hub/flowchart-sequence-designer/compare/v1.0.0...HEAD
[1.0.0]: https://github.com/ag-gr-hub/flowchart-sequence-designer/compare/v0.1.0...v1.0.0
[0.1.0]: https://github.com/ag-gr-hub/flowchart-sequence-designer/releases/tag/v0.1.0
