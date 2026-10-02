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
  if (import.meta.env.DEV && !getYandexSdk()) {
    return new MockPurchaseProvider();
  }

  return new YandexPurchaseProvider();
}
