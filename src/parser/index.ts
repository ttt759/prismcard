import MarkdownIt from 'markdown-it';
import mark from 'markdown-it-mark';
import type Token from 'markdown-it/lib/token.mjs';
import { isTheme } from '../settings';
import type { Metadata } from '../settings';

const markdown = new MarkdownIt({ html: false, breaks: false }).use(mark);
const badgeLine = /^#[\p{L}\p{M}\p{N}_][\p{L}\p{M}\p{N}_-]*(?:\s+#[\p{L}\p{M}\p{N}_][\p{L}\p{M}\p{N}_-]*)*$/u;

export interface ParsedCard {
  source: string;
  tokens: Token[];
  tags: string[];
  heading: string;
  cover: boolean;
}

export interface Deck {
  metadata: Metadata;
  cards: ParsedCard[];
}

function readFrontmatter(lines: string[]) {
  const metadata: Metadata = {};
  if (lines[0]?.trim() !== '---') return { lines, metadata };
  const end = lines.findIndex((line, index) => index > 0 && line.trim() === '---');
  if (end < 2) return { lines, metadata };

  const entries = lines.slice(1, end).filter(line => line.trim() && !line.trimStart().startsWith('#'));
  const fields = entries.map(line => line.match(/^([\w-]+)\s*:\s*(.*?)\s*$/));
  if (!fields.length || fields.some(field => !field)) return { lines, metadata };

  for (const field of fields) {
    if (!field) continue;
    const [, key, raw] = field;
    const value = raw.replace(/^(['"])(.*)\1$/, '$2');
    if (key === 'title' || key === 'author' || key === 'tag') metadata[key] = value;
    if (key === 'theme' && isTheme(value)) metadata.theme = value;
  }
  return { lines: lines.slice(end + 1), metadata };
}

function parseCard(source: string, env: object): ParsedCard | undefined {
  const tokens = markdown.parse(source, env);
  const tagLines: string[] = [];

  while (tokens.length >= 3) {
    const [open, inline, close] = tokens.slice(-3);
    if (open.level !== 0 || open.type !== 'paragraph_open' || close.type !== 'paragraph_close') break;
    const lines = inline.content.split('\n');
    while (lines.length && badgeLine.test(lines.at(-1)!.trim())) tagLines.push(lines.pop()!.trim());
    if (lines.length) {
      const remaining = lines.join('\n');
      if (remaining !== inline.content) {
        inline.content = remaining;
        inline.children = markdown.parseInline(remaining, env)[0].children;
      }
      break;
    }
    tokens.splice(-3);
  }

  const tags = tagLines.reverse().flatMap(line => line.split(/\s+/));
  if (!tokens.length && !tags.length) return;
  const headingIndex = tokens.findIndex(token => token.type === 'heading_open' && token.level === 0);
  const headingToken = tokens[headingIndex + 1];
  return {
    source,
    tokens,
    tags,
    heading: headingIndex < 0 ? '' : headingToken.children?.map(token => token.content).join('') || headingToken.content,
    cover: tokens[0]?.type === 'heading_open' && tokens[0].tag === 'h1',
  };
}

export function parseDeck(source: string, splitH2: boolean): Deck {
  const { lines, metadata } = readFrontmatter(source.replace(/^\uFEFF/, '').replace(/\r\n?/g, '\n').split('\n'));
  const env = {};
  const boundaries = new Map<number, number>();
  for (const token of markdown.parse(lines.join('\n'), env)) {
    if (token.level !== 0 || !token.map) continue;
    const [start, end] = token.map;
    // CommonMark reads a rule directly after a paragraph as a Setext underline.
    if ((token.type === 'hr' || (token.type === 'heading_open' && token.markup === '-'))
      && lines[end - 1].trim() === '---') {
      boundaries.set(end - 1, end);
    }
    if (splitH2 && token.type === 'heading_open' && token.markup === '##') {
      boundaries.set(start, start);
    }
  }

  let start = 0;
  const cards: ParsedCard[] = [];
  function append(end: number) {
    const markdownSource = lines.slice(start, end).join('\n').replace(/^\n+|\n+$/g, '');
    if (!markdownSource.trim()) return;
    const card = parseCard(markdownSource, env);
    if (card) cards.push(card);
  }

  for (const [end, next] of boundaries) {
    append(end);
    start = next;
  }
  append(lines.length);
  return { metadata, cards };
}
