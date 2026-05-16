export type DiagramType = 'flowchart' | 'sequence';
export type DiagramVariant = 'flowchart' | 'question' | 'journey';
export type NodeShape = 'rectangle' | 'diamond' | 'circle' | 'parallelogram';
export type ExportFormat = 'mermaid' | 'plantuml' | 'json' | 'svg' | 'png';

export interface DiagramNode {
  id: string;
  label: string;
  shape?: NodeShape;
  x?: number;
  y?: number;
  metadata?: Record<string, unknown>;
}

export interface DiagramEdge {
  id: string;
  from: string;
  to: string;
  label?: string;
  style?: 'solid' | 'dashed' | 'dotted';
  arrowhead?: 'arrow' | 'none' | 'open';
}

export interface SequenceMessage {
  id: string;
  from: string;
  to: string;
  label: string;
  style?: 'solid' | 'dashed';
}

export interface DiagramModel {
  type: DiagramType;
  title?: string;
  nodes: DiagramNode[];
  edges: DiagramEdge[];
  actors?: string[];
  messages?: SequenceMessage[];
}
