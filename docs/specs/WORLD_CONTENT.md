# World, content and presentation

## Layout and content ownership

`src/game/world/ReleaseRegionMap.ts` owns eight irregular region polygons and
12 passages in a 14500×16600 coordinate envelope. This envelope is not a single
walkable empty field. `src/game/world/WalkableWorld.ts` resolves boundaries and
gate access; `src/game/world/RegionPaths.ts` owns routes;
`src/game/world/ReleaseWorldContent.ts` defines 40 ordinary species;
`src/game/bosses/BossSystem.ts` defines eight main and 16 side bosses.
Three packs per species = 120 packs, with randomized sizes 3–8; three elites
per species = 120 elites, not three elites per region. IDs are save/bestiary keys.

Boundaries use authored geography: waterways, mountains, height differences
and cliffs. Preserve the user's region arrangement and actual passage graph;
do not replace polygons with isolated circles or arbitrary gaps. Straight-span
diagnostics at base speed currently give roughly 13–27 seconds; this is not a
guarantee for an obstacle-filled route or slowed/loaded gameplay.

## Geometry and interactions

`src/game/world/WorldTerrain.ts`, `src/game/world/RegionGeography.ts` and
`src/game/world/WorldWatercourses.ts` supply terrain/geographic samples.
`src/game/render3d/TerrainMeshes.ts`, `src/game/render3d/WatercourseMeshes.ts` and
`src/game/render3d/GeographyModels.ts` present them. Logical XY walkability and
obstacle footprints govern collisions, while sampled height aligns feet/roads,
bridges and danger markings. Visual terrain changes must not block intended
paths or allow bypasses. Boss spawn bodies stay clear of passages/resources.

Region cliff skirts meet the unchanged plateau rim and extend below the lowest
authored valley/water floor. Adjacent panels share their band vertices; broad
rock bevels and colour variation follow position rather than a separate random
value at each small panel. Their hidden lower edge must not emerge as repeated
teeth beside bridges or waterways. This is presentation geometry, not a new
height/walkability sampler or collider.
Mixed liquid/plateau bank cells continue the flat liquid beneath the opaque
skirt, rather than exposing upward-sloping underlay triangles in the channel.
Solid mountain/cut underlay retains its existing heights.

`SettlementLayout.ts` owns the four base building locations/dimensions, forge
and well footprint. Renderer, placement, Phaser solids and enemy navigation
consume those records. Buildings/well block actors; empty awnings are not full
walls. Ground solids exist through repair stages, while roofs/decorations are
not additional blockers. Spawn, banking and forge interaction approaches stay
clear. Starter wood is east of the workshop with canopy clearance; generated
resource candidates also avoid these ground footprints.

Resource nodes have logical durability/collision and type-specific visual cues;
decorative vegetation does not silently become a harvest node. Resource layouts
are seeded/stable across reload; opened chests and progression persist, node
HP/cooldowns and loose pickups do not. See [ECONOMY_BALANCE](ECONOMY_BALANCE.md).

## Creature and hero presentation

`src/game/render3d/CreatureCatalog.ts` maps 64 species/boss identities to authored
models. `src/game/render3d/CreatureModels.ts`, `src/game/render3d/CreatureAnatomy.ts`,
`src/game/render3d/CreatureFaces.ts` and `src/game/render3d/CreatureSculpt.ts` define
surfaces. World and portraits share identity/creation; normalized combat body
radius remains separate from protruding horns, wings, weapons and tails.

Current local baked data in `public/assets/models/creature-sculpt` contains
217 shared surfaces, 220,540 shared triangles (~3292 KiB), revision
`2026-10-04-creature-skin-v23`; this is a snapshot,
not a performance target. `src/game/render3d/CreatureMotion.ts` animates articulated
parts, not a physics ragdoll. Weapon sockets must follow the hand; face, fangs,
horns and stingers must follow their parent throughout idle/move/attack/recovery.
`src/game/render3d/CreatureAura.ts` provides subtle animated elite aura/ground effects
for all 40 elite variants; effects must not inflate HP-label/portrait bounds.
Elites also use anatomy/armor differences, not aura alone.

The earlier segmented goblin was rejected by the user. Its local replacement
uses one connected baked head/ear/body/limb mesh, with `GoblinSkin.ts` binding it
to eight bones carried by the existing pose anchors. Skeleton and material are
owned per instance; geometry and weights are shared. Small leather-edge/cuff
thickness is baked into the same skin. Fitted costume shading and seam details
use the bind frame, so garment edges follow deformation; skin/leather/metal
have distinct roughness. Eye whites/irises are shaded on the orbital regions of
that same deforming skin, with no separate eye plates or pupil meshes. Surface
preload requests both the manifest and binary with the current sculpt revision
in their cache keys to avoid loading an older pair after an update.
The user accepted the goblin as the working creature baseline on 2026-10-03
and directed work toward the remaining mobs. Its narrower, higher eye apertures
leave a nasal bridge and stay above the nose tip. This is scoped creature approval,
not full visual/reference or release acceptance.

`MammalForms.ts` owns authored boar/jackal/cat/hound/ram proportions;
`MammalSkin.ts` carries one connected head/ears/body/legs/tail surface through the
existing head, jaw, four leg and tail anchors. Eyes, nose and coat markings belong
to that deforming surface; tusks/horns/whiskers remain attached head details.
Elite mammals have heavier shoulder/neck/jowl volumes, contrasting mantles and
larger keratin features, retaining the shared aura. Matching bosses retain their
identity ornaments and original world scale.
`HumanoidForms.ts` authors humanoid mass/face profiles; the eight-anchor skin
binder also covers rogues, cultists, knights, ogres, smiths, imps, gargoyles and
harpies; harpy wings/talons retain their separate motion anchors.
Fitted garments/plate relief and face colour stay in the skin; intentional
weapons, shields and boss ornaments follow their existing attachment joints.
`ReptileForms`/`ReptileSkin` provide connected head/jaw/body/leg/tail skins with
closed curved wing membranes. Bat/owl skins and connected soft/segmented skins
reuse existing motion anchors through `BirdSkin.ts` and `SmallCreatureSkin.ts`.
`SurfaceFace.ts` projects remaining fitted face pigment in an immutable authored
frame. Its center and perimeter are fitted to the exposed head surface, including
the entire aperture; it must not project a second pair onto a nearby abdomen.
Stone/sand/scrap giants retain deliberate material facets and articulated plates,
but use a coherent skull/orbit/nose with unobscured painted eyes. Their broad
brows belong to the head surface, not separate blocks concealing the face.
These are render-only routes: no combat radius, attack, spawn or save changes.
Ogre/imp/harpy/smith/gargoyle expressions use fitted brow, nostril and lip pigment;
masked rogues/cultists have fitted brows inside the hood aperture and restrained
hood/cuff seams. Each humanoid kind owns its material regions: goblin metal
shoulder/vest masks must not produce metallic spots on another kind's cloth/skin.
the smith's beard/chin mass belongs to the connected skin. Insect boss body
replacement targets the actual face-bearing shell, preserving dorsal plates
without turning a plate into a second body over the eyes. Mandibles/fangs keep
the eye aperture clear. Whole-model visibility checks complement face attachment
checks: attached eyes can still be concealed by unrelated geometry. Adult dragon/
wyvern bosses retain their authored horns rather than an intersecting extra pair.
Elite gargoyles/imps have a broad chest and cranial crest; elite harpies have a
taller plume crown and contrasting shoulder mantle. Reptile elites have taller
joined dorsal sails and heavy jowls; elite serpents have a broad joined neck
frill. These silhouettes complement world-scale growth and the existing aura,
rather than relying on one small extra ornament. Dark spiders and beetles use
contrasting painted irises, so their faces remain readable without floating eye
plates. Gargoyle eyes remain uncovered by the knight visor's pigment. Wisps use
one closed faceted crystal core, with face pigment on that surface; rings stay
below the aperture and satellites behind it. Flame satellites also stay behind
the face. Elite giant decorations must not cross the eye openings.
Sculpt bounds reserve the marching-grid boundary cells on every axis, so long
mouths/tails are not clipped by a nominally sufficient bounding box. Baked surfaces
must have no open boundary; closed wing membranes also retain outward winding.
New-family human art approval and latest device acceptance remain open.

Current surfaces include species-specific canine/goat/feline heads and body
proportions, coherent veteran fur mantles, convex beetle wing cases, painted
worm/serpent segments, a closed freckled fungus cap and connected harpy/owl
feather fans. Root colossus, moss ogre, insect, rock and predator bosses have
independent mass profiles; existing individual equipment remains on other bosses.
This describes local implementation, not approval of every design or animation.

The user's 2026-10-03 creature reference is the cover goblin preserved in the
[reference index](../references/visual/README.md): compact coherent volumes,
fitted expressive eyes/muzzles, broad leaf ears and brown leather/simple steel.
The authored families are intended to follow this language, with intentional
chitin/stone/metal differences; full visual acceptance remains open.
`CreatureScale.ts` owns presentation
profiles: short goblin/imp, adult human, low heavy boar, longer predators,
larger giants and broad winged reptiles. Compare all five regional species
with the hero using one world-scale camera in the existing motion preview;
individual portrait fit is insufficient. Elite growth retains gameplay radius
as an input, plus mature anatomy/equipment; damage/reach/radii are unchanged.
Existing boss world-scale factors are retained separately from normal profiles.

The active catalog does not use the older Bat/Goat/Owl GLBs. Assets/loaders remain
for compatibility/rig coverage; do not remove them on the assumption they are
current active creatures. Hero skins share articulation through
`src/game/render3d/HeroSkinModel.ts`; orbiting weapons mirror gameplay cycles.
`HeroArmorForms.ts` supplies shared closed helmet/shoulder/breastplate surfaces.
Metal and darker rims meet along the same geometry rather than intersecting
stacked ellipsoids; per-hero palette materials still follow skin selection.
These forms preserve the existing hero rig/grips and all gameplay skin bonuses.
Hero ankle pivots keep support soles on the existing neutral terrain plane while
the torso leans/bobs; swing feet retain their lift. This is presentation kinematics,
not body physics, per-foot terrain navigation or a change to movement speed.

## Art workflow and constraints

Visibility culling and `src/game/render3d/MeshBatching.ts` reduce render work;
they must not disable gameplay outside the camera. Resource/building labels
remain dynamic/localized at the accepted size, with quality fixed independently
of oversized icons. The approved art backlog is [WORLD_VISUAL_POLISH](features/WORLD_VISUAL_POLISH.md).

`TreeForms.ts` supplies shared closed bark/canopy surfaces; living harvest trees
use connected foliage and buttressed trunks, with rigid meshes batched together.
Keep their established height/footprint and fewer than 1500 triangles per living tree.
Brook banks feather into existing terrain; low grouped pebbles/reeds are decorative,
stay clear of bridge decks and add no obstacles or harvest targets. Shore layers
sample the actual Float32 vertex coordinates before computing height; water
stays in the existing corridor. Bound the complete instanced scenery of each
brook to fewer than 25000 triangles; no new light, bloom or dense startup sculpt.

`ForestUnderstory.ts` composes low walk-through beds in regions 1/3/5/6:
at most four beds, four shared shrubs and 64 shared leaf instances per 640-unit
chunk, below 33 units high and fewer than 6500 triangles. Keep the whole bed
clear of roads (70 units beyond its footprint), passages, geography and the
settlement (650 units). Instance buffers are released on chunk removal; shared
surfaces remain reusable. Sparse acacias use one connected umbrella canopy.
Road wear is shader colour within existing ribbon geometry; it changes no
route width or height. Restored houses have continuous stone plinths and fitted
stone/timber courses inside their established footprints.

`ContactBursts3D.ts` adds short contact flashes/puffs to recorded hits and faint
distance-driven hero footfall dust. The fixed pools retain 32 hit contacts and
16 footfalls, at most two added draws, without lights, texture requests, damage
events or lasting halos. Telegraph contrast bands stay inside the existing
danger geometry; appearance must never imply a shorter attack range.

## Asset workflow

Before changes to environments, characters, enemies, bosses, UI, animation or
important props, inspect the applicable [visual reference index](../references/visual/README.md)
and its actual gameplay material. Record the source/view inspected in the task
plan or report. Missing reference evidence is Unverified; do not substitute an
unrelated cover or present a guessed style as an approved decision. References
guide presentation, while specs retain authority over behavior and constraints.
UI behavior/readability remains owned by [UI_UX_LOCALIZATION](UI_UX_LOCALIZATION.md).

Use the applicable steps for the actual asset route; do not force a GLB/bitmap
export workflow onto code-authored surfaces or procedural audio:

1. Establish reference, intended role and functional constraints. For a new
   content mechanic, use the prototype-first workflow in [ARCHITECTURE](ARCHITECTURE.md).
2. Author/generate/import with traceable sources. Code-authored surfaces live in
   render3d; the sculpt generator is `scripts/creature-sculpt-bake.mjs` and its
   outputs are manifest.json/surfaces.bin. External packs already keep SOURCE.md
   and LICENSE.txt beside vendored GLBs. For a substantial new generated/external
   pack, record origin/license or generation recipe, source/output paths and
   intended active/compatibility/provisional use. Keep required source/recipe
   recoverable; a machine-specific temporary path alone is insufficient.
3. Normalize only where needed: finite geometry/outward normals, units/orientation,
   pivot/ground contact, local textures/materials, rig and bounds. Bitmap cleanup
   includes transparency, sampling and intended display size. Procedural audio
   stays in GameAudio; imported sound would need provenance, levels, loop/end
   review and the existing pause/mute lifecycle. Do not create unused audio files.
4. Preview through shared production model/UI constructors in the appropriate
   existing harness. Check scale and anchors, visual collision/hit-area agreement,
   interaction coordinates and idle/move/wind-up/impact/recovery alignment. Include
   same-camera ordinary/elite comparisons; portrait auto-framing can conceal size.
5. Compare silhouette, material separation, composition and motion with the actual
   reference under representative game lighting/camera. Record concrete gaps and
   human-review status under [QA_RELEASE](QA_RELEASE.md#acceptance-gates).
6. Integrate through the existing catalog/loader/renderer; retain IDs, colliders,
   cooldowns, localization, visibility/batching and cleanup. After creature surface
   authoring changes (models/anatomy/materials/catalog/sculpt), run
   `npm run art:bake-creatures`, inspect output, then `npm run check:art`.
   Bake is a generator, not a test; stale baked hashes are failures. Select other
   gates from QA_RELEASE instead of treating every asset as a sculpt bake.
7. Verify in the actual game and affected desktop/touch contexts; produce practical
   inspectable evidence, including any harness-only overrides. Isolated preview
   success does not close scene-level/device acceptance or promote placeholders
   to final content. Link results from the plan; release still uses QA_RELEASE.

Retain existing metadata, licenses and historical observations when replacing an
asset. Do not infer active use from the presence of a file in public. Trivial
asset replacements that preserve intended visual behavior need no specification
churn; update metadata/generated outputs when affected. Changed style, animation,
readability, anchors or visual interaction semantics update the relevant contract
automatically under AGENTS, with new decisions persisted instead of chat-only.

## Validation and limits

`npm run check:world` covers layout/access/terrain; `npm run check:polish` seeded
formations/viewport calculations; `npm run check:art` catalog/baked geometry/rigs/
terrain/attachments/aura. None establishes aesthetic parity, every random spawn
or real GPU performance. Full comparisons of regions, mobs, elites and bosses
in gameplay and motion previews, readable battle silhouettes, resource collision
and phone/weak-PC rendering remain manual. Latest art is local, not certified as
the uploaded build. Current spawn reliability risk is open.
