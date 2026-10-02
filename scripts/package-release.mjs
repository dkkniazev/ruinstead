import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdir, readdir, readFile, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { build } from 'esbuild';

const workspace = process.cwd();
const buildDir = path.join(workspace, 'dist');
const outputDir = path.join(workspace, 'yandex-output');
const archivePath = path.join(outputDir, 'ruinstead-candidate.zip');
const files = [];
async function walk(directory) {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const absolute = path.join(directory, entry.name);
    if (entry.isDirectory()) await walk(absolute);
    else {
      assert(entry.isFile(), 'Release archive cannot contain symlinks');
      const relative = path.relative(buildDir, absolute).split(path.sep).join('/');
      assert(!/[\s\u0400-\u04ff]/u.test(relative), `Unsupported archive filename: ${relative}`);
      files.push({ path: relative, bytes: (await stat(absolute)).size });
    }
  }
}
await walk(buildDir);
assert(files.some(file => file.path === 'index.html'), 'Build dist/index.html before packaging');
const bytes = files.reduce((sum, file) => sum + file.bytes, 0);
assert(bytes <= 100_000_000, 'Uncompressed game exceeds 100 MB');
await mkdir(outputDir, { recursive: true });
const archiver = process.platform === 'win32' ? 'tar.exe' : 'bsdtar';
const roots = (await readdir(buildDir)).sort();
// Pass arguments directly to the system archiver, never through a shell.
execFileSync(archiver, ['-a', '-c', '-f', archivePath, '-C', buildDir, ...roots]);
const listing = execFileSync(archiver, ['-t', '-f', archivePath], { encoding: 'utf8' })
  .split(/\r?\n/).filter(name => name && !name.endsWith('/')).sort();
assert.deepEqual(listing, files.map(file => file.path).sort(), 'Archive contents differ from dist');
const sha256 = createHash('sha256').update(await readFile(archivePath)).digest('hex');
const languageModule = await build({
  entryPoints: [path.join(workspace, 'src/i18n/I18n.ts')],
  bundle: true, platform: 'node', format: 'esm', write: false,
});
const { SUPPORTED_LANGUAGES } = await import(
  `data:text/javascript;base64,${Buffer.from(languageModule.outputFiles[0].text).toString('base64')}`,
);
await writeFile(path.join(outputDir, 'ruinstead-candidate.json'), JSON.stringify({
  generatedAt: new Date().toISOString(), version: '0.1.0', supportedLanguages: SUPPORTED_LANGUAGES,
  orientation: 'landscape', archive: path.basename(archivePath), sha256,
  uncompressedBytes: bytes, files,
  status: 'local candidate; live SDK and physical-device verification pending',
}, null, 2) + '\n');
console.log(`Release candidate: ${archivePath}\nFiles: ${files.length}; uncompressed bytes: ${bytes}\nSHA256: ${sha256}\nArchive prepared locally. It has not been uploaded, moderated or published.`);
