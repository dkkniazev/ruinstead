# Persistence, migration and cloud synchronization

## Durable model and keys

`src/game/state/GameState.ts` defines schema **29**. The local key remains
`ruinstead.save.v1`, with `.meta`; key suffix is not schema version.
`src/game/state/SaveKeys.ts` owns local keys. Cloud keys are `ruinsteadSave` and
`ruinsteadSaveMeta` in `src/platform/yandex/YandexCloudSave.ts`.

Persist hero levels/upgrades and equipment, bank/backpack, consumables,
settlement repair/levels/production/tick time, world access/boss cooldowns/
landmarks/unique rewards/opened chests/position, XP/mastery/milestone claims,
premium currencies/skins/chests/pity/daily/pass/pack/theme/pet state, monetization
timers/receipt tokens, quests, bestiary, sound and onboarding. Durable writes are
explicit snapshots from WorldScene, not a continuous save of all simulation.

Not persisted: current HP/death/invulnerability, enemy HP/AI/aggro, resource-node
HP/timers or loose pickups/death piles. Saving position/backpack does not make
those ground drops recoverable across reload. IDs must remain stable even when
display names/models/localization change.

## Local load/save and migrations

`src/game/state/GameStateStore.ts` reads JSON, sanitizes finite bounded values,
known IDs, levels/loadout/cost-related state and supplies defaults for missing
data. Invalid/unreadable local data falls back to a new default with diagnostics;
do not claim recovery of corrupt contents. Ordinary save failure warns and can
continue toward cloud; `requireLocal: true` throws so a purchase cannot consume
without local durable acknowledgement. savedAt is a wall-clock timestamp.

Legacy compatibility includes pre-15 weapon unlock normalization, pre-23 home
position reset, pre-26/pre-27 world-position migration, and pre-28/pre-29 onboarding
normalization. Derived contiguous region access uses main-boss/bridge progress.
Preserve existing migration/default paths; future schema changes must define
old/missing/invalid input behavior, not simply bump a number or rename a key.

At WorldScene startup, a saved player position inside a solid settlement building
or well is moved locally to clear ground. Use the actual Phaser body centre and
clearance, not an assumed sprite offset. Valid clear positions are preserved;
inventory, progression, schema and identity keys are unchanged. This is a world
placement correction, not a save reset or a migration to a different map.

## Cloud resolution and ordering

Yandex identity/data is resolved before world startup when available. Newer
metadata savedAt chooses local or cloud; equal timestamps yield no replacement.
This is whole-state selection, not a field-wise merge. Failed cloud reads do
not authorize overwriting unknown cloud data; the cloud writer stays unbound
until successful resolution. Local progress remains playable without login.

Writes capture a deep snapshot before async waiting and serialize through a
promise chain. Failed writes do not poison subsequent attempts. Ordinary saves
debounce at five seconds; hide/pagehide, platform/ad transitions and explicit
purchase persistence flush. UI authorization may attach cloud later. Manual
multi-device/offline conflict behavior remains separate from fixture checks.

## Receipt/reward boundary

WorldScene's receipt handler records tokens with the applied grant and requires
local save plus production cloud persistence before consuming consumables.
Already-granted receipts retry persistence/consume without granting again.
Permanent ownership is not consumed. Persistence/consume failure leaves the
receipt retryable; a transient success notice must not substitute for durability.
See [PLATFORM_MONETIZATION](PLATFORM_MONETIZATION.md) for provider behavior.

## Risks and validation

Client time/state are trusted; payment receipts are requested unsigned through
`getPayments({signed:false})`. There is no backend receipt verification or
transactional server store. Storage quota/private mode/network failure, concurrent
tabs, equal timestamps, stale cloud and unavailable authorization need explicit
handling. Do not describe local+cloud as a distributed atomic transaction.

Run `npm run check:release` for source selection, failure/retry, captured snapshots,
receipt ordering/idempotence and startup fixtures; `npm run check:regressions`
for migration/inventory/economy contracts, plus affected campaign/gameplay gates.
Manual: old save/new save, malformed data, reload after grants/death, offline
then login, two devices, storage failure and pending purchase reconciliation.
Do not erase a user's real save to perform QA without authorization.
