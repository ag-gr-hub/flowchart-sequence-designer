import type { DiagramVariant } from '../core/types.js';

/**
 * Color palette for the flowchart `<DiagramEditor>`. Every visual surface
 * pulls from one of these tokens, so overriding any single property via
 * `themeOverrides` updates every element that uses it. Built-in
 * `lightTheme` and `darkTheme` are exported as ready-made values.
 *
 * Token groups:
 * - `canvas` / `dot` — background and dot-grid color.
 * - `nodeFill` / `nodeStroke` / `nodeSelectedFill` — base node styling.
 * - `edgeColor` — edge stroke and arrowhead color.
 * - `text*` — type ramp (primary > secondary > muted).
 * - `panel*` / `ctrls*` / `input*` / `card*` / `section*` — chrome around
 *   the canvas (side panel, controls, form fields, card rows).
 * - `labelText` / `hintText` — small-text accents inside chrome.
 * - `statusBg` / `bannerBg` — bottom validation banner backdrop.
 * - `btnSec*` / `shapeBtn*` — secondary button surfaces.
 * - `addFormBg` — accent backdrop for the "add node" form.
 */
export interface ThemeColors {
  canvas: string; dot: string;
  nodeFill: string; nodeStroke: string; nodeSelectedFill: string;
  edgeColor: string;
  textPrimary: string; textSecondary: string; textMuted: string;
  panelBg: string; panelBorder: string;
  ctrlsBg: string; ctrlsBorder: string;
  inputBg: string; inputBorder: string; inputText: string;
  cardBg: string; cardBorder: string;
  sectionBorder: string;
  labelText: string;
  hintText: string;
  statusBg: string;
  btnSecBg: string; btnSecText: string;
  shapeBtnBg: string; shapeBtnBorder: string;
  addFormBg: string;
  bannerBg: string;
}

/** Default light palette. Indigo accent on a near-white canvas. */
export const lightTheme: ThemeColors = {
  canvas: '#fafbfc', dot: '#dbe3ee',
  nodeFill: '#ffffff', nodeStroke: '#cbd5e1', nodeSelectedFill: '#eef2ff',
  edgeColor: '#94a3b8',
  textPrimary: '#1e293b', textSecondary: '#475569', textMuted: '#94a3b8',
  panelBg: '#ffffff', panelBorder: '#e2e8f0',
  ctrlsBg: '#ffffff', ctrlsBorder: '#cbd5e1',
  inputBg: '#f8fafc', inputBorder: '#e2e8f0', inputText: '#1e293b',
  cardBg: '#f8fafc', cardBorder: '#e2e8f0',
  sectionBorder: '#f1f5f9',
  labelText: '#94a3b8',
  hintText: '#94a3b8',
  statusBg: '#ffffff',
  btnSecBg: '#e2e8f0', btnSecText: '#475569',
  shapeBtnBg: '#f1f5f9', shapeBtnBorder: '#e2e8f0',
  addFormBg: '#f5f3ff',
  bannerBg: '#f8fafc',
};

/** Default dark palette. Slate canvas with a softer indigo accent. */
export const darkTheme: ThemeColors = {
  canvas: '#0f172a', dot: '#1e293b',
  nodeFill: '#1e293b', nodeStroke: '#334155', nodeSelectedFill: '#1e1b4b',
  edgeColor: '#475569',
  textPrimary: '#f1f5f9', textSecondary: '#94a3b8', textMuted: '#475569',
  panelBg: '#1e293b', panelBorder: '#334155',
  ctrlsBg: '#0f172a', ctrlsBorder: '#1e293b',
  inputBg: '#0f172a', inputBorder: '#334155', inputText: '#e2e8f0',
  cardBg: '#0f172a', cardBorder: '#334155',
  sectionBorder: '#0f172a',
  labelText: '#475569',
  hintText: '#475569',
  statusBg: '#0f172a',
  btnSecBg: '#334155', btnSecText: '#94a3b8',
  shapeBtnBg: '#0f172a', shapeBtnBorder: '#334155',
  addFormBg: '#1e1b4b',
  bannerBg: '#1e293b',
};

export const ACCENT = {
  indigo: '#4f46e5', indigoGlow: 'rgba(79,70,229,0.22)',
  indigoLight: '#818cf8', indigoText: '#a5b4fc',
  indigoSoftBg: 'rgba(79,70,229,0.15)', indigoSoftBorder: 'rgba(79,70,229,0.3)',
  amber: '#d97706', amberLight: '#fef3c7', amberBorder: '#fcd34d', amberGlow: 'rgba(217,119,6,0.25)',
  amberDark: '#fbbf24', amberDarkLight: 'rgba(251,191,36,0.12)', amberDarkBorder: 'rgba(251,191,36,0.3)',
  emerald: '#059669', emeraldLight: '#ecfdf5', emeraldGlow: 'rgba(5,150,105,0.2)',
  emeraldDark: '#10b981', emeraldDarkLight: 'rgba(16,185,129,0.12)', emeraldDarkBorder: 'rgba(16,185,129,0.3)',
};

export interface VariantAccent {
  color: string;
  fill: string;
  border: string;
  glow: string;
}

export function variantAccent(variant: DiagramVariant, isDark: boolean): VariantAccent {
  if (variant === 'question') {
    return isDark
      ? { color: ACCENT.amberDark, fill: ACCENT.amberDarkLight, border: ACCENT.amberDarkBorder, glow: ACCENT.amberGlow }
      : { color: ACCENT.amber, fill: ACCENT.amberLight, border: ACCENT.amberBorder, glow: ACCENT.amberGlow };
  }
  if (variant === 'journey') {
    return isDark
      ? { color: ACCENT.emeraldDark, fill: ACCENT.emeraldDarkLight, border: ACCENT.emeraldDarkBorder, glow: ACCENT.emeraldGlow }
      : { color: ACCENT.emerald, fill: ACCENT.emeraldLight, border: '#6ee7b7', glow: ACCENT.emeraldGlow };
  }
  return isDark
    ? { color: '#818cf8', fill: 'rgba(79,70,229,0.12)', border: 'rgba(79,70,229,0.3)', glow: ACCENT.indigoGlow }
    : { color: ACCENT.indigo, fill: '#f5f3ff', border: '#c7d2fe', glow: ACCENT.indigoGlow };
}
