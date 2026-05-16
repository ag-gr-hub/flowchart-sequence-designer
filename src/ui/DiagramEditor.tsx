import React, { useCallback, useState } from 'react';
import {
  ReactFlow,
  addEdge,
  applyNodeChanges,
  applyEdgeChanges,
  Background,
  Controls,
  MiniMap,
  type Node,
  type Edge,
  type OnNodesChange,
  type OnEdgesChange,
  type OnConnect,
  type Connection,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { Toolbar } from './Toolbar.js';
import type { DiagramModel, ExportFormat } from '../core/types.js';
import { Model } from '../core/model.js';
import { toMermaid } from '../exporters/mermaid.js';
import { toPlantUML } from '../exporters/plantuml.js';
import { toJSON } from '../exporters/json.js';
import { toSVG, toPNG } from '../exporters/svg.js';
import { fromMermaid } from '../importers/mermaid.js';
import { fromJSON } from '../importers/json.js';

interface DiagramEditorProps {
  initialModel?: DiagramModel;
  onChange?: (model: DiagramModel) => void;
  onExport?: (format: ExportFormat, content: string | Blob) => void;
  height?: number | string;
}

function modelToFlow(model: DiagramModel): { nodes: Node[]; edges: Edge[] } {
  const NODE_W = 140, NODE_H = 44, GAP_X = 60, GAP_Y = 80, PADDING = 40;
  const nodes: Node[] = model.nodes.map((n, i) => ({
    id: n.id,
    position: { x: n.x ?? PADDING + (i % 4) * (NODE_W + GAP_X), y: n.y ?? PADDING + Math.floor(i / 4) * (NODE_H + GAP_Y) },
    data: { label: n.label },
    type: n.shape === 'diamond' ? 'default' : 'default',
    style: shapeStyle(n.shape),
  }));
  const edges: Edge[] = model.edges.map(e => ({
    id: e.id,
    source: e.from,
    target: e.to,
    label: e.label,
    animated: e.style === 'dashed',
  }));
  return { nodes, edges };
}

function shapeStyle(shape?: string): React.CSSProperties {
  switch (shape) {
    case 'diamond': return { clipPath: 'polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)', background: '#fff', border: '1.5px solid #555' };
    case 'circle': return { borderRadius: '50%', background: '#fff', border: '1.5px solid #555' };
    default: return { background: '#fff', border: '1.5px solid #555', borderRadius: 6 };
  }
}

function flowToModel(nodes: Node[], edges: Edge[], prev: DiagramModel): DiagramModel {
  return {
    ...prev,
    nodes: nodes.map(n => ({
      id: n.id,
      label: String(n.data?.label ?? n.id),
      x: n.position.x,
      y: n.position.y,
    })),
    edges: edges.map(e => ({
      id: e.id,
      from: e.source,
      to: e.target,
      label: e.label ? String(e.label) : undefined,
      style: e.animated ? 'dashed' : 'solid',
    })),
  };
}

export function DiagramEditor({ initialModel, onChange, onExport, height = 600 }: DiagramEditorProps) {
  const baseModel: DiagramModel = initialModel ?? { type: 'flowchart', nodes: [], edges: [] };
  const { nodes: initNodes, edges: initEdges } = modelToFlow(baseModel);

  const [nodes, setNodes] = useState<Node[]>(initNodes);
  const [edges, setEdges] = useState<Edge[]>(initEdges);
  const [currentModel, setCurrentModel] = useState<DiagramModel>(baseModel);

  const onNodesChange: OnNodesChange = useCallback((changes) => {
    setNodes(nds => {
      const updated = applyNodeChanges(changes, nds);
      const newModel = flowToModel(updated, edges, currentModel);
      setCurrentModel(newModel);
      onChange?.(newModel);
      return updated;
    });
  }, [edges, currentModel, onChange]);

  const onEdgesChange: OnEdgesChange = useCallback((changes) => {
    setEdges(eds => {
      const updated = applyEdgeChanges(changes, eds);
      const newModel = flowToModel(nodes, updated, currentModel);
      setCurrentModel(newModel);
      onChange?.(newModel);
      return updated;
    });
  }, [nodes, currentModel, onChange]);

  const onConnect: OnConnect = useCallback((connection: Connection) => {
    setEdges(eds => {
      const updated = addEdge(connection, eds);
      const newModel = flowToModel(nodes, updated, currentModel);
      setCurrentModel(newModel);
      onChange?.(newModel);
      return updated;
    });
  }, [nodes, currentModel, onChange]);

  const handleExport = useCallback(async (format: ExportFormat) => {
    let content: string | Blob;
    switch (format) {
      case 'mermaid': content = toMermaid(currentModel); break;
      case 'plantuml': content = toPlantUML(currentModel); break;
      case 'json': content = toJSON(currentModel); break;
      case 'svg': content = toSVG(currentModel); break;
      case 'png': content = await toPNG(currentModel); break;
      default: return;
    }
    if (onExport) {
      onExport(format, content);
    } else {
      // Default: download
      const url = content instanceof Blob
        ? URL.createObjectURL(content)
        : URL.createObjectURL(new Blob([content], { type: 'text/plain' }));
      const a = document.createElement('a');
      a.href = url;
      a.download = `diagram.${format === 'plantuml' ? 'puml' : format}`;
      a.click();
      URL.revokeObjectURL(url);
    }
  }, [currentModel, onExport]);

  const handleImport = useCallback((text: string) => {
    try {
      const model = text.trim().startsWith('{')
        ? fromJSON(text).toJSON()
        : fromMermaid(text).toJSON();
      const { nodes: n, edges: e } = modelToFlow(model);
      setNodes(n);
      setEdges(e);
      setCurrentModel(model);
      onChange?.(model);
    } catch (err) {
      alert(`Import failed: ${(err as Error).message}`);
    }
  }, [onChange]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height }}>
      <Toolbar onExport={handleExport} onImport={handleImport} />
      <div style={{ flex: 1 }}>
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          fitView
        >
          <Background />
          <Controls />
          <MiniMap />
        </ReactFlow>
      </div>
    </div>
  );
}
