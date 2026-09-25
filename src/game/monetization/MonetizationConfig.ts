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
  supplyAdCooldownMs:
    15 * 60 * 1000,
  supplyRewards: {
    wood: 30,
    stone: 20,
    metal: 10,
    crystal: 6,
    fiber: 10,
  },
  bossTicketDropChance: 0.08,
  returnTicketPackSize: 5,
  returnTicketProductId:
    'return_tickets_5',
  adFreeWeekProductId:
    'ad_free_week',
  adFreeWeekDurationMs:
    7 * 24 * 60 * 60 * 1000,
} as const;
