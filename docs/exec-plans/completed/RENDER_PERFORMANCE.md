# Render performance investigation

Completed local application pass · 2026-10-05; started 2026-10-04 after severe
Yandex Browser lag reports. Historical isolated baseline was about 805 draws /
549k triangles at the settlement. Original-browser investigation was stopped
by the user; exact configuration cause and broader release/device acceptance
remain Unverified. This plan does not claim all performance work is complete.

Owning contracts: [ARCHITECTURE](../../specs/ARCHITECTURE.md),
[WORLD_CONTENT](../../specs/WORLD_CONTENT.md), [QA_RELEASE](../../specs/QA_RELEASE.md).
Preserve accepted creature art, population, simulation, timing, saves and UI size.
No population reduction or new balance. Use existing isolated polish harness;
do not mutate user/cloud progress or claim fixture performance as physical-device QA.

## Milestones

1. [x] Instrument reusable DEV render counters/timings and GPU diagnostics; record
   same-camera settlement/forest/boss baseline, separating startup from steady state.
2. [x] Optimize evidenced render/CPU work without changing art/mechanics; test
   culling boundaries, attachments, hidden shadows and resource ownership risks.
3. [x] Compare representative scenes at identical viewport/profile, walk/teleport
   between regions, check visual interaction/animation/labels and logs.
4. [x] Run relevant docs/art/gameplay/regression/build checks; reconcile specs/state
   and report measured improvement and unverified user-browser/device limits.
5. [x] Verify game performance in the affected Yandex Browser's isolated
   configuration. Main-profile repair was removed from scope by the user on
   2026-10-05 after reporting smooth Yandex gameplay on a weaker work PC.
   - [x] Separate user-data directory restores hardware WebGL on RX 9070 XT.
   - [x] User local media-scenario screenshot records 166 FPS / hardware RX 9070 XT.
   - Main-profile cause remains Unverified; no repair or workaround acceptance
     is claimed. User explicitly asks to stop investigating that configuration.
6. [x] Inspect further application render/startup costs; select only evidenced
   improvements, preserving visuals, population, mechanics and save behavior.
7. [x] Implement bounded improvements with regression coverage for concrete risks;
   compare representative scenes and record actual cost/draw changes.
8. [x] Run relevant gates/build, reconcile specs/state/roadmap and complete this
   local optimization pass before planning Android development separately.

## Investigation and risks

Latest release code is main `5e93477`; working tree initially clean. Reuse
`/?playtest=polish&scenario=media` with ordinary equipment/damage/no saved progress.
Any protection used solely to sustain profiling is disclosed separately from combat QA.
Potential costs: per-frame hidden scene traversal, large moving shadow map, complex
skinned bounds/constructor work, world resource DOM reads/writes and terrain churn.
Measure before selecting fixes. Shader compilation/first encounter and continual
frame work are different risks. A compatibility renderer is not a performance fix.
Historical random spawn-import failure remains open unless specifically repaired.

Reference index and existing scoped art approval inspected. This task preserves
the approved art rather than reauthors surfaces/style; no new reference parity claim.
Spec maintenance is needed only for new render/tooling contracts, not every cache fix.

## Evidence

The entries below follow the investigation timeline. Pending checks at an
earlier stage are superseded by the final October 5 scope/verification section.

Local IAB uses hardware ANGLE / Radeon RX 9070 XT, drawing buffer 1280×720.
The user subsequently supplied matched Yandex/Edge diagnostics: Yandex runs at
6 FPS / 157.7 ms, buffer 2560×1288, with ANGLE Microsoft Basic Render Driver
(0x0000008C); Edge runs at 165 FPS / 6.1 ms, buffer 2552×1261, with ANGLE AMD
Radeon RX 9070 XT. Microsoft identifies this Basic Render Driver adapter as
software rendering in its [DXGI documentation](https://learn.microsoft.com/en-us/windows/win32/direct3ddxgi/d3d10-graphics-programming-guide-dxgi).
The original configuration's software backend is confirmed; its exact block cause
remains Unverified. A later clean-directory report restores hardware WebGL; see below.
Official [Yandex instructions](https://browser.yandex.ru/help/ru/troubleshooting/connection)
place the option under Settings → System → Performance and require a browser
restart. The user was asked for its current state; no flags, policies, GPU drivers
or browser settings were changed by the agent.

Follow-up user screenshot confirms the hardware-acceleration checkbox is already
enabled. Disabled user preference is therefore not the current explanation.
Application renderer creation already requests `powerPreference: 'high-performance'`;
this is a browser hint, not proof of which backend is used. Requested the affected
Yandex Browser's `browser://gpu` Graphics Feature Status / Problems Detected /
Log Messages. The connected UI inventory exposes only Codex IAB and MCP Apps,
not the actual Yandex Browser. A read-only Win32_Process diagnostic was denied
access and provided no process/flag evidence; no settings were changed.

User-provided `about-gpu-2026-10-04T17-58-04-873Z.txt` (report export
17:57:08 UTC) confirms YaBrowser 26.8.0.0 has `GPU modes blocklist: HARDWARE_GL`,
`angle=d3d11-warp`, software WebGL/compositing/canvas and a zero GPU-process crash
count. The displayed browser command line has no explicit GPU-disable or renderer
override switch; this does not rule out internal policy or earlier failures.
Dawn enumerates the RX 9070 XT and integrated Radeon as available D3D12 adapters;
its D3D11 WebGPU-backend blocklist is not proof that AMD's Direct3D11 driver fails
for WebGL. Reported errors are failure to retrieve overlay video-device info and
an unsupported EGL context version; neither identifies the original block cause.
Earlier repeated-GPU-crash suggestion remains a hypothesis, not an established
diagnosis. The next user-operated diagnostic is the [official Yandex games
troubleshooting step](https://browser.yandex.com/help/ru/troubleshooting/media):
temporarily enable only Override software rendering list, fully restart, then
inspect actual WebGL/GPU and the game's frame rate. This is a compatibility-list
override, not a change to sandbox/security flags; if unstable, restore Default.
No browser flag/restart/driver change has been performed by the agent, and success
is pending user evidence. No new runtime change or repeated application build is
needed for this report-only follow-up.

### Affected-browser override did not restore hardware · reviewed 2026-10-05

Second user report `about-gpu-2026-10-04T18-45-48-115Z.txt` (18:45:44 UTC)
contains `--ignore-gpu-blocklist` in the browser command line, confirming the
suggested flag was applied. Hardware GL is still blocklisted; the active backend
remains D3D11 WARP, with zero GPU-process crashes and the same overlay/context
errors. The user's game screenshot remains at about 7 FPS / 141.6 ms. This
remediation FAILED; do not keep proposing it as a pending or proven solution.
Recommend restoring its Default value because it provided no benefit.

Read-only local device diagnostics identify both AMD adapters as Status OK /
ConfigManagerErrorCode 0: RX 9070 XT driver `32.0.31041.1004`, integrated Radeon
driver `32.0.21045.5002`, both dated 2026-08-17. Installed Yandex browser executable
is `26.8.4.893` (the GPU report normalizes the browser version to `26.8.0.0`).
No mandatory/recommended YandexBrowser policy keys exist at the four checked
HKLM/HKCU registry locations; this narrow check does not rule out every policy
delivery mechanism. The first read-only registry query had a PowerShell syntax
error, then was corrected; no registry writes or browser/driver changes occurred.

Edge hardware rendering on this same machine and earlier physical-phone user QA
are evidence against a universal failure. They cannot establish the affected
player percentage or current Yandex-device acceptance. Users whose browser
selects software rendering can face severe 3D lag; application code cannot treat
an available WebGL2 context as proof of hardware acceleration. The originating
Yandex hardware-mode rejection remains Unverified. A browser update check and an
isolated browser/profile comparison are further diagnostics, not established fixes.
The next requested comparison is a full browser exit/relaunch with Ruinstead
tabs closed, recording WebGL / GL_RENDERER / mode blocklist before opening the
game. This separates an already-software browser startup from a change observed
after game launch.
Keep release/device acceptance open; do not add an automatic art downgrade or
promise a working production software-renderer mode from these measurements.

### Follow-up startup report · 2026-10-05

User supplied `about-gpu-2026-10-05T03-12-59-684Z.txt` in response to the
before-game startup check. It still reports software Canvas/compositing/WebGL,
D3D11 WARP active, HARDWARE_GL blocklisted and zero GPU-process crashes. The
`--ignore-gpu-blocklist` switch is absent again. The report itself does not contain
tab history; treating it as before-game evidence relies on the requested user
scenario, not an agent-observed browser session. Restoration is not verified.

Prepared ignored local helper `yandex-output/performance/open-yandex-gpu-check.cmd`.
It launches the already installed browser at the verified Program Files path,
opens `browser://gpu` and supplies a new, randomly named user-data directory under
the helper's ignored output folder. No browser launch was executed by the agent.
The supported [Chromium user-data-directory override](https://chromium.googlesource.com/chromium/src/+/HEAD/docs/user_data_dir.md)
isolates both profile data and per-installation local state; actual Yandex
acceptance of that override must be inspected in the new report. No remote debug
port, new executable, driver installation, security flag or existing-profile
deletion is involved. User should avoid sign-in/import/sync in that test window.
This is a local diagnostic artifact, not a production feature or a proven fix.
Current candidate/browser readiness and affected-player prevalence remain open.

### Clean browser directory restores hardware WebGL · 2026-10-05

User report `about-gpu-2026-10-05T03-20-52-225Z.txt` (03:20:47 UTC) confirms
the helper's `--user-data-dir` was honored, with isolated directory
`yandex-output/performance/yandex-gpu-clean-22634-19653`. RX 9070 XT is now
ACTIVE, ANGLE uses `d3d11` instead of `d3d11-warp`, Canvas/compositing/WebGL
are hardware accelerated, `Software Rendering: No`, and GPU-process crash count
is zero. The previous HARDWARE_GL mode-blocklist row is absent. This validates
hardware restoration in the isolated configuration, not game frame rate yet.

The same installed browser and AMD drivers work on hardware with different
saved browser data. The original failure is therefore associated with existing
configuration/local state; the specific setting or cause remains Unverified.
The unsupported EGL-context error also occurs in this working hardware report
and cannot alone identify the earlier block cause. No original browser data,
registry, settings or drivers were modified by the agent.

Requested the existing no-save media playtest and a short walk in this same
clean window, reporting game FPS/GPU before enabling sign-in/import/sync.
The diagnostic helper creates a new random directory on every invocation;
it is not a daily launcher or a save migration. Actual clean-window game
performance, original-configuration repair and release/device acceptance are
still pending. This evidence does not establish the affected-player percentage.

The follow-up game check initially had no listening local instance. Restarting
Vite failed with EBUSY while watching a locked Cookies file in the diagnostic
browser directory under `yandex-output/`. Excluded that existing ignored output
directory from Vite's development watcher; source watching remains enabled.
This restores the local test server without modifying browser data or game behavior.
Restart on strict port 5175 remains running after repeated HTTP 200 checks of
the playtest HTML and transformed `src/main.ts`; no further watcher error was
emitted. `npm run check:docs`, `npm run build` and the scoped diff check PASS;
the existing large-JS-chunk warning remains. The subsequent user screenshot
confirms local game FPS in the clean Yandex configuration, as recorded below.

### User local game performance in clean Yandex · 2026-10-05

User attachment `codex-clipboard-21bdd4fd-968e-4c93-bd47-844b9fcb6324.png`
records the requested no-save media scenario in region 1 at (6280,10863):
166 FPS / 6.1 ms, simulation time 100%, CPU 3D 2.3 ms (render 2.0),
707 draws / 497k triangles, buffer 2560×1312 and ANGLE hardware RX 9070 XT.
Terrain is 49 active / 49 resident / 49 built. The reported software-renderer
6–7 FPS slowdown is absent in this local clean-window scene. Camera, viewport
and scene counts differ slightly from the original screenshot; do not attribute
the full difference to application optimization or claim a controlled FPS ratio.

The peak since startup/reset is still 1786.1 ms; no reset or transition-isolated
sample was supplied. This screenshot cannot prove startup/first-visit hitches,
full travel/combat, Yandex draft or weak-PC acceptance. Original configuration
repair remains open; the exact saved setting responsible is still Unverified.
Evidence copy: `yandex-output/performance/yandex-clean-game-after.png`.

Prepared `yandex-output/performance/open-ruinstead-yandex-clean.cmd` to reuse
the existing directory verified by the clean GPU report, opening the normal
local game URL. It checks that the directory/executable exist; repeated launches
do not create additional random browser directories. The agent has not executed
the launcher, migrated original saves or modified the main browser configuration.
The helper is a local workaround for review, not an accepted main-profile repair.

Baseline after DEV instrumentation: base (6280,10630), 843 draws / 565k triangles,
166 FPS / 2.4 ms CPU 3D (render 2.0, actors .2, labels .1). Forest pack warm:
930 draws / 627k, 165 FPS / 2.6 ms; first move transient 140.9 ms decaying peak.
Lava boss first move: 1608 draws / 761k, 74 FPS transient, peak 338.3 ms;
warm state 1548 draws / 728k / 4.0 ms CPU 3D. Boss then died and reward panel
paused the scene, so its zero FPS is not a performance failure. Protection was
enabled for sustained profiling; these measurements do not validate normal combat.
Random spawn placement differs across HMR reloads; draw totals are approximate
scene comparisons, not controlled same-seed benchmarks.

First changes: cache rigid scenery matrices, cull offscreen chunk shadow submission,
update chunk membership only on cell changes and share label viewport metrics.
Base after that stage: 796 draws / 565k, 165 FPS / 2.3 ms CPU 3D. Not a major FPS
gain on this hardware. Larger latency fix: reference-counted creature templates
reuse assembly/batching/bind data, with independent cloned rigs/materials.

Controlled Node benchmark against `5e93477` loads the same current baked geometry,
constructs 24 simultaneous units/species, five trials, median construction only:
goblin **47.05 → 4.39 ms**, boar **22.29 → 2.02**, magma-hound **13.67 → 1.77**,
lava-elemental **31.88 → 2.89**. This measures CPU model assembly, not GPU/FPS.
Ignored reproducible script/results: `yandex-output/performance/creature-benchmark.mjs`
and `.json`; source baseline retrieved from the named Git revision, no remote API.

First typecheck failed because SkeletonUtils.clone returns Object3D in its typing;
root is a cloned Group, corrected with explicit Group cast. Subsequent typecheck
and full art gate PASS. New assertions cover multi-instance geometry sharing,
independent bones/poses/materials, double disposal, final-template cleanup, cached
static world transforms, dynamic labels and offscreen chunk bounds. Bake retains
217 surfaces / 220540 triangles / 3292 KiB; only authoring hash changes.

Further browser review: all eight regions visited via existing live-unit/landmark
controls; ordinary/elite faces, wings, tails, shadow boundaries and resource
labels remain present. Walk near the base/brook: 224 units/s, 0 blocked frames
of 481; simulation time 100%. Temporary viewports 896×414, 1920×1080 and
3840×2160 were exercised and reset. Warm lava scene still runs 154–166 FPS on
the IAB Radeon at those sizes; this does not reproduce the user's Yandex lag.
Protected view was used for prolonged combat profiling, not normal-play acceptance.
First uncached lava entry after template sharing still peaks at 239–259 ms
(earlier decaying baseline about 338 ms; randomized scene counts differ).
Shader compilation/uncached terrain remain startup/first-visit work, not eliminated.

`SceneryChunkCache` now retains at most 121 chunks after cell updates, with only
the original 49 active; inactive cached chunks cannot submit shadows. Owned
buffers/materials are released on LRU eviction and teardown; immutable shared
surfaces survive. The cap trades bounded extra geometry residency for removing
rebuilds on nearby return trips. Regression checks exercise real Three groups,
revisits, distant teleports, visibility, eviction and repeated cleanup.
Actual base/brook route: first visit builds 7 new chunks (49→56) and peaks
27.8 ms; the repeated home→brook visit remains at 56 built / 49 active and peaks
2.6 ms after resetting the DEV peak. This is an observed local route, not a
guaranteed performance ratio on other devices. DEV peaks now hold the maximum
until explicit reset, avoiding loss of transient evidence.

Docs/gameplay/timing/regressions/world/polish/art and TypeScript/build checks
have passed during this pass, including the final post-cache build and doc check.
Build retains the large-JS-chunk warning; final bundle is `index-BzuoFwzQ.js`.
Hardware WebGL restoration and the user's local 166-FPS scene are confirmed only
in the separate clean configuration. Original-configuration repair and broader
route/draft/device acceptance remain pending; local optimizations alone do not
establish those results.
The expanded DEV QA panel can physically cover boss reward buttons; collapsing
it allowed ordinary mouse dismissal in this run. This does not prove the cause
of the earlier art-pass observation or a production UI defect.

## Further bounded application pass · 2026-10-05

The user reports smooth Yandex Browser play on a weaker work PC and asks to
stop the powerful-PC browser investigation. This is human feedback without
recorded FPS/device specifications; the original profile is not repaired.
Continue application work, then plan Android separately; no platform migration
or draft upload belongs to this pass.

### Selected costs and corrections

- Hidden-hero occlusion submitted mask/fill per rigid hero part, even in a clear
  scene. `HeroOcclusion3D` now submits two InstancedMeshes per shared geometry;
  matrices follow the current hero/outfit/weapon and source geometry updates.
  Reflected transforms retain the ordinary-mesh path. Source geometry is borrowed;
  owned instance buffers/materials release once.
- Base building matrices were recalculated each frame despite being rigid.
  They are frozen only after placement/rebuild. Camp animation is attached
  afterwards, and Sprite/light transforms stay dynamic.
- Building label scale traversed the base every frame. The exact previous
  scale formula now runs on resize or model replacement; dynamic state/text
  are preserved.
- Building upgrades removed instanced roofs without explicitly releasing their
  GPU instance buffers. `InstanceResources` handles replacement/teardown without
  releasing borrowed geometry/materials. This is an ownership fix; no numeric
  memory reduction has been measured.

The initial instancing variant passed transform tests but FAILED GPU comparison:
large absolute coordinates tinted visible hero pixels (up to 9314 changed pixels).
Centering overlay transforms around the hero reduced the error; a four-unit
depth-buffer mask margin then removed the visible tint while preserving geometry.
The reflected fallback also initially FAILED the matrix assertion after recentering:
manual matrix updates needed Three r186's forced world refresh/dirty marker.
Both failures were repaired and their relevant regressions/comparisons rerun.

### Controlled evidence

An ignored comparison uses the exact legacy overlay from Git `5e93477` and the
current production hero/overlay. Same hero instance, pose, camera, light, blocker
and geometry are rendered to stencil/depth targets. Sixty scenes cover default,
moss-guard and void-blade outfits; axe/sword/hammer/spear/daggers; near and large
world coordinates; and clear versus blocked views. All 60 reduce calls by at
least 80 and preserve triangle counts. The default axe overlay is **100 → 20**
calls (full controlled scene **154 → 74**). Worst frame difference is 29 of
172800 pixels above RGB error 6; worst occluded case is 22. Minor edge differences
remain, so this is not an exact pixel-identity claim or an FPS benchmark.

Construction audit additionally covers all 33 hero outfit entries × five weapons:
axe overlays become 20–36 calls rather than 100–124. Node art regressions cover
live instance/world transforms through motion/equipment/visibility, reflected
fallback, borrowed geometry and double cleanup. Real restored workshop roofs
emit exactly two instance-buffer dispose events across repeated cleanup; shared
geometry/material dispose counts remain zero. Static-parent/dynamic-child tests
retain live camp-like animation after static caching.

Local evidence (ignored, not production entries):
`yandex-output/performance/occlusion-compare.html`, `HeroOcclusionLegacy.ts`,
`occlusion-compare.json/.png`, `hero-overlay-audit.mjs/.json` and
`local-render-final.png`. The comparison calls production constructors; it is
a task diagnostic, not a separate game implementation.

### Verification and remaining scope

`npm run check:art`, `npm run check:gameplay`, `npm run check:regressions`,
`npm run check:world`, `npm run check:polish`, TypeScript and production build
PASS for the further render changes. `node scripts/art-sanity.mjs` PASS again
after the final roof-ownership addition; build/typecheck PASS again afterwards.
Final JS bundle is `index-ChT9waGd.js` (~2700 kB / 776 kB gzip); the existing
large-chunk warning remains. Release/I18N fixtures passed in the earlier cache
pass and were not rerun for these render-only changes; balance/campaign were
not rerun because mechanics/economy/gates are unchanged. Full fresh-save/live-SDK
and physical-phone acceptance are not asserted.
Final `npm run check:docs` and `git diff --check` PASS. Production inspection
finds only the normal `index.html` entry and no DEV playtest/GPU/profile/comparison
diagnostic strings in the JS bundle.

Final actual-game review at 1280×720 checks visible armor, occlusion behind a
base building, unchanged labels and live flame. The south-walk fixture from the
home return point met the storage collider (222/223 blocked frames), matching
the visible solid building; it is not a free-route speed measurement. The free
brook walk records **225 units/s, 0/243 blocked frames, simulation time 100%**.
These runs retain ordinary damage and population. Observed 59–98 FPS across
foreground/background QA interactions is not a controlled before/after sample;
the draw comparison above is the measured improvement. Console has only the
expected local SDK-unavailable warning and no render errors.

The browser viewport override did not change the DOM's actual 1280×720 size;
it was reset. Reused the existing `qa-viewports.html` iframe instead: the running
game was inspected at 844×390, expanded to 1280×720 and returned to 844×390.
Label sizes, base geometry, animated hero/camp and mini-map/menu separation
remain present after resize. Screenshots `local-render-phone.png` and
`local-render-resize.png` record that desktop emulation, not physical-touch QA.

Cold shader/terrain entries, the historical randomized spawn-import failure and
broader draft/device/travel acceptance remain open in ROADMAP. Completed caches
and original-browser repair are not future implementation items. The changes
remain local; draft archive 13720751 and Git origin are unchanged.
