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
 * @param options.expectedType  If set, an error fires when the imported model is
 *   the wrong type — guards against pasting a flowchart into the sequence editor.
 * @param options.transform     Optional final-shape transform applied after the
 *   type check and before `applyAndPush` (e.g., position-defaulting nodes).
 * @param options.onSuccess     Optional success callback (e.g., for toast notifications).
 * @param options.onError       Optional error callback. Falls back to `alert()` if omitted.
 */
export function useImporter(
  applyAndPush: (m: DiagramModel) => void,
  options: {
    expectedType?: DiagramModel['type'];
    transform?: (m: DiagramModel) => DiagramModel;
    onSuccess?: (message: string) => void;
    onError?: (message: string) => void;
  } = {},
): (text: string) => void {
  const { expectedType, transform, onSuccess, onError } = options;
  const reportError = onError ?? ((msg: string) => alert(msg));
  return useCallback((text: string) => {
    try {
      const parsed = text.trim().startsWith('{')
        ? fromJSON(text).toJSON()
        : fromMermaid(text).toJSON();
      if (expectedType && parsed.type !== expectedType) {
        reportError(`Imported diagram is not a ${expectedType} diagram.`);
        return;
      }
      applyAndPush(transform ? transform(parsed) : parsed);
      onSuccess?.('Diagram imported successfully');
    } catch (err) {
      reportError(`Import failed: ${(err as Error).message}`);
    }
  }, [applyAndPush, expectedType, transform, onSuccess, onError]);
}
