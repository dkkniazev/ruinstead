# QA and release contract

## Principles and evidence

Checks are Node assertion/esbuild fixtures and TypeScript/Vite, not a Jest/Vitest
or automated browser suite. Fixtures can replace Phaser rendering, DOM or SDK;
their PASS verifies the exercised contracts, not device visuals/live services.
Run change-relevant gates below, record exact commands/failures, and retain any
intermittent failure even after a subsequent PASS. New failing cases must not be
removed or accepted by weakening assertions. [CURRENT_STATE](../CURRENT_STATE.md)
records the bootstrap results and open spawn-import failure.

## Package command inventory

Run from repository root with Node ≥20.19 and installed lockfile dependencies.

| Exact command | Actual coverage / effect | Limit |
| --- | --- | --- |
| `npm run dev` | Vite DEV server and QA pages | Mocks possible; not release QA |
| `npm run typecheck` | Strict TypeScript src | No runtime/device behavior |
| `npm run check:docs` | Canonical documentation structure, links, paths, npm commands, package/direct-script inventory | Not a semantic proof of prose/code agreement; historical reports excluded |
| `npm run check:i18n` | Collect source strings, English coverage/template/prompt assertions | Writes source catalog; no linguistic/device QA |
| `npm run balance` | Cost/formula diagnostics, late-region damage scenarios | Not whole-campaign difficulty/retention; current DPS focus regions 5/6 |
| `npm run check:world` | Polygons/passages/unlocks/migrations; terrain roads, water beds, warnings and bridge foot heights | No full human route/device rendering |
| `npm run check:gameplay` | Damage/regen/potions, rare costs, boss danger geometry; real Phaser clock at simulated 15/20/30/60/120 FPS/start-refocus | Not actual hardware performance |
| `npm run check:polish` | 24 fixed-seed pack layouts/body separation; seven viewports × three DPR calculations | Does not cover every random layout, screenshot aesthetics or physical touch |
| `npm run check:regressions` | HP skin toggle, weightless coins/death, upgrade caps, copy reroll/trading; loadout/orbital impact, resolver, navigation/wind-up/skins | Fixture paths, not complete playthrough |
| `npm run check:art` | Catalog/models, geography, rig/weapon/face transforms, baked authoring hash/budget, elite aura/silhouette components | No art-parity judgment or GPU benchmark |
| `npm run art:bake-creatures` | Generates baked sculpt surfaces/manifests | Mutation, not validation; review assets and follow with art gate |
| `npm run check:release` | Production provider/SDK callback/lifecycle fixtures, cloud resolution/order, purchase save-before-consume/idempotence, startup ready, i18n | Live SDK/account/activation not tested; imports real random spawn builder |
| `npm run check:campaign` | 23 quest gates, optional independence, once-only rewards, mandatory acquisition/cost paths | Not physical combat skill, movement or complete browser campaign |
| `npm run build` | Typecheck and Vite production dist | No platform/device/playthrough acceptance; may warn about large JS chunk |
| `npm run preview` | Serves built dist | SDK availability differs from authorized Yandex draft |
| `npm run release:pack` | Release fixture gate + build + ZIP/manifest | Does not run all game/art/campaign gates or upload anything |

## Direct scripts

The package composition is explicit, so individual failures can be reproduced:

| Family | Direct commands |
| --- | --- |
| Docs | `node scripts/docs-sanity.mjs`; `node scripts/docs-sanity.mjs --self-test` (in-memory broken-link/path/command/structure fixtures, then repo check) |
| Economy | `node scripts/balance-sanity.mjs` |
| World | `node scripts/world-sanity.mjs`; `node scripts/terrain-path-sanity.mjs` |
| Gameplay/time | `node scripts/gameplay-sanity.mjs`; `node scripts/timing-sanity.mjs` |
| Layout/packs | `node scripts/polish-sanity.mjs` |
| Regression | `node scripts/regression-sanity.mjs`; `node scripts/gameplay-world-sanity.mjs` |
| Art | `node scripts/art-sanity.mjs`; `node scripts/geography-art-sanity.mjs`; `node scripts/creature-rig-sanity.mjs`; `node scripts/creature-sculpt-sanity.mjs` |
| Platform/persistence/startup | `node scripts/platform-release-sanity.mjs`; `node scripts/purchase-persistence-sanity.mjs`; `node scripts/startup-sanity.mjs` |
| Campaign | `node scripts/campaign-sanity.mjs` |
| I18n | `node scripts/i18n-sanity.mjs` |

Other tools are deliberately distinguished from required sanity gates:

- `node scripts/collect-i18n.mjs`: source catalog generator, writes
  `src/i18n/source-strings.json`; normal i18n gate already invokes it.
- `node scripts/creature-sculpt-bake.mjs`: same mutation as art bake; authoring
  changes require regenerated data and the hash gate, not repeated unnecessary bakes.
- `node scripts/visual-sanity.mjs`: optional legacy catalog/geometry check;
  output/report contains old three-GLB claims. `--report` overwrites the historical
  VISUAL_AUDIT and is not an authoritative SDD report. Prefer current check:art.
- `node scripts/render-iap-icons.mjs`: generates SVG/256px PNG console icons in
  yandex-output/iap-icons. Requires sharp, not a root dependency; optional first
  positional argument is an absolute sharp module path from workspace dependencies.
  It is not a purchase integration test.
- `node scripts/package-release.mjs`: packages existing dist only. Requires
  tar.exe on Windows or bsdtar on other hosts, writes candidate ZIP/JSON.
  Rejects symlinks, whitespace/Cyrillic filenames, wrapper/no root index, invalid
  listing and uncompressed size above 100 MB. Manifest records SHA256/files/
  declared RU/EN/landscape. It cannot establish SDK approval or legal asset provenance.

## Gates by change type

Every substantive task: `npm run check:docs`; runtime code: `npm run typecheck`
and `npm run build`. Add the relevant rows, not every script for a one-line doc edit.

| Change | Additional required gates / review |
| --- | --- |
| Combat, AI, dash, interaction | check:gameplay, check:regressions; check:polish for spawns, check:world for movement; manual moving/aggro scenarios |
| World/layout/gates | check:world, check:polish, check:regressions, check:campaign for access; check:art for terrain/geometry |
| Progression/economy/quests | balance, check:gameplay, check:regressions, check:campaign; check:release if saved/rewarded/premium state changes |
| Save/migration/purchase grant | check:release, check:regressions, affected campaign/economy; old/new/corrupt/offline/reload manual paths |
| SDK/ads/purchases/lifecycle | check:release, check:i18n for visible messages; authorized draft with cancellation/retry/focus/audio |
| UI/input/languages | check:polish, check:regressions, check:i18n; actual desktop/touch tap/viewport/label review |
| Art/motion/assets | art:bake-creatures when sculpt authoring changed, check:art; check:world/polish if terrain/layout changed; gameplay camera + motion/device review |
| Documentation/tooling only | check:docs; --self-test when docs validator changes; no fabricated manual gameplay claim |

## Full release candidate

Run check:docs, balance, check:world, check:gameplay, check:polish,
check:regressions, check:art, check:campaign and check:release, then build/package.
Do not treat release:pack as shorthand for the full list. Inspect generated diff
(i18n/bake), dist contents and candidate manifest; do not package DEV playtest URLs
as proof of a normal fresh-save launch. Fix/record failures; no silent retry-to-green.
Only upload the identified candidate when authorized; replacing a draft does not
authorize moderation/publication. Live state is verified in console, not inferred
from local files. External requirements must be rechecked for the actual release.

CI in `.github/workflows/ci.yml`: npm ci, docs, balance/world/gameplay/polish/
regressions/art and build on Node20/Linux. It does **not** currently run
check:release, check:campaign or independent i18n. CI green is not full release green.

## Mandatory manual scenarios when affected

1. Fresh normal URL/new save: loader, usable controls, startup ready, first quest;
   old save retains progress. Use isolated QA saves, not an unauthorized reset.
2. Desktop/touch landscape: mini-map/menu separation, health/potion visibility,
   one tap per action, long forge list/actions, all panels and RU/EN labels.
3. Aggro without killing pack: wood/stone/metal/crystal/fiber, pickup and E chest;
   base loot once, no automatic ad, optional bonus, pursuit/damage continue;
   near forge/chest priority and distant forge rejection.
4. Movement: base surroundings on weak PC, dash/full bag, all passages and boss
   arena clearances; ordinary/elite wind-up kiting and finite boss strike escape.
5. Economy: coins-only deposit/death, full bag, cap32/five-star reroll/fallback,
   fusion/upgrades, sales, production offline catch-up, independent preparation quests.
6. Saves/rewards: repeated claims/reload, health skin toggle, cloud offline/login/
   conflict, interrupted purchase persistence and recovery, no duplicate grant.
7. Authorized Yandex build: ad success/skip/error, dismiss respawn offer, visibility/
   platform pause/audio, correct language. Activated IAP: buy/cancel/pending receipt.
8. Art in gameplay: ordinary/elite pairs, all bosses/regions, idle/move/attack/
   recovery attachments, terrain/label/collision agreement and actual device frame behavior.

Record build/hash, browser/device, save scenario, results and remaining Unverified
items. No numerical FPS/retention/revenue target is invented by this spec.
