export const MONETIZATION_CONFIG = {
  enabled: true,
  interstitialEnabled: false,
  blessingDurationMs:
    3 * 60 * 1000,
  blessingDamageMultiplier: 1.2,
  blessingHealthMultiplier: 1.25,
  blessingSpeedMultiplier: 1.15,
  blessingGatheringMultiplier: 1.5,
  rewardedReviveHealthRatio: 0.7,
  rewardedReviveInvulnerabilityMs:
    2500,
  productionRewardMultiplier: 2,
  chestRewardMultiplier: 2,
  bossRewardMultiplier: 2,
  bossRespawnResetAdCooldownMs:
    60 * 60 * 1000,
  bossTicketDropChance: 0.08,
  returnTicketPackSize: 5,
  returnTicketProductId:
    'return_tickets_5',
} as const;
