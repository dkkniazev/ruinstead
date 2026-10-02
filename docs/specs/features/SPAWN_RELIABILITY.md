# Spawn initialization reliability

## Status

Draft

Proposed next correctness milestone from a confirmed bootstrap failure; not
implemented or a change to population/balance. See [next plan](../../exec-plans/active/NEXT_MILESTONE.md).

## Problem and current behavior

`src/game/enemies/EnemySystem.ts` builds ALL_SPAWNS during module initialization
using Math.random. Allocation has bounded attempts and throws if no legal
formation is found. First bootstrap check:release failed with “No clear formation
for magma-hound group 1”; repeated invocation passed. Failing seed/frequency and
browser reproduction are Unverified. Fixed 24-seed polish coverage passes.

## Goal and required behavior

Make the failing layout reproducible and initialization reliable under preserved
population, gate/resource/boss clearance and pack-separation constraints. Retain
a diagnostic seed/fixture for each discovered failure. A normal supported start
must not silently lose packs or leave a blank game after allocation failure.
The actual correction/fallback policy must be chosen from the reproduction,
recorded here before implementation, and tested rather than hidden with retries.

## Non-goals and invariants

No mob reduction, overlap/clearance weakening, new economy/quest rules, save reset,
or sweeping AI/render rewrite. Preserve three packs of 3–8 plus three elites per
species, all region/gate/obstacle constraints and current seed-test assertions.

## Acceptance criteria

- The discovered failing input is deterministic and fails the pre-fix implementation.
- After correction that case creates the intended population without invalid bodies,
  removed packs, dropped assertions or retry-to-green test handling.
- Initialization diagnostics identify an allocation failure and its replay input;
  startup failure/recovery behavior is explicitly reviewed in the active contract.
- Existing seed/layout, gameplay, persistence/startup and build gates pass, with
  no schema or balance change. Browser launch/reload provides usable controls.

## Automated and manual validation

Add a focused failing-seed regression, then `npm run check:polish`,
`npm run check:world`, `npm run check:regressions`, `npm run check:release`,
`npm run check:campaign`, typecheck/build. Expand seed testing based on a concrete
discovered risk, not an arbitrary success-rate target. Manual normal launch,
reload, gate/boss/resource clearance and startup failure presentation.
