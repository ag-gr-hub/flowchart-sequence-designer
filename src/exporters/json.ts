import type { DiagramModel } from '../core/types.js';

/**
 * Serialize a `DiagramModel` to pretty-printed JSON. This is the canonical
 * round-trip format: every field — including `variant`, `waypoint`,
 * `metadata.group`, and `metadata.answers` — survives a round trip through
 * `toJSON` + `fromJSON` unchanged.
 */
export function toJSON(model: DiagramModel): string {
  return JSON.stringify(model, null, 2);
}
