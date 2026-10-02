import Phaser from 'phaser';
import { usesLegacyWorldArt } from '../game/render3d/RenderingSupport';

export class BootScene extends Phaser.Scene {
  constructor() {
    super('BootScene');
  }

  preload(): void {
    // Painted assets belong to the compatibility renderer. Loading them before
    // every 3D start used ~28 MiB of downloads plus decoded GPU textures.
    if (!usesLegacyWorldArt()) return;
    this.load.image('ruinstead-forest-ground', 'art/forest-ground.png');
    this.load.image('ruinstead-ash-ground', 'art/ash-ground.png');
    this.load.image('ruinstead-volcanic-ground', 'art/volcanic-ground.png');
    this.load.image('ruinstead-river-ground', 'art/river-ground.png');
    this.load.image('ruinstead-canyon-ground', 'art/canyon-ground.png');
    this.load.image('ruinstead-hero-painted', 'art/hero-painted.png');
    this.load.image('ruinstead-goblin-painted', 'art/goblin-painted.png');
    this.load.image('ruinstead-ruined-arch', 'art/ruined-arch.png');
    this.load.image('ruinstead-forge-workshop', 'art/forge-workshop.png');
    this.load.image('ruinstead-forest-hut', 'art/forest-hut.png');
    this.load.image('ruinstead-return-shrine', 'art/return-shrine.png');
  }

  create(): void {
    this.scene.start('WorldScene');
  }
}
