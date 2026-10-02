import type { AdsProvider } from './AdsProvider';
import { MockAdsProvider } from './MockAdsProvider';
import { YandexAdsProvider } from './YandexAdsProvider';
import { getYandexSdk } from '../yandex/YandexSdk';

export function createAdsProvider(): AdsProvider {
  if (import.meta.env.DEV && !getYandexSdk()) {
    return new MockAdsProvider();
  }

  // The platform provider reports unavailable without SDK; production cannot
  // grant a simulated reward after a failed platform initialization.
  return new YandexAdsProvider();
}
