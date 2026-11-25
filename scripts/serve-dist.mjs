import { once } from 'node:events';
import { readFile } from 'node:fs/promises';
import { createServer } from 'node:http';
import { extname, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const dist = resolve(fileURLToPath(new URL('../dist', import.meta.url)));
const base = '/prismcard/';
const mime = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml' };

export async function serveDist() {
  const server = createServer(async (request, response) => {
    try {
      const target = new URL(request.url, 'http://localhost').pathname;
      if (!target.startsWith(base)) throw new Error('Incorrect base');
      const file = resolve(dist, decodeURIComponent(target.slice(base.length)) || 'index.html');
      if (!file.startsWith(dist + sep)) throw new Error('Outside dist');
      const data = await readFile(file);
      response.writeHead(200, { 'content-type': mime[extname(file)] ?? 'application/octet-stream' }).end(data);
    } catch {
      response.writeHead(404).end();
    }
  });
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  const origin = `http://127.0.0.1:${server.address().port}`;
  return { origin, home: origin + base, close: () => new Promise(resolve => server.close(resolve)) };
}
