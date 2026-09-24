import { setLanguageFromCode } from '../../i18n/I18n';
import { initializeYandexCloudSave } from './YandexCloudSave';
import {
  getYandexSdk,
  setYandexSdk,
  type YandexSdk,
} from './YandexSdk';

const SDK_PATH = '/sdk.js';

async function loadSdkScript(): Promise<void> {
  if (window.YaGames) return;

  await new Promise<void>((resolve, reject) => {
    const existing =
      document.querySelector<HTMLScriptElement>(
        'script[data-yandex-games-sdk]',
      );

    if (existing) {
      existing.addEventListener(
        'load',
        () => resolve(),
        { once: true },
      );
      existing.addEventListener(
        'error',
        () => reject(),
        { once: true },
      );
      return;
    }

    const script = document.createElement('script');
    script.src = SDK_PATH;
    script.async = true;
    script.dataset.yandexGamesSdk = 'true';
    script.addEventListener(
      'load',
      () => resolve(),
      { once: true },
    );
    script.addEventListener(
      'error',
      () => reject(),
      { once: true },
    );
    document.head.append(script);
  });
}

export async function initializeYandexPlatform():
  Promise<YandexSdk | undefined> {
  try {
    await loadSdkScript();

    if (!window.YaGames) return undefined;

    const sdk = await window.YaGames.init();

    resetYandexLifecycleState();
    setYandexSdk(sdk);
    setLanguageFromCode(
      sdk.environment?.i18n?.lang,
    );

    try {
      const safeStorage =
        await sdk.getStorage?.();

      if (safeStorage) {
        Object.defineProperty(
          window,
          'localStorage',
          {
            configurable: true,
            get: () => safeStorage,
          },
        );
      }
    } catch (error) {
      console.warn(
        'Yandex safe storage is unavailable.',
        error,
      );
    }

    try {
      const player = await sdk.getPlayer();
      await initializeYandexCloudSave(player);
    } catch (error) {
      console.warn(
        'Yandex player/cloud save is unavailable.',
        error,
      );
    }

    return sdk;
  } catch (error) {
    console.warn(
      'Yandex SDK initialization failed. Local mode remains available.',
      error,
    );
    return undefined;
  }
}

export type YandexGameplaySuspension =
  | 'visibility'
  | 'advertisement';

let gameReadyReported = false;
let gameplayRequested = false;
let gameplayReportedActive = false;

const gameplaySuspensions =
  new Set<YandexGameplaySuspension>();

function syncYandexGameplay(): void {
  const api =
    getYandexSdk()?.features.GameplayAPI;

  if (!api) return;

  const shouldBeActive =
    gameplayRequested &&
    gameplaySuspensions.size === 0;

  if (
    shouldBeActive &&
    !gameplayReportedActive
  ) {
    api.start();
    gameplayReportedActive = true;
  } else if (
    !shouldBeActive &&
    gameplayReportedActive
  ) {
    api.stop();
    gameplayReportedActive = false;
  }
}

export function markYandexGameReady(): void {
  if (gameReadyReported) return;

  const loadingApi =
    getYandexSdk()?.features.LoadingAPI;

  if (!loadingApi) return;

  loadingApi.ready();
  gameReadyReported = true;
}

export function startYandexGameplay(): void {
  gameplayRequested = true;
  syncYandexGameplay();
}

export function stopYandexGameplay(): void {
  gameplayRequested = false;
  syncYandexGameplay();
}

export function suspendYandexGameplay(
  reason: YandexGameplaySuspension,
): void {
  gameplaySuspensions.add(reason);
  syncYandexGameplay();
}

export function resumeYandexGameplay(
  reason: YandexGameplaySuspension,
): void {
  gameplaySuspensions.delete(reason);
  syncYandexGameplay();
}

export function resetYandexLifecycleState(): void {
  gameReadyReported = false;
  gameplayRequested = false;
  gameplayReportedActive = false;
  gameplaySuspensions.clear();
}
