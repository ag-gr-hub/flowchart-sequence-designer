import type { DiagramModel, DiagramNode, DiagramEdge, DiagramType, SequenceMessage } from './types.js';

export class Model {
  private data: DiagramModel;

  constructor(type: DiagramType, title?: string) {
    this.data = { type, title, nodes: [], edges: [], actors: [], messages: [] };
  }

  static fromData(data: DiagramModel): Model {
    const m = new Model(data.type, data.title);
    m.data = structuredClone(data);
    return m;
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
    this.data.edges.push({ ...edge });
    return this;
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
