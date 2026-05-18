import React, { useCallback, useEffect, useRef, useState } from 'react';

export interface ImportDialogProps {
  open: boolean;
  onClose(): void;
  onImport(text: string): void;
}

/**
 * Modal for importing a Mermaid or JSON diagram. Textarea for paste plus a
 * file picker (.json / .mmd / .mermaid / .txt). Auto-detects format from
 * the body: leading `{` → JSON, otherwise Mermaid.
 */
export function ImportDialog({ open, onClose, onImport }: ImportDialogProps) {
  const [text, setText] = useState('');
  const [fileName, setFileName] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);

  // Reset every time the dialog opens; focus the textarea so paste works
  // without an extra click.
  useEffect(() => {
    if (!open) return;
    setText('');
    setFileName(null);
    setError(null);
    const id = requestAnimationFrame(() => textareaRef.current?.focus());
    return () => cancelAnimationFrame(id);
  }, [open]);

  // Esc closes, Tab is trapped inside the dialog so focus can't leak to the
  // editor underneath.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
        return;
      }
      if (e.key !== 'Tab') return;
      const root = dialogRef.current;
      if (!root) return;
      const focusables = root.querySelectorAll<HTMLElement>(
        'button:not([disabled]), textarea, input:not([type="file"])',
      );
      if (focusables.length === 0) return;
      const first = focusables[0]!;
      const last = focusables[focusables.length - 1]!;
      const active = document.activeElement as HTMLElement | null;
      if (e.shiftKey && active === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && active === last) { e.preventDefault(); first.focus(); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  const onFile = useCallback((file: File) => {
    setError(null);
    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = () => {
      const result = typeof reader.result === 'string' ? reader.result : '';
      setText(result);
    };
    reader.onerror = () => setError(`Could not read ${file.name}`);
    reader.readAsText(file);
  }, []);

  const onSubmit = useCallback(() => {
    const trimmed = text.trim();
    if (!trimmed) {
      setError('Paste a diagram or pick a file first.');
      return;
    }
    try {
      onImport(trimmed);
      onClose();
    } catch (e) {
      setError((e as Error).message);
    }
  }, [text, onImport, onClose]);

  if (!open) return null;

  const trimmed = text.trim();
  const detected = !trimmed ? null : trimmed.startsWith('{') ? 'JSON' : 'Mermaid';
  const canSubmit = trimmed.length > 0;

  return (
    <div role="presentation" onClick={onClose} style={s.backdrop}>
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="fsd-import-title"
        onClick={(e) => e.stopPropagation()}
        style={s.dialog}
      >
        <header style={s.header}>
          <div style={s.brandDot} />
          <h2 id="fsd-import-title" style={s.title}>Import diagram</h2>
          <span style={s.headerHint}>Mermaid or JSON</span>
        </header>

        <div style={s.body}>
          <label htmlFor="fsd-import-textarea" style={s.label}>Paste source</label>
          <textarea
            id="fsd-import-textarea"
            ref={textareaRef}
            value={text}
            onChange={(e) => { setText(e.target.value); setError(null); }}
            placeholder={PLACEHOLDER}
            spellCheck={false}
            style={s.textarea}
          />

          <div style={s.fileRow}>
            <input
              ref={fileInputRef}
              type="file"
              accept=".json,.mmd,.mermaid,.txt,application/json,text/plain"
              style={s.hiddenFile}
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) onFile(f);
                e.target.value = '';
              }}
            />
            <button type="button" onClick={() => fileInputRef.current?.click()} style={s.fileBtn}>
              Choose file…
            </button>
            <span style={s.fileName}>{fileName ?? '.json, .mmd, .mermaid, .txt'}</span>
          </div>

          <div style={s.status} aria-live="polite">
            {error ? (
              <span style={s.error}>! {error}</span>
            ) : detected ? (
              <span style={s.ok}>Detected: {detected}</span>
            ) : null}
          </div>
        </div>

        <footer style={s.footer}>
          <button type="button" onClick={onClose} style={s.cancelBtn}>Cancel</button>
          <button
            type="button"
            onClick={onSubmit}
            disabled={!canSubmit}
            style={{ ...s.submitBtn, ...(canSubmit ? null : s.submitBtnDisabled) }}
          >
            Import
          </button>
        </footer>
      </div>
    </div>
  );
}

const PLACEHOLDER =
  'flowchart TD\n  A[Start] --> B{Choice?}\n  B -->|yes| C[Done]\n  B -->|no| A';

// ── Styles ────────────────────────────────────────────────────────────────
// The dialog is launched from the Toolbar which is fixed-dark, so the modal
// matches that surface rather than the canvas's themed palette.
const s = {
  backdrop: {
    position: 'fixed', inset: 0, zIndex: 100,
    background: 'rgba(15, 23, 42, 0.65)',
    backdropFilter: 'blur(2px)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    padding: 24, fontFamily: 'ui-sans-serif,system-ui,sans-serif',
  },
  dialog: {
    width: 'min(560px, 100%)', maxHeight: '90vh',
    background: '#1e293b', color: '#f1f5f9',
    border: '1px solid #334155', borderRadius: 12,
    boxShadow: '0 24px 64px rgba(0,0,0,0.45)',
    display: 'flex', flexDirection: 'column', overflow: 'hidden',
  },
  header: {
    padding: '14px 18px', borderBottom: '1px solid #334155',
    display: 'flex', alignItems: 'center', gap: 10,
  },
  brandDot: {
    width: 8, height: 8, borderRadius: '50%',
    background: '#4f46e5', boxShadow: '0 0 8px #818cf8',
  },
  title: {
    margin: 0, fontSize: 14, fontWeight: 700, letterSpacing: 0.2,
    color: '#f1f5f9', fontFamily: 'ui-monospace,monospace',
  },
  headerHint: { marginLeft: 'auto', fontSize: 11, color: '#64748b' },
  body: { padding: 18, display: 'flex', flexDirection: 'column', gap: 12, overflow: 'auto' },
  label: {
    fontSize: 11, fontWeight: 600, color: '#94a3b8',
    letterSpacing: 0.4, textTransform: 'uppercase',
  },
  textarea: {
    width: '100%', minHeight: 180,
    padding: '10px 12px', borderRadius: 8,
    background: '#0f172a', color: '#e2e8f0',
    border: '1px solid #334155', outline: 'none',
    fontFamily: 'ui-monospace,SFMono-Regular,Menlo,Consolas,monospace',
    fontSize: 12, lineHeight: 1.55, resize: 'vertical',
    boxSizing: 'border-box',
  },
  fileRow: {
    display: 'flex', alignItems: 'center', gap: 10,
    padding: '10px 12px', borderRadius: 8,
    background: 'rgba(79, 70, 229, 0.08)',
    border: '1px dashed rgba(79, 70, 229, 0.4)',
  },
  hiddenFile: { display: 'none' },
  fileBtn: {
    padding: '6px 12px', borderRadius: 6, cursor: 'pointer',
    background: '#4f46e5', color: '#fff', border: 'none',
    fontSize: 11, fontWeight: 600, fontFamily: 'inherit',
    letterSpacing: 0.2,
  },
  fileName: {
    fontSize: 11, color: '#cbd5e1', flex: 1,
    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
  },
  status: { display: 'flex', alignItems: 'center', minHeight: 16 },
  error: { fontSize: 11, color: '#fca5a5', fontWeight: 500 },
  ok: { fontSize: 11, color: '#86efac', fontWeight: 500 },
  footer: {
    padding: '12px 18px', borderTop: '1px solid #334155',
    display: 'flex', justifyContent: 'flex-end', gap: 8,
    background: '#0f172a',
  },
  cancelBtn: {
    padding: '6px 14px', borderRadius: 6, cursor: 'pointer',
    background: 'transparent', color: '#cbd5e1',
    border: '1px solid #334155',
    fontSize: 12, fontWeight: 500, fontFamily: 'inherit',
  },
  submitBtn: {
    padding: '6px 14px', borderRadius: 6, cursor: 'pointer',
    background: '#4f46e5', color: '#fff', border: 'none',
    fontSize: 12, fontWeight: 600, fontFamily: 'inherit',
    letterSpacing: 0.2,
  },
  submitBtnDisabled: { cursor: 'not-allowed', background: 'rgba(79,70,229,0.35)' },
} satisfies Record<string, React.CSSProperties>;
