export type PurchaseReceipt = {
  productId: string;
  purchaseToken: string;
};

export type PurchaseCatalogItem = {
  id: string;
  title: string;
  description: string;
  price: string;
  priceValue: string;
  priceCurrencyCode: string;
  currencyIconUrl: string;
};

export type PurchaseResult =
  | {
      success: true;
      receipt: PurchaseReceipt;
    }
  | {
      success: false;
      reason:
        | 'unavailable'
        | 'cancelled-or-failed';
    };

export interface PurchaseProvider {
  readonly name: string;
  isAvailable(): boolean;
  purchase(
    productId: string,
  ): Promise<PurchaseResult>;
  getCatalog():
    Promise<PurchaseCatalogItem[]>;
  getPendingPurchases():
    Promise<PurchaseReceipt[]>;
  consume(
    purchaseToken: string,
  ): Promise<void>;
}
