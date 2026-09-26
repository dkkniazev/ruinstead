# Gobkit free creature assets

Ruinstead loads a deliberately small subset of the official Gobkit free packs at runtime.

Official catalogue and licence metadata:
- https://gobkit.com/freebies
- https://gobkit.com/api/free

Licence: CC0 1.0 Universal / public domain. Commercial use is allowed and attribution is not required.

Active model families:
- Minion Pack: selected humanoid enemies
- Animal Pack: bat, corgi, rhino
- Animal Pack Vol.2: boar, goat, owl, rat, marmot

The loader keeps Ruinstead's own procedural model as a fallback. External models are only used when their silhouette matches the enemy; slimes, insects, golems, worms, spirits, serpents and dragons are intentionally not replaced by unrelated catalogue animals.

Gobkit states the files are plain glTF 2.0 GLB, CORS-enabled, low-poly and rigged/animated. Current packs expose named idle/attack/dead/walk clips; the loader also supports older single-timeline mirrors.
