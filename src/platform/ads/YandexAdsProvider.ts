import type {
  AdsProvider,
  InterstitialAdPlacement,
  InterstitialAdResult,
  RewardedAdPlacement,
  RewardedAdResult,
} from './AdsProvider';
import {
  resumeYandexGameplay,
  suspendYandexGameplay,
} from '../yandex/YandexPlatform';
import { getYandexSdk } from '../yandex/YandexSdk';

function notifyAdOpen(): void {
  suspendYandexGameplay('advertisement');
  window.dispatchEvent(
    new Event('yandex-ad-open'),
  );
}

function notifyAdClose(): void {
  resumeYandexGameplay('advertisement');
  window.dispatchEvent(
    new Event('yandex-ad-close'),
  );
}

export class YandexAdsProvider
  implements AdsProvider {
  readonly name = 'yandex';

  isRewardedAvailable(): boolean {
    return Boolean(getYandexSdk());
  }

  showRewarded(
    _placement: RewardedAdPlacement,
  ): Promise<RewardedAdResult> {
    const sdk = getYandexSdk();

    if (!sdk) {
      return Promise.resolve({
        rewarded: false,
        reason: 'unavailable',
      });
    }

    return new Promise<RewardedAdResult>(
      (resolve) => {
        let rewarded = false;
        let settled = false;

        const finish = (
          result: RewardedAdResult,
        ): void => {
          if (settled) return;
          settled = true;
          notifyAdClose();
          resolve(result);
        };

        notifyAdOpen();

        try {
          sdk.adv.showRewardedVideo({
            callbacks: {
              onRewarded: () => {
                rewarded = true;
              },
              onClose: () => {
                finish({
                  rewarded,
                  reason: rewarded
                    ? 'completed'
                    : 'skipped',
                });
              },
              onError: () => {
                finish({
                  rewarded: false,
                  reason: 'error',
                });
              },
            },
          });
        } catch {
          finish({
            rewarded: false,
            reason: 'error',
          });
        }
      },
    );
  }

  isInterstitialAvailable(): boolean {
    return Boolean(getYandexSdk());
  }

  showInterstitial(
    _placement: InterstitialAdPlacement,
  ): Promise<InterstitialAdResult> {
    const sdk = getYandexSdk();

    if (!sdk) {
      return Promise.resolve({
        shown: false,
        reason: 'unavailable',
      });
    }

    return new Promise<InterstitialAdResult>(
      (resolve) => {
        let settled = false;

        const finish = (
          result: InterstitialAdResult,
        ): void => {
          if (settled) return;
          settled = true;
          notifyAdClose();
          resolve(result);
        };

        notifyAdOpen();

        try {
          sdk.adv.showFullscreenAdv({
            callbacks: {
              onClose: (wasShown) => {
                finish({
                  shown: wasShown !== false,
                  reason: 'completed',
                });
              },
              onError: () => {
                finish({
                  shown: false,
                  reason: 'error',
                });
              },
            },
          });
        } catch {
          finish({
            shown: false,
            reason: 'error',
          });
        }
      },
    );
  }
}
