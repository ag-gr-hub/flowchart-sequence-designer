import type { DiagramModel } from '../core/types.js';

export function toJSON(model: DiagramModel): string {
  return JSON.stringify(model, null, 2);
}
