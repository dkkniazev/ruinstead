export type DisplayPurchasePrice = {
  price: string;
  currencyIconUrl: string;
};

const escape = (value: string): string => value.replace(/[&<>"']/g, character =>
  ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[character]!),
);

/** Keep both the displayed currency name and its icon from the SDK catalog. */
export function purchasePriceLabel(
  product: DisplayPurchasePrice | undefined,
  fallback = 'Недоступно',
): string {
  if (!product) return escape(fallback);

  const iconUrl = /^(https:\/\/|\/(?!\/))/i.test(product.currencyIconUrl)
    ? product.currencyIconUrl
    : '';
  return `<span class="r-purchase-price"><span>${escape(product.price)}</span>${iconUrl
    ? `<img class="r-currency-icon" src="${escape(iconUrl)}" alt="" width="20" height="20" referrerpolicy="no-referrer">`
    : ''}</span>`;
}
