import { FileText, RotateCcw } from 'lucide-react';
import { useRef } from 'react';
import type { Copy } from './copy';

export function Editor({ markdown, change, reset, t }: { markdown: string; change: (value: string) => void; reset: () => void; t: Copy }) {
  const editor = useRef<HTMLTextAreaElement>(null);
  const count = markdown.split('\n').length;

  function insertCard() {
    const field = editor.current;
    if (!field) return;
    const caret = field.selectionDirection === 'backward' ? field.selectionStart : field.selectionEnd;
    field.setRangeText('\n\n---\n\n', caret, caret, 'end');
    change(field.value);
    field.focus();
  }

  return (
    <section className="studio-panel editor-panel" aria-labelledby="editor-title">
      <div className="panel-heading">
        <h2 id="editor-title"><FileText size={17} /> {t.markdown}</h2>
        <div className="editor-actions">
          <button type="button" className="button-plain insert-card-button" onClick={insertCard}>{t.insertCard}</button>
          <button type="button" className="button-plain reset-button" aria-label={t.reset} title={t.reset} onClick={reset}>
            <RotateCcw size={14} /><span>{t.reset}</span>
          </button>
        </div>
      </div>
      <div className="editor-body">
        <textarea ref={editor} value={markdown} onChange={event => change(event.target.value)} aria-label={t.input}
          spellCheck={false} wrap="soft" />
      </div>
      <div className="panel-status editor-status">
        <span className="file-type"><span aria-hidden="true">M↓</span> Markdown</span>
        <span>{t.lines(count)}</span>
      </div>
    </section>
  );
}
