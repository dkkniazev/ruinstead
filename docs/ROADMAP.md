# Roadmap reconstructed from current implementation

Status 2026-10-04. This is future work, not a list of functions already implemented.
Evidence: [CURRENT_STATE](CURRENT_STATE.md), [investigation](SDD_INVESTIGATION.md),
domain specs and dated QA/art reports. No roadmap implementation in SDD bootstrap.
Validation commands/scenarios are owned by [QA_RELEASE](specs/QA_RELEASE.md).

## Maintenance

Keep only unresolved implementation, decisions and acceptance work here. Remove
completed items from future work and preserve evidence in completed plans/history;
update dependencies and references. A review of an implemented system is a QA
task, not a claim that the system must be built again. Speculative P2 items require
a product decision and do not authorize implementation. Routine doc audits do
not change product status or reopen completed bootstrap work.

## P0 — correctness and release conditions

### P0.1 Reproduce and correct spawn initialization failure

- Goal: normal startup allocates the intended population without import-time failure.
- Why: observed first release-gate failure for magma-hound group1, subsequent PASS;
  randomized ALL_SPAWNS is on the real import path.
- Systems: EnemySystem/PackFormation/navigation/reservations; startup/polish fixtures.
- Dependency: retain failing seed/input before deciding a correction; [Draft feature](specs/features/SPAWN_RELIABILITY.md).
- Acceptance: deterministic regression fails before correction and passes after;
  counts/clearance/gates unchanged, failure diagnostic and startup recovery reviewed.
- Validation: seeded regression, polish/world/regressions/release/campaign and build;
  normal browser launch/reload. [Next plan](exec-plans/active/NEXT_MILESTONE.md).

### P0.2 Close candidate save/lifecycle and release acceptance gaps

- Goal: identified candidate survives authorized draft reload/offline/focus and
  old/new saves without duplicate/lost durable rewards.
- Why: fixtures exist and the October 4 candidate is saved in draft 619868;
  full current-candidate platform/multi-device behavior remains Unverified.
- Systems: packaging, GameStateStore/cloud, main lifecycle, ads/UI, release records.
- Dependency: P0.1 fixed; candidate/hash built; authorized console/device access.
- Acceptance: full relevant automated gates recorded, candidate uploaded only when
  authorized, manual scenarios pass or specific blocker recorded; no false readiness claim.
- Validation: QA_RELEASE full release list plus save/cloud/ad/focus scenarios on
  desktop/mobile. Preserve user's prior ad QA as history, not repeated evidence.

### P0.3 IAP activation and fulfillment — conditional on IAP release

- Goal: SDK catalog/real or platform test receipts work with durable once-only grants.
- Why: client and product setup exist; support activation/live payments Unverified.
- Systems: Yandex console/catalog/providers/receipt handler/cloud/shop.
- Dependency: external support/account activation and authorized test access.
- Acceptance: intended product IDs/prices fetched, cancel/pending/reload/retry paths
  verified without duplicate grant or consume before durability. If unavailable,
  record a separate explicit release decision rather than claiming IAP ready.
- Validation: check:release + authorized draft purchase QA; no claim that fixtures
  establish tax/contract eligibility or external activation.

## P1 — release quality

### P1.1 Complete gameplay-world/creature visual acceptance

- Goal: cohesive world and organic creatures toward actual reference gameplay.
- Why: approved user direction and [visual backlog](VISUAL_BACKLOG.md); local
  surfaces/aura exist but geometric coverage is not art acceptance.
- Systems: render3d terrain/water/scenery, creature/hero models/motion/materials,
  portraits/labels and baked assets.
- Current progress: connected trees/acacias, softened brook banks, grouped low
  understory, worn roads and fitted house bases are implemented locally. Species
  anatomy/plumage, selected boss mass profiles, contact accents/footfall dust,
  warning contrast and resource-label separation are also implemented;
  the Oct3 pass adds cover-directed faces/cloth/chitin/stone forms, explicit
  species proportions and solid base buildings/closed well/tree clearance.
  Its [focused plan](exec-plans/active/CREATURE_STYLE_AND_BASE_FIXES.md) records
  actual collision/legacy-position checks and the superseded art rejection.
  [active art review](exec-plans/active/VISUAL_FINISH.md) owns comparison evidence.
  After rejecting the segmented goblin, the user accepted the corrected connected
  goblin as a working baseline and directed the remaining creature rollout.
  Connected mammal/humanoid/reptile/bird/soft skins and fitted insect/giant faces
  now run locally across the catalog. Gallery review covers 40 ordinary/elite
  pairs and 24 boss designs; all 40 pairs and all 24 bosses were additionally
  inspected in isolated wind-up/impact/recovery. Five hero weapons and representative outfits were
  reviewed through the production timed pose; armor seams/support soles were
  corrected. All eight regions have latest-bake scene review, with shell/face
  repairs rechecked in actual combat. Cliff/water underlay teeth are corrected;
  regular grid steps near mountain ramps still need composition work.
  On October 4 the user accepted the current catalog/world art for this release;
  additional reference-quality work remains a follow-up, not a current-release
  human approval blocker. Remaining acceptance includes
  full scene/fight motion, the other outfit combinations and
  physical-device QA. The
  [active plan](exec-plans/active/VISUAL_FINISH.md) records the user's choice of
  no paid generation and the local mesh route. Catalog/world reference
  acceptance remains separate from automated geometry coverage.
- Dependency: stable startup; actual Hero Path RPG and XP Hero gameplay captures;
  [approved feature](specs/features/WORLD_VISUAL_POLISH.md).
- Acceptance: ordinary/elite silhouette differences, attached faces/weapons/
  stingers through attack recovery, readable paths and correct boundaries/labels
  pass the named comparisons; remaining gaps and human review decision explicitly
  recorded, separately from automated gates in QA_RELEASE.
- Validation: bake as needed, art/world/polish/build, gameplay/motion previews,
  all regions/creatures/bosses and phone/weak-PC review.

### P1.2 Verify weak-PC base movement and performance without population changes

- Goal: identify whether remaining slow movement is frame cost, clock/input or collision.
- Why: user reports weakness limited to low-end PCs; strong PC/phone work. Timing
  fixtures pass but do not measure a weak GPU/CPU with full base scenery.
- Systems: clock/player/collision vs render culling/batching/labels, debug overlay.
- Dependency: reproducible affected hardware/build context; no assumed bug mechanism.
- Acceptance: evidence identifies the cause or an explicit hardware limitation.
  If a correction is needed, it preserves travel/dash/collision and population,
  with the before/after scenario recorded; profiling alone does not assert a code bug.
- Validation: timing/gameplay/world/polish/art as affected, real base-route profiling.

### P1.3 Full campaign/rare-resource and mobile UI review

- Goal: verify key/optional quest guidance and progression economics, comfortable HUD.
- Why: mandatory gates are implemented/tested, but fresh-save combat route and
  rare-resource pacing through finale are Unverified; phone feedback shows UI issues.
- Systems: quests/balance/economy/UI/labels/input/localization.
- Dependency: stable candidate, isolated new save and desktop/touch tester context.
- Acceptance: main quests are not blocked by optional training tasks, presented
  costs have reachable acquisition paths, latest mobile map/menu/health/text and
  single-tap actions pass explicit scenarios. Any tuning follows a recorded decision.
- Validation: campaign/balance/gameplay/regressions/i18n, manual progression and
  maximum inventory/long forge list/short landscape height. Do not reduce mob count.

## P2 — post-release / decisions before expansion

### P2.1 Resolve reserved settlement and offline-policy scope

- Goal: decide whether reserved infirmary/gate workflows and total offline cap
  belong in a future expansion; currently only four production/utility buildings upgrade.
- Why: historical design/save fields suggest wider settlement, not current UI;
  per-update offline clamp is often misread as a total cap.
- Systems: settlement/economy/save/UI; no implementation authorized by this item.
- Dependency: product decision and migration/cost spec before adding/removing rules.
- Acceptance: explicit Approved/Deferred decision; if approved, spec covers old saves,
  spending/rewards/clock behavior and UI. Reserved fields are not silently deleted.
- Validation: docs plus gameplay/regressions/release/campaign for subsequent implementation.

### P2.2 Decide production analytics/audio expansion

- Goal: evaluate adding a real analytics collector or richer audio only after release quality.
- Why: existing analytics emits DOM events without a sink; audio is procedural.
  No revenue/retention target or backend design is confirmed.
- Systems: analytics/audio/platform lifecycle and release/privacy metadata as applicable.
- Dependency: explicit product/service/asset-rights decision; current functionality preserved.
- Acceptance: documented scope/trust/data/consent or asset provenance and measurable
  validation scenario before implementation; not relabeled as already connected.
- Validation: lifecycle/release fixtures and actual sound/collector inspection if approved.
