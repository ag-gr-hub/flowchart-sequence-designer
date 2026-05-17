/**
 * React UI entry point. Pulls in `react` and `react-dom` as peer
 * dependencies. The `DiagramEditor` is the all-in-one component most
 * consumers reach for; `SequenceEditor` is the sequence-diagram specialization.
 * `Toolbar` and `StepEditor` are exposed for embedding the same primitives
 * inside a custom shell.
 *
 * @example
 * ```tsx
 * import { DiagramEditor, presetFlowchartModel } from 'flowchart-sequence-designer/ui';
 *
 * <DiagramEditor initialModel={presetFlowchartModel()} onChange={save} />
 * ```
 */

/** Main flowchart/question/journey editor. Accepts an optional `initialModel`; renders a SequenceEditor internally if the model type is `'sequence'`. */
export { DiagramEditor } from './DiagramEditor.js';
export type { DiagramEditorProps, ThemeColors } from './DiagramEditor.js';

/** Dedicated sequence diagram editor with actor columns and message rows. */
export { SequenceEditor } from './SequenceEditor.js';
export type { SequenceEditorProps, SequenceThemeColors } from './SequenceEditor.js';

/** Dark-themed toolbar with export buttons and import dialog. Can be used standalone in a custom editor shell. */
export { Toolbar } from './Toolbar.js';

/** Node property editor panel (label, shape, color, answers/branches). Useful for building custom sidebars. */
export { StepEditor } from './StepEditor.js';

/** Preset model factories and blank-canvas helper. */
export { presetFlowchartModel, presetSequenceModel, emptyModel } from './presets.js';
