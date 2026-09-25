export const MONETIZATION_CONFIG = {
  enabled: true,
  expeditionBonusRatio: 0.5,
  productionBoostCycles: 4,
  interstitialEveryExpeditions: 4,
  interstitialStartAtExpedition: 4,
} as const;

export function isReturnInterstitialDue(
  expeditionCount: number,
): boolean {
  if (
    !MONETIZATION_CONFIG.enabled ||
    expeditionCount <
      MONETIZATION_CONFIG
        .interstitialStartAtExpedition
  ) {
    return false;
  }

  return (
    expeditionCount %
      MONETIZATION_CONFIG
        .interstitialEveryExpeditions ===
    0
  );
}
