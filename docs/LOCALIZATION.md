# Russian and English

The Yandex SDK chooses the language before the game is constructed. Outside Yandex Games, browser language is used; `?lang=en` or `?lang=ru` can be used for a direct check. Unsupported languages fall back to Russian.

`src/i18n/EnglishCatalog.ts` contains translations of Russian source text and message templates. Add an English entry whenever adding player-facing Russian text. Numbered placeholders must match, but English may reorder them. Definitions and save IDs remain language-independent: translate at display boundaries, after language selection.

`Localize.ts` handles DOM text and accessibility attributes, HTML templates, canvas labels, composed loot messages and numerical placeholders. `ReconcileDOM` localizes the incoming template without replacing active buttons. User-entered input values are preserved. No global DOM observer or game-state mutation is used.

Run `npm run check:i18n` and `npm run typecheck`. The catalog check extracts source strings from the shipped game, verifies coverage and placeholders, and checks composed rewards and multiline map text. It also runs as part of `check:release` and `release:pack`. The release manifest reads supported languages from `I18n.ts`. Also inspect new screens in English and Russian: source coverage cannot detect every runtime combination or CSS pseudo-element.

The developer-only media profile does not save to local storage or the cloud. Its level-20 hero has achievable level-4 Common weapons with one star and eight health/backpack upgrades. Enemy AI, damage, gathering and death use ordinary gameplay. Mobile capture emulates the touch controls at 896×504 and exports 1280×720; it does not replace a physical phone test.
