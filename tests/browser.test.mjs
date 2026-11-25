import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { mkdir, mkdtemp, readFile, readdir, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { test } from 'node:test';
import { promisify } from 'node:util';
import JSZip from 'jszip';
import { chromium } from 'playwright-core';
import { serveDist } from '../scripts/serve-dist.mjs';
import { browserPath } from '../skills/prismcard/scripts/browser.mjs';

const run = promisify(execFile);

function dimensions(png) {
  assert.equal(png.subarray(1, 4).toString(), 'PNG');
  return [png.readUInt32BE(16), png.readUInt32BE(20)];
}

async function download(page, label) {
  const [item] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: label, exact: true }).click()]);
  return { name: item.suggestedFilename(), data: await readFile(await item.path()) };
}

test('production Studio and CLI share safe, full-resolution cards', { timeout: 120_000 }, async () => {
  const cache = resolve('.cache');
  await mkdir(cache, { recursive: true });
  const runDirectory = await mkdtemp(join(cache, 'browser-'));
  const temporary = join(runDirectory, 'temp');
  await mkdir(temporary);
  const env = { ...process.env, TMP: temporary, TEMP: temporary, TMPDIR: temporary };
  const server = await serveDist();
  const executablePath = await browserPath();
  let browser;

  try {
    browser = await chromium.launch({ executablePath, env, headless: true });
    const context = await browser.newContext({ locale: 'en-US', viewport: { width: 1440, height: 900 } });
    await context.grantPermissions(['clipboard-read', 'clipboard-write'], { origin: server.origin });
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    const requests = [];
    page.on('request', request => requests.push(request.url()));
    await page.goto(server.home);
    const editor = page.getByRole('textbox', { name: 'Card Markdown' });
    await page.getByRole('heading', { name: 'Good ideas deserve good cards.' }).waitFor();
    await page.screenshot({ path: join(runDirectory, 'studio.png') });
    assert.equal(await page.locator('.deck-tab').count(), 4);
    assert.ok((await page.request.get(`${server.home}favicon.svg`)).ok());

    await editor.fill(`## First\n\n${'A long line with words to wrap naturally. '.repeat(20)}\n\n## Second`);
    assert.equal(await editor.evaluate(element => element.scrollWidth), await editor.evaluate(element => element.clientWidth));
    assert.equal(await page.locator('.line-numbers').count(), 0);
    await editor.evaluate(element => element.setSelectionRange(element.value.indexOf('## Second'), element.value.indexOf('## Second')));
    await page.getByRole('button', { name: '+ Card (---)', exact: true }).click();
    assert.match(await editor.inputValue(), /\n\n---\n\n## Second$/);
    assert.equal(await page.locator('.deck-tab').count(), 2);
    assert.equal(await editor.evaluate(element => document.activeElement === element), true);
    page.once('dialog', dialog => dialog.accept());
    await page.getByRole('button', { name: 'Reset to demo' }).click();
    await page.getByRole('button', { name: 'Grid', exact: true }).click();
    assert.equal(await page.locator('.preview-grid [data-prism-card]').count(), 4);
    await page.locator('.grid-card-select').nth(2).click();
    assert.equal(await page.locator('.grid-card-select').nth(2).getAttribute('aria-current'), 'page');
    await page.getByRole('button', { name: 'Single', exact: true }).click();
    await page.getByRole('heading', { name: 'Show the recipe.' }).waitFor();
    await page.locator('.deck-tab').first().click();

    for (const [theme, label] of Object.entries({ editorial: 'Editorial', swiss: 'Swiss', cyber: 'Cyber', brutal: 'Brutal', aurora: 'Aurora', craft: 'Craft' })) {
      await page.getByRole('button', { name: label, exact: true }).click();
      await page.locator(`.preview-mount .theme-${theme}`).waitFor();
      await page.locator('.preview-scaled').screenshot({ path: join(runDirectory, `theme-${theme}.png`) });
    }
    await page.getByRole('button', { name: 'Aurora', exact: true }).click();
    const markdown = await editor.inputValue();
    const first = await download(page, 'Download PNG');
    assert.equal(first.name, 'prismcard-01.png');
    assert.deepEqual(dimensions(first.data), [1080, 1440]);
    await page.getByRole('button', { name: 'Copy PNG', exact: true }).click();
    await page.getByText('PNG copied to clipboard.').waitFor();
    const clipboard = await page.evaluate(async () => (await navigator.clipboard.read())[0]?.types);
    assert.ok(clipboard?.includes('image/png'));

    const zipped = await download(page, 'Export all (ZIP)');
    assert.equal(zipped.name, 'prismcard-deck.zip');
    const zip = await JSZip.loadAsync(zipped.data);
    const names = ['card-01.png', 'card-02.png', 'card-03.png', 'card-04.png'];
    assert.deepEqual(Object.keys(zip.files), names);
    const fixture = join(runDirectory, 'notes.md');
    await writeFile(fixture, markdown);
    const output = join(runDirectory, 'cli');
    const cli = resolve('skills/prismcard/scripts/render-cards.mjs');
    await run(process.execPath, [cli, '--input', fixture, '--out', output, '--theme', 'aurora', '--browser', executablePath], { env });
    assert.deepEqual(await readdir(output), [...names, 'manifest.json']);
    const manifest = JSON.parse(await readFile(join(output, 'manifest.json'), 'utf8'));
    assert.deepEqual(manifest, {
      count: 4, theme: 'aurora', ratio: '3:4', language: 'en', width: 1080,
      cards: ['Good ideas deserve good cards.', 'Give each card one job.', 'Show the recipe.', 'Ready to share?'].map((heading, index) => ({
        index: index + 1, file: names[index], width: 1080, height: 1440, heading,
      })),
    });
    for (const name of names) {
      const fromCli = await readFile(join(output, name));
      assert.deepEqual(dimensions(fromCli), [1080, 1440]);
      assert.deepEqual(fromCli, await zip.file(name).async('nodebuffer'), `CLI and Studio differ for ${name}`);
    }
    assert.deepEqual(first.data, await readFile(join(output, names[0])));
    await assert.rejects(run(process.execPath, [cli, fixture, '--out', output], { env }), /Output file already exists.*--overwrite/);
    await assert.rejects(run(process.execPath, [cli, fixture, '--input', fixture], { env }), /one Markdown file/i);
    await writeFile(join(output, 'keep.txt'), 'Unrelated file');
    await writeFile(fixture, '---\ntheme: cyber\n---\n\n## 覆盖输出\n\n==检查高亮==');
    await run(process.execPath, [cli, '-i', fixture, '-o', output, '-f', '--ratio', 'auto', '--lang', 'zh'], { env });
    assert.deepEqual(await readdir(output), ['card-01.png', 'keep.txt', 'manifest.json']);
    const updated = JSON.parse(await readFile(join(output, 'manifest.json'), 'utf8'));
    assert.deepEqual(updated, {
      count: 1, theme: 'cyber', ratio: 'auto', language: 'zh', width: 1080,
      cards: [{ index: 1, file: names[0], width: 1080, height: 720, heading: '覆盖输出' }],
    });

    await page.getByRole('button', { name: 'Next card' }).click();
    await page.locator('.preview-mount mark').waitFor();
    await page.getByRole('button', { name: 'Next card' }).click();
    await page.locator('.preview-mount .hljs-keyword').first().waitFor();
    await page.getByRole('button', { name: 'Next card' }).click();
    assert.equal(await page.locator('.preview-mount table').count(), 1);
    assert.equal(await page.getByRole('checkbox', { checked: true }).count(), 2);

    await editor.fill('## First\n\nTiny card.\n\n## Second\n\nAnother small card.');
    assert.equal(await page.locator('.deck-tab').count(), 1);
    await page.getByRole('switch', { name: 'Split at H2 headings' }).check();
    assert.equal(await page.locator('.deck-tab').count(), 2);
    for (const [ratio, size] of [['1:1', [1080, 1080]], ['16:9', [1600, 900]]]) {
      await page.getByRole('button', { name: ratio, exact: true }).click();
      assert.deepEqual(dimensions((await download(page, 'Download PNG')).data), size);
    }
    await page.getByRole('button', { name: '3:4', exact: true }).click();
    await editor.fill('## A tighter card\n\n' + 'A paragraph with enough text to test the layout.\n\n'.repeat(13));
    await page.getByRole('slider', { name: 'Font scale' }).fill('120');
    await page.getByRole('button', { name: 'Airy' }).click();
    await page.getByText('Content exceeds this frame', { exact: true }).waitFor();
    await page.getByRole('button', { name: 'Auto-fit', exact: true }).click();
    assert.equal(await page.getByRole('button', { name: 'Compact' }).getAttribute('aria-pressed'), 'true');
    const fitted = Number(await page.getByRole('slider', { name: 'Font scale' }).inputValue());
    assert.ok(fitted >= 85 && fitted < 120);
    assert.equal(await page.getByRole('button', { name: 'Download PNG' }).isEnabled(), true);
    const long = `## Long card\n\n${'A paragraph with plenty of text for this card.\n\n'.repeat(30)}The final line.`;
    await editor.fill(`## Short\n\nA short card.\n\n---\n\n${long}`);
    await page.getByRole('button', { name: 'Grid', exact: true }).click();
    const clipped = page.locator('.grid-card').nth(1);
    await clipped.getByText('Overflow', { exact: true }).waitFor();
    assert.equal(await page.locator('.grid-card').first().getByText('Overflow', { exact: true }).count(), 0);
    await clipped.locator('.grid-card-select').click();
    await page.getByText('Content exceeds this frame', { exact: true }).waitFor();
    assert.equal(await page.getByRole('button', { name: 'Download PNG' }).isDisabled(), true);
    await writeFile(fixture, long);
    const overflow = join(runDirectory, 'overflow');
    await assert.rejects(run(process.execPath, [cli, fixture, '--out', overflow], { env }), /exceeds its frame/);
    assert.deepEqual(await readdir(overflow), []);
    await assert.rejects(run(process.execPath, [cli, fixture, '--out', output, '--overwrite'], { env }), /exceeds its frame/);
    assert.deepEqual(JSON.parse(await readFile(join(output, 'manifest.json'), 'utf8')), updated);
    await page.getByRole('button', { name: 'Auto-fit', exact: true }).click();
    await page.getByText('Still too tall at 85%', { exact: false }).waitFor();
    await page.getByRole('button', { name: 'Use Auto height', exact: true }).click();
    await page.getByRole('button', { name: 'Single', exact: true }).click();
    const autoSize = dimensions((await download(page, 'Download PNG')).data);
    assert.equal(autoSize[0], 1080);
    assert.ok(autoSize[1] > 1440);
    await page.getByText('The final line.', { exact: true }).waitFor({ state: 'attached' });

    await editor.fill('<script>window.prismcardUnsafe=1</script>\n\n<img src="https://example.invalid/test.png" onerror="window.prismcardUnsafe=2">\n\n[Unsafe](javascript:alert(1))\n\n![Label](https://example.invalid/test.png)');
    assert.equal(await page.locator('.preview-mount script, .preview-mount img, .preview-mount a').count(), 0);
    assert.equal(await page.evaluate(() => window.prismcardUnsafe), undefined);
    assert.equal(requests.some(url => url.includes('example.invalid')), false);

    await page.getByRole('button', { name: '中文' }).click();
    await page.reload();
    await page.getByRole('heading', { name: '设计', exact: true }).waitFor();
    assert.match(await page.getByRole('textbox', { name: '卡片 Markdown' }).inputValue(), /prismcardUnsafe/);
    page.once('dialog', dialog => dialog.accept());
    await page.getByRole('button', { name: '重置为示例' }).click();
    await page.getByRole('heading', { name: '把好点子做成好卡片。' }).waitFor();
    for (const theme of ['杂志社论', '瑞士网格', '暗黑霓虹', '新粗野波普', '极光毛玻璃', '森系手账']) {
      await page.getByRole('button', { name: theme, exact: true }).click();
      const styles = await page.locator('.preview-mount h1').evaluate(element => {
        const css = getComputedStyle(element);
        return { tracking: parseFloat(css.letterSpacing) / parseFloat(css.fontSize), wrap: css.textWrapStyle };
      });
      assert.ok(Math.abs(styles.tracking) <= .01001, theme);
      assert.equal(styles.wrap, 'balance');
    }
    await page.getByRole('textbox', { name: '卡片 Markdown' }).fill('## 一张卡片只讲透一件事\n\n==三个黄金排版习惯==。');
    const wrapping = await page.locator('.preview-mount mark').evaluate(element => ({
      decoration: getComputedStyle(element).boxDecorationBreak,
      wrap: getComputedStyle(element.parentElement).textWrapStyle,
    }));
    assert.deepEqual(wrapping, { decoration: 'clone', wrap: 'pretty' });
    page.once('dialog', dialog => dialog.accept());
    await page.getByRole('button', { name: '重置为示例' }).click();
    await page.setViewportSize({ width: 390, height: 844 });
    await page.screenshot({ path: join(runDirectory, 'mobile.png'), fullPage: true });
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth), 390);
    assert.deepEqual(errors, []);
    console.log(`Visual snapshots: ${runDirectory}`);
  } finally {
    await browser?.close();
    await server.close();
  }
});
