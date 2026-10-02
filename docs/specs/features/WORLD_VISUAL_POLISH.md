# World and creature visual polish

## Status

Approved

Accepted product direction; implementation is in progress, acceptance remains open.
Sources: prior user requests recorded in [VISUAL_BACKLOG](../../VISUAL_BACKLOG.md),
[NEXT_WORLD_ART_PASS](../../NEXT_WORLD_ART_PASS.md) and local render modules.

## Problem and goal

User reports visible primitive construction, weak ordinary/elite distinction,
incorrect weapon/face/stinger articulation, flat sparse terrain and unclear
mobile labels. Bring gameplay presentation toward the four reference games.
Hero Path RPG and XP Hero are known; remaining two names are Unverified.
The cover provides supplementary goblin/environment direction, not the main bar.

## Current and required behavior

3D terrain/scenery, articulated hero/64 creature identities, elite anatomy/aura,
surface baking and watercourses exist locally. Their presence does not establish
art acceptance. Required: cohesive organic volumes, species-specific faces,
material separation, mature elite silhouettes, subtle aura, terrain landmarks/
slopes/water with readable paths, and correct hand/face articulation in motion.
Effects enhance existing melee/ranged-enemy attacks, drops and gathering; no new
player spell system is requested.

## Non-goals and invariants

No gameplay/economy/population/gate changes, save reset, new magic or publishing.
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
at ordinary startup. Saved state unchanged. After surface changes run
`npm run art:bake-creatures`, `npm run check:art`, typecheck/build; geography edits
also check:world/polish. Use [QA_RELEASE](../QA_RELEASE.md) for exact gates.
Manual: all eight regions, ordinary/elite pairs, 24 bosses and hero weapon motion
in gameplay/previews, phone landscape and weak PC. Capture results per item;
full acceptance remains Unverified until these reviews pass.
