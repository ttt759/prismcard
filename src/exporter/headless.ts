import { parseDeck } from '../parser';
import { ratios, readOverrides, resolveSettings } from '../settings';
import type { Language } from '../settings';
import type { CardProps } from '../themes/Card';
import { captureCard, pngScale } from './capture';

let cards: CardProps[] = [];

function load(markdown: string, splitH2: boolean, overrides: unknown, language: Language) {
  const deck = parseDeck(markdown, splitH2);
  const settings = resolveSettings(deck.metadata, readOverrides(overrides));
  cards = deck.cards.map((card, index) => ({
    card,
    index,
    settings,
    title: deck.metadata.title,
    total: deck.cards.length,
    language,
  }));
  return {
    count: cards.length,
    theme: settings.theme,
    ratio: settings.ratio,
    language,
    width: ratios[settings.ratio].width * pngScale,
    headings: deck.cards.map(card => card.heading),
  };
}

async function png(index: number) {
  if (!cards[index]) throw new Error(`Missing card ${index + 1}.`);
  const blob = await captureCard(cards[index]);
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(reader.error);
    reader.onload = () => resolve(String(reader.result).split(',')[1]);
    reader.readAsDataURL(blob);
  });
}

Object.assign(window, { prismcardRender: { load, png } });
