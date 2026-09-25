import type {
  PurchaseProvider,
} from './PurchaseProvider';
import {
  MockPurchaseProvider,
} from './MockPurchaseProvider';
import {
  YandexPurchaseProvider,
} from './YandexPurchaseProvider';
import {
  getYandexSdk,
} from '../yandex/YandexSdk';

export function createPurchaseProvider():
  PurchaseProvider {
  return getYandexSdk()
    ? new YandexPurchaseProvider()
    : new MockPurchaseProvider();
}
