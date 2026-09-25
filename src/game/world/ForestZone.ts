import Phaser from 'phaser';
import {
  getRegionDefinition,
} from './ReleaseRegionMap';

const REGION_ONE =
  getRegionDefinition(1);

export const FOREST_HEART =
  new Phaser.Math.Vector2(
    REGION_ONE.center[0] +
      REGION_ONE.radiusX * 0.48,
    REGION_ONE.center[1] -
      REGION_ONE.radiusY * 0.12,
  );

export const FOREST_HEART_DISCOVERY_RADIUS =
  220;

export const FOREST_LANDMARKS = [
  {
    id: 'forest-gate',
    name: 'Заросшие ворота',
    x:
      REGION_ONE.center[0] -
      REGION_ONE.radiusX * 0.58,
    y:
      REGION_ONE.center[1] -
      REGION_ONE.radiusY * 0.05,
  },
  {
    id: 'old-stump',
    name: 'Старый пень',
    x:
      REGION_ONE.center[0] -
      REGION_ONE.radiusX * 0.3,
    y:
      REGION_ONE.center[1] -
      REGION_ONE.radiusY * 0.48,
  },
  {
    id: 'stone-ring',
    name: 'Каменный круг',
    x:
      REGION_ONE.center[0] +
      REGION_ONE.radiusX * 0.22,
    y:
      REGION_ONE.center[1] +
      REGION_ONE.radiusY * 0.45,
  },
  {
    id: 'forest-heart',
    name: 'Лесной алтарь',
    x: FOREST_HEART.x,
    y: FOREST_HEART.y,
  },
] as const;

export type ForestLandmarkId =
  (typeof FOREST_LANDMARKS)[number]['id'];
