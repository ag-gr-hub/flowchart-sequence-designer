import React, { useEffect, useRef, useState } from 'react';
import type { ThemeColors } from './theme.js';

export interface CtxMenuState {
  x: number;
  y: number;
  nodeId: string | null;
  edgeId?: string | null;
}

export interface ContextMenuProps {
  x: number; y: number; nodeId: string | null; edgeId?: string | null;
  isDark: boolean; t: ThemeColors; acc: { color: string };
  canUndo: boolean; canRedo: boolean;
  onUndo(): void; onRedo(): void; onReCenter(): void; onAddNode(): void;
  onDuplicate(): void; onRename(): void; onDelete(): void; onDisconnect(): void;
  onEdgeRename?(): void;
  onEdgeStyle?(style: 'solid' | 'dashed' | 'dotted'): void;
  onEdgeArrowhead?(arrow: 'arrow' | 'none'): void;
  onEdgeDelete?(): void;
  onEdgeResetRouting?(): void;
  currentEdgeStyle?: 'solid' | 'dashed' | 'dotted';
  currentEdgeArrow?: 'arrow' | 'none' | 'open';
  edgeHasWaypoint?: boolean;
  containerRef: React.RefObject<HTMLDivElement | null>;
}

export function ContextMenu({
  x, y, nodeId, edgeId, isDark, t, acc, canUndo, canRedo,
  onUndo, onRedo, onReCenter, onAddNode, onDuplicate, onRename, onDelete, onDisconnect,
  onEdgeRename, onEdgeStyle, onEdgeArrowhead, onEdgeDelete, onEdgeResetRouting,
  currentEdgeStyle, currentEdgeArrow, edgeHasWaypoint, containerRef,
}: ContextMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState({ x, y });

  useEffect(() => {
    if (!menuRef.current || !containerRef.current) return;
    const m = menuRef.current.getBoundingClientRect();
    const c = containerRef.current.getBoundingClientRect();
    let nx = x, ny = y;
    if (nx + m.width > c.right - 8) nx = x - m.width;
    if (ny + m.height > c.bottom - 8) ny = y - m.height;
    setPos({ x: nx, y: ny });
  }, [x, y, containerRef]);

  const bg = isDark ? '#1e293b' : '#ffffff';
  const border = isDark ? '#334155' : '#e2e8f0';
  const hoverBg = isDark ? '#334155' : '#f1f5f9';
  const dividerColor = isDark ? '#334155' : '#f1f5f9';
  const text = t.textPrimary;
  const muted = t.textMuted;

  const item = (label: string, onClick: () => void, color?: string, disabled?: boolean): React.ReactNode => (
    <button
      key={label}
      onClick={disabled ? undefined : onClick}
      style={{
        display: 'flex', alignItems: 'center', gap: 10,
        width: '100%', padding: '7px 14px', background: 'none', border: 'none',
        textAlign: 'left', cursor: disabled ? 'default' : 'pointer',
        fontSize: 12, fontFamily: 'ui-sans-serif,system-ui,sans-serif',
        color: disabled ? muted : (color ?? text),
        opacity: disabled ? 0.4 : 1,
        borderRadius: 6,
      }}
      onMouseEnter={e => { if (!disabled) (e.currentTarget as HTMLElement).style.background = hoverBg; }}
      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'none'; }}
    >
      {label}
    </button>
  );

  const divider = <div style={{ height: 1, background: dividerColor, margin: '4px 0' }} />;

  return (
    <div
      ref={menuRef}
      onMouseDown={e => e.stopPropagation()}
      style={{
        position: 'fixed', left: pos.x, top: pos.y, zIndex: 9999,
        background: bg, border: `1px solid ${border}`,
        borderRadius: 10, padding: '5px 0', minWidth: 180,
        boxShadow: isDark ? '0 8px 32px rgba(0,0,0,0.5)' : '0 8px 32px rgba(0,0,0,0.12)',
        fontFamily: 'ui-sans-serif,system-ui,sans-serif',
      }}
    >
      {edgeId ? (
        <>
          <div style={{ padding: '4px 14px 6px', fontSize: 10, fontWeight: 700, color: muted, textTransform: 'uppercase', letterSpacing: 0.8 }}>Edge</div>
          {item('Rename label (dbl-click)', () => onEdgeRename?.())}
          {divider}
          <div style={{ padding: '4px 14px 2px', fontSize: 9, fontWeight: 700, color: muted, textTransform: 'uppercase', letterSpacing: 0.8 }}>Style</div>
          {item(`Solid${currentEdgeStyle === 'solid' || !currentEdgeStyle ? ' ✓' : ''}`, () => onEdgeStyle?.('solid'))}
          {item(`Dashed${currentEdgeStyle === 'dashed' ? ' ✓' : ''}`, () => onEdgeStyle?.('dashed'))}
          {item(`Dotted${currentEdgeStyle === 'dotted' ? ' ✓' : ''}`, () => onEdgeStyle?.('dotted'))}
          {divider}
          <div style={{ padding: '4px 14px 2px', fontSize: 9, fontWeight: 700, color: muted, textTransform: 'uppercase', letterSpacing: 0.8 }}>Arrowhead</div>
          {item(`Arrow${currentEdgeArrow !== 'none' ? ' ✓' : ''}`, () => onEdgeArrowhead?.('arrow'))}
          {item(`None${currentEdgeArrow === 'none' ? ' ✓' : ''}`, () => onEdgeArrowhead?.('none'))}
          {divider}
          {item('Reset routing', () => onEdgeResetRouting?.(), undefined, !edgeHasWaypoint)}
          {item('Delete edge', () => onEdgeDelete?.(), '#ef4444')}
        </>
      ) : nodeId ? (
        <>
          <div style={{ padding: '4px 14px 6px', fontSize: 10, fontWeight: 700, color: muted, textTransform: 'uppercase', letterSpacing: 0.8 }}>Node</div>
          {item('Rename (dbl-click)', onRename)}
          {item('Duplicate', onDuplicate)}
          {item('Disconnect all edges', onDisconnect)}
          {divider}
          {item('Delete node', onDelete, '#ef4444')}
        </>
      ) : (
        <>
          <div style={{ padding: '4px 14px 6px', fontSize: 10, fontWeight: 700, color: muted, textTransform: 'uppercase', letterSpacing: 0.8 }}>Canvas</div>
          {item('Add node here', onAddNode, acc.color)}
          {item('Re-center (Ctrl+0)', onReCenter)}
          {divider}
          {item('Undo (Ctrl+Z)', onUndo, undefined, !canUndo)}
          {item('Redo (Ctrl+Y)', onRedo, undefined, !canRedo)}
        </>
      )}
    </div>
  );
}
