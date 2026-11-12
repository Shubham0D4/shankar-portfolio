// Renders the home hero's resting state and saves it as the still image
// (DESIGN.md §8): AVIF, WebP and JPEG at the widths in HERO_STILL.
//   npm run dev -- --port 5199
//   SCRATCH=/some/dir node dev/hero-still.mjs [http://localhost:5199]
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import sharp from 'sharp';
import { launch } from './inspect-checks/cdp.mjs';

const BASE = process.argv[2] ?? 'http://localhost:5199';
const OUT = join(import.meta.dirname, '..', 'public', 'assets', 'hero');
const SIZES = { wide: [960, 1440, 1920], tall: [480, 800, 1080] };
mkdirSync(OUT, { recursive: true });

const b = await launch({ width: 1200, height: 900 });
try {
  for (const [kind, widths] of Object.entries(SIZES)) {
    await b.goto(`${BASE}/?still-render=${kind}`);
    await b.waitFor('window.__heroStill', 60000);
    const png = Buffer.from((await b.eval('window.__heroStill')).split(',')[1], 'base64');
    if (process.env.SCRATCH) writeFileSync(join(process.env.SCRATCH, `hero-${kind}.png`), png);
    for (const w of widths) {
      const img = sharp(png).resize({ width: w });
      await img.clone().avif({ quality: 55, effort: 6 }).toFile(join(OUT, `instruments-${kind}-${w}.avif`));
      await img.clone().webp({ quality: 78 }).toFile(join(OUT, `instruments-${kind}-${w}.webp`));
      await img.clone().jpeg({ quality: 80, mozjpeg: true }).toFile(join(OUT, `instruments-${kind}-${w}.jpg`));
    }
    console.log(kind, 'done');
  }
  if (b.logs.length) console.log(b.logs.join('\n'));
} finally {
  await b.close?.();
}
