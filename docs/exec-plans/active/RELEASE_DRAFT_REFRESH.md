# Accepted art candidate: Git and Yandex draft refresh

## Status and authority

In progress · 2026-10-04. The user accepts the current visual version for release
and explicitly authorizes committing/pushing the local changes and replacing
Yandex draft 619868. This supersedes the earlier local-only restriction. It does
not authorize moderation, publication, purchase activation or a support message.
The user will upload gameplay video manually after the console's conversion timeout.
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
3. [ ] Replace draft archive, save and verify console processing/file identity.
4. [ ] Reconcile release/state/art acceptance records; commit and push reviewed changes.
5. [ ] Provide the existing local gameplay MP4 for the user's manual upload.

## Evidence

Initial console inspection: draft 619868 still references archive 13658626,
last changed 10:34:25 02/10/2026, archive status Ready. Horizontal gameplay video
shows a pending-processing notice; the user supplied the conversion-timeout notice.
Existing local file: `yandex-output/store-assets/ruinstead-gameplay.mp4`,
7,718,238 bytes, modified 2026-10-01. It predates the latest art and is not claimed
as a recording of this candidate. Preserve it and provide it as requested.

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
  upload succeeds as archive 13720751; saved 18:11:08 04/10/2026. Processing is
  complete, automatic verification is pending. Original file was 13658626.
- Actual Russian draft startup loads the exact new bundle and `/sdk.js`; loading
  screen disappears, world/HUD and existing level7 save display normally. No game
  errors; one deprecated Ticker.setFPS warning comes from an external ad script.
  Closed the platform ad; no resource/reward/spend/save-fixture actions performed.
  This does not establish cloud recovery/live-IAP or full normal-play acceptance.
- Capture: `yandex-output/release-draft-startup-2026-10-04.png` (actual hosted
  production startup, no QA overrides). Console proof will accompany task report.
