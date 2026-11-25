import { constants } from 'node:fs';
import { access, stat } from 'node:fs/promises';
import { delimiter, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

async function executable(path) {
  try {
    await access(path, constants.X_OK);
    return (await stat(path)).isFile();
  } catch {
    return false;
  }
}

export async function browserPath(explicit) {
  const requested = explicit || process.env.PRISMCARD_BROWSER_PATH;
  if (requested) {
    const path = resolve(requested);
    if (await executable(path)) return path;
    throw new Error(`Browser executable is unavailable: ${path}`);
  }

  const candidates = [];
  const names = process.platform === 'win32'
    ? ['chrome.exe', 'msedge.exe']
    : ['google-chrome', 'google-chrome-stable', 'microsoft-edge', 'microsoft-edge-stable', 'chromium', 'chromium-browser'];

  if (process.platform === 'win32') {
    const roots = [process.env.PROGRAMFILES, process.env['PROGRAMFILES(X86)'], process.env.LOCALAPPDATA].filter(Boolean);
    for (const app of ['Google/Chrome/Application/chrome.exe', 'Microsoft/Edge/Application/msedge.exe']) {
      for (const root of roots) candidates.push(join(root, app));
    }
  } else if (process.platform === 'darwin') {
    for (const prefix of ['/Applications', process.env.HOME && join(process.env.HOME, 'Applications')].filter(Boolean)) {
      candidates.push(join(prefix, 'Google Chrome.app/Contents/MacOS/Google Chrome'));
      candidates.push(join(prefix, 'Microsoft Edge.app/Contents/MacOS/Microsoft Edge'));
    }
  }
  for (const directory of (process.env.PATH || '').split(delimiter).filter(Boolean)) {
    for (const name of names) candidates.push(join(directory, name));
  }
  for (const candidate of candidates) {
    if (await executable(candidate)) return candidate;
  }
  throw new Error('Install Chrome or Edge, or provide an existing browser executable with --browser.');
}

export async function openRenderer(browser) {
  const context = await browser.newContext({ offline: true });
  const page = await context.newPage();
  const asset = name => fileURLToPath(new URL(`../assets/${name}`, import.meta.url));
  await page.setContent('<!doctype html><html><head><meta charset="utf-8"></head><body></body></html>');
  await page.addStyleTag({ path: asset('renderer.css') });
  await page.addScriptTag({ path: asset('renderer.js') });
  return page;
}
