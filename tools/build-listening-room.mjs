/**
 * Generates public/demos/listening-room.html from Aether Command's real score
 * manifest.
 *
 * The room's whole claim is that these tracks are selected by a system, so the
 * data behind it has to BE that system's data — not a retyped copy that drifts
 * the first time a window changes. Re-run after editing scoreTracks.ts:
 *
 *   node tools/build-listening-room.mjs
 */
import { readFileSync, writeFileSync } from 'node:fs';

const SRC = '/Users/bonnieremeika/Documents/_MKRMK/Awebsite/src/app/data/scoreTracks.ts';
const src = readFileSync(SRC, 'utf8');

const body = src.slice(src.indexOf('export const SCORE_TRACKS'), src.indexOf('/** Which variant wins'));
const R2 = src.match(/const R2 = '([^']+)'/)[1];

const tracks = [];
for (const block of body.split(/\n  \{\n/).slice(1)) {
  const get = (k, q = true) => {
    const re = q ? new RegExp(`${k}: '([^']*)'`) : new RegExp(`${k}: (-?[\\d.]+)`);
    const m = block.match(re);
    return m ? (q ? m[1] : Number(m[1])) : undefined;
  };
  const id = get('id');
  if (!id) continue;
  const file = (block.match(/src: `\$\{R2\}\/([^`]+)`/) || [])[1];
  const bbox = (block.match(/bbox: \[([^\]]+)\]/) || [])[1];
  const cultures = (block.match(/cultures: \[([^\]]+)\]/) || [])[1];
  tracks.push({
    id,
    title: get('title'),
    src: `${R2}/${file}`,
    slot: get('slot'),
    note: get('note'),
    startYear: get('startYear', false),
    endYear: get('endYear', false),
    peakStartYear: get('peakStartYear', false),
    peakEndYear: get('peakEndYear', false),
    bed: /bed: true/.test(block),
    bbox: bbox ? bbox.split(',').map(n => Number(n.trim())) : null,
    cultures: cultures ? cultures.split(',').map(s => s.trim().replace(/'/g, '')) : null,
  });
}

const preferred = Object.fromEntries(
  [...src.matchAll(/^\s{2}(\w+): '([^']+)',$/gm)]
    .filter(m => src.indexOf(m[0]) > src.indexOf('PREFERRED_VARIANT'))
    .map(m => [m[1], m[2]]),
);

const html = readFileSync(new URL('./listening-room.template.html', import.meta.url), 'utf8')
  .replace('/*__TRACKS__*/', JSON.stringify(tracks, null, 2))
  .replace('/*__PREFERRED__*/', JSON.stringify(preferred, null, 2));

writeFileSync(new URL('../public/demos/listening-room.html', import.meta.url), html);
console.log(`built listening-room.html — ${tracks.length} tracks`);
