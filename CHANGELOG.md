# Changelog

All notable changes to `flowchart-sequence-designer` are documented here.
Format: [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).
Versioning: [Semantic Versioning](https://semver.org/).

## [Unreleased]

### Added
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

### Changed
- Internal refactor: the 1500-line `DiagramEditor.tsx` monolith is split into
  focused modules (`layout.ts`, `theme.ts`, `render.tsx`, `NodeNavigator.tsx`,
  `ContextMenu.tsx`, `hooks/useHistory.ts`, `hooks/useSystemTheme.ts`). No
  public API or visual change — the file is now ~770 lines and the render
  layer can be imported in isolation.

### Fixed
- Node drag operations now push to the undo history. Previously the drag
  mutated state directly and was lost on `Ctrl+Z`.

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
