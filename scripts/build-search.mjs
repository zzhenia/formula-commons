#!/usr/bin/env node
// Build a Pagefind search index for a static site, plus any pages listed in sitemaps.
// URLs are stored absolute, so results open on the right domain when another site
// merges this index (search.js). Only <main> (site) or <article> (sitemap pages) is indexed.
//
// usage: node scripts/build-search.mjs <site-dir> <base-url> <out-dir> [sitemap-url ...]
// The same file lives in formula-site and zheniavasiliev-site; keep them identical.
import { readdir, readFile, rm } from 'node:fs/promises';
import { join, relative, sep } from 'node:path';
import * as pagefind from 'pagefind';

const [siteDir, base, outDir, ...sitemaps] = process.argv.slice(2);
if (!siteDir || !base || !outDir) {
  console.error('usage: build-search.mjs <site-dir> <base-url> <out-dir> [sitemap-url ...]');
  process.exit(2);
}
const SKIP = new Set(['node_modules', 'pagefind', '.git', '.github']);

async function* htmlFiles(dir) {
  for (const e of await readdir(dir, { withFileTypes: true })) {
    if (e.name.startsWith('_') || e.name.startsWith('.') || SKIP.has(e.name)) continue;
    const p = join(dir, e.name);
    if (e.isDirectory()) yield* htmlFiles(p);
    else if (e.name.endsWith('.html') && e.name !== '404.html') yield p;
  }
}

// Mark the first <tag> as the indexed body; null when the page has none.
function markBody(html, tags) {
  for (const t of tags) {
    const i = html.search(new RegExp(`<${t}[\\s>]`, 'i'));
    if (i > -1) return html.slice(0, i + 1 + t.length) + ' data-pagefind-body' + html.slice(i + 1 + t.length);
  }
  return null;
}

async function get(url) {
  const r = await fetch(url, { headers: { 'User-Agent': 'formula-search-indexer' } });
  if (!r.ok) throw new Error(`${r.status} ${url}`);
  return r.text();
}

const { index } = await pagefind.createIndex({});
let count = 0;
async function add(url, html, tags) {
  const content = markBody(html, tags);
  if (!content) return;
  const { errors } = await index.addHTMLFile({ url, content });
  if (errors.length) throw new Error(`${url}: ${errors.join('; ')}`);
  count++;
}

for await (const file of htmlFiles(siteDir)) {
  const rel = relative(siteDir, file).split(sep).join('/');
  const path = rel === 'index.html' ? '' : rel.replace(/index\.html$/, '');
  await add(new URL(path, base + '/').href, await readFile(file, 'utf8'), ['main']);
}

for (const sm of sitemaps) {
  const urls = [...(await get(sm)).matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
  for (let i = 0; i < urls.length; i += 6) {
    const pages = await Promise.all(urls.slice(i, i + 6).map(get));
    for (const [n, html] of pages.entries()) await add(urls[i + n], html, ['article', 'main']);
  }
}

if (!count) throw new Error('no pages indexed');
await rm(outDir, { recursive: true, force: true });
const { errors } = await index.writeFiles({ outputPath: outDir });
if (errors.length) throw new Error(errors.join('; '));
await pagefind.close();
console.log(`indexed ${count} pages -> ${outDir}`);
