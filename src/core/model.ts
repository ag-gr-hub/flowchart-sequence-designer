import type {
  DiagramModel,
  DiagramNode,
  DiagramEdge,
  DiagramType,
  DiagramVariant,
  SequenceMessage,
  ValidationError,
} from './types.js';

/**
 * Mutable builder around a `DiagramModel`. Every public mutator returns
 * `this` so callers can chain (`new Model('flowchart').addNode(...).addEdge(...)`).
 * Call `.toJSON()` to extract a deep-cloned plain model suitable for
 * serialization or for handing to the editor components.
 *
 * All add/update operations validate immediately and throw on collisions or
 * dangling references. For non-throwing, batch-style structural checks call
 * `.validate()` instead.
 */
export class Model {
  private data: DiagramModel;

  /**
   * Create an empty model.
   *
   * @param type     Top-level kind — `flowchart` or `sequence`.
   * @param title    Optional human-readable title.
   * @param variant  Optional UI variant (flowchart models only).
   */
  constructor(type: DiagramType, title?: string, variant?: DiagramVariant) {
    this.data = {
      type,
      ...(variant ? { variant } : {}),
      title,
      nodes: [],
      edges: [],
      actors: [],
      messages: [],
    };
  }

  /**
   * Rehydrate a `Model` from a previously serialized `DiagramModel`. The
   * incoming data is deep-cloned, so future mutations on the returned `Model`
   * do not affect the caller's object.
   */
  static fromData(data: DiagramModel): Model {
    const m = new Model(data.type, data.title, data.variant);
    m.data = structuredClone(data);
    return m;
  }

  /** Set the UI variant. No-op semantics for sequence models. */
  setVariant(variant: DiagramVariant): this {
    this.data.variant = variant;
    return this;
  }

  /**
   * Append a node. Throws if a node with the same id already exists. The
   * input is shallow-cloned, so later mutations of the caller's object do
   * not leak in.
   */
  addNode(node: DiagramNode): this {
    if (this.data.nodes.find((n) => n.id === node.id)) {
      throw new Error(`Node with id "${node.id}" already exists`);
    }
    this.data.nodes.push({ ...node });
    return this;
  }

  /**
   * Patch an existing node in place. Throws if the id is not found. The id
   * field itself cannot be patched — to rename, remove + re-add.
   */
  updateNode(id: string, patch: Partial<Omit<DiagramNode, 'id'>>): this {
    const node = this.data.nodes.find((n) => n.id === id);
    if (!node) throw new Error(`Node "${id}" not found`);
    const { __proto__, constructor, ...safe } = patch as Record<string, unknown>;
    Object.assign(node, safe);
    return this;
  }

  /**
   * Remove a node and every edge that referenced it as `from` or `to`. Safe
   * to call on a missing id (no-op).
   */
  removeNode(id: string): this {
    this.data.nodes = this.data.nodes.filter((n) => n.id !== id);
    this.data.edges = this.data.edges.filter((e) => e.from !== id && e.to !== id);
    return this;
  }

  /**
   * Append an edge. Throws on duplicate id or if either endpoint references
   * an unknown node — the model never holds dangling edges from this entry
   * point. (Importers can still construct dangling edges; call `validate()`
   * to detect them.)
   */
  addEdge(edge: DiagramEdge): this {
    if (this.data.edges.find((e) => e.id === edge.id)) {
      throw new Error(`Edge with id "${edge.id}" already exists`);
    }
    if (!this.data.nodes.find((n) => n.id === edge.from)) {
      throw new Error(`Edge "${edge.id}" references unknown source node "${edge.from}"`);
    }
    if (!this.data.nodes.find((n) => n.id === edge.to)) {
      throw new Error(`Edge "${edge.id}" references unknown target node "${edge.to}"`);
    }
    this.data.edges.push({ ...edge });
    return this;
  }

  /**
   * Surface structural problems without throwing. Returns an array of
   * `ValidationError`s; empty array means the model is well-formed. Used by
   * the editor's status banner and by external tooling.
   */
  validate(): ValidationError[] {
    const errors: ValidationError[] = [];
    const nodeIds = new Set<string>();
    for (const n of this.data.nodes) {
      if (nodeIds.has(n.id))
        errors.push({
          kind: 'duplicate-node-id',
          id: n.id,
          message: `Duplicate node id "${n.id}"`,
        });
      nodeIds.add(n.id);
    }
    const edgeIds = new Set<string>();
    for (const e of this.data.edges) {
      if (edgeIds.has(e.id))
        errors.push({
          kind: 'duplicate-edge-id',
          id: e.id,
          message: `Duplicate edge id "${e.id}"`,
        });
      edgeIds.add(e.id);
      if (!nodeIds.has(e.from))
        errors.push({
          kind: 'dangling-from',
          id: e.id,
          message: `Edge "${e.id}" references unknown source node "${e.from}"`,
        });
      if (!nodeIds.has(e.to))
        errors.push({
          kind: 'dangling-to',
          id: e.id,
          message: `Edge "${e.id}" references unknown target node "${e.to}"`,
        });
    }
    return errors;
  }

  /** Remove an edge by id. Safe to call on a missing id (no-op). */
  removeEdge(id: string): this {
    this.data.edges = this.data.edges.filter((e) => e.id !== id);
    return this;
  }

  /** Append a sequence actor. Duplicate names are silently ignored. */
  addActor(name: string): this {
    if (!this.data.actors!.includes(name)) {
      this.data.actors!.push(name);
    }
    return this;
  }

  /**
   * Append a sequence message. The actors referenced by `from`/`to` are not
   * validated here — callers are expected to register them via `addActor()`
   * first.
   */
  addMessage(message: SequenceMessage): this {
    this.data.messages!.push({ ...message });
    return this;
  }

  /**
   * Return a deep-cloned plain `DiagramModel`. Safe to mutate by the caller;
   * mutations do not flow back into this `Model`.
   */
  toJSON(): DiagramModel {
    return structuredClone(this.data);
  }
}
