import Phaser from 'phaser';
import { BootScene } from '../scenes/BootScene';
import { HudScene } from '../scenes/HudScene';
import { WorldScene } from '../scenes/WorldScene';
import {
  getBrowserViewportMetrics,
} from './layout/Viewport';

const viewport =
  getBrowserViewportMetrics();

export const gameConfig:
  Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  parent: 'app',
  backgroundColor: '#69be4b',
  width: viewport.renderWidth,
  height: viewport.renderHeight,
  scene: [
    BootScene,
    WorldScene,
    HudScene,
  ],
  scale: {
    mode: Phaser.Scale.NONE,
    autoCenter:
      Phaser.Scale.CENTER_BOTH,
    zoom: viewport.canvasCssZoom,
  },
  physics: {
    default: 'arcade',
    arcade: {
      debug: false,
    },
  },
  render: {
    antialias: true,
    pixelArt: false,
    roundPixels: false,
  },
};
