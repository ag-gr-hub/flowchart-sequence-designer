import { useCallback } from 'react';
import type { DiagramModel } from '../../core/types.js';
import { fromMermaid } from '../../importers/mermaid.js';
import { fromJSON } from '../../importers/json.js';

/**
 * Returns a `handleImport(text)` callback that parses pasted/uploaded text
 * (JSON or Mermaid, sniffed by whether it starts with `{`) and pushes the
 * result into history via `applyAndPush`.
 *
 * Editors differ in what shape they expect (flowchart vs sequence) and how
 * they post-process the parsed model (positioning nodes, normalizing types).
 * `expectedType` + `transform` capture those differences without duplicating
 * the parse/error-handling shell.
 *
 * @param applyAndPush  Commits the imported model into the editor's history stack.
 * @param options.expectedType  If set, an alert fires when the imported model is
 *   the wrong type — guards against pasting a flowchart into the sequence editor.
 * @param options.transform     Optional final-shape transform applied after the
 *   type check and before `applyAndPush` (e.g., position-defaulting nodes).
 */
export function useImporter(
  applyAndPush: (m: DiagramModel) => void,
  options: {
    expectedType?: DiagramModel['type'];
    transform?: (m: DiagramModel) => DiagramModel;
  } = {},
): (text: string) => void {
  const { expectedType, transform } = options;
  return useCallback((text: string) => {
    try {
      const parsed = text.trim().startsWith('{')
        ? fromJSON(text).toJSON()
        : fromMermaid(text).toJSON();
      if (expectedType && parsed.type !== expectedType) {
        alert(`Imported diagram is not a ${expectedType} diagram.`);
        return;
      }
      applyAndPush(transform ? transform(parsed) : parsed);
    } catch (err) {
      alert(`Import failed: ${(err as Error).message}`);
    }
  }, [applyAndPush, expectedType, transform]);
}
