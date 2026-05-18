import React, { useState } from 'react';
import type { DiagramModel, DiagramNode, DiagramVariant } from '../core/types.js';
import type { ThemeColors } from './theme.js';

export interface NodeNavigatorProps {
  model: DiagramModel;
  selected: string | null;
  variant: DiagramVariant;
  isDark: boolean;
  t: ThemeColors;
  acc: { color: string; fill: string; border: string };
  open: boolean;
  onToggle(): void;
  onSelect(nodeId: string): void;
}

export function NodeNavigator({
  model,
  selected,
  variant,
  isDark,
  t,
  acc,
  open,
  onToggle,
  onSelect,
}: NodeNavigatorProps) {
  const [search, setSearch] = useState('');

  const shapeIcon = (node: DiagramNode) => {
    if (variant === 'question') return '?';
    if (variant === 'journey') return '↗';
    switch (node.shape) {
      case 'diamond':
        return '◇';
      case 'circle':
        return '○';
      case 'parallelogram':
        return '▱';
      default:
        return '▭';
    }
  };

  const filtered = model.nodes.filter((n) => n.label.toLowerCase().includes(search.toLowerCase()));

  const inEdges = (id: string) => model.edges.filter((e) => e.to === id).length;
  const outEdges = (id: string) => model.edges.filter((e) => e.from === id).length;

  if (!open) {
    return (
      <div
        style={{
          width: 36,
          flexShrink: 0,
          background: t.panelBg,
          borderRight: `1px solid ${t.panelBorder}`,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          paddingTop: 8,
          gap: 6,
        }}
      >
        <button
          onClick={onToggle}
          title="Open node list"
          aria-expanded={false}
          aria-label="Open node list"
          style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            color: t.textMuted,
            padding: 6,
            borderRadius: 6,
            fontSize: 14,
            lineHeight: 1,
          }}
        >
          ☰
        </button>
        <div
          style={{
            fontSize: 10,
            color: t.textMuted,
            fontWeight: 700,
            writingMode: 'vertical-rl',
            transform: 'rotate(180deg)',
            letterSpacing: 0.5,
          }}
        >
          {model.nodes.length}
        </div>
      </div>
    );
  }

  return (
    <div
      style={{
        width: 216,
        flexShrink: 0,
        background: t.panelBg,
        borderRight: `1px solid ${t.panelBorder}`,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '10px 12px',
          borderBottom: `1px solid ${t.panelBorder}`,
          flexShrink: 0,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span
            style={{
              fontSize: 11,
              fontWeight: 700,
              color: t.textSecondary,
              textTransform: 'uppercase',
              letterSpacing: 0.7,
            }}
          >
            {variant === 'question' ? 'Questions' : variant === 'journey' ? 'Steps' : 'Nodes'}
          </span>
          <span
            style={{
              fontSize: 10,
              fontWeight: 700,
              color: t.textMuted,
              background: isDark ? '#0f172a' : '#f1f5f9',
              padding: '1px 6px',
              borderRadius: 99,
            }}
          >
            {model.nodes.length}
          </span>
        </div>
        <button
          onClick={onToggle}
          style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            color: t.textMuted,
            padding: '2px 4px',
            borderRadius: 4,
            fontSize: 13,
            lineHeight: 1,
          }}
          title="Collapse"
          aria-expanded={true}
          aria-label="Collapse node list"
        >
          ‹
        </button>
      </div>

      <div
        style={{ padding: '8px 10px', borderBottom: `1px solid ${t.sectionBorder}`, flexShrink: 0 }}
      >
        <div style={{ position: 'relative' }}>
          <span
            style={{
              position: 'absolute',
              left: 8,
              top: '50%',
              transform: 'translateY(-50%)',
              fontSize: 11,
              color: t.textMuted,
              pointerEvents: 'none',
            }}
          >
            ⌕
          </span>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search…"
            style={{
              width: '100%',
              padding: '5px 8px 5px 24px',
              border: `1.5px solid ${t.inputBorder}`,
              borderRadius: 7,
              fontSize: 12,
              background: t.inputBg,
              color: t.inputText,
              outline: 'none',
              boxSizing: 'border-box',
              fontFamily: 'inherit',
            }}
          />
        </div>
      </div>

      <div
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: '6px 8px',
          display: 'flex',
          flexDirection: 'column',
          gap: 2,
        }}
      >
        {filtered.length === 0 && (
          <div
            style={{
              textAlign: 'center',
              padding: '20px 0',
              fontSize: 12,
              color: t.textMuted,
              fontStyle: 'italic',
            }}
          >
            {model.nodes.length === 0 ? 'No nodes yet' : 'No matches'}
          </div>
        )}
        {filtered.map((node, idx) => {
          const isSelected = selected === node.id;
          const answers = (node.metadata?.answers as string[] | undefined) ?? [];
          return (
            <button
              key={node.id}
              onClick={() => onSelect(node.id)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                width: '100%',
                padding: '7px 8px',
                textAlign: 'left',
                background: isSelected ? acc.fill : 'transparent',
                border: isSelected ? `1.5px solid ${acc.border}` : '1.5px solid transparent',
                borderRadius: 8,
                cursor: 'pointer',
                fontFamily: 'inherit',
                transition: 'background 0.1s',
              }}
              onMouseEnter={(e) => {
                if (!isSelected)
                  (e.currentTarget as HTMLElement).style.background = isDark
                    ? '#334155'
                    : '#f1f5f9';
              }}
              onMouseLeave={(e) => {
                if (!isSelected) (e.currentTarget as HTMLElement).style.background = 'transparent';
              }}
            >
              <div
                style={{
                  width: 22,
                  height: 22,
                  borderRadius: 6,
                  flexShrink: 0,
                  background: isSelected ? acc.color : isDark ? '#334155' : '#e2e8f0',
                  color: isSelected ? '#fff' : t.textMuted,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: variant === 'journey' ? 9 : 11,
                  fontWeight: 700,
                }}
              >
                {variant === 'journey' ? idx + 1 : shapeIcon(node)}
              </div>

              <div style={{ flex: 1, minWidth: 0 }}>
                <div
                  style={{
                    fontSize: 12,
                    fontWeight: isSelected ? 600 : 400,
                    color: isSelected ? acc.color : t.textPrimary,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                    lineHeight: 1.3,
                  }}
                >
                  {node.label}
                </div>
                <div style={{ fontSize: 10, color: t.textMuted, lineHeight: 1.2, marginTop: 1 }}>
                  {variant === 'question'
                    ? `${answers.length} answer${answers.length !== 1 ? 's' : ''}`
                    : `${inEdges(node.id)}↓ ${outEdges(node.id)}→`}
                </div>
              </div>

              {isSelected && (
                <span style={{ fontSize: 10, color: acc.color, flexShrink: 0 }}>◉</span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
