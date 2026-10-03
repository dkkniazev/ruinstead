# Current state · 2026-10-02

## Scope and release phase

Baseline below was inspected at HEAD `35f546e` with pre-existing local visual
changes during SDD bootstrap. Later local deltas are recorded separately below;
this is not a snapshot of only main, the nested gitlink or the live draft.
Sources: [investigation](SDD_INVESTIGATION.md), [project contract](specs/PROJECT_SPEC.md),
code/scripts/config and dated reports. Bootstrap changed documentation/validation
only; subsequent visual work does change rendering.

[RELEASE_READINESS](RELEASE_READINESS.md) records draft 619868 and later archive
13658626 on October 2. Earlier 13645716/“not uploaded” entries are chronological.
Live draft contents/moderation/publication today: **Unverified** (console not
inspected in bootstrap). Latest local creature/terrain changes are not established
as uploaded. User previously checked rewarded ads and touch controls; that is
historical evidence, not new live QA of this working tree. IAP activation is pending/
Unverified according to existing support/setup records.

## Implemented and partial systems

| Area | Status | Evidence / caveat |
| --- | --- | --- |
| Phaser gameplay + Three.js world + DOM HUD | Implemented | `src/main.ts`, `src/scenes/WorldScene.ts`, `src/game/render3d/WorldPresentation3D.ts`; compatibility view retained |
| Eight polygons, 12 passages, 40 species/24 bosses | Implemented | `src/game/world/ReleaseRegionMap.ts`, `ReleaseWorldContent.ts`, `src/game/bosses/BossSystem.ts`, world gate |
| Three packs and three elites per species | Implemented with correctness risk | `src/game/enemies/EnemySystem.ts`; intermittent initialization allocation failure below |
| Wind-up/roam/chase, primary/orbital melee, dash | Implemented | `src/game/combat`, `src/game/enemies`, gameplay/regression/time fixtures |
| Gather/pickups/chests during aggro; one E resolver | Implemented | `src/game/world/WorldInteractions.ts`, `ChestSystem.ts`, `src/game/gathering/ResourceSystem.ts`; manual attack-during-interaction still required |
| Hero1–50, upgrade20, weapon10/5 stars/cap32 | Implemented | `src/game/progression`, regression/campaign fixtures |
| 23 main quests + independent preparation tasks | Implemented | `src/game/quests/QuestDirector.ts`, campaign gate; full human campaign Unverified |
| Forge restoration, four buildings/production/sales | Implemented | `src/game/settlement`, `src/game/economy/ResourceTrading.ts`; total offline policy unresolved |
| Bestiary, skins/mastery/chests/pass/pets/themes | Implemented workflows; visual acceptance partial | `src/game/bestiary`, `src/game/cosmetics`, premium/persistence fixtures |
| Schema29 local/cloud migration and receipt ledger | Implemented | `src/game/state/GameStateStore.ts`, `src/platform/yandex/YandexCloudSave.ts`; real multi-device QA separate |
| Yandex lifecycle/rewarded/providers/client IAP | Implemented client; activation/live IAP Unverified | `src/platform`, release fixtures, [IAP records](IAP_CATALOG.md) |
| RU/EN, keyboard/touch, responsive HUD | Implemented; latest device acceptance partial | `src/i18n`, `src/game/input`, `src/game/ui`; prior phone UI concerns |
| Sculpt surfaces/elite aura/watercourse art | Local partial acceptance | `src/game/render3d`, baked assets; art gate proves geometry, not reference parity |
| Sound and analytics | Procedural audio implemented; analytics sink absent | `src/game/audio/GameAudio.ts`, `src/game/analytics/Analytics.ts` emits DOM events only |
| Infirmary/gate upgrades, TV controls, player spells/ragdoll | Reserved or absent | GameState fields/SDK type are not workflows; do not mark complete |
| Old MVP plans/active GLB claims | Historical/superseded | [drift register](DOCUMENTATION_DRIFT.md); assets retained for compatibility |

## Confirmed correctness issue and release conditions

**Open startup risk:** first `npm run check:release` failed while importing the
real WorldScene with `Error: No clear formation for magma-hound group 1` from
buildEnemySpawns. EnemySystem uses Math.random and initializes ALL_SPAWNS during
import. A second identical invocation passed. Failing seed/frequency and browser
reproduction: **Unverified**. The retry does not close this finding; the 24 fixed
polish seeds passing is insufficient. See [NEXT_MILESTONE](exec-plans/active/NEXT_MILESTONE.md).

Full current-candidate device/playthrough/live-platform acceptance is incomplete.
This is a validation gap, not proof of a new gameplay defect. IAP activation/
fulfillment is a blocker **if** the release includes purchases. Ad verification
by the user is recorded, but no activation is inferred from it. No current legal
or platform compliance verdict is made by repository inspection.

## Debt and unresolved evidence

- Large WorldScene/GameUI coordinators; client-only trusted state/time and unsigned
  payment SDK, no backend transaction/receipt verification (architecture/platform specs).
- Production clamps elapsed time to two hours per call, but lastTickAt catches
  up successive older cycles. Intended total offline limit: **Unverified**.
- CI runs a subset; release:pack also does not include all gameplay/campaign gates.
- Forge range enforcement currently belongs to UI opening/upgrade, not a repeated
  scene handler check. Primary safe-zone attack suppression does not gate the
  earlier orbital update. These are documented implementation boundaries, not new fixes.
- Optional visual report generator contains old GLB assertions; new art gate is canonical.
- Nested `ruinstead` is a separate gitlink; purpose **Unverified**, root build ignores it.
- User confirmed Hero Path RPG and XP Hero as the two primary gameplay references
  on 2026-10-02; the other games are outside current scope. Full art parity remains open.

## Bootstrap validation evidence

| Command | Result this task |
| --- | --- |
| `npm run balance` | PASS; diagnostics, not full balance acceptance |
| `npm run check:world` | PASS polygons/terrain/path fixtures |
| `npm run check:gameplay` | PASS gameplay + simulated Phaser timing |
| `npm run check:polish` | PASS 24 layouts / 2880 packs / 15763 ordinary bodies; viewport calculations |
| `npm run check:regressions` | PASS inventory/health/economy/interaction/navigation contracts |
| `npm run check:art` | PASS catalog/rig/sculpt/aura; current model max 10807 triangles |
| `npm run check:campaign` | PASS 23 gates/optional independence/reward contracts |
| `npm run check:release` | First FAIL spawn import; second PASS fixtures + 973 collected strings |
| Docs, typecheck, build | PASS, including docs negative fixtures; build has large-chunk warning. Evidence in [completed plan](exec-plans/completed/SDD_BOOTSTRAP.md) |

No new ZIP, upload, commit or console mutation in bootstrap. No browser/phone/
live ad/payment test was performed here. Runtime hash comparison and documentation
gate evidence are recorded in the completed plan. Required manual scenarios live
in [QA_RELEASE](specs/QA_RELEASE.md); priorities in [ROADMAP](ROADMAP.md).

## Local visual delta after SDD audit · 2026-10-02

At HEAD `bf8f222` plus local changes, living trees now use connected clustered
canopies, shared curved/tapered bark and root flares; sparse-tree branches use
the same bark forms. Brook banks use denser cross-sections, terrain normals and
feathered wet-soil/moss transitions, with grouped small shore details and local
flow direction. Gameplay geography/colliders/population, saves and label size
are unchanged. No creature bake or console upload was needed/performed.

Actual no-save browser review covered harvest trees in regions 1–8, both brooks
and bridge approaches, plus the close harvest preview. This is scoped visual
progress, not reference parity or release approval. Phone/weak-PC acceptance
remains Unverified; the browser viewport override timed out during attempted
844×390 review. Existing startup-risk and platform conditions above remain open.
Per-pass checks, intermediate failures and remaining art gaps are recorded in
[the scenery plan](exec-plans/completed/FOREST_SCENERY_POLISH.md).

## Local gameplay art continuation · 2026-10-02

Low understory beds, a connected acacia canopy, worn dirt routes and continuous
stone/timber house bases now supplement the preceding tree/brook pass. Canine,
feline and goat anatomy, veteran fur, beetle shells, fungus caps, worm/serpent
skins and bird plumage are refined; selected bosses have distinct mass profiles.
The creature bake at that pass had 354 shared surfaces / 120,874 triangles / 1902 KiB;
the maximum complete model is 11,203 triangles. Contact accents/footfall dust
use fixed GPU pools, and boss warnings have stronger contrast inside their
unchanged danger geometry. Resource labels resolve overlap while keeping their
original size, sharp DPR-aware text and active harvest priority.

Browser review covered all eight regions, all ordinary/elite and boss gallery
designs, representative motion/contact attachments, harvesting, a lava-golem
fight, bridges/landmarks and a rendered 844×390 touch-layout iframe. Reference
review used actual gameplay media from the official Hero Path RPG and XP Hero
store pages; neither native app was played. These results do not establish full
reference parity, all boss fights, real phone rendering or weak-PC performance.
The viewport-override failure was worked around with the existing iframe harness;
physical-device acceptance remains Unverified. Scope/results/intermediate art
failures and remaining work: [active visual plan](exec-plans/active/VISUAL_FINISH.md).
No upload, commit or gameplay/population/save changes in this continuation.

## Creature style, scale and solid base · 2026-10-03

The user's latest direction explicitly selects the generated low-poly cover
goblin as the creature style reference. Hero Path RPG/XP Hero remain world and
gameplay comparators. Coherent sculpted faces, fitted clothing, rounded/chamfered
family surfaces and explicit species size profiles now cover the 64 creature
identities. Goblin is compact; boar is heavier/longer, stone bodies taller and
slimes/insects lower. Combat radii, damage/rewards and populations are unchanged.
Current bake: 390 shared surfaces / 183,370 shared triangles / 2876 KiB; maximum
whole model 12,631 triangles (limit 13,000). Elite anatomy/equipment/aura remains.

Four buildings, forge and well now have shared ground footprints used by
collision/navigation/placement. Starter wood moved clear of the workshop with
unchanged identity/yield; well has a closed stone interior and opaque water.
Old positions inside newly solid masonry move locally to clear ground using the
synchronized Phaser body centre; valid positions and save schema remain intact.

Actual no-save browser checks stopped walking at all six solids, opened forge
by E outside it, recovered a legacy position from the workshop and checked the
tree/well through the game camera. Common-scale lineups in all eight regions
and representative ordinary/elite motion were inspected. Affected automated
gates pass; results and failures are in [the focused plan](exec-plans/active/CREATURE_STYLE_AND_BASE_FIXES.md).
Human approval of creature style, full reference parity and latest physical
phone/weak-PC QA remain open. The known intermittent startup risk above is not
closed by a subsequent passing release check. No upload/commit/publication.
