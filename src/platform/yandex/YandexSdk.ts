export type YandexPlayer = {
  getData(keys?: string[]): Promise<Record<string, unknown>>;
  setData(
    data: Record<string, unknown>,
    flush?: boolean,
  ): Promise<void>;
};

type AdCallbacks = {
  onOpen?: () => void;
  onClose?: (wasShown?: boolean) => void;
  onError?: (error: unknown) => void;
};

export type YandexSdk = {
  environment?: {
    i18n?: {
      lang?: string;
    };
  };
  getPlayer(): Promise<YandexPlayer>;
  getStorage?(): Promise<Storage>;
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
