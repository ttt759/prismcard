import { cardNumber } from '../themes/Card';
import type { CardProps } from '../themes/Card';
import { captureCard } from './capture';

export function download(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = name;
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 10_000);
}

export async function copyCard(props: CardProps) {
  if (!navigator.clipboard?.write || typeof ClipboardItem === 'undefined') {
    throw new Error('Image clipboard access is unavailable.');
  }
  const png = captureCard(props);
  const item = new ClipboardItem({ 'image/png': png });
  await Promise.all([navigator.clipboard.write([item]), png]);
}

export async function captureZip(cards: CardProps[], onProgress: (done: number) => void) {
  const { default: JSZip } = await import('jszip');
  const zip = new JSZip();
  for (const card of cards) {
    const png = await captureCard(card);
    zip.file(`card-${cardNumber(card.index + 1)}.png`, png);
    onProgress(card.index + 1);
  }
  return zip.generateAsync({ type: 'blob' });
}
