import assert from 'node:assert/strict';
import { test } from 'node:test';
import { parseDeck } from '../src/parser/index';
import { resolveSettings } from '../src/settings';

test('frontmatter sets defaults and UI overrides win, including blank values', () => {
  const deck = parseDeck('\uFEFF---\r\ntitle: "My Deck"\r\nauthor: "@alice"\r\ntag: \'Dev Notes\'\r\ntheme: cyber\r\n---\r\n# Intro', false);
  assert.deepEqual(deck.metadata, { title: 'My Deck', author: '@alice', tag: 'Dev Notes', theme: 'cyber' });
  assert.equal(resolveSettings(deck.metadata, { author: '', theme: 'craft' }).author, '');
  assert.equal(resolveSettings(deck.metadata, { author: '', theme: 'craft' }).theme, 'craft');
  assert.equal(deck.cards.length, 1);
});

test('separators and optional H2 split at top level and preserve fenced examples', () => {
  const source = '# Start\n\n```md\n---\n## Escaped\n```\n\n> ## Quote\n\n## Second\n\nParagraph with no blank before rule\n---\n## Third\n\n---\n';
  assert.equal(parseDeck(source, false).cards.length, 2);
  const split = parseDeck(source, true).cards;
  assert.equal(split.length, 3);
  assert.ok(split[0].source.includes('## Escaped'));
  assert.ok(split[1].source.startsWith('## Second'));
  assert.ok(split[2].source.startsWith('## Third'));
  assert.equal(parseDeck('---\n# Open\n---\n---\n## Close', false).cards.length, 2);
  assert.equal(parseDeck('##\tTab heading\n\n    ---\n\n### Child', true).cards.length, 1);
});

test('extracts only trailing hashtag groups and parses highlights outside inline code', () => {
  const [card] = parseDeck('# Heading\n\n#inside\n\nA ==**bright** idea== with `==code==`.\n\n#AI #开源\n#Productivity', false).cards;
  assert.deepEqual(card.tags, ['#AI', '#开源', '#Productivity']);
  assert.ok(card.tokens.some(token => token.children?.some(child => child.content === '#inside')));
  const inline = card.tokens.find(token => token.content.startsWith('A =='));
  assert.ok(inline?.children?.some(child => child.type === 'mark_open'));
  assert.ok(inline?.children?.some(child => child.type === 'strong_open'));
  assert.ok(inline?.children?.some(child => child.type === 'code_inline' && child.content === '==code=='));
  const edge = parseDeck('==`a==b`==', false).cards[0].tokens[1].children;
  assert.deepEqual(edge?.map(child => child.type), ['mark_open', 'code_inline', 'mark_close']);
});

test('recognizes a standalone hashtag line after a paragraph without a blank line', () => {
  const [card] = parseDeck('Keep this **paragraph**.\n#Design #开源', false).cards;
  assert.deepEqual(card.tags, ['#Design', '#开源']);
  assert.equal(card.tokens[1].content, 'Keep this **paragraph**.');
  assert.ok(card.tokens[1].children?.some(child => child.type === 'strong_open'));
});

test('keeps HTML as text and rejects executable link schemes', () => {
  const [card] = parseDeck('<script>unsafe</script>\n\n[link](javascript:unsafe)\n\n![alt](https://example.invalid/img.png)', false).cards;
  assert.ok(card.tokens.every(token => !token.type.startsWith('html')));
  assert.ok(card.tokens.every(token => token.children?.every(child => child.type !== 'link_open') ?? true));
  assert.ok(card.tokens.some(token => token.children?.some(child => child.type === 'image')));
});
