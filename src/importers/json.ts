import { Model } from '../core/model.js';
import type { DiagramModel } from '../core/types.js';

export function fromJSON(json: string | DiagramModel): Model {
  const data: DiagramModel = typeof json === 'string' ? JSON.parse(json) : json;
  if (!data.type || !Array.isArray(data.nodes) || !Array.isArray(data.edges)) {
    throw new Error('Invalid DiagramModel JSON');
  }
  return Model.fromData(data);
}
