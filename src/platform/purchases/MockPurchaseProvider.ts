import type {
  PurchaseCatalogItem,
  PurchaseProvider,
  PurchaseReceipt,
  PurchaseResult,
} from './PurchaseProvider';

export class MockPurchaseProvider
  implements PurchaseProvider {
  readonly name = 'mock';
  private sequence = 0;

  isAvailable(): boolean {
    return true;
  }

  async purchase(
    productId: string,
  ): Promise<PurchaseResult> {
    this.sequence += 1;

    return {
      success: true,
      receipt: {
        productId,
        purchaseToken:
          `mock-${this.sequence}`,
      },
    };
  }

  async getCatalog():
    Promise<PurchaseCatalogItem[]> {
    return [];
  }

  async getPendingPurchases():
    Promise<PurchaseReceipt[]> {
    return [];
  }

  async consume(
    _purchaseToken: string,
  ): Promise<void> {
    return;
  }
}
