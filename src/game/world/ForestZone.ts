import Phaser from 'phaser';
import {
  getRegionDefinition,
} from './ReleaseRegionMap';

const REGION_ONE =
  getRegionDefinition(1);

export const FOREST_HEART =
  new Phaser.Math.Vector2(
    REGION_ONE.center[0] + 470,
    REGION_ONE.center[1] - 120,
  );

export const FOREST_HEART_DISCOVERY_RADIUS =
  155;

export const FOREST_LANDMARKS = [
  {
    id: 'forest-gate',
    name: 'Заросшие ворота',
    x: REGION_ONE.center[0] - 620,
    y: REGION_ONE.center[1] - 40,
  },
  {
    id: 'old-stump',
    name: 'Старый пень',
    x: REGION_ONE.center[0] - 260,
    y: REGION_ONE.center[1] - 430,
  },
  {
    id: 'stone-ring',
    name: 'Каменный круг',
    x: REGION_ONE.center[0] + 170,
    y: REGION_ONE.center[1] + 390,
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
