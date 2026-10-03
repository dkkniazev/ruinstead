# UI, input and localization

## UI architecture and interaction

`src/game/ui/GameUI.ts` and `GameUI.css` render DOM HUD/panels, with event contracts
in `src/game/ui/HudEvents.ts` and node reconciliation in `ReconcileDOM.ts`.
`src/game/ui/WorldMap.ts` provides mini/full map; `ModelPortraits.ts` reuses models.
`src/game/layout/Viewport.ts` calculates desktop/touch layouts. Ordinary panels
and full map pause gameplay. The post-chest bonus is nonmodal and does not pause;
boss-reward and other confirmation offers use the modal confirmation container
and pause through HudScene. These are distinct current flows, not a global
combat/interaction lock. Closing the modal resumes its UI-owned pause.

Desktop movement is WASD/arrows, dash Space/Shift; touch has a virtual joystick
and action buttons through `src/game/input/TouchPlayerInput.ts`. E/click uses
the current resolved interaction, not a global forge shortcut. Avoid duplicate
listeners/actions after HUD updates or scene restart. Button animation alone
is not acceptance: one press must produce one intended action.

Current workflows include weapon tabs/damage sorting, five slots and hero
upgrades; forge selection with separate list/action areas; bank/base/production
and sales; bestiary claim count/gold frames; shop/skins/pets/themes; quests,
return, potions, sound/cloud settings, death and reward panels. Availability
must reflect logical range/cost/ownership/provider state, not only disabled CSS.
Current forge opening/upgrade has a UI proximity guard; scene upgrade/fusion
handlers do not recheck range. This boundary is documented in PROGRESSION and
must be considered when changing event dispatch or panel behavior.

## Readability contract

Mobile mini map stays clearly at top right with menu below, without overlap;
menu items collapse through the compact control. Health/potion state must remain
readable during combat, including the nearby action-area health display. Building
models/labels show purpose and repair state. Harvest durability exposes progress.
Resource/building labels keep the accepted size; improve text sampling/quality
without scaling icons beyond the objects. Avoid labels obstructing combat silhouettes.
Resource labels resolve overlap in screen space: the recently harvested node
has priority, then distance. Preserve its projected label size; move other labels
by at most two short rows, with a fine leader to the original anchor. Hide lower
priority labels if no clear position is available. Labels never change harvesting
availability, collision, durability, interaction priority or resource state.

Current code implements responsive layouts, but latest phone/browser raster
quality, repeated taps, short landscape heights and browser/Yandex chrome remain
manual acceptance. A layout calculation fixture is not a screenshot/touch test.

## Language boundary

`src/i18n/I18n.ts`, `Localize.ts`, `EnglishCatalog.ts` and `source-strings.json`
own RU/EN selection/translation. SDK environment language wins on-platform;
browser/URL fallback applies outside it. Translate at display boundaries:
DOM, prompts, world labels, portraits, errors, quest/reward templates, descriptions.
Internal IDs, save keys, catalog product IDs and numerical mechanics stay stable.
Do not embed localized/dynamic text in static art. Store-card translations are
separate release metadata, not the runtime catalog.

[LOCALIZATION](../LOCALIZATION.md) explains the existing collection workflow.
`scripts/collect-i18n.mjs` scans TS outside QA/i18n and writes the source catalog;
`scripts/i18n-sanity.mjs` invokes collection and checks coverage/templates, including
rewarded prompts. It is not a linguistic review and does not comprehensively
discover CSS-only/browser/SDK text. Review generated diff rather than assuming
the check is read-only; new display phrases must have English mappings.

## Validation

`npm run check:polish` for viewport calculations; `npm run check:regressions`
for action/state contracts; `npm run check:i18n` for catalog coverage;
`npm run check:release` for platform/UI boundaries; build/typecheck when code changes.
Manual: desktop and phone landscape with browser chrome; mini-map/menu, potion
visibility, last weapon in long forge list, single-tap actions, bestiary rewards,
all panels, nonmodal chest bonuses and modal boss-offer/resume flow in both
languages. Check new/old saves,
long English/Russian labels and maximum inventory/currency values.
