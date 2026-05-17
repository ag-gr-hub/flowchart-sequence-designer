/**
 * Built-in sample diagrams shown when a consumer mounts the editor without
 * an `initialModel`. The goal is for the empty state to look like a real
 * working diagram, not a blank canvas — so a developer evaluating the
 * package immediately sees the canvas, edge styles, and side panels with
 * meaningful content.
 *
 * Pass `initialModel={emptyModel(variant)}` (or any model of your own) to
 * opt out of the preset.
 */

import type { DiagramModel, DiagramVariant, DiagramType } from '../core/types.js';

/**
 * Return a blank model of the requested type/variant. Useful as
 * `initialModel={emptyModel('flowchart')}` to opt out of the demo preset.
 */
export function emptyModel(
  type: DiagramType,
  variant?: DiagramVariant,
): DiagramModel {
  if (type === 'sequence') {
    return { type: 'sequence', nodes: [], edges: [], actors: [], messages: [] };
  }
  return { type: 'flowchart', variant: variant ?? 'flowchart', nodes: [], edges: [] };
}

const FLOWCHART_PRESET: DiagramModel = {
  type: 'flowchart',
  variant: 'flowchart',
  nodes: [
    { id: 'start',   label: 'Start',            shape: 'circle',     x: 240, y: 60 },
    { id: 'place',   label: 'Place order',      shape: 'rectangle',  x: 216, y: 180 },
    { id: 'check',   label: 'Payment valid?',   shape: 'diamond',    x: 200, y: 300 },
    { id: 'confirm', label: 'Send confirmation',shape: 'rectangle',  x: 60,  y: 460 },
    { id: 'retry',   label: 'Notify failure',   shape: 'rectangle',  x: 380, y: 460 },
    { id: 'done',    label: 'Done',             shape: 'circle',     x: 240, y: 580 },
  ],
  edges: [
    { id: 'e1', from: 'start',   to: 'place' },
    { id: 'e2', from: 'place',   to: 'check' },
    { id: 'e3', from: 'check',   to: 'confirm', label: 'yes' },
    { id: 'e4', from: 'check',   to: 'retry',   label: 'no', style: 'dashed' },
    { id: 'e5', from: 'confirm', to: 'done' },
    { id: 'e6', from: 'retry',   to: 'done',    style: 'dashed' },
  ],
};

const QUESTION_PRESET: DiagramModel = {
  type: 'flowchart',
  variant: 'question',
  nodes: [
    {
      id: 'role',
      label: 'What is your role?',
      shape: 'rectangle',
      x: 220, y: 60,
      metadata: { answers: ['Engineer', 'Designer', 'PM'] },
    },
    { id: 'eng',    label: 'Engineering docs',  shape: 'rectangle', x: 40,  y: 320 },
    { id: 'design', label: 'Design system',     shape: 'rectangle', x: 280, y: 320 },
    { id: 'pm',     label: 'Product roadmap',   shape: 'rectangle', x: 520, y: 320 },
  ],
  edges: [
    { id: 'q1', from: 'role', to: 'eng',    label: 'Engineer' },
    { id: 'q2', from: 'role', to: 'design', label: 'Designer' },
    { id: 'q3', from: 'role', to: 'pm',     label: 'PM' },
  ],
};

const JOURNEY_PRESET: DiagramModel = {
  type: 'flowchart',
  variant: 'journey',
  nodes: [
    { id: 'j1', label: 'Sign up',          shape: 'rectangle', x: 60,  y: 60 },
    { id: 'j2', label: 'Verify email',     shape: 'rectangle', x: 60,  y: 180 },
    { id: 'j3', label: 'Complete profile', shape: 'rectangle', x: 60,  y: 300 },
    { id: 'j4', label: 'Invite team',      shape: 'rectangle', x: 60,  y: 420 },
    { id: 'j5', label: 'Launch project',   shape: 'rectangle', x: 60,  y: 540 },
  ],
  edges: [
    { id: 'je1', from: 'j1', to: 'j2' },
    { id: 'je2', from: 'j2', to: 'j3' },
    { id: 'je3', from: 'j3', to: 'j4' },
    { id: 'je4', from: 'j4', to: 'j5' },
  ],
};

const SEQUENCE_PRESET: DiagramModel = {
  type: 'sequence',
  nodes: [],
  edges: [],
  actors: ['User', 'App', 'Server'],
  messages: [
    { id: 'm1', from: 'User',   to: 'App',    label: 'Tap "Log in"' },
    { id: 'm2', from: 'App',    to: 'Server', label: 'POST /login' },
    { id: 'm3', from: 'Server', to: 'App',    label: '200 OK + token', style: 'dashed' },
    { id: 'm4', from: 'App',    to: 'User',   label: 'Show dashboard', style: 'dashed' },
  ],
};

/**
 * Return a fresh, ready-to-edit flowchart model for the requested variant.
 * The result is a deep clone — callers may mutate freely without affecting
 * future calls.
 *
 * - `flowchart` → 6-node order-processing example with a decision diamond
 * - `question`  → 1-question / 3-answer routing example
 * - `journey`   → 5-step linear onboarding sequence
 */
export function presetFlowchartModel(variant: DiagramVariant = 'flowchart'): DiagramModel {
  if (variant === 'question') return cloneModel(QUESTION_PRESET);
  if (variant === 'journey')  return cloneModel(JOURNEY_PRESET);
  return cloneModel(FLOWCHART_PRESET);
}

/**
 * Return a fresh, ready-to-edit sequence model — a 4-message User → App →
 * Server login flow. Deep-cloned; safe to mutate.
 */
export function presetSequenceModel(): DiagramModel {
  return cloneModel(SEQUENCE_PRESET);
}

function cloneModel(m: DiagramModel): DiagramModel {
  return {
    ...m,
    nodes: m.nodes.map((n) => ({ ...n, metadata: n.metadata ? { ...n.metadata } : undefined })),
    edges: m.edges.map((e) => ({ ...e })),
    actors: m.actors ? [...m.actors] : undefined,
    messages: m.messages?.map((msg) => ({ ...msg })),
  };
}
