import React from 'react';
import type { Toast } from './hooks/useToast.js';

const TOAST_COLORS = {
  success: { bg: '#065f46', border: '#10b981', text: '#ecfdf5' },
  error: { bg: '#7f1d1d', border: '#ef4444', text: '#fef2f2' },
  info: { bg: '#1e3a5f', border: '#3b82f6', text: '#eff6ff' },
};

const containerStyle: React.CSSProperties = {
  position: 'absolute',
  top: 8,
  right: 8,
  display: 'flex',
  flexDirection: 'column',
  gap: 6,
  zIndex: 9999,
  pointerEvents: 'none',
};

/**
 * Renders a stack of auto-dismissing toast notifications.
 * Position this inside a `position: relative` container.
 */
export function ToastContainer({ toasts, onDismiss }: { toasts: Toast[]; onDismiss: (id: number) => void }) {
  if (toasts.length === 0) return null;
  return (
    <div style={containerStyle}>
      {toasts.map(t => {
        const c = TOAST_COLORS[t.type];
        return (
          <div
            key={t.id}
            role="alert"
            aria-live="polite"
            style={{
              background: c.bg,
              border: `1px solid ${c.border}`,
              color: c.text,
              padding: '8px 14px',
              borderRadius: 8,
              fontSize: 12,
              fontWeight: 500,
              fontFamily: 'ui-sans-serif,system-ui,sans-serif',
              boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
              pointerEvents: 'auto',
              cursor: 'pointer',
              maxWidth: 280,
            }}
            onClick={() => onDismiss(t.id)}
          >
            {t.type === 'success' && '✓ '}
            {t.type === 'error' && '✗ '}
            {t.message}
          </div>
        );
      })}
    </div>
  );
}
