import { mkdir, writeFile } from 'node:fs/promises';
import { build } from 'esbuild';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

// Console artwork reuses the game's vector icons. Pass a bundled sharp module
// path when sharp is provided by the workspace runtime rather than this repo.
const sharpModule = process.argv[2];
const { default: sharp } = await import(sharpModule ? pathToFileURL(sharpModule).href : 'sharp');
const compiled = await build({
  entryPoints: ['src/game/ui/GameIcons.ts'], bundle: true,
  platform: 'node', format: 'esm', write: false,
});
const { icon } = await import(`data:text/javascript;base64,${Buffer.from(compiled.outputFiles[0].text).toString('base64')}`);
const products = [
  ['default', 'reward', '', '#dbc58a'],
  ['return_tickets_5', 'ticket', '5', '#dbc58a'],
  ['ad_free_week', 'timer', '7d', '#8bcec3'],
  ['gems_80', 'gems', '80', '#9f95dd'],
  ['gems_250', 'gems', '250', '#a896e6'],
  ['gems_650', 'gems', '650', '#b29bee'],
  ['gems_1400', 'gems', '1400', '#c1a5f7'],
  ['starter_pack', 'chest', '', '#8dc0a6'],
  ['founder_pack', 'elite', '', '#e1bf6a'],
  ['level_pass', 'quest', '', '#b996dc'],
  ['region_pack_stage_2', 'chest', '', '#d88e65'],
  ['legendary_skin_phoenix', 'damage', '', '#ff9574'],
  ['legendary_skin_titan', 'shield', '', '#88b7ce'],
  ['legendary_skin_astral', 'speed', '', '#b8a0ef'],
  ['legendary_skin_worldroot', 'fiber', '', '#90cba4'],
  ['legendary_skin_ruin_king', 'elite', '', '#e3bf68'],
];
const output = path.resolve('yandex-output/iap-icons');
await mkdir(output, { recursive: true });
for (const [id, glyph, badge, accent] of products) {
  const glyphSvg = icon(glyph).replace('<svg ', `<svg x="55" y="40" width="146" height="146" color="${accent}" `);
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="256" height="256" viewBox="0 0 256 256">
    <defs><linearGradient id="bg" x2=".8" y2="1"><stop stop-color="#2f5049"/><stop offset="1" stop-color="#132c2d"/></linearGradient></defs>
    <rect width="256" height="256" rx="38" fill="#132c2d"/>
    <rect x="8" y="8" width="240" height="240" rx="32" fill="url(#bg)" stroke="#aa945f" stroke-width="2"/>
    <path d="M22 61V34q0-12 12-12h27M195 22h27q12 0 12 12v27M22 195v27q0 12 12 12h27M195 234h27q12 0 12-12v-27" fill="none" stroke="#dac68c" stroke-width="3"/>
    <path d="M128 33 211 117 128 201 45 117Z" fill="${accent}" fill-opacity=".055"/>
    ${glyphSvg}
    ${badge ? `<rect x="64" y="180" width="128" height="43" rx="18" fill="#183435" stroke="#9e8d60"/><text x="128" y="211" text-anchor="middle" font-family="Arial, sans-serif" font-size="29" font-weight="700" fill="#edddb1">${badge}</text>` : '<path d="m112 216 16-8 16 8-16 8Z" fill="#dac68c"/>'}
  </svg>`;
  await writeFile(path.join(output, `${id}.svg`), svg);
  await sharp(Buffer.from(svg)).png().toFile(path.join(output, `${id}.png`));
}
console.log(`Rendered ${products.length} SVG and 256×256 PNG icons to ${output}`);
