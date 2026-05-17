import { Model } from './model.js';
import type { DiagramEdge, DiagramNode, NodeShape } from './types.js';
import { nextId } from './ids.js';
import { toMermaid } from '../exporters/mermaid.js';
import { toPlantUML } from '../exporters/plantuml.js';
import { toJSON } from '../exporters/json.js';
import { toSVG, toPNG } from '../exporters/svg.js';

export class FlowchartBuilder {
  private model: Model;

  constructor(title?: string) {
    this.model = new Model('flowchart', title);
  }

  node(id: string, label: string, options: Partial<Omit<DiagramNode, 'id' | 'label'>> = {}): this {
    this.model.addNode({ id, label, shape: options.shape ?? 'rectangle', ...options });
    return this;
  }

  edge(from: string, to: string, options: Partial<Omit<DiagramEdge, 'id' | 'from' | 'to'>> = {}): this {
    this.model.addEdge({ id: nextId('e', this.model.toJSON().edges), from, to, ...options });
    return this;
  }

  removeNode(id: string): this {
    this.model.removeNode(id);
    return this;
  }

  removeEdge(id: string): this {
    this.model.removeEdge(id);
    return this;
  }

  updateNode(id: string, patch: Partial<Omit<DiagramNode, 'id'>>): this {
    this.model.updateNode(id, patch);
    return this;
  }

  getModel(): Model {
    return this.model;
  }

  toMermaid(): string {
    return toMermaid(this.model.toJSON());
  }

  toPlantUML(): string {
    return toPlantUML(this.model.toJSON());
  }

  toJSON(): string {
    return toJSON(this.model.toJSON());
  }

  toSVG(): string {
    return toSVG(this.model.toJSON());
  }

  toPNG(): Promise<Blob> {
    return toPNG(this.model.toJSON());
  }
}

export function flowchart(title?: string): FlowchartBuilder {
  return new FlowchartBuilder(title);
}
