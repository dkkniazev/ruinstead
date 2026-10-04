# QA and release contract

## Principles and evidence

Checks are Node assertion/esbuild fixtures and TypeScript/Vite, not a Jest/Vitest
or automated browser suite. Fixtures can replace Phaser rendering, DOM or SDK;
their PASS verifies the exercised contracts, not device visuals/live services.
Run change-relevant gates below, record exact commands/failures, and retain any
intermittent failure even after a subsequent PASS. New failing cases must not be
removed or accepted by weakening assertions. [CURRENT_STATE](../CURRENT_STATE.md)
records the bootstrap results and open spawn-import failure.

## Acceptance gates

Report **AUTOMATED ACCEPTANCE** separately from **HUMAN VISUAL/FEEL ACCEPTANCE**.
Automated gates verify only their exercised invariants: finite geometry, attached
rigs, bounded effects, state transitions, damage/range alignment, localization,
build/package structure and similar measurable properties. Compilation alone is
not proof of visual or interactive correctness; a passing art assertion cannot
objectively prove attractive, polished, fun, coherent or reference-quality art.

Translate subjective goals into concrete review scenarios where practical:
same-scale ordinary/elite silhouette distinction, blade/face/stinger attachment
over attack phases, visible danger boundaries, readable paths and original-size
labels, HUD clearance and responsive controls. Agent inspection can identify and
repair specific defects and supply comparisons. Final subjective approval remains
human review: record reviewer/decision/date, or **Pending human review**. Do not
infer that approval from a green test, an agent's claim or a user's unrelated reply.
Required device/live-platform checks remain separate evidence, even after human
style approval. Completion/status must reflect any outstanding required gate.

## Verification harnesses and evidence

If existing tests or normal gameplay make a mechanic/visual system difficult to
inspect, assess whether an existing harness can cover it. Extend a reusable
isolated scenario only when it resolves a concrete verification gap; create a new
harness only when reuse is insufficient. Trivial features do not need sandbox
infrastructure. Use shared production logic/model/UI constructors so a preview
does not silently become a second implementation.

| Existing tool | Inspectable scope / limits |
| --- | --- |
| `creature-preview.html` / `src/game/qa/CreaturePreview.ts` | Catalog and portraits; automatic framing is not a same-scale elite comparison |
| `motion-preview.html` / `src/game/qa/CreatureMotionPreview.ts` | Creature/boss phases, scrubbing, rotation, same-scale ordinary/elite pair and regional species/hero lineup; face close-up follows an available animated head anchor; selectable hero weapons/outfits use the production model and bounded timed sampling, without gameplay/save callbacks; individual portraits still auto-frame |
| `world-preview.html` / `src/game/qa/WorldPreview.ts` | Landforms/resources/scenery; final camera/combat integration still needs game review |
| `ui-preview.html` / `src/game/qa/UIPreview.ts` | Deterministic large inventory/panel states and mock prices, no saves/real SDK |
| `qa-viewports.html` / `src/game/qa/ViewportPreview.ts` | Rendered iframe sizes/scenarios; does not reproduce physical browser chrome/touch/GPU |
| `/?playtest=polish` / `src/game/qa/PolishPlaytest.ts` | Isolated in-memory new/preparation/economy/media states, settlement-legacy inside-building load, regions/bosses/resources and base-solid movement diagnostics; species and ordinary/elite selection visits existing live units without spawning replacements or changing their stats; random spawns are not fully deterministic |
| `media-capture.html` | Actual gameplay capture/recording from the isolated media state; fixture overrides must be disclosed |
| `release-assets-preview.html` / `src/game/qa/ReleaseAssets.ts` | Separate promotional asset renders; these are not gameplay proof |
| Node sanity scripts | Seeded pack, save/provider, timing, interaction, rig and other fixtures; consult exact command coverage below |

Tooling must stay isolated from production behavior: DEV entry/flag guards,
non-saving fixture stores, explicit mocks/overrides and no mutation of a real
user save or cloud data. Existing preview HTML files are not normal Vite build
entries; playtest/provider/debug activation is guarded by DEV at its runtime
entry. Future tooling must verify that production cannot activate it through
query parameters and that packaging excludes test entries/fixture assets unless
an intended production diagnostic is explicitly specified. This is a required
review, not a claim that every future artifact is already exclusion-tested.

For visually or interactively correct work, produce inspectable evidence when
practical: screenshots/short recordings, reproducible preview states, debug
output or meaningful assertions. Record revision/candidate, scenario/seed/save,
camera/attack phase, language, viewport/input/browser/device, relevant overrides,
expected/observed result and failed cases. Link evidence from the execution plan
or task report, not duplicated in every spec. Large captures can live in ignored
`yandex-output/`; record reproducible state and source context in the plan so an
ephemeral local image is not the sole specification or acceptance record.
Do not label a protection-enabled preview, mock SDK or viewport iframe as normal
combat, live monetization or physical-device verification.

## Package command inventory

Run from repository root with Node ≥20.19 and installed lockfile dependencies.

| Exact command | Actual coverage / effect | Limit |
| --- | --- | --- |
| `npm run dev` | Vite DEV server and QA pages | Mocks possible; not release QA |
| `npm run typecheck` | Strict TypeScript src | No runtime/device behavior |
| `npm run check:docs` | Canonical documentation structure, links, paths, npm commands, package/direct-script inventory | Not a semantic proof of prose/code agreement; historical reports excluded |
| `npm run check:i18n` | Collect source strings, English coverage/template/prompt assertions | Writes source catalog; no linguistic/device QA |
| `npm run balance` | Cost/formula diagnostics, late-region damage scenarios | Not whole-campaign difficulty/retention; current DPS focus regions 5/6 |
| `npm run check:world` | Polygons/passages/unlocks/migrations; terrain roads, water beds, warnings, bridge foot heights, shared cliff skirts and liquid-bank rays without exposed underlay | No full human route/device rendering |
| `npm run check:gameplay` | Damage/regen/potions, rare costs, boss danger geometry; real Phaser clock at simulated 15/20/30/60/120 FPS/start-refocus | Not actual hardware performance |
| `npm run check:polish` | 24 fixed-seed pack layouts/body separation; seven viewports × three DPR calculations | Does not cover every random layout, screenshot aesthetics or physical touch |
| `npm run check:regressions` | HP skin toggle, weightless coins/death, upgrade caps, copy reroll/trading; loadout/orbital impact, resolver, navigation/wind-up/skins | Fixture paths, not complete playthrough |
| `npm run check:art` | Catalog/models, geography, rig/weapon/face transforms, baked authoring hash/budget, closed surfaces/wings, actual eye-bearing skin triangles/apertures and insect/wisp/flame/mammal-boss whole-model face visibility, weights/material/skeleton disposal, hero armor/support soles/clock sampling, elite aura/silhouette components | No art-parity judgment or GPU benchmark; no independent eye meshes is not by itself an attachment test |
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

The docs gate permits a graph containing only completed plans when no planned
work remains; its self-test covers this lifecycle. It still rejects missing
required documents, broken references, unknown commands and invalid feature status.
Passing this gate alone does not establish that prose matches implementation.

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
