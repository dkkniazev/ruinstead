import Phaser from 'phaser';
import { BootScene } from '../scenes/BootScene';
import { ExpeditionScene } from '../scenes/ExpeditionScene';
import { SettlementScene } from '../scenes/SettlementScene';
import {
  getBrowserViewportMetrics,
} from './layout/Viewport';

const viewport =
  getBrowserViewportMetrics();

export const gameConfig:
  Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  parent: 'app',
  backgroundColor: '#17231c',
  width: viewport.renderWidth,
  height: viewport.renderHeight,
  scene: [
    BootScene,
    SettlementScene,
    ExpeditionScene,
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
