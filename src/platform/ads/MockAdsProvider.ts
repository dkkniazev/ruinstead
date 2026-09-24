import type {
  AdsProvider,
  InterstitialAdPlacement,
  InterstitialAdResult,
  RewardedAdPlacement,
  RewardedAdResult,
} from './AdsProvider';

const MOCK_DELAY_MS = 250;

function delay(): Promise<void> {
  return new Promise((resolve) => {
    window.setTimeout(
      resolve,
      MOCK_DELAY_MS,
    );
  });
}

export class MockAdsProvider
  implements AdsProvider {
  readonly name = 'mock';

  isRewardedAvailable(): boolean {
    return true;
  }

  async showRewarded(
    _placement: RewardedAdPlacement,
  ): Promise<RewardedAdResult> {
    await delay();

    return {
      rewarded: true,
      reason: 'completed',
    };
  }

  isInterstitialAvailable(): boolean {
    return true;
  }

  async showInterstitial(
    _placement: InterstitialAdPlacement,
  ): Promise<InterstitialAdResult> {
    await delay();

    return {
      shown: true,
      reason: 'completed',
    };
  }
}
