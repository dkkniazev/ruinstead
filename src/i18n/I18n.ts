export type LanguageCode = 'ru' | 'en';

let currentLanguage: LanguageCode = 'ru';

export function normalizeLanguageCode(value: string | undefined): LanguageCode {
  return value?.toLowerCase().startsWith('ru') ? 'ru' : 'en';
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
