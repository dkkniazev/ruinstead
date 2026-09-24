import Phaser from 'phaser';

export const FOREST_HEART =
  new Phaser.Math.Vector2(
    2440,
    930,
  );

export const FOREST_HEART_DISCOVERY_RADIUS =
  155;

export const FOREST_LANDMARKS = [
  {
    id: 'forest-gate',
    name: 'Заросшие ворота',
    x: 1080,
    y: 900,
  },
  {
    id: 'old-stump',
    name: 'Старый пень',
    x: 1640,
    y: 430,
  },
  {
    id: 'stone-ring',
    name: 'Каменный круг',
    x: 1940,
    y: 1320,
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
