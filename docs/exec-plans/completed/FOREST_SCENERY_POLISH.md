# Forest scenery visual pass

## Status and scope

Completed scoped scenery pass · 2026-10-02. User explicitly resumed local visual work after the SDD
audit. The separate spawn-reliability plan remains open; this pass does not
implement its Draft proposal. Owning contract: [WORLD_VISUAL_POLISH](../../specs/features/WORLD_VISUAL_POLISH.md).

## Objective and affected modules

Improve the forest gameplay frame with coherent tree crowns/trunks and a softer,
layered transition from grass through wet soil to the existing brook. Inspect
Trees/TreeForms, WatercourseMeshes and their art tests. Keep authored terrain
samples, resource footprints/HP/labels, bridges, mob population, save data and
gameplay unchanged. No commit, upload or publication.

## Phases and acceptance

1. [x] Inspect actual gameplay in the isolated `playtest=polish` session and
   Hero Path RPG App Store gameplay captures. Baseline: detached-looking crown
   lobes, straight cylinder branches, narrow angular bank ribbon and sparse
   shore framing. Compare actual gameplay, not promotional cover art.
2. [x] Build connected, varied tree volumes with readable bark/root structure;
   preserve tree height/footprint and rigid batching/triangle budgets.
3. [x] Layer bank materials and low shore clusters on sampled terrain; preserve
   water extents and crossing geometry, avoid new obstructing scenery.
4. [x] Run art/world/polish/docs/typecheck/build gates. Inspect forest and mineral
   brooks, harvest trees and other affected biomes in browser; compare frame
   readability/cost and record concrete remaining gaps.
5. [x] Record meaningful state and remaining visual backlog; move this scoped
   plan to completed when its acceptance passes. Overall reference parity remains
   open; physical phone/weak-PC review is not replaced by a desktop capture.

## Risks and validation

Closed surfaces need outward winding, finite normals and light-facing tops.
Tree foliage must stay below the existing label anchor and within established
canopy bounds; wood nodes remain the same interactable objects. Bank overlay
must follow terrain without gaps/z-fighting, use soft material boundaries and
stay clear of bridge planks. Shore stones/plants stay below ankle height or are
visually thin walk-through vegetation. Reuse/batch geometry to bound draw cost.
No creature surface-authoring changes are planned, so no sculpt bake unless
that scope actually changes. Tests validate geometry/collision invariants;
browser captures validate appearance. Record failures without hiding retries.

## Results

### Implementation

- Added cached closed bark and canopy geometry in `TreeForms.ts`. Living trees
  use one connected broadleaf crown or integrated pine tiers, curved tapered
  trunks with root flares and branch forks. Sparse acacia/snags reuse the bark;
  their existing separate crown construction remains. Rigid tree surfaces batch
  into one mesh with the existing material, and living trees stay below 1500 triangles.
- Both existing brooks use denser linearly subdivided shore cross-sections,
  feathered wet soil/moss vertex colours and terrain normals. Grouped instanced
  pebbles/reeds avoid bridge decks; complete instanced scenery stays below 25000
  triangles per brook. Ripple direction follows the local river axis. No new
  colliders, harvest targets, lights or bloom were introduced.
- Resource height/footprints/HP/label size, authored terrain controls, crossing
  geometry, population, economy and saves remain unchanged. No creature surface
  authoring changed, so a creature bake was unnecessary; its existing hash gate passes.

### Validation and repairs

| Gate | Result |
| --- | --- |
| `npm run typecheck` | PASS; final build also reran TypeScript |
| `npm run check:art` | PASS; closed surfaces, 52 living/16 sparse harvest silhouettes, banks/bridge clearance/budgets plus existing geography/rig/baked-sculpt gates |
| `npm run check:world` | PASS; polygons, traversal, passages, migration, path/river/bridge terrain checks |
| `npm run check:polish` | PASS; 24 layouts, 2880 packs, 15763 ordinary bodies, 120 elites per layout; 7 viewport calculations × 3 DPR |
| `npm run build` | PASS; 140 modules, main JS 2609.83 kB / 747.14 kB gzip; existing large-chunk warning remains |
| `npm run check:docs`, `git diff --check` | PASS after reconciling state/spec/backlog and moving this plan |

The first twisted/lobed canopy looked like a rubber rock in the browser and was
replaced by a continuous soft union of leaf clusters with broader lighting planes.
The new bank-height regression initially failed at a 0.001-world-unit tolerance.
A diagnostic tolerance change found a 0.06211 error near nearest-span joins:
double-precision XY used for height sampling differed from GPU Float32 XY.
Sampling the rounded XY before computing height fixed the renderer. The original
0.001 tolerance was restored; final maximum errors are 0.00000 (forest) and
0.00002 (mineral). No failing threshold was relaxed for acceptance.

### Manual review and limits

Actual no-save game review covered harvest trees in all eight regions, forest
and mineral brooks and bridge approaches; world-preview supplied a close harvest
view. Resource auto-gather/HP progress and established label sizes remained
visible. Actual Hero Path RPG App Store gameplay screenshots were inspected;
XP Hero screenshots and the two unidentified references were not visually
compared in this pass. This does not establish reference parity.

The stale preview binding recovered with a fresh game tab. A documented 844×390
viewport override timed out/reset the browser tool; resetting it also timed out.
A new normal 1280×720 game tab worked and was left open on the forest bridge.
Final browser diagnostics contained only the expected localhost Yandex SDK
fallback warning. Phone and weak-PC acceptance remain **Unverified**.

One dense region-4 combat frame showed 10 FPS/about 3465 draws/1.058M triangles
while multiple 3D tabs were open and shaders were warming; later views recovered,
including about 148 FPS after closing the extra preview/reference tabs. These
are uncontrolled diagnostic observations, not a hardware benchmark or a confirmed
new performance defect. No population change was made.

Actual game startup reached 120 packs / 120 elites; this single startup does not
close the separate intermittent spawn risk. Full release/campaign/live SDK gates
were not rerun for this art-only scope; no release approval is claimed.

Remaining work: large forest composition/understory/path and slope framing,
buildings, other biome scenery including acacia crowns, independent designs for
remaining creature families/elites/bosses, and controlled device/reference review.
The overall WORLD_VISUAL_POLISH acceptance stays open in ROADMAP/VISUAL_BACKLOG.
No ZIP, console change, commit, push, upload or publication was made.
