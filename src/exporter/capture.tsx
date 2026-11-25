import { toBlob } from 'html-to-image';
import { flushSync } from 'react-dom';
import { createRoot } from 'react-dom/client';
import { Card, cardOverflows } from '../themes/Card';
import type { CardProps } from '../themes/Card';

export const pngScale = 2;

export class CardOverflowError extends Error {
  constructor(readonly index: number) {
    super(`Card ${index + 1} exceeds its frame. Use Auto height, reduce the type size, or split the card.`);
  }
}

export class CardSizeError extends Error {
  constructor() {
    super('The card exceeds the browser’s PNG size limit. Split the card and export again.');
  }
}

export async function captureCard(props: CardProps): Promise<Blob> {
  const staging = document.createElement('div');
  staging.setAttribute('aria-hidden', 'true');
  staging.style.cssText = 'position:fixed;left:-10000px;top:0;width:max-content;pointer-events:none';
  document.body.append(staging);
  const root = createRoot(staging);

  try {
    flushSync(() => root.render(<Card {...props} />));
    await document.fonts.ready;
    const element = staging.querySelector<HTMLElement>('[data-prism-card]');
    if (!element) throw new Error('The card could not be rendered.');
    if (cardOverflows(element)) throw new CardOverflowError(props.index);

    const width = element.offsetWidth;
    const height = element.offsetHeight;
    const pixelRatio = pngScale;
    if (height * pixelRatio > 16384 || width * height * pixelRatio ** 2 > 64_000_000) {
      throw new CardSizeError();
    }
    const png = await toBlob(element, { width, height, pixelRatio, skipAutoScale: true, fontEmbedCSS: '' });
    if (!png) throw new Error('The browser could not generate a PNG.');
    return png;
  } finally {
    root.unmount();
    staging.remove();
  }
}
