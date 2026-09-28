/**
 * Dash is distance-driven rather than duration-driven.  The controller keeps
 * applying dash velocity until the player has actually travelled this far,
 * unless a collision stalls the dash until the safety timeout.
 */
export const PLAYER_DASH_DISTANCE = 420;
export const PLAYER_DASH_SPEED = 1400;
export const PLAYER_DASH_MAX_DURATION_MS = 520;
