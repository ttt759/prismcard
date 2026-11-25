import type { CSSProperties } from 'react';
import type { ParsedCard } from '../parser';
import { MarkdownContent } from '../parser/MarkdownContent';
import { ratios } from '../settings';
import type { Language, Settings } from '../settings';
import './cards.css';
import './themes.css';

export interface CardProps {
  card: ParsedCard;
  index: number;
  total: number;
  settings: Settings;
  title?: string;
  language: Language;
}

export function cardNumber(value: number) {
  return String(value).padStart(2, '0');
}

export function Card({ card, index, total, settings, title, language }: CardProps) {
  const { width, height } = ratios[settings.ratio];
  const number = cardNumber(index + 1);
  const label = settings.tag || title || '';
  const style = {
    width,
    height: height ?? undefined,
    '--font-scale': settings.scale / 100,
  } as CSSProperties;

  return (
    <article
      className={`prism-card theme-${settings.theme} density-${settings.density}${card.cover ? ' card-cover' : ''}`}
      data-prism-card
      data-fixed={height !== null}
      data-ratio={settings.ratio}
      lang={language === 'zh' ? 'zh-CN' : 'en'}
      aria-label={card.heading || title || number}
      style={style}
    >
      <div className="card-sheet">
        <header className="card-masthead">
          <span className="card-insignia" aria-hidden="true"><i /><i /><i /></span>
          {label && <span className="card-series">{label}</span>}
          {settings.theme === 'swiss' && settings.counter && <span className="card-index" aria-hidden="true">{number}</span>}
        </header>
        <div className="card-window">
          <div className="card-flow">
            <div className="card-markdown"><MarkdownContent tokens={card.tokens} /></div>
            {card.tags.length > 0 && (
              <ul className="card-badges" aria-label={language === 'zh' ? '话题' : 'Hashtags'}>
                {card.tags.map((tag, tagIndex) => <li key={tagIndex}>{tag}</li>)}
              </ul>
            )}
          </div>
        </div>
        {(settings.author || settings.counter || settings.watermark) && (
          <footer className="card-footer">
            <span className="card-author">{settings.author}</span>
            {settings.watermark && <span className="card-watermark">PrismCard</span>}
            {settings.counter && <span className="card-counter">{number} / {cardNumber(total)}</span>}
          </footer>
        )}
      </div>
    </article>
  );
}

export function cardOverflows(element: HTMLElement): boolean {
  const viewport = element.querySelector<HTMLElement>('.card-window');
  if (!viewport) return false;
  return viewport.scrollHeight > viewport.clientHeight || viewport.scrollWidth > viewport.clientWidth;
}
