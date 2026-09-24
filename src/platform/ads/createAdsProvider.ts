import type { AdsProvider } from './AdsProvider';
import { MockAdsProvider } from './MockAdsProvider';
import { YandexAdsProvider } from './YandexAdsProvider';
import { getYandexSdk } from '../yandex/YandexSdk';

export function createAdsProvider(): AdsProvider {
  return getYandexSdk()
    ? new YandexAdsProvider()
    : new MockAdsProvider();
}
