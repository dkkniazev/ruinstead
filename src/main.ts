import Phaser from 'phaser';
import { gameAudio } from './game/audio/GameAudio';
import './styles.css';
import { gameConfig } from './game/config';
import {
  syncGameViewport,
} from './game/layout/Viewport';
import {
  getLanguage,
  initializeLanguageFromBrowser,
  setLanguageFromCode,
} from './i18n/I18n';
import {
  YANDEX_PLATFORM_PAUSE_EVENT,
  YANDEX_PLATFORM_RESUME_EVENT,
  initializeYandexPlatform,
  resumeYandexGameplay,
  suspendYandexGameplay,
} from './platform/yandex/YandexPlatform';
import {
  flushYandexCloudSave,
} from './platform/yandex/YandexCloudSave';

type RuntimePauseReason =
  | 'visibility'
  | 'focus'
  | 'advertisement'
  | 'platform';

async function bootstrap(): Promise<void> {
  const languageOverride =
    new URLSearchParams(
      window.location.search,
    ).get('lang');

  if (languageOverride) {
    setLanguageFromCode(
      languageOverride,
    );
  } else {
    initializeLanguageFromBrowser();
  }
  document.documentElement.lang = getLanguage();

  await initializeYandexPlatform();

  const game =
    new Phaser.Game(gameConfig);

  const runtimePauseReasons =
    new Set<RuntimePauseReason>();

  const syncRuntimePause =
    (): void => {
      const paused =
        runtimePauseReasons
          .size > 0;

      if (paused) {
        game.loop.sleep();
        game.sound.mute = true;
        gameAudio.setPaused(true);
      } else {
        game.loop.wake();
        game.sound.mute = false;
        gameAudio.setPaused(false);
      }
    };

  const addRuntimePause =
    (
      reason:
        RuntimePauseReason,
    ): void => {
      runtimePauseReasons.add(
        reason,
      );
      syncRuntimePause();
    };

  const removeRuntimePause =
    (
      reason:
        RuntimePauseReason,
    ): void => {
      runtimePauseReasons.delete(
        reason,
      );
      syncRuntimePause();
    };

  let resizeFrame:
    number | undefined;

  const scheduleViewportSync =
    (): void => {
      if (
        resizeFrame !== undefined
      ) {
        window.cancelAnimationFrame(
          resizeFrame,
        );
      }

      resizeFrame =
        window.requestAnimationFrame(
          () => {
            resizeFrame =
              undefined;
            syncGameViewport(
              game,
            );
          },
        );
    };

  window.addEventListener(
    'resize',
    scheduleViewportSync,
  );
  window.visualViewport
    ?.addEventListener(
      'resize',
      scheduleViewportSync,
    );
  window.addEventListener(
    'orientationchange',
    scheduleViewportSync,
  );
  document.addEventListener(
    'fullscreenchange',
    scheduleViewportSync,
  );

  window.addEventListener(
    'focus',
    () => {
      removeRuntimePause(
        'focus',
      );
      scheduleViewportSync();
    },
  );
  window.addEventListener(
    'blur',
    () => {
      addRuntimePause(
        'focus',
      );
    },
  );

  document
    .getElementById('app')
    ?.addEventListener(
      'contextmenu',
      (event) => {
        event.preventDefault();
      },
    );

  game.events.once(
    Phaser.Core.Events.READY,
    () => {
      syncGameViewport(game);
    },
  );

  window.addEventListener(
    'yandex-ad-open',
    () => {
      addRuntimePause(
        'advertisement',
      );
      void flushYandexCloudSave();
    },
  );

  window.addEventListener(
    'yandex-ad-close',
    () => {
      removeRuntimePause(
        'advertisement',
      );
    },
  );

  window.addEventListener(
    YANDEX_PLATFORM_PAUSE_EVENT,
    () => {
      addRuntimePause(
        'platform',
      );
      void flushYandexCloudSave();
    },
  );

  window.addEventListener(
    YANDEX_PLATFORM_RESUME_EVENT,
    () => {
      removeRuntimePause(
        'platform',
      );
      scheduleViewportSync();
    },
  );

  document.addEventListener(
    'visibilitychange',
    () => {
      if (document.hidden) {
        suspendYandexGameplay(
          'visibility',
        );
        addRuntimePause(
          'visibility',
        );
        void flushYandexCloudSave();
      } else {
        resumeYandexGameplay(
          'visibility',
        );
        removeRuntimePause(
          'visibility',
        );
        scheduleViewportSync();
      }
    },
  );

  window.addEventListener(
    'pagehide',
    () => {
      suspendYandexGameplay(
        'visibility',
      );
      void flushYandexCloudSave();
    },
  );
}

void bootstrap();
