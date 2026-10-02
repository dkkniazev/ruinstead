# Repository operating contract

This repository uses Spec-Driven Development (SDD). Specifications describe
**WHAT** must be true; execution plans describe **HOW** to implement it.

## Every non-trivial task

1. Read this file and [PROJECT_SPEC](docs/specs/PROJECT_SPEC.md).
2. Inspect the relevant current implementation, tests and configuration before editing.
3. Read the relevant domain/active feature specs linked by PROJECT_SPEC.
4. Determine whether intended behavior changes; update its spec in the same task.
5. Implement within scope, run the relevant gates in [QA_RELEASE](docs/specs/QA_RELEASE.md),
   and reconcile specs, implementation, tests and status documentation.

The agent decides which specs need maintenance; do not ask the user to make
that administrative decision. Changes to product/gameplay, architecture,
persistence, economy, progression, platform/monetization, UI/input, content rules
or release requirements require corresponding spec updates. A fix restoring an
existing contract, trivial cosmetic edit or implementation-only change does not
require artificial spec churn. Prefer updating the owning spec to duplicate documents.

Persist new user decisions in the owning spec; do not leave the final rule only
in chat. Create a feature spec from [FEATURE_TEMPLATE](docs/specs/FEATURE_TEMPLATE.md)
for a substantial new contract; omit irrelevant sections. Mark proposals Draft,
accepted work Approved, completed contracts Implemented, superseded ones Deprecated.
Do not describe planned work or a fixture result as implemented/live-verified behavior.

## Resolving conflicts

Within repository sources, use this priority:

1. Current explicit user instruction.
2. Active feature specification.
3. PROJECT_SPEC.
4. Architecture/domain specifications.
5. Automated behavioral tests and invariants.
6. Existing implementation.
7. Older/general documentation.

Explain a material conflict and update lower-priority sources when an intentional
decision supersedes them. Investigate unclear evidence rather than copying old
README rules. Mark insufficient evidence **Unverified**. This ordering does not
override higher-level system/developer instructions.

## Scope and compatibility

Preserve behavior outside the task. No unrelated refactors, UI redesigns, API
renames or balance changes; supporting refactors must be required by the contract.
Never silently remove compatibility behavior or weaken tests to get a PASS.
Consider save migrations, duplicate rewards/double spending, non-negative balances,
progression gates, platform callbacks, localization, desktop/touch input, and
visual/interaction alignment where affected. Art changes preserve gameplay rules
unless explicitly requested; dynamic/localized state must remain dynamic.

## Plans and evidence

For multi-system or multi-stage work, create/update a plan in
[docs/exec-plans/active](docs/exec-plans/active), with affected modules, milestones,
risks and validation after each phase. Keep it current; move completed plans to
[docs/exec-plans/completed](docs/exec-plans/completed). Plans never replace specs.

Run meaningful checks for the change; compilation alone is insufficient. Add
regression coverage for a concrete behavioral risk. Record failures, investigate
their cause, repair task-caused failures and rerun relevant checks. A subsequent
PASS does not erase an intermittent failure. Do not broaden testing without a
remaining risk or required gate. Manual visual/device/live-SDK checks are required
when fixtures cannot establish the relevant acceptance condition.

## Completion

Report behavior and important files/specs changed, exact validation performed and
results, manual checks performed, and remaining limitations/Unverified items.
Keep [CURRENT_STATE](docs/CURRENT_STATE.md) and active plans accurate when status
changes; do not rewrite historical reports as if they were today's verification.
Do not claim completion while required acceptance work remains.

## README maintenance

README.md is a human-facing project overview.

When a task materially changes:
- the product description;
- major implemented features;
- supported platforms;
- project structure;
- development/build commands;
- release status;

update README.md in the same task.

Do not update README.md for trivial fixes.

README.md must remain consistent with the current project specifications,
but detailed behavioral contracts belong in docs/specs/ rather than README.md.

When README.md conflicts with current implementation and specifications,
treat the specifications plus verified implementation as authoritative
and correct README.md.