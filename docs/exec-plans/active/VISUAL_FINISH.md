# Gameplay visual finish

## Status and scope

In progress · 2026-10-02–04. User requests continued local work until the visual
task is finished or the usage limit is reached. Hero Path RPG and XP Hero are
now the two primary references by explicit user clarification; the other two
games are no longer acceptance dependencies. Owning contract:
[WORLD_VISUAL_POLISH](../../specs/features/WORLD_VISUAL_POLISH.md).
After the SDD workflow audit, the user resumed runtime art work on 2026-10-03
and rejected creature appearance/scale and the nonsolid base. The focused
[creature/base pass](CREATURE_STYLE_AND_BASE_FIXES.md) records the new cover-goblin
creature reference and explicitly authorized settlement collision changes.
On 2026-10-04 the user accepts this visual version for release and supersedes
the local-only rule with explicit Git push and Yandex draft upload authorization.
[RELEASE_DRAFT_REFRESH](../completed/RELEASE_DRAFT_REFRESH.md) records that delivery. This plan
retains unfinished reference/device/composition work; no further redesign is
part of the accepted release refresh.

## Milestones

1. [x] Inspect current forest gameplay and the references; record the confirmed
   two-reference scope. Preserve prior tree/brook work and SDD audit changes.
2. [x] Compose low vegetation and ground transitions into coherent beds; clear
   paths, resource/combat anchors and bridge approaches. Improve sparse trees.
3. [x] Review settlement and region landmarks with the game camera; improve
   silhouette, bases/materials and purpose cues within existing collision bounds.
4. [ ] Review all ordinary/elite families and bosses, then refine concrete weak
   designs and motion/material/effect issues. Bake changed creature authoring.
   After the Oct3 rejection, the user accepted the connected goblin baseline;
   the Oct4 rollout implements all families. The user accepts current-release
   art; reference parity and full scene-level boss/hero motion acceptance remain
   open follow-up work. Isolated coverage is
   recorded below; earlier technical evidence is retained.
5. [ ] Review the eight regions and reference comparison, motion, labels and
   device constraints; run art/world/polish/docs/type/build and affected gates.
6. [ ] Reconcile specs/state/backlog with verified changes; mark completion only
   for achieved acceptance. Git/draft delivery belongs to the release-refresh
   plan; no publication is authorized.

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

### Hero and boss motion review · 2026-10-04

- [x] Extend the existing motion preview with selectable production hero weapons/
  outfits and deterministic timed attack scrubbing. No production controls,
  combat timing, saves or rewards change; QA-only sampling owns no second rig.
- [x] Inspect all 40 ordinary/elite pairs and all 24 bosses in isolated
  wind-up/impact/recovery, and all five hero
  weapon clips in wind-up/contact/recovery. Inspect representative outfits in
  idle/walk; repair observed armor/sole/face attachment and visibility defects.
- [x] Inspect corrected models in actual game, then affected art/type/build/docs
  gates. Record individual coverage; physical-device/human approval stays separate.
- [ ] Full normal-play fights and remaining hero outfit combinations in context;
  latest physical-phone/weak-PC and human reference/style acceptance.

The old preview only shows the hero in a regional size lineup, so it cannot
expose each hero weapon/outfit pose. Reuse that page instead of introducing a
separate harness. Risk: QA samples must advance the actual capped model clock,
walking must supply distance, and diagnostic changes must remain DEV-only.

Production changes this pass:
- Final masked-humanoid review found blank brows and weak cuff/hood edges on
  rogues/cultists. Refine fitted pigment on the existing deforming skin, keeping
  eyes exposed, masks closed and the accepted goblin unchanged; review ordinary/
  elite wind-up/impact/recovery and the actual regional game camera. Fitted brows,
  cuff/hood/boot edges are now implemented. Rogue/cultist five pairs and their
  crystal-priest/raider-king bosses were revisited in all three phases.
  Stone guardian and imp material separation were additionally inspected in idle.
- Shared closed helmet/shoulder/breastplate geometry replaces overlapping armor
  ellipsoids; rim/metal bands share edges, palette materials remain per hero.
- Ankle support keeps the boot sole on the established neutral terrain plane
  through torso lean/bob, with swing clearance. No movement/body-physics change.
- Ogre, imp, harpy, gargoyle and smith expressions have fitted brows/nostrils/lips; the
  smith has joined chin/beard mass. The accepted goblin face is unchanged.
- Ash/venom matriarch authoring now replaces the actual face-bearing shell,
  preserving dorsal plates instead of creating another body hiding the eyes.
  Beetle/scorpion/spider mandibles and elite fangs were moved clear of eye apertures.
- Adult winged bosses retain authored horns, with the intersecting generic extra
  horn pair removed. A yellow mark behind the fire-dragon horn was inspected
  with the head close-up and geometry ray: it is a dorsal skin scale/crest, not
  a detached third eye. A speculative shader projection change did not remove
  it and was reverted; no new projection contract is claimed.
- Remove the knight visor's pigment from gargoyles, increase dark beetle eye
  contrast and remove giant ornaments crossing their eyes. Flame satellites
  move behind the face. Wisps use one closed crystal core with a fitted face,
  lower rings and rear satellites, replacing intersecting crystal bodies.
- Reuse the in-memory game QA panel with regional species/rank selection to visit
  actual live units. It changes no unit stats/population and adds no save writes.

Latest bake `2026-10-04-creature-skin-v23`: 217 shared surfaces / 220,540 triangles /
3292 KiB; maximum complete model 9,680 triangles, below the existing 13,000 gate.
`art:bake-creatures`, `check:art`, `build`, `check:docs`, `git diff --check` PASS.
Build includes typecheck and retains the existing large-chunk warning. Production
dist contains only index.html, art and assets: no QA preview entries or the
live-unit/motion-preview debug strings. This is build-content/DEV-guard review,
not an authorized platform or physical-device test.

Concrete intermediate failures retained:
- Hero support-only adjustment failed at walking speed 140: seven sampled soles
  were 72.47–76.4 against the 74-unit support plane. Corrected support/swing
  clearance, then retained the 180-frame idle/walk/run/attack regression.
- Whole-model face rays first failed on beetle and then venom-spider eyes;
  moved mandibles/fangs, preserving the strict first-visible-surface assertions.
  Mammal-boss eye visibility over 45 poses/four viewing directions already passed;
  no unproved obsidian-beast ornament correction was made.
- Extending visible-eye checks to wisps exposed the dusk-wisp aperture first at
  (-10.60,42.64), then (-4.45,41.66). Moving gems/lowering rings alone did not
  repair it: overlapping old head/core surfaces still covered the aperture.
  Replace them with a single shared closed crystal core, retain strict
  front/isometric eye visibility rays, then repeat all three wisp variants in
  ordinary/elite wind-up/impact/recovery and in game. Final sculpt check PASS.
- Masked-humanoid shoulders had unwanted shaded patches. Preview shadow bias,
  disabling received shadows, smoothing shoulder weights and recalculating baked
  normals did not repair them; all speculative changes were reverted. The cause
  was the goblin's metal/roughness mask inherited by another kind's cloth. Give
  each kind its own material regions; same-camera inspection shows clean shoulders
  and a distinct metal cuirass. No new surface density or altered rig is retained.
- DEV HMR during intermediate v21/v22 and reverted v24 experiments emitted revision-mismatch fallback
  warnings. Fresh v23 navigation after the finished bake has no asset fallback;
  historical tab logs retain those intermediate warnings rather than erasing them.

Manual isolated coverage: all 40 ordinary/elite pairs and all 24 bosses at
wind-up 78%, impact 8% and recovery
100%; corrected matriarchs and smith revisited. All five production hero weapon
clips sampled at preparation 30%, contact 55% and full recovery. Outfit idle/
walk inspection covered Iron Heart, Moss Guardian, Pathfinder, Forest Gatherer,
Craftsman, Phoenix Lord, Titan Guardian and World-Root Sage; all 29 outfits ×
five weapons retain automated rig coverage, not a claim of full human art review.
The preview now offers a moving head close-up for every available neck anchor.

Actual no-save game review after v20: base/forest hero walking, ash matriarch in
region 2, cinder smith/ordinary and elite imps in region 4, venom matriarch/spider
packs in region 3. Enhanced media loadout, level 20 and QA protection were used;
these observations prove art integration, not normal difficulty or full fights.
Fresh game logs show only the expected localhost SDK warning, no shader/asset
fallback errors. Teleport frame counters include scenery construction spikes;
they are not stable hardware benchmarks. During this scene review two pointer
clicks did not visibly dismiss a boss-reward offer; Enter did. Cause and normal
mouse/touch reproduction are Unverified, so dismissal reliability remains a
manual candidate check rather than silently being counted as a PASS.

After v23, all eight regions were revisited at 1280×720 in IAB using the live-unit
selector: forest goblins/ogre, elite ruin guardian/flames in region 2, dusk wisps
in 3, elite obsidian beetle/elementals in 4, elite wind spirit in 5, elite crystal
wisp in 6, steppe jackals/worms in 7, elite drake/wyverns/serpents in 8. The
same media/protection overrides apply. Species/rank selection and region-list
refresh work through visible controls; normal and elite populations remain.
Final masked-humanoid materials were revisited in regions 3/4/6/7/8 with the
weaker `weapons=all` loadout (level 1, zero stars), no media scenario and QA health
restoration. Live ordinary/elite fighting is visible; this still does not prove
normal-play difficulty. The fresh game tab has no console errors.

### Cliff skirt refinement · 2026-10-04

- [x] Replace panel-scale random bevel/shading and exposed lower skirt teeth
  with coherent rock planes, preserving the plateau rim, terrain samples,
  passages and all logical footprints. Reuse existing terrain geometry.
- [x] Check shared cliff edges/hidden lower boundary, world/polish/art/type/build;
  review water/lava, mountain and height-difference boundaries in game.

Source inspected again: Hero Path RPG official App Store preview (snow/lava
battle and canyon-village frames) and three gameplay screenshots on 2026-10-04.
Broad contiguous rock masses are the comparison; no native-app playthrough or
terrain mechanics are inferred. The local magma-region capture has small
repeated dark triangles at the skirt's lower edge beside the bridge. Risk:
changing the rim or boundary sampler would misalign paths and feet, so only the
non-walkable visual skirt is in scope.
The initial common skirt datum/coherent bevel passed world/polish/art/build but
game inspection still showed teeth. Further inspection found mixed liquid/land
boundary triangles using the high plateau's underlay height. Continue only
liquid/land cells as flat liquid under the opaque skirt; do not alter the
functional boundary or plateau samplers. A global lower-underlay attempt removed
the water teeth, but regular grid steps remained beside the mountain ramp;
restrict the correction to liquid cells and retain solid mountain/cut underlay
heights. The steps also remain after that reversion: no claim of repairing the
mountain-ramp composition is made by this liquid-bank fix.

Final local game views: lava bank beside passage 1–4 (no exposed teeth), river
1–2 (continuous bank), mountain 2–3 and high-cliff 3–5 (no new open seams).
The no-save/level-20 weapon fixture is used; teleport-only views do not prove
walking/collision acceptance. Geometry tests cover all eight closed skirt loops,
75 river/50 lava bank rays, roads/brook beds/warnings/decks. `check:world`,
`check:polish`, `check:art`, `build` PASS; top-land count remains 69,361 triangles,
no new shadow light or extra boundary draw. Build retains the large-chunk warning.
Final `check:docs` and normal `git diff --check` PASS. An attempted diff check
with `core.autocrlf=false` treated existing CRLF endings as trailing whitespace;
the repository's normal Git conversion passes. No line-ending rewrite or Git
configuration change was retained. Final production output again contains no
preview HTML or selected-unit/motion QA strings.
During final tab cleanup, rebinding the owned catalog tab 57 timed out twice at
the browser focus command, including after closing three temporary tabs. The
motion-preview capture and preceding game inspection succeeded; this is not
silently counted as a successful final catalog reopen. Cause is Unverified.

Inspectable ignored captures in `yandex-output/visual-finish/`:
`imp-v20-pair-2026-10-04.png`, `smith-v20-world-2026-10-04.png`,
`venom-v20-world-2026-10-04.png`, `gargoyle-v23-world-2026-10-04.png`,
`wisp-v23-world-2026-10-04.png`, `goblin-v23-world-2026-10-04.png`,
`raider-v23-pair-2026-10-04.png`, `boar-v23-pair-2026-10-04.png`,
`cliff-lava-bank-2026-10-04.png`.
Pending acceptance stays separate from these
technical results. No paid generation, commit, ZIP or console publication.

### Goblin prototype after rejected sculpt pass · 2026-10-03

The user rejected the segmented goblin. Smoothing/detailing its separate parts
had not achieved the approved reference. On review of the available generation
route the connected fal account reported exhausted credits; no upload/job was
submitted. The user explicitly chose continued work without paid generation.
The current route is entirely local code-authored mesh/skinning, with no engine
migration, external asset dependency or payment.

Source inspected again: `docs/references/visual/ruinstead-creature-style.png`.
Prove this one coherent goblin mesh and its motion before propagating the route
to other species. Technical checks and implementation coverage do not replace
human art acceptance.

- [x] Author one connected, baked head/ears/neck/torso/limb surface for ordinary
  and elite goblins; remove the previous disconnected goblin surfaces.
- [x] Bind it through `GoblinSkin.ts` to an eight-joint skeleton carried by the
  existing head/arm/leg/knee pose anchors. Eyes, tusks and weapon grips keep those
  same frames. Skinning changes presentation, not collision or damage timing.
- [x] Fit expressive eye/nose/ear forms and a leather costume. Garment boundaries
  are shaded in the bind frame; they do not detach while the body bends. Elite
  mass, fitted shoulder armor, tusks and existing faint aura remain.
- [x] Check idle/walk/wind-up/strike and ordinary/elite scale in the motion preview,
  then actual forest gameplay/combat. Local ignored captures:
  `yandex-output/visual-finish/goblin-skinned-*-2026-10-03.png`.
- [x] Bake, run check:art and build. Added meaningful baked-topology, normalized
  weights, palm-to-arm, finite deformed attack/gait vertices, shared geometry
  lifetime and pre-render translated/scaled bounds regressions.
- [ ] Human approval against the goblin reference; broader catalog redesign,
  all boss/hero motion and actual physical-device acceptance remain open.

Earlier bake `2026-10-03-goblin-skin-v7`: 372 shared surfaces, 182,470 triangles,
2813 KiB. Ordinary goblin: 6,444 total triangles (4,244 in its skin); elite:
7,362 (4,296 in skin). Geometry/weights are shared; skeleton and costume material
are owned per instance. This measures geometry, not weak-PC rendering performance.

Concrete failures found and repaired during this prototype: unused old goblin
constructor failed typecheck; interpolated vertex-color costume edges looked
patchy; low palms were erroneously weighted to thighs; updateWorldMatrix bypassed
the skin bind-inverse update, inflating newly translated/scaled bounds. Preserve
these observations and the regression evidence. A local preview reload timed out;
a fresh owned tab worked. Browser render logs had no shader/runtime errors;
normal localhost SDK-unavailable warning remained. The no-save combat harness
used health protection, so this is visual integration evidence, not difficulty QA.

The prototype is active locally but provisional. No claim of reference parity,
full creature completion or release readiness. No commit/ZIP/upload/publication.

Further local style iteration completed: fuller fitted eyes/irises and brows,
leaf ears rising closer to the reference, small baked garment-edge/cuff thickness
in the same connected mesh. Bind-frame lapel stitches, cuff studs and boot seams
remain attached during deformation; skin, leather and elite metal get distinct
roughness/metalness. Agent inspection found the elite's little crown lump weak;
removed it, retaining heavier anatomy/armor/tusks/aura as the veteran silhouette.

v7 manual evidence: desktop in-app browser 1280×720, ordinary idle/wind-up 78%/
strike 8%, same-scale pair, both walking from a rear-quarter view; actual no-save
media forest pack and battle with DEV health protection enabled (visual evidence,
not difficulty QA). Captures `goblin-local-v7-idle-2026-10-03.png`,
`goblin-local-v7-pair-2026-10-03.png`, `goblin-local-v7-combat-2026-10-03.png`
under `yandex-output/visual-finish`. No preview shader/runtime errors; game had
only the expected localhost SDK-unavailable warning. Fresh page 52 was used
after the previous owned page 50 was no longer present. AX identified a diagnostic
summary as a button while DOM did not; fresh DOM text located it successfully.
The slider scrubs the full attack cycle, so fixed wind-up/strike buttons were used
for the stated phase percentages. No production UI change was made for these.

PASS: final v7 check:art, typecheck and build; build retains its existing >500 kB
chunk warning. No paid generation or new mechanics. Human art and latest physical
phone/weak-PC review remain pending; refinement is not human approval.

User follow-up: eyes still read as detached from the face. The v7 rigid white/pupil
layers used the previous forward facial depth although the connected skull was
shallower. v8 fixes the actual surface fit: orbital forms belong to the continuous
skin and eye whites/irises are shaded on that same bind-frame surface. Separate
eye plates/pupils were removed. Regression checks measure actual eye-bearing skin
vertices against the animated head transform across gait and attack, not just a
rigid eye's neck parent. Previous visual inspection missed this defect.

The v8 review also found two concrete problems: a cached older manifest triggered
the authoring fallback, and outer elite-boot vertices beyond the old X cutoff
were incorrectly assigned to the weapon arm. The loader now versions both file
URLs; a fresh preview loads the baked pair without fallback warnings. The entire
low boot envelope follows the legs, with coverage for wide elite toes, and the
shoulder transition is continuous in height. Elite profile wind-up was rerun;
the long stretched boot triangles disappeared. These failures remain recorded.

Current v8 bake: 372 surfaces / 182,388 shared triangles / 2812 KiB. Complete
ordinary goblin 5,498 triangles (4,202 skin), elite 6,418 (4,256 skin). Art/type/build
PASS includes actual eye-region motion, full boot attachment and real-loader cache
key regressions. Final manual review: ordinary frontal idle and profile wind-up;
elite profile wind-up 78%/strike 8%, plus an actual no-save forest pack at the normal
game camera. Preview has no shader/runtime/fallback warning; game only has the
expected localhost SDK warning. This patch's field check did not use health
protection or test combat difficulty. Physical-device/human art approval still open.
Captures: `goblin-eye-v8-*-2026-10-03.png` under `yandex-output/visual-finish`.

### Continuous creature rollout · 2026-10-03–04 (implementation checked locally)

User found the v8 whites spilling onto the nasal slope. v9 raises/narrows/widens
the orbital placement, lowers the nose tip and leaves a clear narrow bridge.
The motion harness now has a goblin face close-up carried by the animated head.
Art/typecheck PASS; frontal close-up and rotated wind-up were inspected.
User subsequently accepted the goblin as the working baseline ("Ладно, сойдет")
and asked to move to the remaining mobs. Approval is scoped to this goblin;
it does not close world/mob/device/reference acceptance.

Milestones / owning modules:
- [x] Correct goblin nasal/eye separation; preserve attachment regressions.
- [x] Replace mammal skin assemblies: `MammalForms`, `CreatureSculpt`,
  `MammalSkin`, `CreatureModels`; inspect five families and matching bosses.
- [x] Extend the accepted coherent anatomy/material language to remaining
  humanoid, reptile, insect, bird and soft/stone creature families.
- [x] Review all 40 ordinary/elite pairs and 24 boss designs in the gallery,
  representative family attack phases and all eight regions in the actual game.
  Preserve species scales, population, collision/reach/rewards and save IDs.
- [ ] Close full boss/hero motion, new-family human art and physical-device
  acceptance; static portraits and representative phases do not prove this.
- [x] Bake and art/type/build/docs gates for final v17; reconcile owning specs/state.

Risks: distorted weights at touching jaws/feet/tail, shader projection spilling
onto another facial region, lost boss identity or generic elite silhouettes,
startup geometry growth and physical-device performance. Gates: actual baked
topology/skin motion/attachment/disposal checks, shared camera + gameplay review;
compilation is insufficient. No paid generation, new mechanics or publishing.

Initial mammal implementation replaces head/neck/ears/four legs and tail beads
with one connected skin using existing animation. First motion review exposed
the old rigid jaw still being constructed: replaced by a jaw bone in the skin.
Facial shader derivatives inside conditional branches drew dotted white limits;
evaluate them unconditionally with bounded AA. Re-inspected boar: seams gone.
Preview shadow bias was aligned with the existing world/release preview practice;
the shader derivative repair, not shadow bias, removed the dotted seams.

#### Rollout results · 2026-10-04

- Connected mammal skins cover 17 ordinary/elite/boss variants across boar,
  jackal, feline, hound and ram; the former solid jaw is now an animation anchor.
  Matching boss identity ornaments remain, and elbows/paws/jaws follow the
  original motion. Coat/eyes/nose/hoof pigment belongs to the skin.
- The shared eight-anchor route covers 26 humanoid variants, including harpies;
  equipment retains its grips. Fitted cloth/plate relief replaces rigid garment
  slabs. Harpy head plumes and shoulder mantle are joined; wings/talons retain
  their anchors. Smith goggles are pigment on the skull, not floating plates.
- Eleven reptile variants have a joined jaw/body/leg/tail surface, a real oral
  cavity and closed curved wing membranes. Bird/soft/segmented binders cover
  15 variants; segments bend rather than separating the face from the body.
  These coverage totals overlap where a shared face route decorates a skin.
- 44 remaining fitted faces paint their eyes on the exposed head surface.
  Stone/sand/scrap giants receive coherent skull/orbit/nose volumes; intentional
  stone plates and individual boss ornamentation remain articulated.
- Elites use shoulder/neck/jowl mass, contrasting mantles and larger keratin;
  imp/gargoyle chest/cranial crests, harpy crown/collar, reptile dorsal sails and
  serpent neck frills supplement growth and the existing subtle aura.
- Final bake `2026-10-04-creature-skin-v17`: 217 shared surfaces, 220,396 shared
  triangles, 3290 KiB; largest complete model 9,680 triangles (limit 13,000).
  Shared geometry/weights survive instance cleanup; owned skeleton/materials
  are disposed. No gameplay systems, population, rewards or saves changed.

Manual evidence: all eight regional galleries (40 pairs / 24 bosses), ordinary/
elite attack poses across every major family, and all eight actual game regions.
Final v17 reinspection covered spider, beetle, scorpion, serpent, gargoyle, harpy,
salamander, smith, boar and fire dragon. Faces/teeth/stingers stayed attached in
the inspected wind-up/strike states. The actual fire-dragon scene was reloaded
after the final bake; fresh logs contain only the expected localhost SDK warning,
with no shader error or asset fallback. Gallery/motion tabs remain inspectable.
Game art inspection enabled no-save QA protection: this is not difficulty/full
boss-fight acceptance. Current-machine frame counters are not a weak-PC benchmark.
Physical phone and new-family human approval remain Unverified.

Final captures under `yandex-output/visual-finish/`:
`boar-v17-pair-2026-10-04.png`, `spider-v17-pair-2026-10-04.png`,
`salamander-v17-pair-2026-10-04.png`, `dragon-v17-game-2026-10-04.png`;
dated v14 game/gallery captures preserve wider rollout review.

Failures investigated and repaired during the rollout:
- Boss ornaments were initially omitted from the shared skin path: preserve
  boss metadata and check individual ornaments on the actual constructed model.
- Narrow nasal/mouth cuts formed internal islands after bounds changed: remove
  cuts that serve only as lip lines; paint those lines on the connected skin.
- Marching-grid boundaries clipped long heads/mouths, including five scorpion
  faces: reserve skipped boundary cells per axis; fitted-face coverage is now 44.
  Assert no open baked boundary, plus outward closed wing winding.
- Solid reptile mouths/jaw vertices weighted to feet folded under attack: build
  a connected oral cavity and constrain jaw/foot weights by the authored regions.
- Eye center tests missed clipped aperture edges: fit nine center/perimeter
  probes and test the full opening. Test containing skin triangles, not a raw
  vertex-count proxy, then exercise actual head motion and owned cleanup.
- Fungus beard hid the eyes; lower it. Harpy head was bald; add joined plumes.
- Species-specific JS shader branches shared a cache key: use the same GLSL
  program with kind uniforms, retaining separate per-instance face data.
- Spider upper eye projection hit the abdomen, with old gem inserts resembling
  extra eyes: remove inserts, lower the aperture and assert head-front depth;
  dark spider iris contrast is painted on the surface.
- Gallery inspection found several elites still too similar: add the joined
  crests/ruff/frill masses listed above, then repeat their affected pose checks.
- Mid-edit HMR used a newer author revision before the bake existed and emitted
  fallback warnings. Final fresh reload after v17 did not use that fallback.
- Initial region 2–4 QA clicks used the prior selected pack: those observations
  were not counted. Repeat with `К пачке` then `В бой`; all eight regions reviewed.

Final `check:art` and `build` PASS (build includes TypeScript). Build retains the
existing large-chunk warning (2687.51 kB uncompressed JS); this is not device
performance acceptance. Latest standalone sculpt and `check:docs` gates PASS;
`git diff --check` finds no whitespace errors (only existing Git LF/CRLF notices).
Broader release,
campaign, balance, live SDK and device gates were not repeated for this render-only
rollout. No commit, paid generation, release ZIP, console upload or publication.

The remainder below records earlier world/visual phases, not the v17 bake snapshot.

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
