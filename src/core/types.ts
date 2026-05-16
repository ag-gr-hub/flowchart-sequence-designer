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
  /**
   * Optional manual waypoint in canvas coordinates. When set, the edge is
   * routed as two cubic segments that meet at this point. Persisted in JSON
   * exports; ignored by Mermaid/PlantUML serializers (those formats don't
   * encode routing).
   */
  waypoint?: { x: number; y: number };
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
  /** UI variant — controls which editor specialization renders the model. */
  variant?: DiagramVariant;
  title?: string;
  nodes: DiagramNode[];
  edges: DiagramEdge[];
  actors?: string[];
  messages?: SequenceMessage[];
}

export interface ValidationError {
  kind: 'dangling-from' | 'dangling-to' | 'duplicate-node-id' | 'duplicate-edge-id';
  id: string;
  message: string;
}
