# Gobkit enemy assets

Ruinstead self-hosts a small, deliberately curated subset of Gobkit's free model catalogue.

Official catalogue and machine-readable metadata:
- https://gobkit.com/freebies
- https://gobkit.com/api/free

License: **CC0 1.0 Universal / public domain**. Gobkit's official metadata states that these free models may be used for commercial or personal projects without attribution.

Vendored runtime models:
- Bat: https://gobkit.com/freebies/animal/Bat.glb
- Goat: https://gobkit.com/freebies/animalB/Goat.glb
- Owl: https://gobkit.com/freebies/animalB/Owl.glb

The binaries were copied into this repository so the Yandex Games build has no runtime dependency on gobkit.com. The source mirrors used during vendoring preserve the exact file hashes. Ruinstead intentionally uses these models only for matching silhouettes; other enemy families keep their bespoke procedural model until a suitable asset is selected.

Visual audit (2026-09-26): Bat is assigned only to cave-bat; Goat to cliff-ram (Горный козёл); Owl to dust-vulture (Пустынный филин). Four unused cyclops/minion files were removed. All other species use explicit articulated Ruinstead models. Runtime mapping: src/game/render3d/CreatureCatalog.ts.
