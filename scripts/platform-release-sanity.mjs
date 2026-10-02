import assert from 'node:assert/strict';
import { build } from 'esbuild';

const exports = `
export * from './src/platform/ads/createAdsProvider.ts';
export * from './src/platform/purchases/createPurchaseProvider.ts';
export * from './src/platform/yandex/YandexSdk.ts';
export * from './src/platform/yandex/YandexPlatform.ts';
export * from './src/platform/yandex/YandexCloudSave.ts';
export * from './src/game/ui/PurchasePrice.ts';
export * from './src/game/state/SaveKeys.ts';
export * from './src/i18n/I18n.ts';
`;
async function fixture(development) {
  const result = await build({
    stdin: { contents: exports, loader: 'ts', resolveDir: process.cwd() },
    bundle: true, platform: 'node', format: 'esm', write: false,
    define: { 'import.meta.env.DEV': String(development) }, minify: true,
  });
  const source = result.outputFiles[0].text;
  if (!development) {
    assert(!source.includes('mock-'), 'Production must remove simulated purchase receipts');
    assert(!source.includes('name="mock"'), 'Production must remove simulated ad providers');
  }
  return import(`data:text/javascript;base64,${Buffer.from(source).toString('base64')}`);
}

const platformWindow = new EventTarget();
const values = new Map();
platformWindow.localStorage = {
  getItem: key => values.get(key) ?? null,
  setItem: (key, value) => values.set(key, value),
};
platformWindow.setTimeout = setTimeout;
platformWindow.clearTimeout = clearTimeout;
globalThis.window = platformWindow;
const prod = await fixture(false);
const dev = await fixture(true);
assert.equal(dev.createAdsProvider().name, 'mock');
assert.equal(dev.createPurchaseProvider().name, 'mock');

const ads = prod.createAdsProvider();
const purchases = prod.createPurchaseProvider();
assert.equal(ads.name, 'yandex');
assert.equal(purchases.name, 'yandex');
assert.equal(ads.isRewardedAvailable(), false);
assert.equal(ads.isInterstitialAvailable(), false);
assert.deepEqual(await ads.showRewarded('chest_reward'), { rewarded: false, reason: 'unavailable' });
assert.deepEqual(await ads.showInterstitial('zone_transition'), { shown: false, reason: 'unavailable' });
assert.equal(purchases.isAvailable(), false);
assert.deepEqual(await purchases.purchase('return_tickets_5'), { success: false, reason: 'unavailable' });
assert.deepEqual(await purchases.getCatalog(), []);
assert.deepEqual(await purchases.getPendingPurchases(), []);
await assert.rejects(purchases.consume('not-a-receipt'), /unavailable/);

let callbacks;
let fullscreenCallbacks;
let throwAd = false;
let starts = 0;
let stops = 0;
let readyCalls = 0;
let adOpens = 0;
let adCloses = 0;
platformWindow.addEventListener('yandex-ad-open', () => adOpens++);
platformWindow.addEventListener('yandex-ad-close', () => adCloses++);
const product = {
  id: 'return_tickets_5', title: '5 билетов', description: 'Возвращение домой',
  price: '25 YAN', priceValue: '25', priceCurrencyCode: 'YAN',
  getPriceCurrencyImage: size => `https://example.invalid/currency-${size}.svg`,
};
const consumed = [];
let failPurchase = false;
const sdk = {
  features: {
    GameplayAPI: { start: () => starts++, stop: () => stops++ },
    LoadingAPI: { ready: () => readyCalls++ },
  },
  adv: {
    showRewardedVideo: options => { if (throwAd) throw Error('SDK failure'); callbacks = options.callbacks; },
    showFullscreenAdv: options => { fullscreenCallbacks = options.callbacks; },
  },
  getPayments: async () => ({
    getCatalog: async () => [product],
    getPurchases: async () => [{ productID: product.id, purchaseToken: 'pending-1' }],
    purchase: async ({ id }) => {
      if (failPurchase) throw Error('cancelled');
      return { productID: id, purchaseToken: 'paid-1' };
    },
    consumePurchase: async token => consumed.push(token),
  }),
};
prod.setYandexSdk(sdk);
dev.setYandexSdk(sdk);
assert.equal(dev.createAdsProvider().name, 'yandex');
assert.equal(dev.createPurchaseProvider().name, 'yandex');
assert.equal(ads.isRewardedAvailable(), true);
prod.markYandexGameReady();
prod.markYandexGameReady();
assert.equal(readyCalls, 1, 'Game Ready is emitted once');
prod.startYandexGameplay();
assert.equal(starts, 1);
let pending = ads.showRewarded('chest_reward');
assert.equal(stops, 1, 'Advertising pauses gameplay immediately');
callbacks.onClose();
assert.deepEqual(await pending, { rewarded: false, reason: 'skipped' });
assert.equal(starts, 2);

pending = ads.showRewarded('boss_reward');
callbacks.onRewarded();
callbacks.onRewarded();
callbacks.onClose();
callbacks.onClose();
callbacks.onError(Error('late error'));
assert.deepEqual(await pending, { rewarded: true, reason: 'completed' });
assert.equal(adOpens, 2);
assert.equal(adCloses, 2, 'Repeated SDK callbacks settle the request once');
prod.suspendYandexGameplay('visibility');
const startsBeforeHiddenAd = starts;
pending = ads.showRewarded('return_home');
callbacks.onError(Error('no ad'));
assert.deepEqual(await pending, { rewarded: false, reason: 'error' });
assert.equal(starts, startsBeforeHiddenAd, 'Closing an ad must not resume a hidden game');
prod.resumeYandexGameplay('visibility');
assert.equal(starts, startsBeforeHiddenAd + 1);
throwAd = true;
assert.deepEqual(await ads.showRewarded('supply'), { rewarded: false, reason: 'error' });
assert.equal(adOpens, adCloses, 'SDK exceptions release the advertising pause');
throwAd = false;
pending = ads.showInterstitial('return_to_settlement');
fullscreenCallbacks.onClose(false);
assert.equal((await pending).shown, false, 'A rejected interstitial is not counted as shown');

const catalog = await purchases.getCatalog();
assert.equal(catalog[0].price, '25 YAN');
assert.equal(catalog[0].currencyIconUrl, 'https://example.invalid/currency-small.svg');
assert.deepEqual(await purchases.getPendingPurchases(), [{ productId: product.id, purchaseToken: 'pending-1' }]);
assert.deepEqual(await purchases.purchase(product.id), { success: true, receipt: { productId: product.id, purchaseToken: 'paid-1' } });
failPurchase = true;
assert.deepEqual(await purchases.purchase(product.id), { success: false, reason: 'cancelled-or-failed' });
await purchases.consume('paid-1');
assert.deepEqual(consumed, ['paid-1']);
assert.equal(prod.purchasePriceLabel(undefined), 'Недоступно');
const price = prod.purchasePriceLabel(catalog[0]);
assert(price.includes('25 YAN') && price.includes('<img') && price.includes('currency-small.svg'));
assert(!prod.purchasePriceLabel({ price: '<b>25</b>', currencyIconUrl: 'javascript:alert(1)' }).includes('<img'));
assert(prod.purchasePriceLabel({ price: '<b>25</b>', currencyIconUrl: '' }).includes('&lt;b&gt;'));
for (const [language,expected] of [['ru','ru'],['ru-RU','ru'],['en','en'],['en-US','en'],['EN_GB','en'],['tr','ru'],[undefined,'ru']]) {
  assert.equal(prod.normalizeLanguageCode(language), expected, 'Select supported SDK and browser languages');
}

const writes = [];
values.set(prod.LOCAL_SAVE_KEY, JSON.stringify({ savedAt: 20, schemaVersion: 29 }));
values.set(prod.LOCAL_SAVE_META_KEY, JSON.stringify({ savedAt: 20 }));
await prod.initializeYandexCloudSave({
  getData: async () => ({ ruinsteadSave: { savedAt: 10 }, ruinsteadSaveMeta: { savedAt: 10 } }),
  setData: async (data, flush) => writes.push({ data, flush }),
});
assert.equal(writes[0].data.ruinsteadSave.savedAt, 20, 'A stale cloud save cannot overwrite newer local progress');
prod.queueYandexCloudSave({ savedAt: 30, schemaVersion: 29, marker: 'latest' });
await prod.flushYandexCloudSave();
assert.equal(writes.at(-1).data.ruinsteadSave.marker, 'latest');
assert.equal(writes.at(-1).flush, true, 'Explicit flush persists queued progress without waiting for the debounce');
prod.setYandexSdk(undefined);
assert.equal(ads.isRewardedAvailable(), false);
assert.equal(purchases.isAvailable(), false);
console.log('Release platform: PASS — production has no mock grants, SDK denial/skip/error/repeated callbacks, independent pauses, catalog currency, purchase cancellation/receipts, cloud flush and supported language. SDK responses here are fixtures, not a live Yandex test.');
