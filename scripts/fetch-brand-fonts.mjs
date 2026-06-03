// One-off dev tool: download the latin-subset woff2 for the brand fonts from
// Google Fonts, so they can be committed and loaded via next/font/local
// (zero network at build time). Run with network available.
import { writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';

const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';
const OUT = new URL('../src/app/fonts/', import.meta.url);
mkdirSync(OUT, { recursive: true });

// [outName, css2 query]
const JOBS = [
  ['HankenGrotesk-300', 'family=Hanken+Grotesk:wght@300'],
  ['HankenGrotesk-400', 'family=Hanken+Grotesk:wght@400'],
  ['HankenGrotesk-500', 'family=Hanken+Grotesk:wght@500'],
  ['HankenGrotesk-600', 'family=Hanken+Grotesk:wght@600'],
  ['HankenGrotesk-700', 'family=Hanken+Grotesk:wght@700'],
  ['HankenGrotesk-800', 'family=Hanken+Grotesk:wght@800'],
  ['InstrumentSerif-400', 'family=Instrument+Serif:ital@0'],
  ['InstrumentSerif-400italic', 'family=Instrument+Serif:ital@1'],
  ['SpaceMono-400', 'family=Space+Mono:ital,wght@0,400'],
  ['SpaceMono-700', 'family=Space+Mono:ital,wght@0,700'],
  ['SpaceMono-400italic', 'family=Space+Mono:ital,wght@1,400'],
];

// From a CSS2 response, return the woff2 URL of the `/* latin */` block.
// Google emits `/* subset */` immediately before each @font-face block.
function latinWoff2(css) {
  const chunks = css.split('/* '); // each chunk: "latin */ @font-face {...}"
  for (const c of chunks) {
    if (c.startsWith('latin */')) {
      const m = c.match(/url\((https:\/\/[^)]+\.woff2)\)/);
      if (m) return m[1];
    }
  }
  // fallback: last woff2 in file (Google orders latin last)
  const all = [...css.matchAll(/url\((https:\/\/[^)]+\.woff2)\)/g)];
  return all.length ? all[all.length - 1][1] : null;
}

async function run() {
  for (const [name, query] of JOBS) {
    const cssUrl = `https://fonts.googleapis.com/css2?${query}&display=swap`;
    const cssRes = await fetch(cssUrl, { headers: { 'User-Agent': UA } });
    if (!cssRes.ok) throw new Error(`${name}: css ${cssRes.status}`);
    const css = await cssRes.text();
    const url = latinWoff2(css);
    if (!url) throw new Error(`${name}: no woff2 found`);
    const fontRes = await fetch(url, { headers: { 'User-Agent': UA } });
    if (!fontRes.ok) throw new Error(`${name}: font ${fontRes.status}`);
    const buf = Buffer.from(await fontRes.arrayBuffer());
    writeFileSync(join(OUT.pathname, `${name}.woff2`), buf);
    process.stdout.write(`${name}.woff2  ${(buf.length / 1024).toFixed(1)}KB  <- ${url}\n`);
  }
}
run().catch((e) => {
  process.stderr.write(`fetch-fonts failed: ${e.message}\n`);
  process.exit(1);
});
