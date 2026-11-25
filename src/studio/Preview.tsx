import { AlertTriangle, ChevronLeft, ChevronRight, Copy as CopyIcon, Download, Layers } from 'lucide-react';
import { useCallback, useLayoutEffect, useRef, useState } from 'react';
import { ratios } from '../settings';
import { Card, cardNumber, cardOverflows } from '../themes/Card';
import type { CardProps } from '../themes/Card';
import type { Copy } from './copy';

type Mode = 'single' | 'grid';

interface Measurement {
  index: number;
  height: number;
  overflow: boolean;
}

interface FrameProps {
  card: CardProps;
  mode: Mode;
  onMeasure?: (measurement: Measurement) => void;
  overflowLabel: string;
}

function PreviewFrame({ card, mode, onMeasure, overflowLabel }: FrameProps) {
  const host = useRef<HTMLDivElement>(null);
  const mount = useRef<HTMLDivElement>(null);
  const preset = ratios[card.settings.ratio];
  const [geometry, setGeometry] = useState({ width: preset.width, height: preset.height ?? 360, scale: .4, overflow: false });

  useLayoutEffect(() => {
    const bounds = mode === 'single' ? host.current?.parentElement : host.current;
    const element = mount.current?.querySelector<HTMLElement>('[data-prism-card]');
    const flow = element?.querySelector('.card-flow');
    if (!bounds || !element || !flow) return;

    const measure = () => {
      const width = preset.width;
      const height = element.offsetHeight;
      const gutter = mode === 'grid' ? 0 : bounds.clientWidth < 440 ? 36 : 70;
      const maxHeight = mode === 'grid' ? 230 : preset.height ? bounds.clientHeight - 64 : Infinity;
      const scale = Math.max(.05, Math.min(1, (bounds.clientWidth - gutter) / width, maxHeight / height));
      const overflow = cardOverflows(element);
      setGeometry(previous => previous.width === width && previous.height === height && previous.scale === scale
        && previous.overflow === overflow ? previous : { width, height, scale, overflow });
      onMeasure?.({ index: card.index, height, overflow });
    };
    const observer = new ResizeObserver(measure);
    for (const target of [bounds, element, flow]) observer.observe(target);
    measure();
    return () => observer.disconnect();
  }, [card, mode, onMeasure, preset]);

  return (
    <div ref={host} className={`frame-host frame-${mode}`} data-preview-index={card.index}>
      <div className="preview-scaled" aria-hidden={mode === 'grid' ? true : undefined}
        style={{ width: geometry.width * geometry.scale, height: geometry.height * geometry.scale }}>
        <div className="preview-mount" ref={mount} style={{ transform: `scale(${geometry.scale})` }}><Card {...card} /></div>
      </div>
      {mode === 'grid' && geometry.overflow && <span className="grid-overflow">{overflowLabel}</span>}
    </div>
  );
}

function compactScale(element: HTMLElement, scale: number): number {
  const className = element.className;
  const originalScale = element.style.getPropertyValue('--font-scale');
  try {
    element.classList.remove('density-balanced', 'density-airy');
    element.classList.add('density-compact');
    // Test from the current size downward so wrapping changes can never skip a better fit.
    for (let candidate = Math.floor(scale); candidate >= 85; candidate--) {
      element.style.setProperty('--font-scale', String(candidate / 100));
      if (!cardOverflows(element)) return candidate;
    }
    return 85;
  } finally {
    element.className = className;
    element.style.setProperty('--font-scale', originalScale);
  }
}

interface Props {
  cards: CardProps[];
  index: number;
  select: (index: number) => void;
  onAutoHeight: () => void;
  onAutoFit: (scale: number) => void;
  onExport: (action: 'png' | 'copy') => void;
  busy: boolean;
  t: Copy;
}

export function Preview({ cards, index, select, onAutoHeight, onAutoFit, onExport, busy, t }: Props) {
  const stage = useRef<HTMLDivElement>(null);
  const [mode, setMode] = useState<Mode>('single');
  const [measurement, setMeasurement] = useState<Measurement>();
  const measureActive = useCallback((next: Measurement) => {
    setMeasurement(previous => previous?.index === next.index && previous.height === next.height && previous.overflow === next.overflow
      ? previous : next);
  }, []);
  const card = cards[index];
  const frame = card ? ratios[card.settings.ratio] : null;
  const active = measurement?.index === index ? measurement : undefined;
  const overflow = card && active?.overflow;
  const exhausted = card?.settings.density === 'compact' && card.settings.scale === 85;
  const pngSize = frame ? `${frame.width * 2} × ${(frame.height ?? active?.height ?? 360) * 2}` : '';

  function fitCard() {
    const element = stage.current?.querySelector<HTMLElement>(`[data-preview-index="${index}"] [data-prism-card]`);
    if (element && card) onAutoFit(compactScale(element, card.settings.scale));
  }

  return (
    <section className="studio-panel preview-panel" aria-labelledby="preview-title">
      <div className="panel-heading preview-heading">
        <h2 id="preview-title"><Layers size={17} /> {t.preview} <span className="deck-count">{t.card(cards.length)}</span></h2>
        <div className="preview-actions">
          <div className="segments preview-modes" role="group" aria-label={t.previewMode}>
            <button type="button" aria-pressed={mode === 'single'} onClick={() => setMode('single')}>{t.single}</button>
            <button type="button" aria-pressed={mode === 'grid'} onClick={() => setMode('grid')}>{t.grid}</button>
          </div>
          <button type="button" className="icon-button" aria-label={t.clipboard} title={t.clipboard}
            onClick={() => onExport('copy')} disabled={!card || overflow || busy}><CopyIcon size={17} /></button>
          <button type="button" className="icon-button download-button" aria-label={t.download} title={t.download}
            onClick={() => onExport('png')} disabled={!card || overflow || busy}><Download size={17} /></button>
        </div>
      </div>
      <div className="preview-stage-wrap">
        <div ref={stage} className={`preview-stage${mode === 'grid' && card ? ' stage-grid' : ''}`}>
          {!card && <div className="preview-empty"><Layers size={32} /><h3>{t.empty}</h3><p>{t.emptyHint}</p></div>}
          {card && mode === 'single' && <PreviewFrame card={card} mode={mode} onMeasure={measureActive} overflowLabel={t.overflowBadge} />}
          {card && mode === 'grid' && (
            <ul className="preview-grid" aria-label={t.deckPages}>
              {cards.map(page => {
                const number = cardNumber(page.index + 1);
                const title = page.card.heading || t.untitled;
                const selected = page.index === index;
                return (
                  <li className="grid-card" data-active={selected} key={page.index}>
                    <PreviewFrame card={page} mode={mode} onMeasure={selected ? measureActive : undefined} overflowLabel={t.overflowBadge} />
                    <div className="grid-card-label" aria-hidden="true"><b>{number}</b><span>{title}</span></div>
                    <button className="grid-card-select" type="button" aria-current={selected ? 'page' : undefined}
                      aria-label={t.selectCard(number, title)} onClick={() => select(page.index)} />
                  </li>
                );
              })}
            </ul>
          )}
        </div>
        {overflow && (
          <div className="overflow-notice">
            <div className="overflow-message" role="status">
              <AlertTriangle size={17} />
              <div><strong>{t.overflow}</strong><span>{exhausted ? t.fitFailed : t.overflowHint}</span></div>
            </div>
            <div className="overflow-actions">
              <button type="button" onClick={fitCard} disabled={exhausted}>{t.autoFit}</button>
              <button type="button" onClick={onAutoHeight}>{t.autoHeight}</button>
            </div>
          </div>
        )}
      </div>
      <div className="deck-strip" aria-label={t.deckPages}>
        <button className="icon-button deck-arrow" aria-label={t.previous} title={t.previous} type="button"
          disabled={index === 0 || !card} onClick={() => select(index - 1)}><ChevronLeft size={18} /></button>
        <div className="deck-tabs">
          {cards.map(({ card: page, index: pageIndex }) => (
            <button key={pageIndex} className="deck-tab" type="button" aria-current={pageIndex === index ? 'page' : undefined}
              title={page.heading || t.untitled} onClick={event => {
                select(pageIndex);
                event.currentTarget.scrollIntoView({ block: 'nearest', inline: 'nearest' });
              }}>
              <b>{cardNumber(pageIndex + 1)}</b><span>{page.heading || t.untitled}</span>
            </button>
          ))}
        </div>
        <button className="icon-button deck-arrow" aria-label={t.next} title={t.next} type="button"
          disabled={index >= cards.length - 1 || !card} onClick={() => select(index + 1)}><ChevronRight size={18} /></button>
      </div>
      <div className="panel-status preview-status">
        <span>{card ? `${cardNumber(index + 1)} / ${cardNumber(cards.length)}` : '–'}</span>
        {card && <span>{pngSize} <b>PNG</b></span>}
      </div>
    </section>
  );
}
