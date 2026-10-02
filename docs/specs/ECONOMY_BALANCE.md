# Resources, production and balance

## Resources and custody

Six resources: wood, stone, metal, crystal, fiber, coins.
`src/game/gathering/ResourceTypes.ts`, `BackpackSystem.ts`, `ResourceSystem.ts`
own resource types, weights, capacity, pickups/nodes. Current weights are
1/1/2/1.5/0.5/0 respectively. Coins occupy zero capacity but remain backpack
loot until deposit and drop on death. A coins-only bag still triggers depositing.
Banked resources survive death. Capacity/spend/grants must stay finite and
non-negative; an overfull operation cannot silently discard its cost/reward.

Resource nodes show harvesting HP; stationary harvesting causes vulnerability,
not immunity. A fixed layout seed (`0x52a71d3`) and starter anchors keep resource
access stable across F5. Node HP/depletion timers and loose world drops are not
save fields; backpack amounts and bank are saved. Death drops are transient;
reloading is not a supported durable recovery of that ground pile.

## Acquisition and sinks

`src/game/economy/HarvestBalance.ts`, `RegionEconomy.ts` own abundance/yields;
rare nodes yield 2/3/4 at abundance bands 1–2/3–4/5. Crystal/fiber are exploration,
mob/elite/boss/quest/chest rewards, not settlement passive output. Cost tuning
must evaluate these sources against hero/weapon/skin progression rather than
assuming thousands of wood imply enough rare resources.

Costs come from progression/settlement/premium configs. Bridge repair uses the
backpack and quest item; most hero/weapon/base upgrades spend banked resources.
`src/game/economy/ResourceTrading.ts` sells stored resources: wood1, stone1,
metal3, crystal12, fiber4 coins per unit. Caller restricts the settlement action;
trade validates positive safe-integer amounts, stock and safe proceeds before
atomic debit/credit. Money itself is not a sellable resource.

## Production and clock behavior

`src/game/settlement/CityBuilderSystem.ts` produces wood/stone/metal/coins in
30-second cycles into pending storage with capacity determined by storage level.
Collection transfers pending to bank; a separately requested rewarded multiplier
does not alter ordinary collection semantics. Production/building state and
lastTickAt are saved; elapsed time is wall-clock based.

Current MAX_OFFLINE_MS clamps **each update** to two hours. lastTickAt advances
only by processed cycles, so successive updates can catch up older elapsed time.
Do not describe this as a hard total two-hour offline limit. The intended total
offline policy is Unverified; changing it needs an explicit contract/migration
review. Client clock is trusted, not a server-protected economy.

## Balance ownership and invariants

`src/game/combat/RegionBalance.ts`, `StageCombatProfile.ts`, weapon definitions,
hero/weapon upgrade balance, harvest/region economy and premium configs own
numerical rules. Update tests/specs for deliberate policy changes, not every
number copied into prose. Preserve copy-equivalence cap/reroll rarity, reward
idempotence, independent optional quests and deliberate enemy population.
Inventory cap fallbacks must show the actual substitute reward to the player.

## Validation and limits

`npm run balance` checks formula/cost diagnostics, including late-region DPS
scenarios currently focused on regions five/six; it is not a complete difficulty
study. `npm run check:gameplay` covers rare-resource/upgrade affordability cases;
`npm run check:regressions` covers cap/reroll/sales/coins; `npm run check:campaign`
covers mandatory gates. Save/purchase changes require `npm run check:release`.

Manual: fresh-save route to early boss, ordinary vs upgraded gear, rare-resource
acquisition/sinks, full backpack/coins-only deposit/death, sale at zero/full stock,
offline catch-up and reward cancellation. Do not lower mob count to compensate
for one tester's skill; weak-PC timing/performance is a separate risk.
