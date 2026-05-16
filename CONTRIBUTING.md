# Contributing

Thanks for your interest in improving `flowchart-sequence-designer`. This guide covers everything you need to get set up locally and submit a change.

## Development setup

Requires [Bun](https://bun.sh) 1.0+ (uses `bun test` and `bun run build` via [tsup](https://tsup.egoist.dev)).

```bash
git clone https://github.com/ag-gr-hub/flowchart-sequence-designer.git
cd flowchart-sequence-designer
bun install
```

### Scripts

| Command | What it does |
|---|---|
| `bun run build` | Compile to `dist/` (ESM + CJS + `.d.ts`) |
| `bun run dev` | Watch mode — rebuilds on save |
| `bun test` | Run the test suite |
| `bun run typecheck` | `tsc --noEmit` — type-check without emitting |
| `bun run lint` | ESLint over `src/` (install dev deps first — see below) |
| `bun run format` | Prettier-format `src/**/*.{ts,tsx,json}` |
| `bun run format:check` | Check formatting without writing |

### Optional lint/format tooling

ESLint and Prettier are configured but the deps aren't pinned in `package.json`
(to keep the install lean). To enable `bun run lint` / `bun run format`:

```bash
bun add -d eslint @typescript-eslint/parser @typescript-eslint/eslint-plugin \
  eslint-plugin-react eslint-plugin-react-hooks prettier
```

### Running the demo locally

```bash
bun run build              # build the package first
cd demo
bun install
bun run dev                # opens http://localhost:5173
```

The demo Vite config aliases `flowchart-sequence-designer` to `../dist/`, so the demo reflects whatever you just built. Re-run `bun run build` in the root after changes.

## Project layout

```
src/
├── core/          # types, Model, FlowchartBuilder, SequenceBuilder
├── exporters/     # mermaid, plantuml, json, svg
├── importers/     # mermaid, json
├── ui/            # DiagramEditor, StepEditor, Toolbar, NodeNavigator
└── __tests__/     # bun:test suites
demo/              # Vite app — live demo deployed to GitHub Pages
```

The `"."` entry exports the core API (no React); `"./ui"` exports the React components. Keep React imports out of `src/core/`, `src/exporters/`, and `src/importers/`.

## Making a change

1. **Open an issue first** for non-trivial work (new features, breaking changes) so we can align on scope before you write code.
2. Fork, branch (`feat/foo` or `fix/bar`), commit, push, open a PR against `master`.
3. Make sure these all pass before requesting review:
   - `bun run typecheck`
   - `bun test`
   - `bun run build`
4. Add a `CHANGELOG.md` entry under `## [Unreleased]` describing the change.
5. If you added a feature, update the `README.md` and the demo's `DocsPage.tsx`.

## Commit messages

We follow [Conventional Commits](https://www.conventionalcommits.org/) loosely:

```
feat: <what>          # new feature
fix: <what>           # bug fix
docs: <what>          # README/CHANGELOG/comments
refactor: <what>      # no behavior change
test: <what>          # tests only
chore: <what>         # tooling, CI, deps
```

## Code style

- TypeScript strict mode is on — keep it that way.
- No `any`. Use `unknown` and narrow.
- Two-space indent, single quotes, semicolons.
- Prefer named exports over default exports (except React components used in the demo).
- No comments that explain *what* the code does — only *why* if non-obvious.

## Reporting bugs

Open a [GitHub issue](https://github.com/ag-gr-hub/flowchart-sequence-designer/issues/new/choose) with:
- A minimal reproduction (CodeSandbox link, or a `.test.ts` snippet)
- What you expected vs. what happened
- Your environment (Bun/Node version, OS, browser if UI-related)

## Code of Conduct

By participating, you agree to abide by the [Code of Conduct](./CODE_OF_CONDUCT.md).
