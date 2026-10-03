# Repository operating contract

This repository uses Spec-Driven Development (SDD). Specifications define **WHAT**
must be true; execution plans define **HOW** to implement it.

## Every non-trivial task

1. Read this file and [PROJECT_SPEC](docs/specs/PROJECT_SPEC.md).
2. Inspect the relevant implementation, tests and configuration before editing.
3. Read the owning domain and applicable feature specs linked by PROJECT_SPEC.
4. Automatically determine whether the request changes documented behavior;
   update the relevant spec in the same task. The user must not have to request
   spec maintenance or decide which documents need updating.
5. Implement within scope, run the relevant tests/sanity checks/builds in
   [QA_RELEASE](docs/specs/QA_RELEASE.md), and reconcile code, specs and documentation.

Product/gameplay, architecture, persistence, economy, progression, platform,
monetization, UI/input, content-rule and release-requirement changes need spec
maintenance. Fixes restoring an existing contract, trivial cosmetic edits and
implementation-only changes must not create unnecessary spec churn.

Persist new product/technical decisions in the owning spec during development,
then implement and validate them; never leave a superseding rule only in chat.
For a substantial new contract use [FEATURE_TEMPLATE](docs/specs/FEATURE_TEMPLATE.md)
and omit irrelevant sections. Use Draft / Approved / Implemented / Deprecated
honestly; planned work and fixture results are not implemented/live-verified behavior.

## Conflicts and scope

Within repository sources, priority is: current explicit user instruction →
applicable Approved/Implemented feature spec → PROJECT_SPEC → domain/architecture
specs → behavioral tests/invariants → implementation → older/general docs.
Draft proposals, Deprecated specs and completed plans are historical/proposal
evidence, not active overrides. This order never overrides system/developer rules.

Investigate material conflicts instead of copying an old README; explain the
conflict and update lower-priority sources when a decision supersedes them.
Mark insufficient evidence **Unverified**.

Preserve behavior outside the task. No unrelated refactors, redesigns, API
renames or balance changes; supporting refactors must be required by the contract.
Do not silently remove compatibility behavior or weaken tests to get a PASS.
Consider migrations, duplicate rewards/double spending, non-negative balances,
progression gates, platform callbacks, localization, desktop/touch and visual
interaction alignment where affected. Art preserves mechanics unless explicitly
changed; dynamic/localized state must remain dynamic.

## Game development map

For new mechanics, enemies, bosses, interactions or complex content, apply the
prototype-first workflow and data boundaries in [ARCHITECTURE](docs/specs/ARCHITECTURE.md).
Before changing environments, characters/enemies/bosses, UI, animation or important
props, inspect the applicable [visual references](docs/references/visual/README.md)
and follow the [asset workflow](docs/specs/WORLD_CONTENT.md#asset-workflow).
References guide style; owning functional specs remain authoritative.

When a mechanic or visual system is difficult to verify with existing tests or
normal gameplay, consider a reusable isolated developer/test harness instead of
repeating the full game flow. Reuse existing tooling first; do not add harnesses
for trivial features. [QA_RELEASE](docs/specs/QA_RELEASE.md#verification-harnesses-and-evidence)
owns harness isolation, inspectable evidence and the separate automated versus
human visual/feel acceptance gates.

## Plans and validation

Large, multi-system or multi-stage tasks need a plan in
[docs/exec-plans/active](docs/exec-plans/active): affected modules, milestones,
risks, validation per phase and acceptance. Maintain it during work; move it to
[docs/exec-plans/completed](docs/exec-plans/completed) when complete. No active plan
is required when no such work remains. Plans never substitute for feature specs.

Before completion run relevant checks/builds; compilation alone is insufficient.
Add regression coverage for concrete risks. Record failures, investigate, repair
task-caused failures and rerun relevant gates. A later PASS does not erase an
intermittent failure. Use manual visual/device/live-SDK checks when fixtures cannot
prove acceptance. Report checks not run and why; do not invent verification.

## Documentation maintenance and completion

Update [CURRENT_STATE](docs/CURRENT_STATE.md) only for meaningful changes to actual
implementation, limitations, blockers or release/validation state, or to correct
an evidenced inaccurate claim. Do not refresh it for every task, routine repeated
PASS or trivial edit; record those results in the task report/plan.

[ROADMAP](docs/ROADMAP.md) contains remaining work. When an item is completed,
remove it from future work or move its evidence to completed plans/history;
revise dependencies and active references. Keep unfinished acceptance checks
distinct from functionality already implemented.

Keep README consistent with specs/verified implementation. Update it only when
product scope, major features/platforms, structure, commands or release status
materially change; detailed contracts belong in the owning specs, not README.

A completed task must leave implementation, specifications, relevant tests and
documentation in agreement. Report important behavior/files/specs changed,
validation/results, manual checks and remaining limitations/Unverified items.
Do not claim completion while required acceptance work remains.
