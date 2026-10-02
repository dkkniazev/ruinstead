# Next milestone · spawn reliability

## Status and objective

Planned, not started in SDD bootstrap. [Feature](../../specs/features/SPAWN_RELIABILITY.md)
is Draft; correction policy is selected only after reproduction. Make normal game
initialization reliable without changing intentional pack population or clearance.

## Why next

First bootstrap release gate failed importing the real scene with “No clear
formation for magma-hound group 1”, then passed unchanged. ALL_SPAWNS generation
runs at import with random allocation. This confirmed startup risk precedes
further art acceptance; 24 fixed seeds do not close it. Frequency/seed/browser
reproduction remain Unverified. See [CURRENT_STATE](../../CURRENT_STATE.md).

## Prerequisites and systems

Preserve current working art changes and saves. Read gameplay/world/architecture
and QA specs. Inspect `src/game/enemies/EnemySystem.ts`, `PackFormation.ts`,
world navigation/reservations/resource/boss constraints, and
`scripts/polish-sanity.mjs`, `scripts/purchase-persistence-sanity.mjs`,
`scripts/startup-sanity.mjs`. Review `src/main.ts` startup failure handling.
Do not assume a fixture-only problem or change schema to solve allocation.

## Phases and validation

1. [ ] Instrument/replay allocation input in isolated tests; capture failing seed
   and constraints. Reproduce pre-fix failure deterministically; document whether
   it arises in supported browser startup. Do not repeatedly retry and call it fixed.
2. [ ] Select the smallest correction from evidence; record its behavior/failure
   policy in the feature spec and mark accepted scope Approved before implementing.
   Preserve three packs of 3–8/three elites per species and existing clearances.
3. [ ] Implement targeted correction and diagnostic/recovery boundary if required.
   Focused failing-seed test must pass without removing packs or assertions.
4. [ ] Run polish/world/regressions and release fixtures; expand deterministic
   coverage only for the actual uncovered allocator boundary. Retain all existing seeds.
5. [ ] Run campaign/typecheck/build, normal browser new/old-save launch/reload,
   passage/boss/resource clearance and any new failure-message/recovery scenario.
6. [ ] Update owning specs/current state/drift with evidence, close accepted feature
   and move this plan to completed only when final acceptance is achieved.

## Major regression risks

Accidental population reduction, weaker separation, blocked gates/boss arenas,
unstable saves/IDs, random behavior hidden by retries, expensive startup work,
or changed difficulty/loot due to relocating/removing packs. Distinguish seeded
tests from proof of all random possibilities. Art must not be reverted to repair logic.

## Final gate

Retained failing input fails pre-fix and succeeds after correction; intended
population/constraints remain intact. Relevant checks and usable browser launch
pass; any remaining uncertainty is explicit. No schema/balance changes or external
upload unless separately authorized. Then resume the approved visual milestone
with its own reviewable acceptance criteria.
