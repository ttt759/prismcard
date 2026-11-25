#!/usr/bin/env node
import { readFile, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';
import { browserPath, openRenderer } from './browser.mjs';
import { writeDeck } from './output.mjs';

const help = `PrismCard • Render Markdown as local 2× PNG cards

Usage: node render-cards.mjs <input.md> [options]
       node render-cards.mjs --input <input.md> [options]

  -i, --input <file.md>     Input Markdown file
  -o, --out <directory>    Output directory (default: ./prismcard-cards)
  -f, --overwrite          Replace the previous card PNGs and manifest in the output directory
      --theme <name>        editorial, swiss, cyber, brutal, aurora, craft
      --ratio <preset>      3:4, 1:1, 16:9, auto (default: 3:4)
      --scale <percent>     85–120 (default: 100)
      --padding <density>   compact, balanced, airy
      --author <handle>     Override the Markdown author
      --tag <series>        Override the Markdown series tag
      --lang <language>     en or zh (default: en)
      --split-h2            Start a new card at each level-two heading
      --no-counter          Hide the page counter
      --no-watermark        Hide the PrismCard watermark
      --browser <path>      System Chrome/Edge executable
  -h, --help                Show this help

Portrait: 1080×1440  •  Square: 1080×1080  •  Wide: 1600×900
Auto keeps the full content at 1080 pixels wide. Every deck includes manifest.json.`;

function oneOf(name, value, allowed) {
  if (value !== undefined && !allowed.includes(value)) {
    throw new Error(`--${name} expects one of: ${allowed.join(', ')}.`);
  }
  return value;
}

async function render(markdown, options, overrides, language) {
  const { chromium } = await import('playwright-core').catch(error => {
    if (error.code === 'ERR_MODULE_NOT_FOUND') {
      const skill = fileURLToPath(new URL('..', import.meta.url));
      throw new Error(`Install the renderer dependency with npm ci --prefix "${skill}".`);
    }
    throw error;
  });
  const executablePath = await browserPath(options.browser);
  const output = resolve(options.out ?? 'prismcard-cards');
  const browser = await chromium.launch({ executablePath, headless: true });

  try {
    const page = await openRenderer(browser);
    const { headings, ...metadata } = await page.evaluate(
      ({ markdown, split, overrides, language }) => window.prismcardRender.load(markdown, split, overrides, language),
      { markdown, split: options['split-h2'] ?? false, overrides, language },
    );
    const { count } = metadata;
    if (!count) throw new Error('The input contains no cards.');
    const names = Array.from({ length: count }, (_, index) => `card-${String(index + 1).padStart(2, '0')}.png`);
    await writeDeck(output, [...names, 'manifest.json'], options.overwrite, async staging => {
      const cards = [];
      for (const [index, file] of names.entries()) {
        const base64 = await page.evaluate(index => window.prismcardRender.png(index), index);
        const png = Buffer.from(base64, 'base64');
        await writeFile(join(staging, file), png);
        cards.push({ index: index + 1, file, width: png.readUInt32BE(16), height: png.readUInt32BE(20), heading: headings[index] });
      }
      await writeFile(join(staging, 'manifest.json'), JSON.stringify({ ...metadata, cards }, null, 2) + '\n');
    });
    console.log(`Rendered ${count} ${count === 1 ? 'card' : 'cards'} to ${output}`);
  } finally {
    await browser.close();
  }
}

async function main() {
  const { values, positionals } = parseArgs({
    allowPositionals: true,
    options: {
      input: { type: 'string', short: 'i' },
      out: { type: 'string', short: 'o' },
      overwrite: { type: 'boolean', short: 'f' },
      theme: { type: 'string' },
      ratio: { type: 'string' },
      scale: { type: 'string' },
      padding: { type: 'string' },
      author: { type: 'string' },
      tag: { type: 'string' },
      lang: { type: 'string' },
      browser: { type: 'string' },
      'split-h2': { type: 'boolean' },
      'no-counter': { type: 'boolean' },
      'no-watermark': { type: 'boolean' },
      help: { type: 'boolean', short: 'h' },
    },
  });
  if (values.help) {
    console.log(help);
    return;
  }
  const inputs = values.input === undefined ? positionals : [...positionals, values.input];
  if (inputs.length !== 1 || !inputs[0]) throw new Error('Pass one Markdown file as a positional argument or with --input.');
  const scale = values.scale === undefined ? undefined : Number(values.scale);
  if (scale !== undefined && (!Number.isInteger(scale) || scale < 85 || scale > 120)) {
    throw new Error('--scale expects an integer from 85 to 120.');
  }
  const overrides = {
    theme: oneOf('theme', values.theme, ['editorial', 'swiss', 'cyber', 'brutal', 'aurora', 'craft']),
    ratio: oneOf('ratio', values.ratio, ['3:4', '1:1', '16:9', 'auto']),
    density: oneOf('padding', values.padding, ['compact', 'balanced', 'airy']),
    author: values.author,
    tag: values.tag,
    scale,
    counter: values['no-counter'] ? false : undefined,
    watermark: values['no-watermark'] ? false : undefined,
  };
  const language = oneOf('lang', values.lang, ['en', 'zh']) ?? 'en';
  const markdown = await readFile(resolve(inputs[0]), 'utf8');
  await render(markdown, values, overrides, language);
}

main().catch(error => {
  console.error(`PrismCard: ${error.message}`);
  process.exitCode = 1;
});
