export type LanguageCode = 'ru' | 'en';

// Only advertise languages with a complete, verified player interface.
export const SUPPORTED_LANGUAGES: readonly LanguageCode[] = ['ru', 'en'];

let currentLanguage: LanguageCode = 'ru';

export function normalizeLanguageCode(value: string | undefined): LanguageCode {
  const requested = value?.toLowerCase().split(/[-_]/)[0];
  return SUPPORTED_LANGUAGES.find(language => language === requested) ?? 'ru';
}

export function initializeLanguageFromBrowser(): LanguageCode {
  currentLanguage = normalizeLanguageCode(
    navigator.languages?.[0] ?? navigator.language,
  );

  return currentLanguage;
}

export function setLanguageFromCode(value: string | undefined): LanguageCode {
  if (value) {
    currentLanguage = normalizeLanguageCode(value);
  }

  return currentLanguage;
}

export function getLanguage(): LanguageCode {
  return currentLanguage;
}
