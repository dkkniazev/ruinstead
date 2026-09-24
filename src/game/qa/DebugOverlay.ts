import Phaser from 'phaser';
import { detectInputMode } from '../input/PlayerInput';

export class DebugOverlay {
  private readonly enabled: boolean;
  private text?: Phaser.GameObjects.Text;

  constructor(
    private readonly scene: Phaser.Scene,
  ) {
    this.enabled =
      import.meta.env.DEV ||
      new URLSearchParams(
        window.location.search,
      ).get('debug') === '1';
  }

  create(): void {
    if (!this.enabled || this.text) return;

    this.text = this.scene.add
      .text(12, 12, '', {
        fontFamily: 'monospace',
        fontSize: '13px',
        color: '#dce8d9',
        backgroundColor: '#00000099',
        padding: {
          x: 8,
          y: 6,
        },
      })
      .setScrollFactor(0)
      .setDepth(10000);
  }

  update(): void {
    if (!this.text) return;

    const renderer =
      this.scene.game.renderer.type ===
      Phaser.WEBGL
        ? 'WebGL'
        : 'Canvas';

    this.text.setText([
      `FPS: ${this.scene.game.loop.actualFps.toFixed(0)}`,
      `Render: ${this.scene.scale.width}x${this.scene.scale.height}`,
      `Renderer: ${renderer}`,
      `Input: ${detectInputMode()}`,
    ]);
  }

  destroy(): void {
    this.text?.destroy();
    this.text = undefined;
  }
}
