import Phaser from 'phaser';
import type {
  MovementIntent,
  PlayerInputSource,
} from './PlayerInput';

type DesktopKeys = {
  up: Phaser.Input.Keyboard.Key;
  down: Phaser.Input.Keyboard.Key;
  left: Phaser.Input.Keyboard.Key;
  right: Phaser.Input.Keyboard.Key;
  dash: Phaser.Input.Keyboard.Key;
};

export class DesktopPlayerInput
  implements PlayerInputSource {
  readonly mode = 'desktop' as const;

  private readonly cursors:
    Phaser.Types.Input.Keyboard.CursorKeys;
  private readonly keys: DesktopKeys;

  constructor(scene: Phaser.Scene) {
    const keyboard = scene.input.keyboard;

    if (!keyboard) {
      throw new Error(
        'Keyboard input plugin is unavailable.',
      );
    }

    this.cursors =
      keyboard.createCursorKeys();
    this.keys = keyboard.addKeys({
      up: Phaser.Input.Keyboard.KeyCodes.W,
      down: Phaser.Input.Keyboard.KeyCodes.S,
      left: Phaser.Input.Keyboard.KeyCodes.A,
      right: Phaser.Input.Keyboard.KeyCodes.D,
      dash: Phaser.Input.Keyboard.KeyCodes.SPACE,
    }) as DesktopKeys;
  }

  getMovement(): MovementIntent {
    const left =
      this.keys.left.isDown ||
      this.cursors.left.isDown;
    const right =
      this.keys.right.isDown ||
      this.cursors.right.isDown;
    const up =
      this.keys.up.isDown ||
      this.cursors.up.isDown;
    const down =
      this.keys.down.isDown ||
      this.cursors.down.isDown;

    return {
      x:
        (right ? 1 : 0) -
        (left ? 1 : 0),
      y:
        (down ? 1 : 0) -
        (up ? 1 : 0),
    };
  }

  consumeDash(): boolean {
    return (
      Phaser.Input.Keyboard.JustDown(
        this.keys.dash,
      ) ||
      Phaser.Input.Keyboard.JustDown(
        this.cursors.shift,
      )
    );
  }

  destroy(): void {
    // Phaser owns keyboard keys and releases them
    // together with the scene input plugin.
  }
}
