# Current state · 2026-10-02 SDD bootstrap

## Scope and release phase

Snapshot of root working tree at HEAD `35f546e` with pre-existing local visual
changes. It is not a snapshot of only main, the nested gitlink or the live draft.
Sources: [investigation](SDD_INVESTIGATION.md), [project contract](specs/PROJECT_SPEC.md),
code/scripts/config and dated reports. SDD changes documentation/validation only.

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
- Full list of four reference games is incomplete: Hero Path RPG/XP Hero known,
  other two **Unverified**. Full art parity has not been accepted.

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
