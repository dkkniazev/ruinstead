import assert from 'node:assert/strict';
import { build } from 'esbuild';

const scenarios = [
  { name: 'production-3d', dev: false, supported: true, query: '', legacy: false },
  { name: 'production-ignores-debug', dev: false, supported: true, query: '?renderer=2d', legacy: false },
  { name: 'production-compatibility', dev: false, supported: false, query: '', legacy: true },
  { name: 'development-3d', dev: true, supported: true, query: '', legacy: false },
  { name: 'development-compatibility-fixture', dev: true, supported: true, query: '?renderer=2d', legacy: true },
  { name: 'context-error', dev: false, supported: false, throws: true, query: '', legacy: true },
];
for (const scenario of scenarios) {
  let probes = 0, releases = 0;
  globalThis.location = { search: scenario.query };
  globalThis.document = { createElement(name) {
    assert.equal(name, 'canvas');
    return { getContext(type) {
      assert.equal(type, 'webgl2'); probes++;
      if (scenario.throws) throw new Error('GPU context rejected');
      return scenario.supported ? { getExtension: () => ({ loseContext() { releases++; } }) } : null;
    } };
  } };
  const result = await build({
    stdin: { contents: `export * from './src/scenes/BootScene.ts';export * from './src/game/render3d/RenderingSupport.ts';`, resolveDir: process.cwd(), loader: 'ts' },
    bundle: true, platform: 'node', format: 'esm', write: false,
    define: { 'import.meta.env.DEV': String(scenario.dev) },
    plugins: [{ name: 'boot-phaser', setup(b) {
      b.onResolve({ filter: /^phaser$/ }, () => ({ path: 'phaser', namespace: 'stub' }));
      b.onLoad({ filter: /.*/, namespace: 'stub' }, () => ({ contents: `export default {Scene:class {
        loaded=[];load={image:(key,url)=>this.loaded.push({key,url})};
      }};` }));
    } }],
  });
  const api = await import(`data:text/javascript;base64,${Buffer.from(result.outputFiles[0].text).toString('base64')}#${scenario.name}`);
  const boot = new api.BootScene();
  boot.preload();
  assert.equal(api.usesLegacyWorldArt(), scenario.legacy, scenario.name);
  assert.equal(boot.loaded.length, scenario.legacy ? 11 : 0, scenario.name);
  assert.equal(api.supports3DWorld(), scenario.supported);
  assert.equal(api.supports3DWorld(), scenario.supported);
  assert.equal(probes, 1, 'Repeated decisions must not allocate additional GPU contexts');
  assert.equal(releases, scenario.supported ? 1 : 0);
}
delete globalThis.document; delete globalThis.location;
console.log('Startup: PASS — normal 3D omits legacy PNG downloads; compatibility loads them, production ignores DEV overrides, temporary context is released and probe errors fall back.');
