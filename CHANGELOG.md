# Changelog

All notable changes to `flowchart-sequence-designer` are documented here.
Format: [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).
Versioning: [Semantic Versioning](https://semver.org/).

## [Unreleased]

### Added
- `LICENSE` (MIT).
- `CHANGELOG.md`, `CONTRIBUTING.md`, `CODE_OF_CONDUCT.md`.
- GitHub issue templates and pull request template.
- CI workflow that runs `bun test`, typecheck, and build on every push and PR.
- `repository`, `bugs`, `homepage` metadata in `package.json`.
- `sideEffects: false` for better tree-shaking.

## [0.1.0] - 2026-05

### Added
- Initial release.
- Programmatic API: `flowchart()`, `sequence()`, `Model` class.
- Exporters: Mermaid, PlantUML, JSON, SVG, PNG.
- Importers: Mermaid, JSON.
- React UI: `DiagramEditor` component with pan/zoom canvas, drag-to-connect, undo/redo, context menu, node navigator, light/dark/auto theme.
- Diagram variants: `flowchart`, `question`, `journey`.
- GitHub Pages live demo with developer docs.

[Unreleased]: https://github.com/ag-gr-hub/flowchart-sequence-designer/compare/v0.1.0...HEAD
[0.1.0]: https://github.com/ag-gr-hub/flowchart-sequence-designer/releases/tag/v0.1.0
