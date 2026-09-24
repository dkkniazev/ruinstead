export type RewardedAdPlacement =
  | 'expedition_reward'
  | 'death_recovery'
  | 'production_boost'
  | 'quest_bonus';

export type InterstitialAdPlacement =
  | 'return_to_settlement'
  | 'zone_transition';

export type RewardedAdResult = {
  rewarded: boolean;
  reason:
    | 'completed'
    | 'skipped'
    | 'unavailable'
    | 'error';
};

export type InterstitialAdResult = {
  shown: boolean;
  reason:
    | 'completed'
    | 'unavailable'
    | 'error';
};

export interface AdsProvider {
  readonly name: string;
  isRewardedAvailable(): boolean;
  showRewarded(
    placement: RewardedAdPlacement,
  ): Promise<RewardedAdResult>;
  isInterstitialAvailable(): boolean;
  showInterstitial(
    placement: InterstitialAdPlacement,
  ): Promise<InterstitialAdResult>;
}
