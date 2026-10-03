# Gameplay visual finish

## Status and scope

In progress · 2026-10-02–03. User requests continued local work until the visual
task is finished or the usage limit is reached. Hero Path RPG and XP Hero are
now the two primary references by explicit user clarification; the other two
games are no longer acceptance dependencies. Owning contract:
[WORLD_VISUAL_POLISH](../../specs/features/WORLD_VISUAL_POLISH.md).
After the SDD workflow audit, the user resumed runtime art work on 2026-10-03
and rejected creature appearance/scale and the nonsolid base. The focused
[creature/base pass](CREATURE_STYLE_AND_BASE_FIXES.md) records the new cover-goblin
creature reference and explicitly authorized settlement collision changes.

## Milestones

1. [x] Inspect current forest gameplay and the references; record the confirmed
   two-reference scope. Preserve prior tree/brook work and SDD audit changes.
2. [x] Compose low vegetation and ground transitions into coherent beds; clear
   paths, resource/combat anchors and bridge approaches. Improve sparse trees.
3. [x] Review settlement and region landmarks with the game camera; improve
   silhouette, bases/materials and purpose cues within existing collision bounds.
4. [x] Review all ordinary/elite families and bosses, then refine concrete weak
   designs and motion/material/effect issues. Bake changed creature authoring.
5. [ ] Review the eight regions and reference comparison, motion, labels and
   device constraints; run art/world/polish/docs/type/build and affected gates.
6. [ ] Reconcile specs/state/backlog with verified changes; mark completion only
   for achieved acceptance. No commit/push/console upload/publication.

## Constraints and risks

No population, balance, economy, save-schema or platform changes. The Oct3
creature/base request explicitly authorizes ground colliders for base buildings,
forge and well, resource clearance and local rescue of old positions in masonry.
Other geography and combat geometry remain unchanged.
Use low walk-through scenery for decoration; large solid objects remain within
existing colliders. Avoid disguising scenery as resources. Preserve label size,
telegraphs, foot contacts and hand/face/stinger articulation. Reuse/batch bounded
geometry; no new shadow lights, bloom or dense startup sculpt. Review visual
quality in actual game, not solely gallery or successful geometry assertions.

The randomized startup failure stays tracked by NEXT_MILESTONE. Prior browser
viewport override timed out; physical phone/weak-PC acceptance is still open.
Do not claim device QA from calculated viewport fixtures. Record new failures
and fixes instead of retrying silently until green.

## Evidence and remaining work

Baseline: forest grass remains scattered, resource tree clusters lack connecting
ground forms, roads are broad uniform ribbons; settlement contains simple
repeated roofs/foundations. Existing creature sculpt/aura and attachment checks
are present; artistic completeness requires separate review. XP Hero App Store
gameplay captures inspected this pass; Hero Path gameplay inspected previously.
Actual gameplay media inspected: official Hero Path RPG App Store app preview
(opening fight and canyon village) and XP Hero store gameplay. Neither native
app was played. The generated cover is not the world/gameplay comparator;
the user now explicitly selects its low-poly goblin for creature style.

### Implemented and reviewed locally

- Low terrain-following understory beds and pooled shrubs/leaves, with road,
  resource, settlement and bridge clearances. Single connected acacia canopy.
- Continuous restored-house stone bases, fitted timber courses and worn dirt
  routes within existing footprints/road meshes. Instanced buffers are disposed
  on streamed chunk removal; shared scenery geometry remains reusable.
- Closed painted mushroom caps; fitted goat/canine/feline faces, veteran fur,
  beetle shell halves, continuous worm/serpent skin, connected bird feather fans.
  Selected bosses received distinct masses (root trunk, moss-ogre torso, insect
  shells, crag bodies and predator ruffs); this is not 24 complete boss redesigns.
- Bake revision `2026-10-02-character-v4`: 354 shared surfaces, 120,874 baked
  triangles, 1902 KiB; maximum complete model 11,203 triangles (limit 13,000).
- Two fixed instanced contact-effect draws (32 flashes, 96 hit puffs + 16 footfall
  slots), body-sized brief impact accents and distance-driven hero dust. Boss
  warning contrast remains inside the original damage geometry.
- Resource label overlap resolver preserves original label size and sharp
  DPR-aware text, prioritizes active harvesting and adds a faint displaced leader.
- DEV-only no-save selected-boss inspection and actual touch-layout harness.
  Gather media route now selects an available early crystal/fiber in region 2.

### Manual evidence

| Scene | Inspected locally |
| --- | --- |
| 1 | Village bases, forest goblin/elite combat, beetles, trees, brook/bridge |
| 2 | Chalk/acacia, scorpions/jackals, resources, touch-layout entry bridge |
| 3 | Slate pass, bats/rogues, predator landmark |
| 4 | Basalt/lava cracks, bridges, lava-golem attack warning and fight |
| 5 | Highland terrain/landmark, harpy flock |
| 6 | Mineral brook/reeds/bridge, wisps and crystal |
| 7 | Mesas/cliffs, worm/owl, tree/stone overlapping labels resolved |
| 8 | Obsidian/lava, drakes/wyvern, landmark |

The 40 ordinary/elite identities and 24 bosses were reviewed in the gallery.
Motion review covered scorpion, hound, beetle, goat, worm, serpent, rogue, cultist,
harpy/owl and root/moss-ogre/sun-tyrant/cinder-smith. This is representative
motion, not every weapon/boss at every attack phase. Before the workflow audit,
all 24 bosses were additionally inspected in the actual no-save gameplay camera;
selected scenes included active circle/line warnings. QA health restoration was
enabled, so these are art/context checks, not a normal difficulty or full-fight
acceptance run. The final hero weapon pass remains open. The 844×390 iframe
renders real touch UI but is not physical-phone acceptance.

### Comparison with reference gameplay

| Area | Local progress | Remaining acceptance |
| --- | --- | --- |
| Creature silhouette | Connected organic surfaces, species profiles, veteran mass | Consistency of every silhouette at normal gameplay distance |
| Motion | Attached grips/faces/stingers, distinct wing fans and boss bodies | Full hero/boss phase review in context |
| Light/materials | Existing shared lighting, fur/shell/cloth separation | Real device appearance; no claim of identical reference lighting |
| Ground | Understory beds, brook banks, connected trees, worn paths | Further composition where gameplay remains sparse |
| Composition | Continuous house bases and region landmarks | Scene-level comparison, without changing population or walkability |
| Combat feedback | Brief contact flash/dust, clearer finite boss warnings | Readability in busy fights and on phone |
| HUD | Label overlap corrected at original size; touch map/menu separated | Latest physical phone and weak-PC checks |

### Checks and failures retained

- PASS: typecheck, check:world, check:polish (24 layouts / 2,880 packs /
  15,763 ordinary bodies, 120 elites per layout, seven viewports × three DPR).
- PASS: final check:art on the 1902 KiB bake, check:regressions, check:i18n (973
  strings) and check:docs, plus typecheck after selected-boss diagnostics. Label
  resolver, effect fixed pools, road/terrain geometry have fixtures.
- Tuple shape error produced NaN geometry during an intermediate bake: repaired
  root path tuples and added finite attribute validation to the bake generator.
- Obsidian beetle borrowed another shell palette: added palette cache keys and
  regression coverage. Art fixture's Phaser import was isolated by its existing stub.
- Browser viewport override timed out twice; use existing iframe harness, keep
  physical devices Unverified. One iframe action timed out; fresh owned tab worked.
- Wrong hound selector was corrected from fresh DOM. Gather capture targeted an
  absent region-1 crystal, then a lethal region-4 area: fixed to region-2 entry.
- Road shader used reserved GLSL `patch`; renamed to `wornPatch`. Contact shader
  redeclared injected `instanceColor`; removed declaration. Clean game tab logs
  have no shader errors after both fixes; TypeScript alone did not catch them.
- Bird fan winding was inside-out; reversed winding and added closed positive
  signed-volume assertions. Elite harpy's old round collar resembled a belt;
  replaced with fitted shoulder/back feather mantle and rebaked.
- A duplicate selectedBoss declaration in the DEV diagnostic panel caused a
  Vite transform failure; removed the duplicate and reran typecheck. The game
  reloaded successfully; later all-boss scene inspection returned no console errors.

The Oct3 creature/base pass records its fresh bake, captures and affected checks;
broader motion and scene acceptance remain open.
Physical-phone/weak-PC acceptance and full reference parity remain open. The
startup reliability issue remains tracked separately, not silently fixed here.
