# Gobkit enemy assets

Ruinstead self-hosts a small, deliberately curated subset of Gobkit's free model catalogue.

Current use, checked 2026-10-03: Bat/Goat/Owl binaries and their loader remain
for compatibility and rig checks. The active CreatureCatalog currently assigns
no `asset` field to any creature, so these files are not the active creature
presentation. See [WORLD_CONTENT](../../../../docs/specs/WORLD_CONTENT.md).

Official catalogue and machine-readable metadata:
- https://gobkit.com/freebies
- https://gobkit.com/api/free

License: **CC0 1.0 Universal / public domain**. Gobkit's official metadata states that these free models may be used for commercial or personal projects without attribution.

Vendored models (retained, not currently active catalog assignments):
- Bat: https://gobkit.com/freebies/animal/Bat.glb
- Goat: https://gobkit.com/freebies/animalB/Goat.glb
- Owl: https://gobkit.com/freebies/animalB/Owl.glb

The binaries were copied into this repository so the Yandex Games build has no
runtime dependency on gobkit.com. Hash preservation was reported during vendoring;
no source-versus-binary hash verification was performed in this documentation audit.

## Historical assignment audit

Visual audit (2026-09-26): Bat was assigned only to cave-bat; Goat to cliff-ram
(Горный козёл); Owl to dust-vulture (Пустынный филин). Four unused cyclops/minion
files were reported removed. Those assignments are historical, not the current
mapping in src/game/render3d/CreatureCatalog.ts. License/source records remain.
