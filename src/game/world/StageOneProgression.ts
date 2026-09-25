import Phaser from 'phaser';
import {
  RELEASE_PASSAGES,
  getPassageMidpoint,
  getRegionDefinition,
} from './ReleaseRegionMap';

const REGION_ONE =
  getRegionDefinition(1);
const BRIDGE =
  RELEASE_PASSAGES.find(
    (entry) =>
      entry.id === '1-2',
  )!;

export const ROOT_COLOSSUS_ARENA_CENTER =
  new Phaser.Math.Vector2(
    REGION_ONE.center[0] +
      REGION_ONE.radiusX * 0.55,
    REGION_ONE.center[1] +
      REGION_ONE.radiusY * 0.5,
  );

export const ROOT_COLOSSUS_ARENA_RADIUS =
  430;

export const STAGE_ONE_BRIDGE_CENTER =
  getPassageMidpoint(BRIDGE);

export const STAGE_ONE_BRIDGE_WIDTH =
  190;
export const STAGE_ONE_BRIDGE_HEIGHT =
  150;

// Kept as compatibility exports for the bridge prototype.
export const STAGE_ONE_RIVER_LEFT =
  STAGE_ONE_BRIDGE_CENTER.x - 90;
export const STAGE_ONE_RIVER_RIGHT =
  STAGE_ONE_BRIDGE_CENTER.x + 90;

const REGION_TWO =
  getRegionDefinition(2);

export const STAGE_TWO_ENTRY =
  new Phaser.Math.Vector2(
    REGION_TWO.center[0] +
      REGION_TWO.radiusX * 0.55,
    REGION_TWO.center[1] +
      REGION_TWO.radiusY * 0.3,
  );

export const STAGE_TWO_ENTRY_RADIUS =
  260;
