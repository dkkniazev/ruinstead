import type {
  PurchaseProvider,
  PurchaseReceipt,
  PurchaseResult,
} from './PurchaseProvider';
import {
  getYandexSdk,
  type YandexPayments,
} from '../yandex/YandexSdk';

async function getPayments():
  Promise<YandexPayments | undefined> {
  const sdk =
    getYandexSdk();

  if (!sdk) {
    return undefined;
  }

  if (sdk.payments) {
    return sdk.payments;
  }

  try {
    return await sdk.getPayments?.({
      signed: false,
    });
  } catch {
    return undefined;
  }
}

export class YandexPurchaseProvider
  implements PurchaseProvider {
  readonly name = 'yandex';

  isAvailable(): boolean {
    const sdk =
      getYandexSdk();

    return Boolean(
      sdk?.payments ||
      sdk?.getPayments,
    );
  }

  async purchase(
    productId: string,
  ): Promise<PurchaseResult> {
    const payments =
      await getPayments();

    if (!payments) {
      return {
        success: false,
        reason: 'unavailable',
      };
    }

    try {
      const purchase =
        await payments.purchase({
          id: productId,
        });

      return {
        success: true,
        receipt: {
          productId:
            purchase.productID,
          purchaseToken:
            purchase.purchaseToken,
        },
      };
    } catch {
      return {
        success: false,
        reason:
          'cancelled-or-failed',
      };
    }
  }

  async getPendingPurchases():
    Promise<PurchaseReceipt[]> {
    const payments =
      await getPayments();

    if (!payments) {
      return [];
    }

    try {
      const purchases =
        await payments
          .getPurchases();

      return purchases.map(
        (purchase) => ({
          productId:
            purchase.productID,
          purchaseToken:
            purchase.purchaseToken,
        }),
      );
    } catch {
      return [];
    }
  }

  async consume(
    purchaseToken: string,
  ): Promise<void> {
    const payments =
      await getPayments();

    if (!payments) {
      throw new Error(
        'Yandex purchases unavailable',
      );
    }

    await payments.consumePurchase(
      purchaseToken,
    );
  }
}
