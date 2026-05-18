/**
 * Mint the next available ID for a given prefix by scanning the existing
 * entities in a model.
 *
 * Avoids the classic collision pitfall of a module-level counter starting at
 * zero: if the model already contains `e1..e6` (e.g. from a preset or an
 * imported diagram), a counter that started at zero would produce a duplicate
 * `e1` on first use. By deriving from the model itself, generated IDs are
 * collision-proof against presets, imports, and concurrent editor instances.
 *
 * @example
 *   nextId('node', model.nodes)     // → 'node7' if model has node1..node6
 *   nextId('e',   model.edges)      // → 'e1'   if model has no edges yet
 *   nextId('m',   model.messages)   // → 'm5'   if model has m1..m4
 */
/**
 * Returns a stateful id generator seeded from the current model. Use this
 * when a single operation needs to mint several IDs in succession (e.g.
 * duplicate or paste) — calling `nextId()` repeatedly against the same
 * snapshot would produce duplicates because the snapshot doesn't reflect
 * the freshly minted IDs.
 *
 * @example
 *   const newNodeId = makeIdSource('node', model.nodes);
 *   const a = newNodeId();  // → 'node7'
 *   const b = newNodeId();  // → 'node8'
 */
export function makeIdSource(prefix: string, existing: Iterable<{ id: string }>): () => string {
  const first = nextId(prefix, existing);
  let counter = parseInt(first.slice(prefix.length), 10);
  return () => `${prefix}${counter++}`;
}

export function nextId(prefix: string, existing: Iterable<{ id: string }>): string {
  const escaped = prefix.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const re = new RegExp(`^${escaped}(\\d+)$`);
  let max = 0;
  for (const item of existing) {
    const match = re.exec(item.id);
    if (match) {
      const n = parseInt(match[1]!, 10);
      if (n > max) max = n;
    }
  }
  return `${prefix}${max + 1}`;
}
