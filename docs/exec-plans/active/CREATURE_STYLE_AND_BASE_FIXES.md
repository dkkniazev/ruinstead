# Creature style, species scale and solid settlement

Base/scale corrections implemented and locally checked; original creature art
rejected, replacement accepted for the October 4 release; device acceptance pending ·
2026-10-03–04. User requests local creature redesign using the
generated low-poly cover goblin, logical species sizes, removal of a tree/roof
intersection, solid base buildings and a closed well interior. The original pass
was local; October 4 Git/draft authorization is owned by
[RELEASE_DRAFT_REFRESH](../completed/RELEASE_DRAFT_REFRESH.md).
Owning contract: [WORLD_VISUAL_POLISH](../../specs/features/WORLD_VISUAL_POLISH.md).
The user subsequently rejected the current goblin for visible geometric assembly.
The completed implementation/check steps below do not satisfy art acceptance;
replacement work is recorded in [VISUAL_FINISH](VISUAL_FINISH.md). On Oct3 the user
accepted the corrected connected goblin as a working baseline; the Oct4 rollout
now implements the remaining family surfaces/faces. This supersedes the rejected
art below, without closing new-family/reference/device acceptance. Base/scale
validation below remains evidence for those unchanged systems.

## Milestones

1. [x] Inspect actual base, creature motion, cover and owning code/specs.
2. [x] Share settlement footprint data across placement, collision and navigation;
   relocate the intersecting starter tree; repair the well's inner wall.
3. [x] Replace incidental radius/core scaling with species presentation profiles;
   refine all creature families with the cover's chunky coherent surfaces/faces.
4. [x] Reuse motion preview for a common-scale species lineup, inspect all families
   and attack attachments, inspect base/game camera and capture evidence.
5. [x] Bake and run affected art/world/gameplay/regression/polish/docs/build gates;
   reconcile actual state and retain human visual/physical-device acceptance.

## Decisions and evidence

- Inspected `yandex-output/store-assets/source/ruinstead-cover-lowpoly.png`:
  generated promotional art, 1637×962. Broad leaf ears, expressive brows, green
  cheeks/muzzle, compact limbs, fitted brown leather and simple metal equipment.
  This is now the user's explicit creature style reference; the two games remain
  world/gameplay comparators. The realistic cover is not this reference.
- Initial base screenshot: starter wood at (+540,+230) intersects workshop at (+430,+170).
  WorldPrototype had landmarks/altar colliders only, no base houses.
  Well used an open-ended FrontSide cylinder; interior back faces were culled.
- Initial creature scale radius/core (goblin core18, boar29) created an unintended
  height/mass relationship. Keep combat radii, damage/rewards/population unchanged;
  record species size policy in the owning spec, test actual world-space bounds.
- Newly solid footprints must leave spawn, deposit, forge E range and paths usable.
  Colliders describe ground solids, not roof eaves or empty awnings. Existing saves
  inside a newly solid building must be moved to the nearest clear position.
- Automated geometry is not subjective approval. Physical-device latest art and
  unreplayed random spawn failure remain separate open acceptance.

## Implementation and local evidence

- `SettlementLayout` owns four building locations/dimensions, forge and well.
  Six ground solids are shared by Phaser collision, navigation and resource
  clearance; empty awnings are not blocked. Starter wood moved to (+675,+265),
  preserving its identity, yield and count. Well is a closed stone annulus with
  an inner lining, opaque water and rim. Shared actor geometry survives batching.
- `CreatureScale` preserves combat radii and boss scale while assigning explicit
  normal species proportions. Common-scale first-region heights: hero 126,
  goblin 86, boar 71; the quadruped's length/mass exceeds the goblin's rather than
  forcing equal height. Stone bodies exceed human height; small slimes stay low.
- Cover-style coherent sculpted faces, softened ear/eye contours, fitted cloth,
  cloven hooves, blended boar/canine backs, layered chitin and chamfered stone
  planes now apply across all 64 identities. Goblin has compact proportions and
  brown fitted leather. Elite mass/armor/aura and attached attack parts remain.
- Bake `2026-10-03-cover-style-v5`: 390 shared surfaces, 183,370 baked triangles,
  2876 KiB; maximum whole model 12,631 triangles, below unchanged 13,000 budget.
- Manual common-scale motion preview covered all eight ordinary regional
  lineups; close ordinary/elite goblin/boar and scorpion strike were reviewed.
  Latest stone planes and fitted humanoid brows were reloaded and inspected.
  Automated rig checks cover catalog attachment phases, not subjective animation
  feel or every complete boss fight.
- Actual no-save browser walking into storage, sawmill, workshop, house, forge
  and well stopped at each wall: 14 average units/s over the three-second test,
  approximately 464 blocked frames of 495 (the initial approach is unblocked).
  Forge E opened normally from its clear exterior approach. Legacy fixture
  inside workshop resumed with body (6709,10737), then a normal down-step reached
  (6709,10876) without trapping/resetting progress. Tree/workshop and well were
  also inspected through the actual gameplay camera, protection disabled.
- Local ignored evidence: `yandex-output/visual-finish/` contains dated goblin/
  boar pairs, forest/highland size lineups, well screenshot and six collision
  reports in `settlement-collisions-2026-10-03.json`.

## Checks, failures and remaining acceptance

- PASS: check:art (64 identities/40 elite auras/rigs), check:world,
  check:gameplay, check:regressions, check:polish (24 layouts/2,880 packs/
  15,763 ordinary bodies/120 elites per layout), check:campaign (23 gates),
  check:release (SDK/purchase/startup fixtures; no live payment), i18n (973 strings),
  final check:docs (26 canonical documents) and build/typecheck after the startup
  correction. Build retains the existing large-chunk warning. Current game/motion
  browser error logs were empty after reloading the latest code.
- Initial dependency tools were missing; npm ci hit locked esbuild/rollup files
  from existing local Vite servers. Exact repository server processes were
  stopped, trusted lockfile dependencies restored and local servers restarted.
  No package/lockfile change. Intermediate art/rig refinement stayed within the
  existing triangle budget after rebaking.
- Manual old-save check exposed a stale Phaser body centre immediately after
  setOffset. Synchronize the actual body before rescue; a real Phaser Body
  regression covers both texture sizes and the browser fixture now exits safely.
- Browser press on nonfocusable body and a delayed status wait timed out.
  Fresh DOM was inspected; E on the visible forge prompt succeeded. These are
  automation issues, not evidence of blocked game input.
- Required human approval of the new style and latest physical-phone/weak-PC
  appearance remain open in [VISUAL_FINISH](VISUAL_FINISH.md). This pass is not
  a claim of complete reference parity. The previously observed randomized
  startup allocation failure stays tracked by NEXT_MILESTONE despite this PASS.
  No ZIP/upload/commit/push/publication.
