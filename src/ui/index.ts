/**
 * React UI entry point. Pulls in `react` and `react-dom` as peer
 * dependencies. The `DiagramEditor` is the all-in-one component most
 * consumers reach for; `SequenceEditor` is the sequence-diagram specialization.
 * `Toolbar` and `StepEditor` are exposed for embedding the same primitives
 * inside a custom shell.
 */

export { DiagramEditor } from './DiagramEditor.js';
export type { DiagramEditorProps, ThemeColors } from './DiagramEditor.js';
export { SequenceEditor } from './SequenceEditor.js';
export type { SequenceEditorProps, SequenceThemeColors } from './SequenceEditor.js';
export { Toolbar } from './Toolbar.js';
export { StepEditor } from './StepEditor.js';
export { presetFlowchartModel, presetSequenceModel, emptyModel } from './presets.js';
