import type { DiagramModel, DiagramNode, DiagramEdge, DiagramType, DiagramVariant, SequenceMessage, ValidationError } from './types.js';

export class Model {
  private data: DiagramModel;

  constructor(type: DiagramType, title?: string, variant?: DiagramVariant) {
    this.data = { type, ...(variant ? { variant } : {}), title, nodes: [], edges: [], actors: [], messages: [] };
  }

  static fromData(data: DiagramModel): Model {
    const m = new Model(data.type, data.title, data.variant);
    m.data = structuredClone(data);
    return m;
  }

  setVariant(variant: DiagramVariant): this {
    this.data.variant = variant;
    return this;
  }

  addNode(node: DiagramNode): this {
    if (this.data.nodes.find(n => n.id === node.id)) {
      throw new Error(`Node with id "${node.id}" already exists`);
    }
    this.data.nodes.push({ ...node });
    return this;
  }

  updateNode(id: string, patch: Partial<Omit<DiagramNode, 'id'>>): this {
    const node = this.data.nodes.find(n => n.id === id);
    if (!node) throw new Error(`Node "${id}" not found`);
    Object.assign(node, patch);
    return this;
  }

  removeNode(id: string): this {
    this.data.nodes = this.data.nodes.filter(n => n.id !== id);
    this.data.edges = this.data.edges.filter(e => e.from !== id && e.to !== id);
    return this;
  }

  addEdge(edge: DiagramEdge): this {
    if (this.data.edges.find(e => e.id === edge.id)) {
      throw new Error(`Edge with id "${edge.id}" already exists`);
    }
    if (!this.data.nodes.find(n => n.id === edge.from)) {
      throw new Error(`Edge "${edge.id}" references unknown source node "${edge.from}"`);
    }
    if (!this.data.nodes.find(n => n.id === edge.to)) {
      throw new Error(`Edge "${edge.id}" references unknown target node "${edge.to}"`);
    }
    this.data.edges.push({ ...edge });
    return this;
  }

  /** Surface structural problems without throwing — used by tooling and the UI banner. */
  validate(): ValidationError[] {
    const errors: ValidationError[] = [];
    const nodeIds = new Set<string>();
    for (const n of this.data.nodes) {
      if (nodeIds.has(n.id)) errors.push({ kind: 'duplicate-node-id', id: n.id, message: `Duplicate node id "${n.id}"` });
      nodeIds.add(n.id);
    }
    const edgeIds = new Set<string>();
    for (const e of this.data.edges) {
      if (edgeIds.has(e.id)) errors.push({ kind: 'duplicate-edge-id', id: e.id, message: `Duplicate edge id "${e.id}"` });
      edgeIds.add(e.id);
      if (!nodeIds.has(e.from)) errors.push({ kind: 'dangling-from', id: e.id, message: `Edge "${e.id}" references unknown source node "${e.from}"` });
      if (!nodeIds.has(e.to)) errors.push({ kind: 'dangling-to', id: e.id, message: `Edge "${e.id}" references unknown target node "${e.to}"` });
    }
    return errors;
  }

  removeEdge(id: string): this {
    this.data.edges = this.data.edges.filter(e => e.id !== id);
    return this;
  }

  addActor(name: string): this {
    if (!this.data.actors!.includes(name)) {
      this.data.actors!.push(name);
    }
    return this;
  }

  addMessage(message: SequenceMessage): this {
    this.data.messages!.push({ ...message });
    return this;
  }

  toJSON(): DiagramModel {
    return structuredClone(this.data);
  }
}
