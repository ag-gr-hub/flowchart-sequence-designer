import { Model } from '../core/model.js';
import type { DiagramModel } from '../core/types.js';
import { sanitizeLabel, MAX_NODES, MAX_EDGES, MAX_ACTORS, MAX_MESSAGES, MAX_IMPORT_LENGTH } from '../core/sanitize.js';

/**
 * Deep-strip prototype-pollution keys (`__proto__`, `constructor`,
 * `prototype`) from any parsed JSON value before it enters the model.
 */
function stripDangerousKeys(obj: unknown): unknown {
  if (Array.isArray(obj)) return obj.map(stripDangerousKeys);
  if (obj !== null && typeof obj === 'object') {
    const clean: Record<string, unknown> = {};
    for (const [key, val] of Object.entries(obj)) {
      if (key === '__proto__' || key === 'constructor' || key === 'prototype') continue;
      clean[key] = stripDangerousKeys(val);
    }
    return clean;
  }
  return obj;
}

/**
 * Rehydrate a `Model` from the package's JSON shape. Accepts either the raw
 * JSON string or an already-parsed `DiagramModel` (handy when the caller has
 * received the data from a typed source).
 *
 * Validates the top-level structure and ensures nodes/edges contain only
 * expected shapes. All labels are sanitized to strip dangerous content.
 * Prototype-pollution keys are stripped from parsed JSON.
 * Resource limits are enforced to prevent browser-tab crashes.
 *
 * @throws If `json` is not a valid `DiagramModel` shape.
 */
export function fromJSON(json: string | DiagramModel): Model {
  if (typeof json === 'string' && json.length > MAX_IMPORT_LENGTH) {
    throw new Error(`Import aborted: input exceeds the maximum of ${MAX_IMPORT_LENGTH} characters`);
  }
  const raw = typeof json === 'string' ? JSON.parse(json) : json;
  const data = stripDangerousKeys(raw) as DiagramModel;

  // Structural validation
  if (typeof data !== 'object' || data === null || Array.isArray(data)) {
    throw new Error('Invalid DiagramModel JSON: expected an object');
  }
  if (data.type !== 'flowchart' && data.type !== 'sequence') {
    throw new Error(`Invalid DiagramModel JSON: unknown type "${data.type}"`);
  }
  if (!Array.isArray(data.nodes) || !Array.isArray(data.edges)) {
    throw new Error('Invalid DiagramModel JSON: nodes and edges must be arrays');
  }

  // Resource limits
  if (data.nodes.length > MAX_NODES) {
    throw new Error(`Import aborted: diagram has ${data.nodes.length} nodes, maximum is ${MAX_NODES}`);
  }
  if (data.edges.length > MAX_EDGES) {
    throw new Error(`Import aborted: diagram has ${data.edges.length} edges, maximum is ${MAX_EDGES}`);
  }
  if (data.actors && data.actors.length > MAX_ACTORS) {
    throw new Error(`Import aborted: diagram has ${data.actors.length} actors, maximum is ${MAX_ACTORS}`);
  }
  if (data.messages && data.messages.length > MAX_MESSAGES) {
    throw new Error(`Import aborted: diagram has ${data.messages.length} messages, maximum is ${MAX_MESSAGES}`);
  }

  // Validate node shape (must have id + label at minimum)
  for (const node of data.nodes) {
    if (typeof node !== 'object' || node === null || typeof node.id !== 'string' || typeof node.label !== 'string') {
      throw new Error('Invalid DiagramModel JSON: each node must have string id and label');
    }
    node.label = sanitizeLabel(node.label);
  }

  // Validate edge shape (must have id, from, to)
  for (const edge of data.edges) {
    if (typeof edge !== 'object' || edge === null || typeof edge.id !== 'string' || typeof edge.from !== 'string' || typeof edge.to !== 'string') {
      throw new Error('Invalid DiagramModel JSON: each edge must have string id, from, and to');
    }
    if (edge.label) edge.label = sanitizeLabel(edge.label);
  }

  // Sanitize sequence fields
  if (data.actors) {
    data.actors = data.actors.map(a => typeof a === 'string' ? sanitizeLabel(a) : a);
  }
  if (data.messages) {
    for (const msg of data.messages) {
      if (typeof msg === 'object' && msg !== null && typeof msg.label === 'string') {
        msg.label = sanitizeLabel(msg.label);
      }
    }
  }

  return Model.fromData(data);
}
