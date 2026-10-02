# Yandex platform, advertising and purchases

## SDK and lifecycle

`src/platform/yandex/YandexSdk.ts` defines the consumed SDK boundary;
`src/platform/yandex/YandexPlatform.ts` initializes `/sdk.js`, identity/device/
language and lifecycle. `src/main.ts` selects SDK language before creating the
game. LoadingAPI.ready is sent after usable world/HUD/presentation startup.
GameplayAPI is coordinated with platform/ad/visibility transitions; pause
reasons remain independent so ending an ad cannot undo a hidden-page pause.
Audio is muted with pauses. Cloud flush/authorization follow [PERSISTENCE](PERSISTENCE.md).

Absent SDK is a supported local browser condition, not permission to simulate
production ads/payments. Local play remains possible; unavailable actions have
visible UI feedback. TV device detection does not imply TV input support.
SDK fixtures cover code contracts, not current Yandex account activation/policies.

## Providers and rewarded flow

`src/platform/ads/createAdsProvider.ts` and
`src/platform/purchases/createPurchaseProvider.ts` choose real providers in
production; mock fallback is DEV-only when SDK is absent. Reward requires SDK
onRewarded and settled close; skip/error gives none. Duplicate callbacks settle
once. Busy flags block concurrent ad/grant flows, not ordinary harvesting.

`src/game/monetization/MonetizationConfig.ts` enables rewarded monetization;
interstitialEnabled is **false**. Fullscreen provider support is not a claim of
forced ads in the regular loop. Explicit placements include death revive,
boss/chest extra rewards, production bonus, timed blessing, boss respawn,
supply, home return and skin chest. Post-chest/boss bonus offers are separate
actions; E must never automatically launch an advertisement. Expiring ad-free
entitlement uses the same requested reward action without advertising; it is
not an automatic free grant on proximity. Dismissal must not loop a modal.

## Product catalog and client purchase contract

`src/game/cosmetics/PremiumStoreConfig.ts` maps 15 client product IDs to tickets,
ad-free week, gems, packs, level pass and five legendary skins.
[IAP_CATALOG](../IAP_CATALOG.md) and [CSV](../yandex-iap-catalog.csv) record console
setup history. Availability of getPayments is not proof of activated payments.
Missing SDK catalog products are not offered; SDK price/currency data populates
buttons through `src/game/ui/PurchasePrice.ts` with escaped text/URLs.

`src/platform/purchases/YandexPurchaseProvider.ts` uses getPayments({signed:false}),
catalog/purchase/pending/consume. There is no signature-verifying server.
`src/scenes/WorldScene.ts` applies receipts serially: validate mapped product,
check ownership/token, apply at most once, add token, persist locally and (in
production) require cloud, then consume a consumable. Permanent grants remain
unconsumed. Saved tokens prevent duplicate grant during retry/reload. If save
fails, do not consume; if consume fails, retry without minting another reward.
An already-owned permanent pack cannot replay its bundled rewards.

Live activation, purchase/cancel/reload/refund/account behavior is **Unverified**
in this bootstrap. Support correspondence is not a technical activation test;
tax/legal eligibility is outside this client contract. Releases advertising IAP
must close activation/fulfillment QA; an ads-only release decision is separate.

## Validation and edge cases

Run `npm run check:release`: DEV/production provider boundaries, ad callback
settlement/lifecycle, catalog formatting, local/cloud failure ordering, duplicate
receipt/permanent grant and consume retries, startup ready timing and i18n.
Run gameplay/regressions/campaign when reward payloads or progression change.

Manual on authorized Yandex draft: successful/closed/failed rewarded ad, pause
and sound after tab changes, optional chest bonus, declined boss-respawn offer,
language/new/old saves; after activation, real/test purchase, cancellation,
pending receipt on reload, persistence outage and recovery. Historical user
verification of ads does not prove latest local build or purchases. Do not send
support messages, submit moderation or publish without user authorization.
