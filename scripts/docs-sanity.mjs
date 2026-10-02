// Read-only SDD graph validation. Never execute Markdown or access the network.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const required = [
  'AGENTS.md', 'README.md', 'docs/SDD_INVESTIGATION.md',
  'docs/CURRENT_STATE.md', 'docs/ROADMAP.md', 'docs/DOCUMENTATION_DRIFT.md',
  'docs/HISTORICAL_DESIGN.md', 'docs/specs/PROJECT_SPEC.md',
  'docs/specs/ARCHITECTURE.md', 'docs/specs/GAMEPLAY_COMBAT.md',
  'docs/specs/WORLD_CONTENT.md', 'docs/specs/PROGRESSION.md',
  'docs/specs/ECONOMY_BALANCE.md', 'docs/specs/PERSISTENCE.md',
  'docs/specs/PLATFORM_MONETIZATION.md', 'docs/specs/UI_UX_LOCALIZATION.md',
  'docs/specs/QA_RELEASE.md', 'docs/specs/FEATURE_TEMPLATE.md',
];
const templateHeadings = [
  'Status', 'Problem', 'Goal', 'User-visible behavior', 'Current behavior',
  'Required behavior', 'Non-goals', 'Invariants', 'Functional requirements',
  'Edge cases', 'Data / persistence implications', 'Platform implications',
  'UI / input implications', 'Localization implications', 'Performance considerations',
  'Security / abuse considerations', 'Acceptance criteria', 'Automated validation',
  'Manual validation', 'Implementation notes',
];

function stripCodeBlocks(text) {
  return text.replace(/^```[^\n]*\n[\s\S]*?^```\s*$/gm, '');
}

function headings(text) {
  return [...stripCodeBlocks(text).matchAll(/^#{1,6}\s+(.+?)\s*#*\s*$/gm)]
    .map((match) => match[1]);
}

function anchors(text) {
  const counts = new Map();
  return new Set(headings(text).map((heading) => {
    const slug = heading.toLowerCase().replace(/[^\p{L}\p{N}_\s-]/gu, '').replace(/\s/g, '-');
    const previous = counts.get(slug) ?? 0;
    counts.set(slug, previous + 1);
    return previous ? `${slug}-${previous}` : slug;
  }));
}

// Reader/exists injection keeps validator regression tests in memory.
function validateDocument(file, text, context) {
  const errors = [];
  const complain = (message) => errors.push(`${file}: ${message}`);
  if (!/^#\s+\S/m.test(text)) complain('missing document title');

  for (const match of text.matchAll(/\b(?:npm run)\s+([\w:-]+)/g)) {
    if (!Object.hasOwn(context.scripts, match[1])) complain(`unknown npm script ${match[1]}`);
  }
  const prose = stripCodeBlocks(text);
  for (const match of prose.matchAll(/!?\[[^\]\n]*\]\(([^)\n]+)\)/g)) {
    const raw = match[1].trim().replace(/^<([^>]+)>.*$/, '$1').replace(/\s+["'].*/, '');
    if (/^[a-z][\w+.-]*:/i.test(raw) || raw.startsWith('//')) continue;
    let decoded;
    try { decoded = decodeURIComponent(raw); } catch { complain(`invalid link encoding ${raw}`); continue; }
    const [target, fragment] = decoded.split('#');
    if (target.startsWith('/')) { complain(`use a repository-relative link: ${raw}`); continue; }
    const resolved = path.posix.normalize(path.posix.join(path.posix.dirname(file), target || path.posix.basename(file)));
    if (resolved === '..' || resolved.startsWith('../')) { complain(`link escapes repository: ${raw}`); continue; }
    if (!context.exists(resolved)) { complain(`missing link target ${resolved}`); continue; }
    if (fragment && resolved.endsWith('.md') && !anchors(context.read(resolved)).has(fragment)) {
      complain(`missing heading ${resolved}#${fragment}`);
    }
  }
  for (const match of prose.matchAll(/`([^`\n]+)`/g)) {
    const reference = match[1];
    if (!/^(?:(?:src|public|scripts|docs|\.github)\/[^\s*<>]+|package\.json|tsconfig\.json|vite\.config\.ts|AGENTS\.md)$/.test(reference)) continue;
    if (!context.exists(reference)) complain(`missing repository path ${reference}`);
  }
  if (file.startsWith('docs/specs/features/')) {
    const status = /^## Status\s*\n\s*(Draft|Approved|Implemented|Deprecated)\s*(?:\n|$)/m.exec(text);
    if (!status) complain('feature needs a valid Status');
    if (!/^## .*Acceptance criteria/m.test(text)) complain('feature needs Acceptance criteria');
    if (!/^## .*validation/im.test(text)) complain('feature needs validation');
  }
  return errors;
}

function validateGraph(files, context) {
  const errors = [];
  for (const file of required) if (!context.exists(file)) errors.push(`missing required file ${file}`);
  if (!files.some((file) => file.startsWith('docs/exec-plans/active/'))) errors.push('missing active execution plan');
  for (const file of files) errors.push(...validateDocument(file, context.read(file), context));
  if (context.exists('docs/specs/FEATURE_TEMPLATE.md')) {
    const present = headings(context.read('docs/specs/FEATURE_TEMPLATE.md'));
    for (const heading of templateHeadings) if (!present.includes(heading)) errors.push(`FEATURE_TEMPLATE: missing ${heading}`);
  }
  if (context.exists('docs/specs/QA_RELEASE.md')) {
    const inventory = context.read('docs/specs/QA_RELEASE.md');
    for (const script of Object.keys(context.scripts)) {
      if (!inventory.includes(`| \`npm run ${script}\` |`)) errors.push(`QA_RELEASE: missing package inventory row ${script}`);
    }
    for (const script of context.directScripts ?? []) {
      if (!inventory.includes(`scripts/${script}`)) errors.push(`QA_RELEASE: missing direct script ${script}`);
    }
  }
  return errors;
}

function selfTest() {
  const memory = new Map([
    ['README.md', '# Test\n\n## Target heading\n'],
    ['src/main.ts', ''], ['docs/specs/PROGRESSION.md', '# Progression\n'],
  ]);
  const context = { scripts: { build: 'vite build' }, exists: (file) => memory.has(file), read: (file) => memory.get(file) };
  const check = (text) => validateDocument('README.md', text, context);
  assert.deepEqual(check('# Test\n[ok](docs/specs/PROGRESSION.md)\n[web](https://example.com/missing)\n`src/main.ts`\n`npm run build`'), []);
  assert.deepEqual(check('# Test\n[ok](#target-heading)'), []);
  assert.match(check('# Test\n[broken](docs/specs/missing.md)')[0], /missing link target/);
  assert.match(check('# Test\n[broken](#unknown)')[0], /missing heading/);
  assert.match(check('# Test\n[escape](../private.md)')[0], /escapes repository/);
  assert.match(check('# Test\n`src/missing.ts`')[0], /missing repository path/);
  assert.match(check('# Test\n`npm run missing`')[0], /unknown npm script/);
  assert.match(check('No title')[0], /missing document title/);
  assert.ok(validateGraph(['README.md'], context).some((error) => error.includes('missing required file')));
  assert.ok(validateGraph(['README.md'], context).some((error) => error.includes('missing active execution plan')));
  memory.set('docs/specs/QA_RELEASE.md', '# QA\n');
  assert.ok(validateGraph(['README.md'], context).some((error) => error.includes('missing package inventory row build')));
  assert.ok(validateGraph(['README.md'], { ...context, directScripts: ['missing.mjs'] })
    .some((error) => error.includes('missing direct script missing.mjs')));
  const feature = validateDocument('docs/specs/features/test.md', '# Test\n## Status\nUnknown', context);
  assert.ok(feature.some((error) => error.includes('valid Status')));
  assert.ok(feature.some((error) => error.includes('Acceptance criteria')));
  assert.ok(feature.some((error) => error.includes('validation')));
  console.log('SDD validator self-test PASS: links, anchors, paths, scripts, structure and inventory');
}

function markdownFiles(directory) {
  const absolute = path.join(root, directory);
  if (!fs.existsSync(absolute)) return [];
  return fs.readdirSync(absolute, { withFileTypes: true }).flatMap((entry) => {
    const relative = `${directory}/${entry.name}`;
    return entry.isDirectory() ? markdownFiles(relative) : entry.isFile() && entry.name.endsWith('.md') ? [relative] : [];
  });
}

const args = process.argv.slice(2);
if (args.some((arg) => arg !== '--self-test')) throw new Error('Usage: node scripts/docs-sanity.mjs [--self-test]');
if (args.includes('--self-test')) selfTest();
const files = [...new Set([
  ...required.filter((file) => file !== 'docs/HISTORICAL_DESIGN.md'),
  ...markdownFiles('docs/specs'), ...markdownFiles('docs/exec-plans'),
])].filter((file) => fs.existsSync(path.join(root, file))).sort();
const context = {
  scripts: JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8')).scripts,
  directScripts: fs.readdirSync(path.join(root, 'scripts')).filter((file) => file.endsWith('.mjs')),
  exists: (file) => fs.existsSync(path.join(root, file)),
  read: (file) => fs.readFileSync(path.join(root, file), 'utf8'),
};
const errors = validateGraph(files, context);
if (errors.length) {
  for (const error of errors) console.error(error);
  process.exitCode = 1;
} else {
  console.log(`SDD documentation PASS: ${files.length} canonical documents; links/paths/npm inventory checked`);
}
