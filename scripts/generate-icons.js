#!/usr/bin/env node
// Regenerate public/icon-192.png and public/icon-512.png.
// Run from the repo root: node scripts/generate-icons.js
// Requires: npm install --save-dev @resvg/resvg-js wawoff2

const { Resvg } = require('@resvg/resvg-js');
const wawoff2 = require('wawoff2');
const fs = require('fs');
const path = require('path');

async function main() {
  const woff2Path = path.resolve(
    'node_modules/@fontsource-variable/bricolage-grotesque/files/bricolage-grotesque-latin-wght-normal.woff2'
  );
  const ttf = await wawoff2.decompress(fs.readFileSync(woff2Path));
  const ttfPath = path.join(require('os').tmpdir(), 'bricolage.ttf');
  fs.writeFileSync(ttfPath, ttf);

  for (const size of [192, 512]) {
    const radius = Math.round(size * 0.1);
    const fontSize = Math.round(size * 0.58);
    const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='${size}' height='${size}' viewBox='0 0 ${size} ${size}'>
      <defs>
        <filter id='shadow' x='-10%' y='-10%' width='120%' height='120%'>
          <feDropShadow dx='0' dy='${size * 0.025}' stdDeviation='${size * 0.018}' flood-color='rgba(0,0,0,0.28)'/>
        </filter>
      </defs>
      <rect width='${size}' height='${size}' rx='${radius}' fill='#7aaa2e'/>
      <text x='${size / 2}' y='${size / 2}' text-anchor='middle' dominant-baseline='central' font-family='Bricolage Grotesque' font-weight='800' font-size='${fontSize}' fill='white' filter='url(#shadow)'>XP</text>
    </svg>`;

    const resvg = new Resvg(svg, {
      font: { fontFiles: [ttfPath], loadSystemFonts: false, defaultFontFamily: 'Bricolage Grotesque' },
    });
    const out = path.resolve(`public/icon-${size}.png`);
    fs.writeFileSync(out, resvg.render().asPng());
    console.log(`Created ${out}`);
  }
}

main().catch((err) => { console.error(err); process.exit(1); });
