# Hero, weapons, quests and settlement progression

## Hero and equipment

`src/game/progression/PlayerLevelBalance.ts` / `PlayerProgressionSystem.ts` define
levels 1–50 and XP/mastery rewards. `src/game/progression/UpgradeBalance.ts`
defines 20 hero upgrade levels (HP, speed, backpack, dash); weapon levels cap at
10 and stars at five. Backpack progression reaches 1000 at upgrade 20 (100 base,
400 at upgrade 10). Legacy damage-upgrade/save fields are not a current standalone
hero upgrade UI. Costs and formulas stay in these files, not copied into specs.

`src/game/progression/WeaponInventory.ts` owns rarity/star variants, loadout,
fusion and loot eligibility. Five slots unlock at hero levels 1/5/10/15/20;
closed slots are normalized away. At most one variant of a family+rarity occupies
the loadout; another rarity of the same family is allowed. Primary and secondaries
use the same inventory, with distinct attack execution.

Copy cap is 32 base-copy equivalents currently owned for family+rarity, including
consumed-by-fusion value (sum count × 2^stars), not lifetime acquisition telemetry.
A five-star same-family weapon of equal/higher rarity also retires weaker loot.
At the cap, loot rerolls uniformly among uncapped other families of the same
rarity. If all families are capped, the caller converts to crystal/fiber. Fusion
needs two equal family/rarity/star copies plus costs; variant upgrade level is
preserved. Never grant a duplicate lower-star weapon past the equivalence cap.
Hero attributes can be upgraded without a forge. Opening the forge panel and its
upgrade button require proximity in GameUI. Scene upgrade/fusion handlers check
restoration, ownership/unlock and costs, but do not recheck distance; fusion's
button has no proximity guard. Current reachable workflow is the nearby paused
forge panel. Do not mistake UI guards for scene-level range enforcement, or add
a new fusion restriction without deciding its intended contract.

## Key quests and access

`src/game/quests/QuestDirector.ts` defines 23 key quests and separately tracked
optional preparation tasks. Key milestones cover restoration, upgrade, altar,
main bosses and region entry through the final dragon. Optional forest kills,
weapon level 3, HP upgrade 2 and three returns reward preparation; they do not
gate main boss completion. Synchronization/reload cannot replay a quest reward.

`src/game/world/StageOneProgression.ts`, `StageTwoProgression.ts`,
`StageTwoGateSystem.ts`, `RegionGateSystem.ts`, `BridgeSystem.ts` govern unlocks.
First boss reward supplies root-heart; the repaired bridge requires it and
backpack materials. Later main bosses unlock the next region in sequence.
Side boss rewards/discoveries do not substitute for main gates. A save cannot
silently unlock disconnected regions; normalization derives contiguous access.

## Settlement, bestiary and cosmetics

`src/game/settlement/SettlementSystem.ts` restores the forge in three repair
stages. `src/game/settlement/CityBuilderSystem.ts` upgrades storage/sawmill/workshop/
house to level eight and owns production. Field presence for infirmary/gate in
GameState is reserved compatibility, not a complete upgrade workflow.
Resource spend sources differ (banked upgrades vs backpack bridge repair);
keep caller range/safe-zone checks and displayed costs consistent.

`src/game/bestiary/BestiarySystem.ts`: 64 identities (40 species, 24 bosses),
elite counters/visual variants in the same species entry. Reward tiers are
species 0/10/25/50/100 kills and bosses 0/1/3/5/10; claim bits persist exactly once.
HUD count/gold frame should identify claimable rewards, including discoveries.

`src/game/cosmetics/SkinEconomy.ts`, `PremiumSystem.ts`, `PremiumStoreConfig.ts`:
29 skins, fragments/chests, mastery, daily rewards, passes, themes and pets.
Skins have real stat/effect bonuses; switching max HP preserves health ratio,
including zero. Themes/pets are current premium data/workflows; their full visual
device QA is not implied by data presence. Purchase grants obey the durable
receipt contract in [PLATFORM_MONETIZATION](PLATFORM_MONETIZATION.md).

## Persistence, edges and validation

Persist levels/upgrade state, owned variants/loadout, quests and claim ledgers,
building repair/levels, discoveries/kills, premium ownership/progress. Sanitize
unknown/closed equipment and old layouts without erasing legitimate progress;
see [PERSISTENCE](PERSISTENCE.md). Full inventory, capped variants, repeated
claims, multiple rarity versions and maxed stats must not cause negative spend,
unusable slots or duplicate grants.

Run `npm run check:campaign`, `npm run check:regressions`, `npm run check:gameplay`,
`npm run balance` as affected; save/premium edits also `npm run check:release`.
Campaign fixtures verify gates/cost paths/idempotence, not human combat skill or
a full fresh-save trip to region eight. Manually test new and upgraded saves,
all claimable UI states, forge range, max-level inventory and optional-quest independence.
