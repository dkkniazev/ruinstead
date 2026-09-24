import Phaser from 'phaser';
import './styles.css';
import { gameConfig } from './game/config';
import {
  syncGameViewport,
} from './game/layout/Viewport';
import {
  initializeLanguageFromBrowser,
  setLanguageFromCode,
} from './i18n/I18n';
import {
  initializeYandexPlatform,
  resumeYandexGameplay,
  suspendYandexGameplay,
} from './platform/yandex/YandexPlatform';
import {
  flushYandexCloudSave,
} from './platform/yandex/YandexCloudSave';

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

  await initializeYandexPlatform();

  const game =
    new Phaser.Game(gameConfig);

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
            resizeFrame = undefined;
            syncGameViewport(game);
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
    'focus',
    scheduleViewportSync,
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
      game.sound.mute = true;
    },
  );

  window.addEventListener(
    'yandex-ad-close',
    () => {
      game.sound.mute =
        document.hidden;
    },
  );

  document.addEventListener(
    'visibilitychange',
    () => {
      if (document.hidden) {
        suspendYandexGameplay(
          'visibility',
        );
        void flushYandexCloudSave();
        game.sound.mute = true;
      } else {
        game.sound.mute = false;
        resumeYandexGameplay(
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
