/**
 * Dash ends when the player has actually travelled the configured distance.
 * The timeout is only a collision/stall safety net; dash upgrades affect
 * cooldown in UpgradeBalance, not distance or duration.
 */
export const PLAYER_DASH_DISTANCE = 210;
export const PLAYER_DASH_SPEED = 1400;
export const PLAYER_DASH_STALL_GRACE_MS = 180;
export const PLAYER_DASH_MAX_DURATION_MS =
  Math.ceil(
    PLAYER_DASH_DISTANCE /
      PLAYER_DASH_SPEED *
      1000,
  ) +
  PLAYER_DASH_STALL_GRACE_MS;
