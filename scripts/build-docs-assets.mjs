import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright-core';
import { browserPath, openRenderer } from '../skills/prismcard/scripts/browser.mjs';
import { serveDist } from './serve-dist.mjs';

const output = fileURLToPath(new URL('../docs/assets', import.meta.url));
const temporary = fileURLToPath(new URL('../.cache/docs-browser', import.meta.url));

const samples = [
  { theme: 'editorial', name: 'Editorial', label: '杂志社论', language: 'en', title: 'Good ideas deserve good cards.',
    tag: 'THE MAKER’S NOTES', quote: 'Give your best thought a page of its own.', tags: '#Writing #Design' },
  { theme: 'swiss', name: 'Swiss', label: '瑞士网格', language: 'zh', title: '一张卡片，只讲一件事。',
    tag: '排版笔记', quote: '先定下重点，再让网格为内容服务。', tags: '#信息设计 #排版' },
  { theme: 'cyber', name: 'Cyber', label: '暗黑霓虹', language: 'en', title: 'Ship the small thing.',
    tag: 'BUILD LOG', quote: 'Release a tiny tool that solves one real problem.', tags: '#OpenSource #BuildInPublic' },
  { theme: 'brutal', name: 'Brutal', label: '新粗野波普', language: 'zh', title: '好点子，要亮相。',
    tag: '灵感练习', quote: '让大胆的标题先替你开口。', tags: '#创作 #视觉' },
  { theme: 'aurora', name: 'Aurora', label: '极光毛玻璃', language: 'en', title: 'Make room for good ideas.',
    tag: 'DESIGN NOTES', quote: 'A little breathing room changes how the whole page feels.', tags: '#CreativeProcess #Typography' },
  { theme: 'craft', name: 'Craft', label: '森系手账', language: 'zh', title: '把灵感留在纸上。',
    tag: '周末手记', quote: '把今天的发现写下来，留给下一次创作。', tags: '#手账 #灵感收集' },
];

async function heroScreenshot(browser, home) {
  for (const deviceScaleFactor of [2, 1.5]) {
    const context = await browser.newContext({ locale: 'en-US', viewport: { width: 1440, height: 900 }, deviceScaleFactor });
    try {
      const page = await context.newPage();
      await page.goto(home);
      await page.getByRole('button', { name: 'Grid', exact: true }).click();
      await page.locator('.grid-card').nth(3).waitFor();
      await page.evaluate(async () => {
        await document.fonts.ready;
        await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
      });
      const png = await page.screenshot({ animations: 'disabled' });
      if (png.byteLength < 800_000 || deviceScaleFactor === 1.5) return png;
    } finally {
      await context.close();
    }
  }
  throw new Error('Unable to capture the Studio showcase.');
}

async function themeShowcase(browser) {
  const renderer = await openRenderer(browser);
  const cards = [];
  for (const { theme, language, title, tag, quote, tags, name, label } of samples) {
    const markdown = `---\nauthor: "@PrismCard"\ntag: ${tag}\n---\n\n# ${title}\n\n> ${quote}\n\n${tags}`;
    const png = await renderer.evaluate(async input => {
      window.prismcardRender.load(input.markdown, false, { theme: input.theme, counter: false }, input.language);
      return window.prismcardRender.png(0);
    }, { markdown, theme, language });
    cards.push({ png, name, label, title });
  }
  await renderer.context().close();

  const board = await browser.newPage({ viewport: { width: 1280, height: 1230 }, deviceScaleFactor: 2 });
  await board.setContent(`<!doctype html>
    <html lang="en">
      <meta charset="utf-8">
      <style>
        * { box-sizing: border-box; }
        body { margin: 0; color: #29223d; background: #f3eff8; font-family: "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif; }
        main { padding: 34px 64px 44px; }
        h1 { margin: 0 0 25px; font-size: 30px; letter-spacing: -.035em; font-weight: 720; }
        .gallery { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 20px; }
        figure { margin: 0; padding: 22px 22px 17px; border: 1px solid #e1d8eb; border-radius: 13px; background: #faf8fd; }
        img { display: block; width: 100%; aspect-ratio: 3 / 4; box-shadow: 0 5px 14px #40315121; }
        figcaption { margin-top: 13px; display: flex; align-items: baseline; justify-content: space-between; gap: 6px; font-size: 16px; font-weight: 720; }
        figcaption span { font-size: 13px; font-weight: 500; color: #665975; }
      </style>
      <main><h1>Six PrismCard themes</h1><div class="gallery"></div></main>
    </html>`);
  await board.evaluate(async cards => {
    const gallery = document.querySelector('.gallery');
    for (const card of cards) {
      const figure = document.createElement('figure');
      const image = document.createElement('img');
      image.src = 'data:image/png;base64,' + card.png;
      image.alt = card.title;
      const caption = document.createElement('figcaption');
      caption.textContent = card.name;
      const label = document.createElement('span');
      label.lang = 'zh-CN';
      label.textContent = card.label;
      caption.append(label);
      figure.append(image, caption);
      gallery.append(figure);
    }
    await document.fonts.ready;
    await Promise.all([...document.images].map(image => image.decode()));
  }, cards);
  return board.locator('main').screenshot();
}

await mkdir(output, { recursive: true });
await mkdir(temporary, { recursive: true });
const executablePath = await browserPath();
const server = await serveDist();
let browser;
try {
  const env = { ...process.env, TEMP: temporary, TMP: temporary, TMPDIR: temporary };
  browser = await chromium.launch({ executablePath, env, headless: true });
  const hero = await heroScreenshot(browser, server.home);
  const themes = await themeShowcase(browser);
  await writeFile(join(output, 'hero-studio.png'), hero);
  await writeFile(join(output, 'themes-showcase.png'), themes);
  console.log(`Generated hero-studio.png (${Math.round(hero.length / 1000)} KB) and themes-showcase.png (${Math.round(themes.length / 1000)} KB).`);
} finally {
  try {
    await browser?.close();
  } finally {
    await server.close();
  }
}
