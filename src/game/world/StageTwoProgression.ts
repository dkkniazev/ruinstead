import Phaser from 'phaser';
import {
  RELEASE_PASSAGES,
  getPassageMidpoint,
  getRegionDefinition,
} from './ReleaseRegionMap';

const REGION_TWO =
  getRegionDefinition(2);
const PASSAGE =
  RELEASE_PASSAGES.find(
    (entry) =>
      entry.id === '2-3',
  )!;

export const STAGE_TWO_START_X =
  REGION_TWO.center[0];

export const STAGE_TWO_GATE_CENTER =
  getPassageMidpoint(PASSAGE);

export const STAGE_TWO_GATE_OPENING_HEIGHT =
  250;

const REGION_THREE =
  getRegionDefinition(3);

export const STAGE_THREE_ENTRY =
  new Phaser.Math.Vector2(
    REGION_THREE.center[0],
    REGION_THREE.center[1] +
      REGION_THREE.radiusY * 0.62,
  );

export const STAGE_THREE_ENTRY_RADIUS =
  260;
