import { Model } from './model.js';
import type { DiagramEdge, DiagramNode, NodeShape } from './types.js';
import { nextId } from './ids.js';
import { toMermaid } from '../exporters/mermaid.js';
import { toPlantUML } from '../exporters/plantuml.js';
import { toJSON } from '../exporters/json.js';
import { toSVG, toPNG } from '../exporters/svg.js';

/**
 * Fluent builder for flowchart-type diagrams. Wraps `Model` with shorter
 * method names tuned for one-shot construction in tests and scripts, and
 * with convenience exporters for every supported `ExportFormat`.
 *
 * @example
 * ```ts
 * const svg = flowchart('Login')
 *   .node('start', 'Begin', { shape: 'circle' })
 *   .node('check', 'Authenticated?', { shape: 'diamond' })
 *   .edge('start', 'check')
 *   .toSVG();
 * ```
 */
export class FlowchartBuilder {
  private model: Model;

  /** @param title Optional human-readable diagram title. */
  constructor(title?: string) {
    this.model = new Model('flowchart', title);
  }

  /**
   * Append a node. Defaults `shape` to `rectangle` when omitted from `options`.
   * Throws on duplicate id.
   */
  node(id: string, label: string, options: Partial<Omit<DiagramNode, 'id' | 'label'>> = {}): this {
    this.model.addNode({ id, label, shape: options.shape ?? 'rectangle', ...options });
    return this;
  }

  /**
   * Append an edge with an auto-generated id. The id is derived from the
   * current edge list to avoid collisions with imported models.
   */
  edge(
    from: string,
    to: string,
    options: Partial<Omit<DiagramEdge, 'id' | 'from' | 'to'>> = {},
  ): this {
    this.model.addEdge({ id: nextId('e', this.model.toJSON().edges), from, to, ...options });
    return this;
  }

  /** Remove a node and every edge that references it. */
  removeNode(id: string): this {
    this.model.removeNode(id);
    return this;
  }

  /** Remove an edge by id. */
  removeEdge(id: string): this {
    this.model.removeEdge(id);
    return this;
  }

  /** Patch an existing node. See `Model.updateNode`. */
  updateNode(id: string, patch: Partial<Omit<DiagramNode, 'id'>>): this {
    this.model.updateNode(id, patch);
    return this;
  }

  /** Return the underlying `Model` for advanced operations or validation. */
  getModel(): Model {
    return this.model;
  }

  /** Serialize as Mermaid `flowchart TD` source. */
  toMermaid(): string {
    return toMermaid(this.model.toJSON());
  }

  /** Serialize as PlantUML activity-diagram source. */
  toPlantUML(): string {
    return toPlantUML(this.model.toJSON());
  }

  /** Serialize as the package's JSON shape (full round-trip fidelity). */
  toJSON(): string {
    return toJSON(this.model.toJSON());
  }

  /** Render to a standalone SVG string. */
  toSVG(): string {
    return toSVG(this.model.toJSON());
  }

  /** Render to a PNG `Blob`. Browser-only (uses the Canvas API). */
  toPNG(): Promise<Blob> {
    return toPNG(this.model.toJSON());
  }
}

/** Convenience constructor — `flowchart('My Diagram')` is `new FlowchartBuilder('My Diagram')`. */
export function flowchart(title?: string): FlowchartBuilder {
  return new FlowchartBuilder(title);
}
