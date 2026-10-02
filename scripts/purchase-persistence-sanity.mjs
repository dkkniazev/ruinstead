import assert from 'node:assert/strict';
import { build } from 'esbuild';

// Exercise the production scene receipt handler, store, cloud writer and SDK
// purchase provider. Only Phaser rendering and external SDK responses are fixtures.
const bundle = await build({
  stdin: { contents: `
    export * from './src/scenes/WorldScene.ts';
    export * from './src/game/state/GameState.ts';
    export * from './src/game/state/GameStateStore.ts';
    export * from './src/game/state/SaveKeys.ts';
    export * from './src/platform/yandex/YandexCloudSave.ts';
    export * from './src/platform/yandex/YandexSdk.ts';
    export * from './src/platform/purchases/YandexPurchaseProvider.ts';
  `, loader: 'ts', resolveDir: process.cwd() },
  bundle: true, platform: 'node', format: 'esm', write: false,
  define: { 'import.meta.env.DEV': 'false', 'import.meta.env.BASE_URL': '"/"' },
  plugins: [{ name: 'phaser-rendering', setup(b) {
    b.onResolve({ filter: /^phaser$/ }, () => ({ path: 'phaser', namespace: 'fixture' }));
    b.onLoad({ filter: /.*/, namespace: 'fixture' }, () => ({ contents: `
      export default {Scene:class {}, Math:{Distance:{Between:(a,b,c,d)=>Math.hypot(c-a,d-b)}, Vector2:class {
        constructor(x=0,y=0){this.x=x;this.y=y;}
      }}};
    ` }));
  } }],
});

async function run() {
  const storage = new Map();
  const timers = new Map();
  let timerId = 0;
  let storageFailure;
  const fixtureWindow = new EventTarget();
  fixtureWindow.localStorage = {
    getItem: key => storage.get(key) ?? null,
    setItem: (key, value) => {
      if (key === storageFailure) throw Error('storage unavailable');
      storage.set(key, value);
    },
  };
  fixtureWindow.setTimeout = fn => { timers.set(++timerId, fn); return timerId; };
  fixtureWindow.clearTimeout = id => timers.delete(id);
  globalThis.window = fixtureWindow;
  const api = await import(`data:text/javascript;base64,${Buffer.from(bundle.outputFiles[0].text + '\n//# sourceURL=purchase-fixture.mjs').toString('base64')}`);
  const warnings = [];
  const warn = console.warn;
  console.warn = (...args) => warnings.push(args[0]);
  let cloud;
  let failCloud = false;
  let failRead = false;
  let failConsume = false;
  let beforeWrite;
  let writes = [];
  let consumes = [];
  let pending = [];
  let purchaseCalls = 0;
  const clone = value => JSON.parse(JSON.stringify(value));
  const player = {
    getData: async () => {
      if (failRead) throw Error('cloud read failed');
      return cloud ? { ruinsteadSave: clone(cloud), ruinsteadSaveMeta: { savedAt: cloud.savedAt } } : {};
    },
    setData: async (data, flush) => {
      writes.push({ data, flush });
      await beforeWrite?.(data);
      if (failCloud) throw Error('cloud write failed');
      cloud = clone(data.ruinsteadSave);
    },
  };
  api.setYandexSdk({ payments: {
    getPurchases: async () => pending,
    purchase: async ({ id }) => {
      purchaseCalls++;
      const receipt = { productID: id, purchaseToken: `purchase-${purchaseCalls}` };
      pending.push(receipt);
      return receipt;
    },
    consumePurchase: async token => {
      assert(cloud?.monetization.grantedPurchaseTokens.includes(token), 'Consume requires a durable cloud token');
      assert(JSON.parse(storage.get(api.LOCAL_SAVE_KEY)).monetization.grantedPurchaseTokens.includes(token), 'Consume requires a durable local token');
      if (failConsume) throw Error('consume failed');
      consumes.push(token);
      pending = pending.filter(p => p.purchaseToken !== token);
    },
  } });
  const scene = (state = api.createDefaultGameState()) => {
    const target = Object.create(api.WorldScene.prototype);
    Object.assign(target, {
      stateStore: new api.GameStateStore(), gameState: state,
      purchaseProvider: new api.YandexPurchaseProvider(),
      purchaseGrantQueue: Promise.resolve(), confirmedPurchaseTokens: new Set(),
      monetizationBusy: false, notices: [],
      emitMonetizationState() {}, emitPremiumState() {}, emitPlayerProgressState() {},
      applyMetaProgression() {}, evaluatePremiumAchievements() {},
    });
    target.game = { events: { emit: (_event, notice) => target.notices.push(notice) } };
    return target;
  };
  const receipt = (token, productId = 'return_tickets_5') => ({ productId, purchaseToken: token });
  const reset = async () => {
    storage.clear(); storageFailure = undefined;
    cloud = undefined; failCloud = false; failRead = false; failConsume = false;
    beforeWrite = undefined; writes = []; consumes = []; pending = []; purchaseCalls = 0;
    assert.equal(await api.initializeYandexCloudSave(player), true);
  };
  const reload = async () => {
    assert.equal(await api.initializeYandexCloudSave(player), true);
    return scene(new api.GameStateStore().load());
  };
  const waitUntil = async predicate => {
    for (let i = 0; i < 100; i++) { if (predicate()) return; await Promise.resolve(); }
    assert(predicate(), 'Expected asynchronous stage was not reached');
  };
  try {
    await assert.rejects(api.flushYandexCloudSave({ requireCloud: true }), /unavailable/);
    await api.flushYandexCloudSave();

    await reset();
    failRead = true;
    assert.equal(await api.initializeYandexCloudSave(player), false);
    let game = scene();
    await game.grantPurchase(receipt('unread-cloud'));
    assert.equal(consumes.length, 0);
    assert.equal(writes.length, 0, 'Failed cloud read must not overwrite unknown progress');

    await reset();
    game = scene();
    const initialTickets = game.gameState.consumables.returnTickets;
    failCloud = true;
    await game.grantPurchase(receipt('cloud-failure'));
    assert.equal(game.gameState.consumables.returnTickets, initialTickets + 5);
    assert.equal(consumes.length, 0, 'Cloud failure retains the SDK receipt');
    assert(game.notices.some(n => String(n).includes('не удалось сохранить')));
    failCloud = false;
    game = await reload();
    await game.grantPurchase(receipt('cloud-failure'));
    assert.equal(game.gameState.consumables.returnTickets, initialTickets + 5, 'Reload retries saving without another grant');
    assert.deepEqual(consumes, ['cloud-failure']);

    await reset();
    game = scene(); failCloud = true;
    await game.grantPurchase(receipt('lost-local'));
    storage.clear(); failCloud = false;
    game = await reload();
    await game.grantPurchase(receipt('lost-local'));
    assert.equal(game.gameState.consumables.returnTickets, initialTickets + 5, 'Unconsumed receipt restores loss of local data');
    assert.deepEqual(consumes, ['lost-local']);

    for (const key of [api.LOCAL_SAVE_KEY, api.LOCAL_SAVE_META_KEY]) {
      await reset(); game = scene(); storageFailure = key;
      await game.grantPurchase(receipt('local-failure'));
      assert.equal(consumes.length, 0, 'Local data or metadata failure must retain the receipt');
      assert.equal(writes.length, 0);
      storageFailure = undefined;
      await game.grantPurchase(receipt('local-failure'));
      assert.equal(game.gameState.consumables.returnTickets, initialTickets + 5);
      assert.deepEqual(consumes, ['local-failure']);
    }

    await reset(); game = scene(); failConsume = true;
    await game.grantPurchase(receipt('consume-failure'));
    assert.equal(consumes.length, 0);
    storage.clear(); failConsume = false;
    game = await reload();
    await game.grantPurchase(receipt('consume-failure'));
    assert.equal(game.gameState.consumables.returnTickets, initialTickets + 5, 'Cloud recovery does not grant a paid item twice');
    assert.deepEqual(consumes, ['consume-failure']);

    await reset(); game = scene();
    await Promise.all([game.grantPurchase(receipt('duplicate')), game.grantPurchase(receipt('duplicate'))]);
    assert.equal(game.gameState.consumables.returnTickets, initialTickets + 5);
    assert.deepEqual(consumes, ['duplicate'], 'Concurrent callbacks consume once');

    await reset(); game = scene();
    let releaseOld;
    beforeWrite = async data => {
      if (!data.ruinsteadSave.monetization.grantedPurchaseTokens.length) {
        await new Promise(resolve => { releaseOld = resolve; });
      }
    };
    game.saveState();
    const oldWrite = api.flushYandexCloudSave();
    await waitUntil(() => releaseOld);
    const grant = game.grantPurchase(receipt('ordered'));
    await waitUntil(() => game.gameState.monetization.grantedPurchaseTokens.includes('ordered'));
    assert.equal(writes.length, 1, 'A new write waits for the earlier request');
    assert.equal(writes[0].data.ruinsteadSave.consumables.returnTickets, initialTickets, 'In-flight snapshot cannot be mutated by a new grant');
    assert.equal(consumes.length, 0);
    releaseOld(); await oldWrite; await grant;
    assert.equal(cloud.consumables.returnTickets, initialTickets + 5);
    assert.deepEqual(consumes, ['ordered']);

    await reset(); game = scene();
    let releasePurchase;
    beforeWrite = () => new Promise(resolve => { releasePurchase = resolve; });
    const buying = game.purchaseProduct('return_tickets_5');
    await waitUntil(() => releasePurchase);
    assert.equal(game.monetizationBusy, true, 'Purchase stays busy until persistence finishes');
    await game.purchaseProduct('return_tickets_5');
    assert.equal(purchaseCalls, 1);
    releasePurchase(); await buying;
    assert.equal(game.monetizationBusy, false);

    await reset(); game = scene();
    await Promise.all([game.grantPurchase(receipt('first')), game.grantPurchase(receipt('second'))]);
    assert.equal(cloud.consumables.returnTickets, initialTickets + 10);
    assert.deepEqual(consumes, ['first', 'second']);

    await reset(); game = scene();
    await game.grantPurchase(receipt('gem-pack', 'gems_80'));
    await game.grantPurchase(receipt('gem-pack', 'gems_80'));
    assert.equal(game.gameState.premium.gems, 80);
    await game.grantPurchase(receipt('ad-week', 'ad_free_week'));
    const adFreeUntil = game.gameState.monetization.adFreeUntil;
    game = await reload();
    await game.grantPurchase(receipt('ad-week', 'ad_free_week'));
    assert.equal(game.gameState.monetization.adFreeUntil, adFreeUntil, 'Retry never extends ad-free time twice');

    await reset(); game = scene(); failCloud = true;
    await game.grantPurchase(receipt('permanent', 'starter_pack'));
    assert.equal(game.gameState.premium.starterPackOwned, true);
    const gems = game.gameState.premium.gems;
    failCloud = false; game = await reload();
    await game.grantPurchase(receipt('permanent', 'starter_pack'));
    assert.equal(cloud.premium.starterPackOwned, true);
    assert.equal(game.gameState.premium.gems, gems, 'Permanent bundle retry never repeats its consumable contents');
    assert.deepEqual(consumes, [], 'Permanent products remain restorable in SDK');

    await reset(); game = scene();
    pending = [{ productID: 'return_tickets_5', purchaseToken: 'pending-startup' }];
    await game.reconcilePendingPurchases();
    assert.equal(cloud.consumables.returnTickets, initialTickets + 5);
    assert.equal(pending.length, 0);
    assert(warnings.length >= 5, 'The error scenarios actually exercised failures');
    console.log('Purchase persistence: PASS — real scene grants, local/cloud failure, unread cloud, ordered snapshots, concurrent callbacks, pending receipt reload/recovery, consume retry, permanent products and busy purchase flow. SDK responses are fixtures; no real payment was made.');
  } finally {
    console.warn = warn;
  }
}

try { await run(); }
catch (error) { console.error(String(error.stack).split('\n').slice(0, 10).join('\n')); process.exitCode = 1; }
