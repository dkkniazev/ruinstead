export type AnalyticsEventName =
  | 'bestiary_discovered'
  | 'bestiary_level_up'
  | 'bestiary_reward_claimed';

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
