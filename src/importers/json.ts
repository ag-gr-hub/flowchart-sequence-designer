import { Model } from '../core/model.js';
import type { DiagramModel } from '../core/types.js';

/**
 * Rehydrate a `Model` from the package's JSON shape. Accepts either the raw
 * JSON string or an already-parsed `DiagramModel` (handy when the caller has
 * received the data from a typed source).
 *
 * Validation here is minimal — only the structural fields needed by the
 * downstream renderer (`type`, `nodes`, `edges`) are checked. For deeper
 * checks call `model.validate()` after import.
 *
 * @throws If `json` is not a valid `DiagramModel` shape.
 */
export function fromJSON(json: string | DiagramModel): Model {
  const data: DiagramModel = typeof json === 'string' ? JSON.parse(json) : json;
  if (!data.type || !Array.isArray(data.nodes) || !Array.isArray(data.edges)) {
    throw new Error('Invalid DiagramModel JSON');
  }
  return Model.fromData(data);
}
