# Accepted art candidate: Git and Yandex draft refresh

## Status and authority

Completed · 2026-10-04. The user accepts the current visual version for release
and explicitly authorizes committing/pushing the local changes and replacing
Yandex draft 619868. This supersedes the earlier local-only restriction. It does
not authorize moderation, publication, purchase activation or a support message.
The user will upload gameplay video manually after the console's conversion timeout.
After receiving the old six-second file, the user requested a new 20–25-second
recording of current gameplay; this expands the media-delivery milestone below.
Owning contracts: [QA_RELEASE](../../specs/QA_RELEASE.md),
[PLATFORM_MONETIZATION](../../specs/PLATFORM_MONETIZATION.md),
[WORLD_VISUAL_POLISH](../../specs/features/WORLD_VISUAL_POLISH.md).

## Scope and risks

Ship the existing creature/hero/terrain changes, supporting QA and SDD records.
No further visual redesign or balance change. Keep save compatibility and normal
production entry. Inspect the working tree and remote main before Git mutations.
The previously recorded random spawn startup failure remains a concrete release
risk; retain any failure from the candidate gates and repair a demonstrated
blocking defect before packaging. Missing physical-device/full-campaign/live-IAP
checks remain Unverified; art acceptance for this release is not reference parity.

## Milestones

1. [x] Review local/remote changes; run all full-candidate gates in QA_RELEASE.
2. [x] Build/package, identify ZIP hash/content and check production isolation/startup.
3. [x] Replace draft archive, save and verify console processing/file identity.
4. [x] Reconcile release/state/art acceptance records; commit and push reviewed changes.
5. [x] Record and inspect a fresh 20–25-second MP4, provide it for manual upload.

## Evidence

Initial console inspection: draft 619868 still references archive 13658626,
last changed 10:34:25 02/10/2026, archive status Ready. Horizontal gameplay video
shows a pending-processing notice; the user supplied the conversion-timeout notice.
Existing local file: `yandex-output/store-assets/ruinstead-gameplay.mp4`,
7,718,238 bytes, modified 2026-10-01. It predates the latest art and is not claimed
as a recording of this candidate. Preserved; superseded for upload by the new clip below.

Keep candidate hash, console archive ID/save timestamp, check outcomes, Git commit
and push result here. Completion requires both the upload and push to be verified;
an attempted action or available local ZIP is not completion.

### Candidate evidence

- Fresh `git fetch origin`: main and origin/main both at 4b19302, no divergence.
  Inspected changes are art, existing isolated QA and supporting documentation;
  no nested gitlink or package/dependency change. No runtime edits in this task.
- All full-candidate checks pass on first run: docs, balance, world, gameplay,
  polish, regressions, art, campaign, release/i18n (973 strings). TypeScript/build
  pass; large-chunk warning retained. Ordinary `git diff --check` passes. No new
  spawn-import failure in this task; the historical intermittent issue stays open.
- `node scripts/package-release.mjs` follows the current release/build gates:
  34 ZIP entries exactly match dist, root index, 36,374,393 uncompressed bytes;
  SHA256 `b164a4d8063e7c1174b8605bd9289c4c60909d33386ed1b73518d59f19d30d31`.
  Bundle `index-CYHY40v-.js`; no preview HTML or DEV-harness strings in production.
- First console upload denied access due to stale console session. After reload,
  upload succeeds as archive 13720751; saved 18:11:08 04/10/2026. At final inspection
  all three archive stages are green, Ready; last change 18:22:35 04/10/2026.
  Original file was 13658626. No moderation/publication performed.
- Actual Russian draft startup loads the exact new bundle and `/sdk.js`; loading
  screen disappears, world/HUD and existing level7 save display normally. No game
  errors; one deprecated Ticker.setFPS warning comes from an external ad script.
  Closed the platform ad; no resource/reward/spend/save-fixture actions performed.
  This does not establish cloud recovery/live-IAP or full normal-play acceptance.
- Capture: `yandex-output/release-draft-startup-2026-10-04.png` (actual hosted
  production startup, no QA overrides). Final Ready console proof:
  `yandex-output/release-draft-2026-10-04.png`.
- Runtime/art candidate committed and pushed to origin/main as `dfae1a8`.
  Follow-up contains only the DEV recorder and reconciled delivery documentation;
  the uploaded production bundle is unchanged.

### Hosted-art discrepancy and new recording

The user supplied a screenshot of the legacy painted 2D renderer at the same
Russian draft URL, including after an incognito launch. A new agent-opened tab
renders current 3D models, has the exact current bundle and a second aria-hidden
Three.js canvas. No game warning reports failed Three construction. The cause
on the user's Yandex browser also occurred at the local address. The existing
renderer selects compatibility art when the WebGL2 probe fails. After browser
graphics troubleshooting the user confirms the picture is now correct. The exact
driver/settings cause remains Unverified; no renderer or compatibility code changed.

Reuse `media-capture.html`: 25-second recorder, optional timed cuts at 0/6/12/18
seconds through base walk, crystal, forest pack and lava-golem encounter. Ordinary
achievable mid-game fixture equipment, no protection or real saves. No altered
attack/damage/drop rules. This DEV-only recorder is excluded from the ZIP.
Validate actual output duration/resolution and inspect the recorded scene phases;
wall-clock recording status alone does not prove the file's duration.

### New MP4 delivery

`yandex-output/store-assets/ruinstead-gameplay-2026-10-04.mp4`: **23.339867 s**,
**1280×720**, **16,912,909 bytes**, SHA256
`aa0f5a3726ec501f9c434cad0770ee7607ddd9a14739b2b36ffcdbe75dafca16`.
Recorded the actual current Three.js canvas, without DOM HUD or audio. Scene
cuts use the existing mid-game media fixture, not a normal campaign recording;
game damage and death remain active. No invulnerability or real saved progress.
Local exported file loaded in a separate video review page: metadata/decoding
PASS, no media error, frames at 1/8/14/20/23 seconds inspected. Settlement,
region 2 resource area, forest melee and lava boss are visible, including the end.
The 25-second wall-clock take contains 23.34 seconds of encoded video.

Initial direct data-URL export was truncated; a larger chunk export then hit a
tool timeout/reset. Neither partial file is delivered. The ordinary download
control saved the full 16,912,909-byte MP4 in Downloads; copied it to the project
output and independently reviewed that file. The old October 1 file is retained.
The new MP4 is provided locally for user upload; the console video conversion
timeout is not claimed fixed. Follow-up `check:docs`, TypeScript/Vite build and
`git diff --check` PASS. All 34 rebuilt production files match the uploaded ZIP
byte for byte; the known large-chunk warning remains. No runtime release gate
was weakened or fixture acceptance invented.
