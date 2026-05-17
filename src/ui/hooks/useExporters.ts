import { useCallback } from 'react';
import type { DiagramModel, ExportFormat } from '../../core/types.js';
import { toMermaid } from '../../exporters/mermaid.js';
import { toPlantUML } from '../../exporters/plantuml.js';
import { toJSON } from '../../exporters/json.js';
import { toSVG, toPNG } from '../../exporters/svg.js';

/**
 * Returns a single `handleExport(format)` callback that runs the requested
 * exporter against `model`. If the caller provided `onExport`, the resulting
 * content is handed off to them. Otherwise the hook triggers a browser
 * download with `filename.<ext>` (with `.puml` substituted for PlantUML).
 *
 * Both editors used to inline this switch; centralizing it keeps export
 * behavior identical and makes adding a new format a one-file change.
 *
 * @param model     The diagram to export.
 * @param onExport  Optional caller-supplied sink. If omitted, a download is triggered.
 * @param filename  Base filename for the download (default `"diagram"`). Diagram and
 *                  sequence editors override to `"diagram"` / `"sequence"` respectively.
 * @param onSuccess Optional callback fired after a successful export (e.g., for toast).
 */
export function useExporters(
  model: DiagramModel,
  onExport: ((format: ExportFormat, content: string | Blob) => void) | undefined,
  filename: string = 'diagram',
  onSuccess?: (message: string) => void,
): (format: ExportFormat) => Promise<void> {
  return useCallback(async (format: ExportFormat) => {
    let content: string | Blob;
    switch (format) {
      case 'mermaid': content = toMermaid(model); break;
      case 'plantuml': content = toPlantUML(model); break;
      case 'json': content = toJSON(model); break;
      case 'svg': content = toSVG(model); break;
      case 'png': content = await toPNG(model); break;
      default: return;
    }
    if (onExport) { onExport(format, content); onSuccess?.(`Exported as ${format.toUpperCase()}`); return; }
    const url = content instanceof Blob
      ? URL.createObjectURL(content)
      : URL.createObjectURL(new Blob([content], { type: 'text/plain' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = `${filename}.${format === 'plantuml' ? 'puml' : format}`;
    a.click();
    URL.revokeObjectURL(url);
    onSuccess?.(`Downloaded ${a.download}`);
  }, [model, onExport, filename, onSuccess]);
}
