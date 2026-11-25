import { Check, CircleAlert, Download, HardDrive, LoaderCircle } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { demos } from '../demo';
import { captureZip, copyCard, download } from '../exporter';
import { captureCard, CardOverflowError, CardSizeError } from '../exporter/capture';
import { parseDeck } from '../parser';
import { languages, resolveSettings } from '../settings';
import type { Language, Settings } from '../settings';
import { cardNumber } from '../themes/Card';
import type { CardProps } from '../themes/Card';
import { copy } from './copy';
import { DesignPanel } from './DesignPanel';
import { demoDraft, readDraft, saveDraft } from './draft';
import { Editor } from './Editor';
import { Preview } from './Preview';

type Action = 'png' | 'copy' | 'zip';

export function App() {
  const [draft, setDraft] = useState(readDraft);
  const [selected, setSelected] = useState(0);
  const [saved, setSaved] = useState(true);
  const [busy, setBusy] = useState<Action>();
  const [progress, setProgress] = useState<{ done: number; total: number }>();
  const [toast, setToast] = useState<{ message: string; failed: boolean }>();
  const exportInFlight = useRef(false);
  const t = copy[draft.language];
  const deck = useMemo(() => parseDeck(draft.markdown, draft.splitH2), [draft.markdown, draft.splitH2]);
  const settings = useMemo(() => resolveSettings(deck.metadata, draft.overrides), [deck.metadata, draft.overrides]);
  const cards = useMemo<CardProps[]>(() => deck.cards.map((card, index) => ({
    card, index, settings, language: draft.language, title: deck.metadata.title, total: deck.cards.length,
  })), [deck, settings, draft.language]);
  const active = Math.min(selected, Math.max(0, cards.length - 1));

  useEffect(() => {
    setSaved(saveDraft(draft));
    document.documentElement.lang = draft.language === 'zh' ? 'zh-CN' : 'en';
  }, [draft]);

  useEffect(() => {
    if (!toast) return;
    const timeout = window.setTimeout(() => setToast(undefined), 4800);
    return () => window.clearTimeout(timeout);
  }, [toast]);

  function setLanguage(language: Language) {
    setDraft(previous => ({
      ...previous,
      language,
      markdown: previous.markdown === demos[previous.language] ? demos[language] : previous.markdown,
    }));
  }

  function updateSetting<K extends keyof Settings>(key: K, value: Settings[K]) {
    setDraft(previous => ({ ...previous, overrides: { ...previous.overrides, [key]: value } }));
  }

  function reset() {
    const pristine = draft.markdown === demos[draft.language] && !draft.splitH2 && !Object.keys(draft.overrides).length;
    if (!pristine && !window.confirm(t.confirmReset)) return;
    setDraft(demoDraft(draft.language));
    setSelected(0);
  }

  async function runExport(action: Action) {
    const card = cards[active];
    if (!card || exportInFlight.current) return;
    exportInFlight.current = true;
    setBusy(action);
    setToast(undefined);
    try {
      if (action === 'zip') {
        const total = cards.length;
        setProgress({ done: 0, total });
        const zip = await captureZip(cards, done => setProgress({ done, total }));
        download(zip, 'prismcard-deck.zip');
        setToast({ message: t.zipDone, failed: false });
      } else if (action === 'copy') {
        await copyCard(card);
        setToast({ message: t.copied, failed: false });
      } else {
        download(await captureCard(card), `prismcard-${cardNumber(card.index + 1)}.png`);
        setToast({ message: t.downloaded, failed: false });
      }
    } catch (error) {
      let message = action === 'copy' ? t.copyError : t.exportError;
      if (error instanceof CardOverflowError) {
        message = t.overflowExport(error.index);
        if (cards[error.index]) setSelected(error.index);
      } else if (error instanceof CardSizeError) {
        message = t.tooLarge;
      }
      setToast({ message, failed: true });
    } finally {
      exportInFlight.current = false;
      setBusy(undefined);
      setProgress(undefined);
    }
  }

  return (
    <div className="studio">
      <header className="topbar">
        <div className="brand">
          <img src={`${import.meta.env.BASE_URL}favicon.svg`} width="36" height="36" alt="" />
          <h1>PrismCard</h1><span className="brand-section">{t.studio}</span>
        </div>
        <div className="top-actions">
          <span className={`saved-status${saved ? '' : ' storage-error'}`} role="status">
            {saved ? <HardDrive size={14} /> : <CircleAlert size={14} />}{saved ? t.saved : t.storageError}
          </span>
          <div className="language-control" role="group" aria-label="Language / 语言">
            {languages.map(language => (
              <button type="button" key={language} lang={language === 'zh' ? 'zh-CN' : 'en'} onClick={() => setLanguage(language)}
                aria-pressed={language === draft.language}>{language === 'zh' ? '中文' : 'EN'}</button>
            ))}
          </div>
          <button className="export-button" type="button" onClick={() => void runExport('zip')} disabled={!cards.length || !!busy}>
            {busy === 'zip' ? <LoaderCircle size={16} className="spinner" /> : <Download size={16} />}
            {progress ? t.progress(progress.done, progress.total) : t.zip}
          </button>
        </div>
      </header>
      <main className="studio-grid">
        <Editor markdown={draft.markdown} change={markdown => setDraft(previous => ({ ...previous, markdown }))} reset={reset} t={t} />
        <Preview cards={cards} index={active} select={setSelected} t={t} busy={!!busy}
          onAutoHeight={() => updateSetting('ratio', 'auto')}
          onAutoFit={scale => setDraft(previous => ({
            ...previous, overrides: { ...previous.overrides, density: 'compact', scale },
          }))}
          onExport={action => void runExport(action)} />
        <DesignPanel settings={settings} language={draft.language} onChange={updateSetting} splitH2={draft.splitH2}
          onSplit={splitH2 => {
            setSelected(0);
            setDraft(previous => ({ ...previous, splitH2 }));
          }} />
      </main>
      {toast && (
        <div className={`toast${toast.failed ? ' toast-error' : ''}`} role={toast.failed ? 'alert' : 'status'}>
          {toast.failed ? <CircleAlert size={18} /> : <Check size={18} />}{toast.message}
        </div>
      )}
    </div>
  );
}
