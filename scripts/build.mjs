/**
 * Zero-dependency static site builder.
 *
 *   src/pages/*.html     page bodies with a small front-matter block
 *   src/partials/*.html  shared layout, header and footer
 *   src/assets/**        css, js, images, video (css is bundled + minified)
 *   src/static/**        copied verbatim to the site root (robots, .htaccess, …)
 *   src/data/media.json  produced by scripts/process-media.py
 *
 * Custom tags expanded at build time:
 *   <x-img src="community/women-circle" alt="…" sizes="…" class="…" eager />
 *   <x-include name="cta" />
 *
 * Output: dist/  (upload its contents to public_html, or let CI deploy it)
 */
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SRC = path.join(ROOT, 'src');
const DIST = path.join(ROOT, 'dist');
const SITE_URL = 'https://faraananagaji.com';

const CSS_ORDER = ['tokens', 'base', 'layout', 'components', 'animations', 'pages'];

const media = JSON.parse(await fs.readFile(path.join(SRC, 'data', 'media.json'), 'utf8'));

// ---------- helpers ----------
const readPartial = (name) => fs.readFile(path.join(SRC, 'partials', `${name}.html`), 'utf8');

function parseFrontMatter(raw) {
  const match = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?/);
  if (!match) return { meta: {}, body: raw };
  const meta = {};
  for (const line of match[1].split(/\r?\n/)) {
    const i = line.indexOf(':');
    if (i > 0) meta[line.slice(0, i).trim()] = line.slice(i + 1).trim();
  }
  return { meta, body: raw.slice(match[0].length) };
}

function parseAttrs(str) {
  const attrs = {};
  for (const m of str.matchAll(/([\w-]+)(?:="([^"]*)")?/g)) attrs[m[1]] = m[2] ?? true;
  return attrs;
}

const escapeAttr = (s) => String(s).replace(/&/g, '&amp;').replace(/"/g, '&quot;');

function picture(attrs, base) {
  const key = attrs.src;
  const info = media.images[key];
  if (!info) throw new Error(`Unknown image "${key}" – run scripts/process-media.py`);
  const dir = `${base}assets/images/${key}`;
  const srcset = info.widths.map((w) => `${dir}-${w}.webp ${w}w`).join(', ');
  const sizes = attrs.sizes || '(max-width: 768px) 100vw, 50vw';
  const eager = 'eager' in attrs;
  const cls = ['lqip', attrs.class].filter(Boolean).join(' ');
  const extra = Object.entries(attrs)
    .filter(([k]) => k.startsWith('data-') || k === 'style')
    .map(([k, v]) => ` ${k}="${escapeAttr(v)}"`)
    .join('');
  const pos = attrs.position ? `object-position:${attrs.position};` : '';
  return (
    `<picture${attrs.wrap ? ` class="${attrs.wrap}"` : ''}>` +
    `<source type="image/webp" srcset="${srcset}" sizes="${sizes}">` +
    `<img src="${dir}-${info.fallback}.jpg" width="${info.width}" height="${info.height}" ` +
    `alt="${escapeAttr(attrs.alt ?? '')}" class="${cls}"${extra} ` +
    `style="${pos}background-image:url(${info.lqip})" ` +
    `loading="${eager ? 'eager' : 'lazy'}" decoding="async"${eager ? ' fetchpriority="high"' : ''}>` +
    `</picture>`
  );
}

const gallery = JSON.parse(await fs.readFile(path.join(SRC, 'data', 'gallery.json'), 'utf8'));
const GALLERY_SIZES = '(max-width: 600px) 100vw, (max-width: 1000px) 50vw, 33vw';

function galleryMarkup(base) {
  const filters =
    `<div class="filters" role="toolbar" aria-label="Filter gallery">` +
    `<button class="filter" type="button" data-filter="all" aria-pressed="true">All</button>` +
    gallery.categories
      .map((c) => `<button class="filter" type="button" data-filter="${c.id}" aria-pressed="false">${c.label}</button>`)
      .join('') +
    `</div>`;

  const items = gallery.items
    .map((item) => {
      const caption = escapeAttr(item.caption);
      if (item.video) {
        const v = media.videos[item.video];
        return (
          `<button class="masonry__item" type="button" data-cat="${item.cat}" data-cursor="Play" ` +
          `data-caption="${caption}" data-video-src="${base}assets/video/${item.video}.mp4">` +
          `<img src="${base}assets/video/${item.video}-poster.webp" width="${v.width}" height="${v.height}" alt="${caption} (video)" loading="lazy" decoding="async">` +
          `<span class="masonry__badge" aria-hidden="true">▶</span>` +
          `<span class="masonry__caption">${item.caption}</span></button>`
        );
      }
      return (
        `<button class="masonry__item" type="button" data-cat="${item.cat}" data-cursor="View" data-caption="${caption}">` +
        picture({ src: item.src, alt: item.caption, sizes: GALLERY_SIZES }, base) +
        `<span class="masonry__caption">${item.caption}</span></button>`
      );
    })
    .join('\n');

  return `${filters}<div class="masonry" data-gallery>${items}</div>`;
}

async function expand(html, base) {
  html = html.replace(/<x-gallery\s*\/>/g, () => galleryMarkup(base));
  // includes first so they can contain images
  for (let pass = 0; pass < 3 && html.includes('<x-include'); pass++) {
    const parts = [];
    for (const m of html.matchAll(/<x-include\s+([^>]*?)\/>/g)) parts.push(m);
    for (const m of parts) {
      const { name } = parseAttrs(m[1]);
      html = html.replace(m[0], await readPartial(name));
    }
  }
  html = html.replace(/<x-img\s+([\s\S]*?)\/>/g, (_, a) => picture(parseAttrs(a), base));
  return html.replaceAll('{{base}}', base);
}

function minifyCss(css) {
  return css
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/\s+/g, ' ')
    .replace(/\s*([{}:;,>])\s*/g, '$1')
    .replace(/;}/g, '}')
    .trim();
}

async function copyDir(from, to) {
  await fs.mkdir(to, { recursive: true });
  for (const entry of await fs.readdir(from, { withFileTypes: true })) {
    const s = path.join(from, entry.name);
    const d = path.join(to, entry.name);
    if (entry.isDirectory()) await copyDir(s, d);
    else await fs.copyFile(s, d);
  }
}

// ---------- build ----------
async function build() {
  const t0 = Date.now();
  await fs.rm(DIST, { recursive: true, force: true });

  // assets (css is bundled separately)
  const assets = path.join(SRC, 'assets');
  for (const dir of await fs.readdir(assets)) {
    if (dir !== 'css') await copyDir(path.join(assets, dir), path.join(DIST, 'assets', dir));
  }
  const css = await Promise.all(
    CSS_ORDER.map((f) => fs.readFile(path.join(assets, 'css', `${f}.css`), 'utf8'))
  );
  await fs.mkdir(path.join(DIST, 'assets', 'css'), { recursive: true });
  await fs.writeFile(path.join(DIST, 'assets', 'css', 'main.min.css'), minifyCss(css.join('\n')));

  await copyDir(path.join(SRC, 'static'), DIST);

  // pages
  const layout = await readPartial('layout');
  const pageFiles = (await fs.readdir(path.join(SRC, 'pages'))).filter((f) => f.endsWith('.html'));
  const sitemap = [];
  const version = Date.now().toString(36);

  // cache-bust ES module imports so long-lived asset caching never serves stale code
  const stampImports = async (dir) => {
    for (const entry of await fs.readdir(dir, { withFileTypes: true })) {
      const p = path.join(dir, entry.name);
      if (entry.isDirectory()) await stampImports(p);
      else if (entry.name.endsWith('.js')) {
        const js = await fs.readFile(p, 'utf8');
        await fs.writeFile(p, js.replace(/(from\s+['"])(\.{1,2}\/[^'"?]+\.js)(['"])/g, `$1$2?v=${version}$3`));
      }
    }
  };
  await stampImports(path.join(DIST, 'assets', 'js'));

  for (const file of pageFiles) {
    const raw = await fs.readFile(path.join(SRC, 'pages', file), 'utf8');
    const { meta, body } = parseFrontMatter(raw);
    const slug = file.replace(/\.html$/, '');
    // 404 can be served from any depth, so it uses root-absolute URLs
    const base = slug === '404' ? '/' : '';
    const canonical = slug === 'index' ? `${SITE_URL}/` : `${SITE_URL}/${file}`;

    // expand includes/images first so placeholders inside partials are filled too
    let html = (await expand(layout.replace('{{content}}', () => body), base))
      .replaceAll('{{title}}', meta.title)
      .replaceAll('{{description}}', meta.description)
      .replaceAll('{{canonical}}', canonical)
      .replaceAll('{{bodyClass}}', meta.bodyClass || `page-${slug}`)
      .replaceAll('{{ogImage}}', `${SITE_URL}/assets/images/social/og-card.jpg`)
      .replaceAll('{{version}}', version)
      .replaceAll('{{year}}', String(new Date().getFullYear()));

    // mark the active nav item
    html = html.replace(
      new RegExp(`(<a[^>]*data-nav="${meta.nav || slug}")`, 'g'),
      '$1 aria-current="page"'
    );

    await fs.writeFile(path.join(DIST, file), html);
    if (slug !== '404') sitemap.push({ loc: canonical, priority: slug === 'index' ? '1.0' : '0.8' });
  }

  const today = new Date().toISOString().slice(0, 10);
  await fs.writeFile(
    path.join(DIST, 'sitemap.xml'),
    `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n` +
      sitemap
        .map((u) => `  <url><loc>${u.loc}</loc><lastmod>${today}</lastmod><priority>${u.priority}</priority></url>`)
        .join('\n') +
      `\n</urlset>\n`
  );

  console.log(`Built ${pageFiles.length} pages → dist/ in ${Date.now() - t0} ms`);
}

await build();
