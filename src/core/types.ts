/**
 * Top-level kind of diagram. `flowchart` uses `nodes` + `edges`; `sequence`
 * uses `actors` + `messages`. The two are rendered by different editors and
 * serialized differently in every exporter.
 */
export type DiagramType = 'flowchart' | 'sequence';

/**
 * UI variant for flowchart-type models. `flowchart` is the default linear
 * graph; `question` is a decision-tree variant whose nodes carry
 * `metadata.answers`; `journey` is a horizontal user-journey style. The
 * variant selects styling and a few interactions inside `DiagramEditor`.
 */
export type DiagramVariant = 'flowchart' | 'question' | 'journey';

/**
 * Visual shape of a flowchart node. Defaults to `rectangle`. `diamond` is
 * conventional for decisions, `circle` for start/end terminators, and
 * `parallelogram` for I/O.
 */
export type NodeShape = 'rectangle' | 'diamond' | 'circle' | 'parallelogram';

/**
 * Supported export targets.
 * - `mermaid` / `plantuml` / `json` / `svg` produce a `string`.
 * - `png` produces a `Blob` (browser-only — uses the Canvas API).
 */
export type ExportFormat = 'mermaid' | 'plantuml' | 'json' | 'svg' | 'png';

/**
 * A flowchart node.
 *
 * @property id        Stable, unique-within-model identifier. Used by edges.
 * @property label     Visible text. Multi-line input is wrapped by the renderer.
 * @property shape     Visual shape; defaults to `rectangle` when omitted.
 * @property x         Optional canvas x-coordinate. When omitted, the renderer
 *                     auto-positions on first paint.
 * @property y         Optional canvas y-coordinate. Same defaulting as `x`.
 * @property metadata  Free-form bag for variant-specific data (e.g.
 *                     `metadata.group` for journey columns, `metadata.answers`
 *                     for question branches). Round-trips through JSON only.
 */
export interface DiagramNode {
  id: string;
  label: string;
  shape?: NodeShape;
  x?: number;
  y?: number;
  metadata?: Record<string, unknown>;
}

/**
 * A directed edge between two flowchart nodes.
 *
 * @property id         Stable, unique-within-model identifier.
 * @property from       Source node id. Must match an existing `DiagramNode.id`.
 * @property to         Target node id. Must match an existing `DiagramNode.id`.
 * @property label      Optional edge label rendered at the midpoint.
 * @property style      Line style. `solid` is default; `dashed` maps to
 *                      Mermaid `-.->` and PlantUML `-[dashed]->`; `dotted`
 *                      maps to Mermaid `-..->` and PlantUML `-[dotted]->`.
 * @property arrowhead  Arrow style at the target end. `arrow` is default.
 * @property waypoint   Optional manual waypoint in canvas coordinates. When
 *                      set, the edge is routed as two cubic segments meeting
 *                      at this point. Persisted in JSON exports; ignored by
 *                      Mermaid/PlantUML serializers (those formats don't
 *                      encode routing).
 */
export interface DiagramEdge {
  id: string;
  from: string;
  to: string;
  label?: string;
  style?: 'solid' | 'dashed' | 'dotted';
  arrowhead?: 'arrow' | 'none' | 'open';
  waypoint?: { x: number; y: number };
}

/**
 * A single message in a sequence diagram.
 *
 * @property id     Stable, unique-within-model identifier.
 * @property from   Source actor name. Must appear in the model's `actors` list.
 * @property to     Target actor name. Must appear in the model's `actors` list.
 * @property label  Message text rendered above the arrow.
 * @property style  Arrow style. `solid` is default; `dashed` is conventional
 *                  for asynchronous or return messages.
 */
export interface SequenceMessage {
  id: string;
  from: string;
  to: string;
  label: string;
  style?: 'solid' | 'dashed';
}

/**
 * The serialized shape of any diagram. Flowchart-type models populate
 * `nodes`/`edges`; sequence-type models populate `actors`/`messages`. Both
 * sub-shapes coexist on a single union to keep the JSON exporter / importer
 * straightforward.
 *
 * @property type      Discriminator — selects which sub-shape is active.
 * @property variant   UI variant. Only meaningful when `type === 'flowchart'`.
 * @property title     Optional human-readable diagram title.
 * @property nodes     Flowchart nodes. Always present (empty for sequence
 *                     models) so the type stays uniform.
 * @property edges     Flowchart edges. Always present (empty for sequence
 *                     models).
 * @property actors    Ordered list of actor names. Sequence models only.
 * @property messages  Ordered list of messages between actors. Sequence
 *                     models only.
 */
export interface DiagramModel {
  type: DiagramType;
  variant?: DiagramVariant;
  title?: string;
  nodes: DiagramNode[];
  edges: DiagramEdge[];
  actors?: string[];
  messages?: SequenceMessage[];
}

/**
 * A single problem found by `Model.validate()`.
 *
 * @property kind     Category of the problem:
 *                    - `dangling-from`: edge `from` references a missing node.
 *                    - `dangling-to`: edge `to` references a missing node.
 *                    - `duplicate-node-id`: two nodes share an `id`.
 *                    - `duplicate-edge-id`: two edges share an `id`.
 * @property id       Identifier of the offending node or edge.
 * @property message  Human-readable description suitable for surfacing in UI.
 */
export interface ValidationError {
  kind: 'dangling-from' | 'dangling-to' | 'duplicate-node-id' | 'duplicate-edge-id';
  id: string;
  message: string;
}
