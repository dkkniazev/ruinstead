# Documentation drift resolved during SDD bootstrap

Evidence date 2026-10-02, root working tree. Old claims below remain visible in
[historical README](HISTORICAL_DESIGN.md) or dated reports; new specs own current
contracts. Proposed product changes are not inferred merely to match old text.

| Old/documented claim | Observed current implementation | Evidence | Resolution |
| --- | --- | --- | --- |
| README stack/render: Phaser primitives and painted placeholders; early MVP tasks still next | Phaser gameplay + Three.js 3D + DOM; eight-region full system present | `src/main.ts`, `src/game/render3d/WorldPresentation3D.ts`, `src/game/ui/GameUI.ts`, world/art gates | Archive full former README unchanged; replace onboarding README and architecture/project contract |
| README schema v24 | Schema29; local key still save.v1, migrated old worlds/onboarding | `src/game/state/GameState.ts`, `GameStateStore.ts`, `SaveKeys.ts` | PERSISTENCE distinguishes key/schema and compatibility |
| README gathering only without threat; targeting an attacking enemy first | Resource update independent of threat; primary nearest eligible target | `src/scenes/WorldScene.ts`, `src/game/combat/CombatSystem.ts`, gameplay-world gate | GAMEPLAY_COMBAT records actual rules and aggro manual scenarios |
| README bestiary eight records | 40 ordinary species +24 bosses, elite counters/variants | `src/game/bestiary/BestiarySystem.ts`, `src/game/render3d/CreatureCatalog.ts` | PROGRESSION/WORLD_CONTENT describe current identity model |
| README feature-complete monetization/analytics; only product setup remains | 15 client/console product records, external activation/live IAP Unverified; analytics DOM event only | `src/platform/purchases/YandexPurchaseProvider.ts`, `src/game/analytics/Analytics.ts`, IAP_CATALOG | CURRENT_STATE/platform spec separate client implementation from service QA |
| GAMEPLAY_WORLD_PASS “Ещё сделать”: aggro/wind-up/roam/polygons/seed/onboarding | Those systems exist and are fixture-covered; manual acceptance may still be pending | `src/game/enemies/EnemySystem.ts`, `src/game/world/WalkableWorld.ts`, ResourceSystem, GameStateStore; gameplay/polish/world gates | Prefix report as historical, do not copy its unchecked boxes to new roadmap |
| VISUAL_AUDIT three active GLBs and simple scaled/tinted elites | Current catalog uses authored surfaces; local elite anatomy/armor/aura; GLBs retained for compatibility | `src/game/render3d/CreatureCatalog.ts`, `CreatureAnatomy.ts`, `CreatureAura.ts`; check:art | Correct report status/model paragraph; warn legacy --report can recreate stale prose |
| NEXT_WORLD_ART_PASS comparisons primarily against own cover | User's main reference is four actual games, known Hero Path RPG/XP Hero | User decision preserved in top of NEXT_WORLD_ART_PASS/VISUAL_BACKLOG | Correct lower comparison bullets; approved feature preserves cover as supplementary |
| RELEASE_READINESS “archive not uploaded” / YANDEX_DRAFT_SETUP last13645716 alongside later13658626 | Different dated observations in one diary, not concurrent current state | Later release entry records13658626; no live console check in bootstrap | Add chronology/current-state banners; qualify earlier upload/translation counts as historical |
| Older reports all checks pass / release green | Bootstrap release gate initially failed on random magma-hound allocation, then passed | Actual check:release output, `EnemySystem.buildEnemySpawns` module initialization | Preserve old runs as history, record new open failure; propose reliability plan, no silent retry closure |

## Unresolved rather than silently corrected

- Total offline cap: code clamps per update, not necessarily total backlog; product
  intent needs a decision. [Economy contract](specs/ECONOMY_BALANCE.md).
- Live console/moderation/IAP state, two reference names, weak-PC reproduction,
  full fresh-save playthrough are Unverified. Do not overwrite records with guesses.
- Legacy visual-sanity report generator still emits obsolete model prose. It is
  optional historical tooling, not the owning spec or current art gate.

## Ongoing maintenance

Use [AGENTS](../AGENTS.md) priority and same-task spec maintenance. Update the owning
contract/status when behavior changes; keep dated evidence intact. The docs gate
checks structural/link/command drift, while code/prose agreement still needs review.
