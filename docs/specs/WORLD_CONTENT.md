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
299 shared surfaces, 98,201 shared triangles (~1541 KiB); this is a snapshot,
not a performance target. `src/game/render3d/CreatureMotion.ts` animates articulated
parts, not a physics ragdoll. Weapon sockets must follow the hand; face, fangs,
horns and stingers must follow their parent throughout idle/move/attack/recovery.
`src/game/render3d/CreatureAura.ts` provides subtle animated elite aura/ground effects
for all 40 elite variants; effects must not inflate HP-label/portrait bounds.
Elites also use anatomy/armor differences, not aura alone.

The active catalog does not use the older Bat/Goat/Owl GLBs. Assets/loaders remain
for compatibility/rig coverage; do not remove them on the assumption they are
current active creatures. Hero skins share articulation through
`src/game/render3d/HeroSkinModel.ts`; orbiting weapons mirror gameplay cycles.

## Art workflow and constraints

After surface-authoring changes (materials/anatomy/models/catalog/sculpt), run
`npm run art:bake-creatures`, review generated assets, then `npm run check:art`.
Bake is a generator, not a test. Stale baked authoring hashes are failures.
Visibility culling and `src/game/render3d/MeshBatching.ts` reduce render work;
they must not disable gameplay outside the camera. Resource/building labels
remain dynamic/localized at the accepted size, with quality fixed independently
of oversized icons. The approved art backlog is [WORLD_VISUAL_POLISH](features/WORLD_VISUAL_POLISH.md).

## Validation and limits

`npm run check:world` covers layout/access/terrain; `npm run check:polish` seeded
formations/viewport calculations; `npm run check:art` catalog/baked geometry/rigs/
terrain/attachments/aura. None establishes aesthetic parity, every random spawn
or real GPU performance. Full comparisons of regions, mobs, elites and bosses
in gameplay and motion previews, readable battle silhouettes, resource collision
and phone/weak-PC rendering remain manual. Latest art is local, not certified as
the uploaded build. Current spawn reliability risk is open.
