# Agent-driven game development SDD audit

## Status and scope

Completed · 2026-10-03. Documentation only, following the user's new audit
request. Preserve the preceding local visual implementation; do not change
application code, assets, gameplay, build configuration or test infrastructure.
The existing SDD structure and automatic spec-maintenance contract remain.

## Systems and milestones

1. [x] Read AGENTS, every spec, state/roadmap, QA scripts/config and architecture.
2. [x] Add missing visual-reference/prototype/data/harness/evidence/asset/review
   principles to their existing owners, with a compact operating map in AGENTS.
3. [x] Correct evidenced stale reference/asset-use claims; preserve historical evidence.
4. [x] Run docs gate; inspect new reference links and prose/code consistency;
   verify no runtime/config/script changes since this audit began.
5. [x] Record additions and remaining self-validation limits; move to completed.

## Acceptance and risks

No duplicate gameplay/domain specifications, mandatory JSON/editor refactor,
unnecessary new harness or invented device/style acceptance. Trivial asset
replacements need no spec churn unless they change intended visual behavior.
Keep automated contract checks distinct from human visual/feel approval.
CURRENT_STATE changes only to correct actual state; ROADMAP only for remaining work.

Baseline SHA256 of 194 non-Markdown files under src/public/scripts/.github and
root HTML/JSON/Vite configuration:
`a9e3c8b61071a59d705df537e5d4635100ffe61471abec96376f9ac277926316`.
Public SOURCE.md metadata is documentation and excluded from this runtime hash.
Check: docs-only QA_RELEASE gate, manual reference-index review, diff whitespace,
and identical file count/hash. Do not rerun application/device gates as proof of
this documentation task; earlier visual checks belong to VISUAL_FINISH.

## Findings and corrections

- Existing automatic spec maintenance, trivial-fix exception, plan/completion
  rules and functional authority remain intact. AGENTS gained only a short map
  to the owning workflow/reference/harness documents, without becoming a full manual.
- ARCHITECTURE now owns prototype-first behavior/debug/presentation/integration
  workflow and separation of logic, typed content, world data, balance and asset
  metadata. Existing mixed modules/procedural coefficients are documented exceptions;
  no JSON conversion/editor or broad refactor was performed.
- WORLD_CONTENT gained the reference-through-in-game asset pipeline adapted to
  authored/baked surfaces, retained GLBs, bitmaps and procedural audio. It includes
  source/license/recipe traceability, scale/anchors/hit/interaction alignment and
  isolated/style/integration review. Equivalent trivial asset swaps do not force
  spec churn. Existing art constraints remain in their original owner.
- QA_RELEASE now inventories existing harnesses, requires reuse before unnecessary
  new tooling, records DEV/no-save/mock/release isolation and inspectable evidence,
  and separates AUTOMATED ACCEPTANCE from HUMAN VISUAL/FEEL ACCEPTANCE.
  FEATURE_TEMPLATE and the Approved visual feature link these rules.
- New docs/references/visual/README.md is warranted by repeated lost/conflicting
  visual directions. It indexes the two confirmed official gameplay sources and
  distinguishes supplementary cover direction. No new harness or separate duplicate
  art manual was warranted. VISUAL_BACKLOG now links the index.
- Gobkit SOURCE.md had stale active Bat/Goat/Owl assignments and an unsupported
  current hash-preservation assertion; current compatibility/rig use is explicit,
  old assignment/history retained and verification limits stated.
- UI_UX_LOCALIZATION incorrectly said boss bonuses were nonmodal. GameUI.offer
  and HudScene show chest_reward alone is nonmodal; boss offers pause through the
  confirmation container. Corrected documentation only, with evidence in DRIFT.
- DRIFT no longer treats the two excluded reference names as missing requirements.
  ROADMAP still contains remaining work, now explicitly naming human visual approval.
  CURRENT_STATE was inspected and unchanged in this audit: no product/state change
  required another snapshot. VISUAL_FINISH retains preceding work/checks and its
  outstanding acceptance, with the task switch recorded rather than false completion.

## Validation and outcome

- `npm run check:docs`: PASS, 25 canonical documents (new plan included).
- Additional read-only reference/source link check: PASS, five local links/anchors.
  These new reference/pack metadata files are outside the existing canonical
  validator's recursive scope; their content and links were reviewed explicitly.
- `git diff --check`: PASS; no whitespace errors. Failed patch-context attempts
  were corrected after inspecting the actual prose; no validator assertion changed.
- 194-file runtime/config/script SHA256 is identical to the baseline above.
  No runtime code, binary asset, test/validator, config, dependency or build change
  during this audit. Typecheck/build/gameplay/device/live SDK gates were not rerun
  for documentation only; previous visual checks are not presented as audit QA.

SDD is ready for normal agent-driven work. Self-validation remains bounded:
random spawn failure lacks a retained failing seed, full physical phone/weak-PC
and live platform/IAP checks remain open, and subjective style/feel requires human
review. The fixtures and reference index do not close those game acceptance gaps.
No commit, push, console mutation or publication.
