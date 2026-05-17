import React, { useCallback, useRef } from 'react';
import type { DiagramModel, DiagramNode } from '../core/types.js';

const W = 168;
const H = 112;
const PAD = 18;

interface NodeBox { id: string; x: number; y: number; w: number; h: number }

export interface MinimapProps {
  model: DiagramModel;
  /** Canvas viewport size (the visible SVG element bounds, in CSS pixels). */
  viewportW: number;
  viewportH: number;
  /** Current pan/zoom transform from the parent canvas. */
  transform: { x: number; y: number; scale: number };
  /** Compute width+height for a node, matching the canvas's measurements. */
  measureNode(node: DiagramNode): { w: number; h: number };
  /** Center the canvas on a content-space point. */
  onCenterOn(contentX: number, contentY: number): void;
  isDark: boolean;
  accentColor: string;
}

export function Minimap({
  model, viewportW, viewportH, transform, measureNode, onCenterOn, isDark, accentColor,
}: MinimapProps) {
  const dragRef = useRef<{ active: boolean } | null>(null);

  const boxes: NodeBox[] = model.nodes.map(n => {
    const { w, h } = measureNode(n);
    return { id: n.id, x: n.x ?? 0, y: n.y ?? 0, w, h };
  });

  if (boxes.length === 0) return null;

  // Content bounding box, plus the current viewport rect (in content space).
  const vx = -transform.x / transform.scale;
  const vy = -transform.y / transform.scale;
  const vw = viewportW / transform.scale;
  const vh = viewportH / transform.scale;

  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const b of boxes) {
    minX = Math.min(minX, b.x); minY = Math.min(minY, b.y);
    maxX = Math.max(maxX, b.x + b.w); maxY = Math.max(maxY, b.y + b.h);
  }
  // Include the viewport so the user always sees their current position.
  minX = Math.min(minX, vx); minY = Math.min(minY, vy);
  maxX = Math.max(maxX, vx + vw); maxY = Math.max(maxY, vy + vh);

  const contentW = Math.max(1, maxX - minX);
  const contentH = Math.max(1, maxY - minY);
  const scale = Math.min((W - PAD * 2) / contentW, (H - PAD * 2) / contentH);
  const offsetX = (W - contentW * scale) / 2 - minX * scale;
  const offsetY = (H - contentH * scale) / 2 - minY * scale;

  const project = (x: number, y: number) => ({
    x: offsetX + x * scale,
    y: offsetY + y * scale,
  });

  const unproject = (mx: number, my: number) => ({
    x: (mx - offsetX) / scale,
    y: (my - offsetY) / scale,
  });

  const panTo = useCallback((e: React.MouseEvent<SVGSVGElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;
    const { x, y } = unproject(mx, my);
    onCenterOn(x, y);
  }, [onCenterOn, scale, offsetX, offsetY]); // eslint-disable-line react-hooks/exhaustive-deps

  const onMouseDown = (e: React.MouseEvent<SVGSVGElement>) => {
    e.stopPropagation();
    dragRef.current = { active: true };
    panTo(e);
  };
  const onMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    if (!dragRef.current?.active) return;
    panTo(e);
  };
  const onMouseUp = () => { dragRef.current = null; };

  const bg = isDark ? 'rgba(15,23,42,0.92)' : 'rgba(255,255,255,0.94)';
  const border = isDark ? '#334155' : '#e2e8f0';
  const nodeFill = isDark ? '#475569' : '#cbd5e1';
  const viewStroke = accentColor;
  const viewFill = `${accentColor}22`;

  // Viewport rect projected into mini-space.
  const vp1 = project(vx, vy);
  const vp2 = project(vx + vw, vy + vh);
  const vpRect = {
    x: Math.max(0, Math.min(W, vp1.x)),
    y: Math.max(0, Math.min(H, vp1.y)),
    w: Math.max(2, Math.min(W, vp2.x) - Math.max(0, vp1.x)),
    h: Math.max(2, Math.min(H, vp2.y) - Math.max(0, vp1.y)),
  };

  return (
    <div
      style={{
        position: 'absolute', bottom: 14, right: 14,
        background: bg, border: `1px solid ${border}`,
        borderRadius: 10, padding: 6,
        boxShadow: isDark ? '0 8px 20px rgba(0,0,0,0.45)' : '0 6px 18px rgba(15,23,42,0.08)',
        backdropFilter: 'blur(6px)',
      }}
    >
      <svg
        width={W} height={H}
        style={{ display: 'block', cursor: 'grab', borderRadius: 6 }}
        onMouseDown={onMouseDown}
        onMouseMove={onMouseMove}
        onMouseUp={onMouseUp}
        onMouseLeave={onMouseUp}
      >
        <rect width={W} height={H} rx={6} fill={isDark ? '#0f172a' : '#fafbfc'} />
        {boxes.map(b => {
          const p = project(b.x, b.y);
          return (
            <rect
              key={b.id}
              x={p.x} y={p.y}
              width={Math.max(2, b.w * scale)} height={Math.max(2, b.h * scale)}
              rx={2} fill={nodeFill}
            />
          );
        })}
        <rect
          x={vpRect.x} y={vpRect.y}
          width={vpRect.w} height={vpRect.h}
          rx={3}
          fill={viewFill} stroke={viewStroke} strokeWidth={1.25}
        />
      </svg>
    </div>
  );
}
