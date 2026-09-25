export type YandexPlayer = {
  getData(keys?: string[]): Promise<Record<string, unknown>>;
  setData(
    data: Record<string, unknown>,
    flush?: boolean,
  ): Promise<void>;
  isAuthorized?(): boolean;
};

type AdCallbacks = {
  onOpen?: () => void;
  onClose?: (wasShown?: boolean) => void;
  onError?: (error: unknown) => void;
};

export type YandexGameApiEvent =
  | 'game_api_pause'
  | 'game_api_resume';

export type YandexProduct = {
  id: string;
  title: string;
  description: string;
  imageURI: string;
  price: string;
  priceValue: string;
  priceCurrencyCode: string;
  getPriceCurrencyImage(
    size:
      | 'small'
      | 'medium'
      | 'svg',
  ): string;
};

export type YandexPurchase = {
  productID: string;
  purchaseToken: string;
  developerPayload?: string;
};

export type YandexPayments = {
  purchase(options: {
    id: string;
    developerPayload?: string;
  }): Promise<YandexPurchase>;
  getPurchases(): Promise<
    YandexPurchase[]
  >;
  getCatalog(): Promise<
    YandexProduct[]
  >;
  consumePurchase(
    purchaseToken: string,
  ): Promise<void>;
};

export type YandexSdk = {
  environment?: {
    i18n?: {
      lang?: string;
    };
  };
  getPlayer(): Promise<YandexPlayer>;
  getStorage?(): Promise<Storage>;
  payments?: YandexPayments;
  getPayments?(
    options?: {
      signed?: boolean;
    },
  ): Promise<YandexPayments>;
  auth?: {
    openAuthDialog(): Promise<void>;
  };
  on?(
    event: YandexGameApiEvent,
    callback: () => void,
  ): void;
  off?(
    event: YandexGameApiEvent,
    callback: () => void,
  ): void;
  screen?: {
    fullscreen?: {
      status?: string;
      STATUS_ON?: string;
      STATUS_OFF?: string;
      request?(): Promise<void>;
      exit?(): Promise<void>;
    };
  };
  deviceInfo?(): {
    type?:
      | 'desktop'
      | 'mobile'
      | 'tablet'
      | 'tv'
      | string;
    isMobile?(): boolean;
    isDesktop?(): boolean;
    isTablet?(): boolean;
    isTV?(): boolean;
  };
  adv: {
    showRewardedVideo(options: {
      callbacks: AdCallbacks & {
        onRewarded?: () => void;
      };
    }): void;
    showFullscreenAdv(options?: {
      callbacks?: AdCallbacks;
    }): void;
  };
  features: {
    LoadingAPI?: {
      ready(): void;
    };
    GameplayAPI?: {
      start(): void;
      stop(): void;
    };
  };
};

declare global {
  interface Window {
    YaGames?: {
      init(): Promise<YandexSdk>;
    };
  }
}

let sdk: YandexSdk | undefined;

export function setYandexSdk(
  value: YandexSdk | undefined,
): void {
  sdk = value;
}

export function getYandexSdk(): YandexSdk | undefined {
  return sdk;
}
