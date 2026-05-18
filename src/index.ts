/**
 * Headless entry point. Builders, the underlying `Model`, and every
 * exporter/importer are exported here. The editor React components live in
 * the `/ui` subpath export — `import { DiagramEditor } from
 * 'flowchart-sequence-designer/ui'` — so server-side or CLI consumers can
 * pull in this entry without dragging React along.
 */

// Builders
export { flowchart, FlowchartBuilder } from './core/flowchart.js';
export { sequence, SequenceBuilder } from './core/sequence.js';

// Model
export { Model } from './core/model.js';

// Exporters
export { toMermaid } from './exporters/mermaid.js';
export { toPlantUML } from './exporters/plantuml.js';
export { toJSON } from './exporters/json.js';
export { toSVG, toPNG } from './exporters/svg.js';

// Importers
export { fromMermaid } from './importers/mermaid.js';
export { fromJSON } from './importers/json.js';

// Security utilities
export { sanitizeLabel, sanitizeURL } from './core/sanitize.js';

// Types
export type {
  DiagramType,
  DiagramVariant,
  DiagramModel,
  DiagramNode,
  DiagramEdge,
  DiagramEdge as Edge,
  DiagramNode as Node,
  NodeShape,
  ExportFormat,
  SequenceMessage,
} from './core/types.js';
