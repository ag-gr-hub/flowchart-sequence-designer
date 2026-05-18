import { Model } from '../core/model.js';
import type { DiagramModel } from '../core/types.js';

/**
 * Rehydrate a `Model` from the package's JSON shape. Accepts either the raw
 * JSON string or an already-parsed `DiagramModel` (handy when the caller has
 * received the data from a typed source).
 *
 * Validates the top-level structure and ensures nodes/edges contain only
 * expected shapes. For deeper semantic checks call `model.validate()` after
 * import.
 *
 * @throws If `json` is not a valid `DiagramModel` shape.
 */
export function fromJSON(json: string | DiagramModel): Model {
  const data: DiagramModel = typeof json === 'string' ? JSON.parse(json) : json;

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

  // Validate node shape (must have id + label at minimum)
  for (const node of data.nodes) {
    if (typeof node !== 'object' || node === null || typeof node.id !== 'string' || typeof node.label !== 'string') {
      throw new Error('Invalid DiagramModel JSON: each node must have string id and label');
    }
  }

  // Validate edge shape (must have id, from, to)
  for (const edge of data.edges) {
    if (typeof edge !== 'object' || edge === null || typeof edge.id !== 'string' || typeof edge.from !== 'string' || typeof edge.to !== 'string') {
      throw new Error('Invalid DiagramModel JSON: each edge must have string id, from, and to');
    }
  }

  return Model.fromData(data);
}
