import { setLanguageFromCode } from '../../i18n/I18n';
import {
  initializeYandexCloudSave,
} from './YandexCloudSave';
import {
  getYandexSdk,
  setYandexSdk,
  type YandexPlayer,
  type YandexSdk,
} from './YandexSdk';

const SDK_PATH = '/sdk.js';

export const YANDEX_PLATFORM_STATE_EVENT =
  'ruinstead:yandex-platform-state';
export const YANDEX_PLATFORM_PAUSE_EVENT =
  'ruinstead:yandex-platform-pause';
export const YANDEX_PLATFORM_RESUME_EVENT =
  'ruinstead:yandex-platform-resume';

export type YandexPlatformState = {
  available: boolean;
  authorized: boolean;
  cloudReady: boolean;
  deviceType:
    | 'desktop'
    | 'mobile'
    | 'tablet'
    | 'tv'
    | 'unknown';
};

export type YandexAuthorizationResult =
  | 'authorized'
  | 'already-authorized'
  | 'unavailable'
  | 'declined'
  | 'error';

let platformState:
  YandexPlatformState = {
  available: false,
  authorized: false,
  cloudReady: false,
  deviceType: 'unknown',
};

let activePlayer:
  YandexPlayer | undefined;
let subscribedSdk:
  YandexSdk | undefined;

const sdkPauseHandler =
  (): void => {
    suspendYandexGameplay(
      'platform',
    );
    window.dispatchEvent(
      new Event(
        YANDEX_PLATFORM_PAUSE_EVENT,
      ),
    );
  };

const sdkResumeHandler =
  (): void => {
    resumeYandexGameplay(
      'platform',
    );
    window.dispatchEvent(
      new Event(
        YANDEX_PLATFORM_RESUME_EVENT,
      ),
    );
  };

function emitPlatformState(): void {
  window.dispatchEvent(
    new CustomEvent<YandexPlatformState>(
      YANDEX_PLATFORM_STATE_EVENT,
      {
        detail: {
          ...platformState,
        },
      },
    ),
  );
}

function detectDeviceType(
  sdk: YandexSdk,
): YandexPlatformState[
  'deviceType'
] {
  try {
    const info =
      sdk.deviceInfo?.();
    const type =
      info?.type;

    if (
      type === 'desktop' ||
      type === 'mobile' ||
      type === 'tablet' ||
      type === 'tv'
    ) {
      return type;
    }

    if (
      info?.isMobile?.()
    ) {
      return 'mobile';
    }

    if (
      info?.isTablet?.()
    ) {
      return 'tablet';
    }

    if (
      info?.isTV?.()
    ) {
      return 'tv';
    }

    if (
      info?.isDesktop?.()
    ) {
      return 'desktop';
    }
  } catch {
    // Browser fallback below.
  }

  return 'unknown';
}

function subscribeSdkEvents(
  sdk: YandexSdk,
): void {
  if (
    subscribedSdk === sdk
  ) {
    return;
  }

  if (subscribedSdk) {
    subscribedSdk.off?.(
      'game_api_pause',
      sdkPauseHandler,
    );
    subscribedSdk.off?.(
      'game_api_resume',
      sdkResumeHandler,
    );
  }

  sdk.on?.(
    'game_api_pause',
    sdkPauseHandler,
  );
  sdk.on?.(
    'game_api_resume',
    sdkResumeHandler,
  );

  subscribedSdk = sdk;
}

async function loadSdkScript(): Promise<void> {
  if (window.YaGames) return;

  await new Promise<void>(
    (resolve, reject) => {
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

      const script =
        document.createElement(
          'script',
        );

      script.src = SDK_PATH;
      script.async = true;
      script.dataset
        .yandexGamesSdk =
          'true';
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
      document.head.append(
        script,
      );
    },
  );
}

async function initializePlayer(
  sdk: YandexSdk,
): Promise<void> {
  const player =
    await sdk.getPlayer();

  activePlayer = player;
  await initializeYandexCloudSave(
    player,
  );

  platformState = {
    ...platformState,
    authorized:
      Boolean(
        player
          .isAuthorized?.(),
      ),
    cloudReady: true,
  };

  emitPlatformState();
}

export async function initializeYandexPlatform():
  Promise<YandexSdk | undefined> {
  try {
    await loadSdkScript();

    if (!window.YaGames) {
      emitPlatformState();
      return undefined;
    }

    const sdk =
      await window.YaGames.init();

    resetYandexLifecycleState();
    setYandexSdk(sdk);
    subscribeSdkEvents(sdk);

    platformState = {
      available: true,
      authorized: false,
      cloudReady: false,
      deviceType:
        detectDeviceType(sdk),
    };
    emitPlatformState();

    setLanguageFromCode(
      sdk.environment
        ?.i18n?.lang,
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
            get: () =>
              safeStorage,
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
      await initializePlayer(
        sdk,
      );
    } catch (error) {
      console.warn(
        'Yandex player/cloud save is unavailable.',
        error,
      );

      platformState = {
        ...platformState,
        cloudReady: false,
      };
      emitPlatformState();
    }

    return sdk;
  } catch (error) {
    console.warn(
      'Yandex SDK initialization failed. Local mode remains available.',
      error,
    );

    setYandexSdk(undefined);
    activePlayer =
      undefined;
    platformState = {
      available: false,
      authorized: false,
      cloudReady: false,
      deviceType:
        'unknown',
    };
    emitPlatformState();

    return undefined;
  }
}

export function getYandexPlatformState():
  YandexPlatformState {
  return {
    ...platformState,
  };
}

export async function requestYandexAuthorization():
  Promise<YandexAuthorizationResult> {
  const sdk =
    getYandexSdk();

  if (
    !sdk ||
    !sdk.auth
  ) {
    return 'unavailable';
  }

  if (
    activePlayer
      ?.isAuthorized?.()
  ) {
    return 'already-authorized';
  }

  suspendYandexGameplay(
    'platform',
  );
  window.dispatchEvent(
    new Event(
      YANDEX_PLATFORM_PAUSE_EVENT,
    ),
  );

  try {
    await sdk.auth
      .openAuthDialog();

    const player =
      await sdk.getPlayer();

    if (
      !player.isAuthorized?.()
    ) {
      return 'declined';
    }

    activePlayer = player;
    await initializeYandexCloudSave(
      player,
    );

    platformState = {
      ...platformState,
      authorized: true,
      cloudReady: true,
    };
    emitPlatformState();

    return 'authorized';
  } catch (error) {
    console.warn(
      'Yandex authorization failed.',
      error,
    );
    return 'error';
  } finally {
    resumeYandexGameplay(
      'platform',
    );
    window.dispatchEvent(
      new Event(
        YANDEX_PLATFORM_RESUME_EVENT,
      ),
    );
  }
}

export async function requestYandexFullscreen():
  Promise<boolean> {
  const fullscreen =
    getYandexSdk()
      ?.screen?.fullscreen;

  if (!fullscreen?.request) {
    return false;
  }

  try {
    await fullscreen.request();
    return true;
  } catch {
    return false;
  }
}

export type YandexGameplaySuspension =
  | 'visibility'
  | 'advertisement'
  | 'platform';

let gameReadyReported = false;
let gameplayRequested = false;
let gameplayReportedActive = false;

const gameplaySuspensions =
  new Set<YandexGameplaySuspension>();

function syncYandexGameplay(): void {
  const api =
    getYandexSdk()
      ?.features
      .GameplayAPI;

  if (!api) return;

  const shouldBeActive =
    gameplayRequested &&
    gameplaySuspensions.size ===
      0;

  if (
    shouldBeActive &&
    !gameplayReportedActive
  ) {
    api.start();
    gameplayReportedActive =
      true;
  } else if (
    !shouldBeActive &&
    gameplayReportedActive
  ) {
    api.stop();
    gameplayReportedActive =
      false;
  }
}

export function markYandexGameReady(): void {
  if (gameReadyReported) {
    return;
  }

  const loadingApi =
    getYandexSdk()
      ?.features
      .LoadingAPI;

  if (!loadingApi) {
    return;
  }

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
  reason:
    YandexGameplaySuspension,
): void {
  gameplaySuspensions.add(
    reason,
  );
  syncYandexGameplay();
}

export function resumeYandexGameplay(
  reason:
    YandexGameplaySuspension,
): void {
  gameplaySuspensions.delete(
    reason,
  );
  syncYandexGameplay();
}

export function resetYandexLifecycleState(): void {
  gameReadyReported = false;
  gameplayRequested = false;
  gameplayReportedActive =
    false;
  gameplaySuspensions.clear();
}
