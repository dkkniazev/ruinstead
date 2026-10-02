# Ruinstead · project specification

## Status and identity

Implemented baseline, reconstructed 2026-10-02 from the working tree
(HEAD `35f546e` plus local changes). Implemented does not mean device acceptance
or publication. See [CURRENT_STATE](../CURRENT_STATE.md).

Single-player browser action RPG for Yandex Games: exploration, automatic
combat/gathering, banking loot, hero/equipment/settlement upgrades and boss gates.
Runtime: TypeScript/Vite, Phaser, Three.js and DOM UI.

## Product pillars

- Readable combat: visible wind-ups, finite danger areas, movement/dash escape.
- Persistent progression through eight distinct connected regions and a recoverable base.
- Rewarded actions are explicit choices; missing/failed SDK never fakes a reward.
- Desktop and touch share rules; authorization is not required for local play.
- Art is judged against the user's game references, including Hero Path RPG and
  XP Hero. The generated cover is supplementary direction, not the primary reference.

## Platforms and core loops

Desktop keyboard and mobile touch are implemented; landscape is the declared
orientation. Prior user QA reports responsive Xiaomi 14 Ultra/Yandex Browser
controls with UI/label concerns. Acceptance of the latest local art on devices
is Unverified. TV is detected by SDK but has no control implementation and is
not a release target. WebGL2 selects 3D; Phaser compatibility rendering is retained.
Russian and English are implemented, selected by SDK on-platform.

1. Explore, autoattack ordinary/elite enemies and bosses, gather resource nodes.
2. Explicitly open a nearby chest through the single E prompt; optionally request
   its rewarded bonus afterwards. Gathering/opening never cancels aggro itself.
3. Return to bank loot, refill potions and heal; upgrade hero/weapons/settlement,
   repair the forge, fuse weapons and collect production.
4. Follow key quests and boss gates; optional preparation tasks reward training.
5. Claim bestiary/mastery/skin rewards, manage loadout and use optional shop/ads.

## Stable invariants

- Rendering does not change authoritative hit ranges, walkability or rewards.
- Aggro is not an interaction lock; no gathering/chest immunity or aggro reset.
- E resolves a nearby available object, never a distant forge or automatic ad.
  Opened chest IDs prevent repeat base rewards.
- Bank and backpack differ; weightless coins remain loot dropped on death.
- Authored gates govern access; art changes cannot create progression shortcuts.
- Health-cap changes preserve health ratio; skin toggling cannot heal.
- Copy cap, fusion equivalence and reward idempotence survive normalization.
- Durably record purchases before consume; duplicate callbacks cannot mint rewards.
- Preserve save migrations, local fallback, stable content IDs and RU/EN boundaries.
- Population is intentional: three packs and three elites per ordinary species.
  Visual/weak-PC work must not reduce it without an explicit product decision.

## Major systems and source-of-truth map

| Domain | Owning contract | Implementation |
| --- | --- | --- |
| Structure/state/render ownership | [ARCHITECTURE](ARCHITECTURE.md) | `src/main.ts`, `src/scenes/WorldScene.ts` |
| Combat/AI/interaction | [GAMEPLAY_COMBAT](GAMEPLAY_COMBAT.md) | `src/game/combat/CombatSystem.ts`, `src/game/world/WorldInteractions.ts` |
| Regions/content/presentation | [WORLD_CONTENT](WORLD_CONTENT.md) | `src/game/world/ReleaseRegionMap.ts`, `src/game/render3d/CreatureCatalog.ts` |
| Hero/weapons/base/quests | [PROGRESSION](PROGRESSION.md) | `src/game/progression/WeaponInventory.ts`, `src/game/quests/QuestDirector.ts` |
| Resources/production/tuning | [ECONOMY_BALANCE](ECONOMY_BALANCE.md) | `src/game/settlement/CityBuilderSystem.ts` |
| Saves/migrations/cloud | [PERSISTENCE](PERSISTENCE.md) | `src/game/state/GameStateStore.ts` |
| SDK/ads/purchases | [PLATFORM_MONETIZATION](PLATFORM_MONETIZATION.md) | `src/platform` |
| UI/input/languages | [UI_UX_LOCALIZATION](UI_UX_LOCALIZATION.md) | `src/game/ui/GameUI.ts`, `src/i18n` |
| Validation/release | [QA_RELEASE](QA_RELEASE.md) | `scripts`, `.github/workflows/ci.yml` |

Active accepted feature: [visual polish](features/WORLD_VISUAL_POLISH.md).
[Spawn reliability](features/SPAWN_RELIABILITY.md) is Draft, not implemented.
[AGENTS](../../AGENTS.md) owns workflow, [FEATURE_TEMPLATE](FEATURE_TEMPLATE.md)
owns new-feature format, [ROADMAP](../ROADMAP.md) priorities; execution plans own HOW.
Historical reports are dated evidence, not current overrides.

## Implementation status and limits

Core loops, eight regions, 40 species/24 bosses, inventory/quests/production,
local/cloud saves, RU/EN, ads and client IAP handling are implemented. Art polish
and device/live-platform acceptance are partial. `infirmary`/`gate` save fields
are reserved, not independent upgrade workflows. Earlier MVP plans are historical.
No player spell system or full ragdoll/cloth simulation exists; motion is procedural.

Confirmed limitation: pack generation can throw during module initialization;
see [next milestone](../exec-plans/active/NEXT_MILESTONE.md). Payments activation
and live fulfillment are Unverified; DOM analytics has no collector. Fixtures do
not establish a full fresh-save playthrough or art parity. Two further reference
game names remain Unverified.

## Explicit non-goals

Approved visual work adds no spells, rebalance, population reduction, save reset
or static-art replacement of gameplay. SDD bootstrap changes documentation and
validation only; no roadmap implementation or publishing. Multiplayer/server
economy/TV are absent; their future priority is unresolved, not decided here.
