import { createReadStream, existsSync, statSync } from 'node:fs';
import { createServer } from 'node:http';
import { extname, join, normalize, resolve } from 'node:path';

const root = resolve(process.cwd(), 'dist');
const port = Number(process.env.PORT ?? 4173);
const host = process.env.HOST ?? '127.0.0.1';

const contentTypes = {
  '.css': 'text/css; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
  '.ico': 'image/x-icon',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.map': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.ttf': 'font/ttf',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
};

function safePath(urlPath) {
  const pathname = decodeURIComponent(new URL(urlPath, `http://${host}:${port}`).pathname);
  const cleanPath = normalize(pathname).replace(/^([/\\])+/, '');

  if (pathname.startsWith('/invite/') && pathname.split('/').length === 3) {
    return join(root, 'invite', '[token].html');
  }

  const direct = join(root, cleanPath);
  if (existsSync(direct) && statSync(direct).isFile()) return direct;

  const html = join(root, `${cleanPath}.html`);
  if (existsSync(html) && statSync(html).isFile()) return html;

  const index = join(root, cleanPath, 'index.html');
  if (existsSync(index) && statSync(index).isFile()) return index;

  return join(root, 'index.html');
}

createServer((request, response) => {
  const filePath = safePath(request.url ?? '/');

  if (!filePath.startsWith(root) || !existsSync(filePath)) {
    response.writeHead(404);
    response.end('Not found');
    return;
  }

  response.writeHead(200, {
    'Content-Type': contentTypes[extname(filePath)] ?? 'application/octet-stream',
    'Cache-Control': 'no-store',
  });
  createReadStream(filePath).pipe(response);
}).listen(port, host, () => {
  console.log(`Serving dist at http://${host}:${port}`);
});
