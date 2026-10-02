# Gameplay, combat and interactions

## Player and weapons

`src/game/player/PlayerController.ts` and `src/game/player/DashConfig.ts` own
movement/dash. Autoattack chooses the nearest eligible enemy/boss, with no
priority for an enemy already hitting the player. Range is measured between
combat body boundaries, not model centers or visible weapon tips.

| Weapon | Base damage | Range | Cooldown ms |
| --- | ---: | ---: | ---: |
| axe | 42 | 82 | 650 |
| sword | 32 | 88 | 430 |
| hammer | 58 | 80 | 900 |
| spear | 36 | 116 | 620 |
| daggers | 19 | 70 | 240 |

Values: `src/game/combat/WeaponDefinitions.ts`. Modified damage:
`src/game/combat/CombatMath.ts`, including level/rarity/stars/skin/profile and
minimum one damage. HUD uses the same rules. Secondary weapons independently
cool down, orbit → attack → impact → return (`src/game/combat/OrbitalAttack.ts`),
with 0.65 damage scale, acquisition relative to hero and damage at visible impact.
Dead/removed/ineligible targets cancel impact.

Safe-zone primary autoattack is suppressed; orbitals are updated before that
branch, so this is not a global attack lock. Healing is maxHP × delta/5000, giving
full health within five uninterrupted seconds for a living hero. Outside safety,
unthreatened regeneration waits five seconds since attack/hit/threat and ticks
3 HP per 500 ms. Potions heal 35%, cap at three, cooldown eight seconds; return
and level-up refill them. Health-cap changes preserve health ratio. Dash distance
210/speed 1400 is bounded by actual movement with stalled-motion termination;
cooldown upgrades cannot shorten distance. CombatSystem applies a 360 ms protection
window after a hit; dash itself adds no damagePlayer immunity. Explicit rewarded
revival has its own temporary protection. Gathering/chest interaction grants none.

## AI and boss attacks

`src/game/enemies/EnemySystem.ts` owns spawns/AI; `src/game/enemies/PackFormation.ts`,
`src/game/enemies/AttackWindup.ts`, `src/game/world/ObstacleNavigation.ts` supply
formation/anticipation/navigation. Three packs of 3–8 and three elites per species
are intentional. Group-scoped aggro uses archetype/speed/elite/group awareness,
with obstacle-aware roaming/chase/leash/return. Attack range is checked again
after wind-up, allowing kiting. Distant inactive actors sleep beyond 1800;
optimization must preserve active pursuit and combat outcomes.

`src/game/bosses/BossSystem.ts` owns 24 bosses. Shared danger geometry in
`src/game/combat/StageCombatProfile.ts` uses circles and finite forward rectangles
for hit tests/warnings. No infinite strike past the displayed rectangle;
player collider margin matters. Verify moving escapes in gameplay. Skipped
boss-respawn ad prompts must not reopen every update inside the spawn zone.
Random spawn allocation can exhaust attempts during import; see the
[Draft reliability feature](features/SPAWN_RELIABILITY.md).

## Interaction contract

ResourceSystem updates independently of threatened state. All resource types,
pickups and chests work during aggro; mobs keep chasing/attacking. Interaction
does not reset aggro or grant invulnerability. Death/scene inactivity and an
intentional panel pause remain separate constraints.

`src/game/world/WorldInteractions.ts`: choose available in-range candidates,
nearest first; within 14 units explicit priority can break a near tie, followed
by distance/ID ordering. Current priorities: chest 30, bridge 20, forge 10.
Show one prompt. E/click re-resolves availability/range, not a stale prompt.
An out-of-range forge cannot intercept a chest.

`src/game/world/ChestSystem.ts`: 16 chests, two per region, range 82. Approach
shows “Открыть сундук · E”; no automatic opening/ad. Explicit open checks
capacity and opened IDs, grants base loot, persists once, then may show a separate
nonmodal rewarded bonus. Skip/failure keeps base loot. Repeated E cannot replay it.

Death drops backpack loot including coins, respawns home and clears pursuit;
bank survives. Explicit home teleport closes its panel and clears pursuit.
These reset actions do not alter normal gathering/opening semantics.

## State and validation

Boss progression/cooldowns, opened IDs, inventory/backpack and quest effects
persist. Enemy HP/aggro, hero HP, node durability and loose drops are transient;
see [PERSISTENCE](PERSISTENCE.md).

Run `npm run check:gameplay`, `npm run check:regressions`, `npm run check:polish`,
`npm run check:world` as affected, plus build/typecheck for runtime edits.
Manual: aggro a pack, harvest each type/pick up loot/open chest while taking damage;
decline and complete bonus; test chest/forge/bridge priority, dash and boss escapes.
