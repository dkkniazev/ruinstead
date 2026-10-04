# World and creature visual polish

## Status

Approved

Accepted product direction; implementation is in progress, acceptance remains open.
Automated geometry/rig gates do not establish human visual/feel approval under
[QA_RELEASE](../QA_RELEASE.md#acceptance-gates). On 2026-10-03 the user rejected
the segmented goblin as an assembly of geometric parts. A subsequent local
connected-mesh/skinned ordinary/elite prototype is implemented and checked.
The user accepted the corrected goblin as the working baseline on 2026-10-03
and requested the remaining mobs. This does not approve other designs. World and device
acceptance remains open; earlier rejection is not resolved by geometry gates.
Sources: prior user requests recorded in [VISUAL_BACKLOG](../../VISUAL_BACKLOG.md),
[NEXT_WORLD_ART_PASS](../../NEXT_WORLD_ART_PASS.md) and local render modules.
On 2026-10-04 the user accepts the current visual version for the release
candidate and authorizes Git/Yandex draft upload. This is scoped release-art
acceptance; it does not establish reference parity or complete remaining device
and normal-play checks. Further art work stays on the roadmap.

## Problem and goal

User reports visible primitive construction, weak ordinary/elite distinction,
incorrect weapon/face/stinger articulation, flat sparse terrain and unclear
mobile labels. Bring gameplay presentation toward Hero Path RPG and XP Hero.
On 2026-10-02 the user confirmed these two as the primary references; the other
previously mentioned games are outside the current comparison scope.
On 2026-10-03 the user explicitly selected the generated low-poly cover goblin
as the creature style reference: compact proportions, coherent rounded planes,
expressive fitted faces and leather/metal equipment. Apply the same visual
language to the other species; the two games remain the world/gameplay comparators.
The [reference index](../../references/visual/README.md) records source material;
the [asset workflow](../WORLD_CONTENT.md#asset-workflow) governs its use.

## Current and required behavior

3D terrain/scenery, articulated hero/64 creature identities, elite anatomy/aura,
surface baking and watercourses exist locally. Their presence does not establish
art acceptance. Required: cohesive organic volumes, species-specific faces,
material separation, mature elite silhouettes, subtle aura, terrain landmarks/
slopes/water with readable paths, and correct hand/face articulation in motion.
Effects enhance existing melee/ranged-enemy attacks, drops and gathering; no new
player spell system is requested.

## Non-goals and invariants

No economy/population/gate changes, save reset, new magic or publishing.
The user now explicitly requires solid base buildings/well and tree/building
clearance. Preserve spawn, return/deposit and forge access; rescue existing saved
positions inside the new obstacles. Creature size changes are presentation only:
keep damage, attack ranges, combat radii and progression unchanged.
Keep IDs, normalized combat bodies, telegraph range, path/resource collision,
localized dynamic labels and accepted icon size. Orbiting weapons follow their
independent gameplay cooldown/impact cycles. Daggers stay perpendicular to the
hand in its frame and do not penetrate the palm at rest; blades align with actual
strike direction. Staff tilt follows the forward casting motion, not sideways.

## Acceptance criteria

- At the same gameplay camera/scale/light, each ordinary/elite pair is distinguishable
  by anatomy/equipment silhouette without depending solely on tint or a tiny ornament.
- Goblin/organic creatures show connected head/body/limb forms without visible
  accidental gaps or unrelated primitive faces; intentional rock armor remains readable.
- Species use explicit presentation sizes rather than a universal portrait fit:
  a goblin is a small humanoid; a boar is low but heavier/wider, canines/felines
  have long bodies, giants and adult dragons have greater mass. Compare in one
  world-scale camera, including elite forms, without changing combat radii.
- Base houses/well block movement over their visible ground solids, keep nearby
  interactions accessible, and trees/canopies do not intersect building roofs.
  Well inner walls remain opaque from the game camera.
- Idle, walking, wind-up, impact and recovery keep blades seated in grips, correct
  striking edge orientation, faces/fangs/horns/stingers attached to their parent.
- Elite aura is visible but does not obscure attacks, inflate portraits or HP bounds.
- Each region comparison includes terrain depth/landmarks/boundary material, with
  every intended passage traversable and boss bodies clear of bridges.
- On actual desktop/touch landscape, labels are sharp at accepted size; menu does
  not overlap mini map, UI does not hide necessary battle information.
- Compare gameplay captures to actual reference gameplay, record remaining gaps;
  do not declare parity using only a preview, cover or automated geometry check.

## Performance, data and validation

Keep visibility batching/culling and pre-baked surfaces; do not build dense sculpts
at ordinary startup. Save schema/inventory/progression remain unchanged; only
an old player position inside newly solid base masonry is corrected locally.
After surface changes run
`npm run art:bake-creatures`, `npm run check:art`, typecheck/build; geography edits
also check:world/polish. Use [QA_RELEASE](../QA_RELEASE.md) for exact gates.
Manual: all eight regions, ordinary/elite pairs, 24 bosses and hero weapon motion
in gameplay/previews, phone landscape and weak PC. Capture results per item;
full acceptance remains Unverified until these reviews pass.
