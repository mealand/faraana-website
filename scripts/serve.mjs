/** Tiny static server for previewing dist/ locally:  npm run preview  →  http://localhost:4173 */
import { createServer } from 'node:http';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const DIST = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', 'dist');
const PORT = Number(process.env.PORT) || 4173;
const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css',
  '.js': 'text/javascript',
  '.json': 'application/json',
  '.svg': 'image/svg+xml',
  '.webp': 'image/webp',
  '.jpg': 'image/jpeg',
  '.png': 'image/png',
  '.mp4': 'video/mp4',
  '.xml': 'application/xml',
  '.txt': 'text/plain',
  '.webmanifest': 'application/manifest+json',
};

createServer(async (req, res) => {
  const url = decodeURIComponent(new URL(req.url, 'http://x').pathname);
  let file = path.join(DIST, url.endsWith('/') ? `${url}index.html` : url);
  if (!file.startsWith(DIST)) return res.writeHead(403).end();
  try {
    const stat = await fs.stat(file);
    const type = TYPES[path.extname(file)] || 'application/octet-stream';
    const range = req.headers.range;
    // range support so <video> can seek
    if (range && type === 'video/mp4') {
      const [s, e] = range.replace('bytes=', '').split('-');
      const start = Number(s);
      const end = e ? Number(e) : stat.size - 1;
      const fh = await fs.open(file);
      const buf = Buffer.alloc(end - start + 1);
      await fh.read(buf, 0, buf.length, start);
      await fh.close();
      res.writeHead(206, {
        'Content-Type': type,
        'Content-Range': `bytes ${start}-${end}/${stat.size}`,
        'Accept-Ranges': 'bytes',
        'Content-Length': buf.length,
      });
      return res.end(buf);
    }
    res.writeHead(200, { 'Content-Type': type, 'Content-Length': stat.size });
    res.end(await fs.readFile(file));
  } catch {
    file = path.join(DIST, '404.html');
    res.writeHead(404, { 'Content-Type': TYPES['.html'] });
    res.end(await fs.readFile(file).catch(() => 'Not found'));
  }
}).listen(PORT, () => console.log(`Preview → http://localhost:${PORT}`));
