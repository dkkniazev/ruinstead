export type AnalyticsEventName =
  | 'bestiary_discovered'
  | 'bestiary_level_up'
  | 'bestiary_reward_claimed'
  | 'ad_offer_shown'
  | 'ad_started'
  | 'ad_result'
  | 'ad_reward_granted'
  | 'interstitial_requested'
  | 'interstitial_result';

export function trackAnalyticsEvent(
  name: AnalyticsEventName,
  payload: Record<
    string,
    string | number | boolean
  >,
): void {
  if (
    typeof window ===
    'undefined'
  ) {
    return;
  }

  window.dispatchEvent(
    new CustomEvent(
      'ruinstead:analytics',
      {
        detail: {
          name,
          payload,
          timestamp:
            Date.now(),
        },
      },
    ),
  );
}
