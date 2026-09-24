import Phaser from 'phaser';
import type {
  MovementIntent,
  PlayerInputSource,
} from './PlayerInput';

const JOYSTICK_X = 118;
const JOYSTICK_Y = 598;
const JOYSTICK_RADIUS = 72;
const KNOB_RADIUS = 31;
const DASH_X = 1154;
const DASH_Y = 592;
const DASH_RADIUS = 49;

export class TouchPlayerInput
  implements PlayerInputSource {
  readonly mode = 'touch' as const;

  private readonly base:
    Phaser.GameObjects.Arc;
  private readonly knob:
    Phaser.GameObjects.Arc;
  private readonly dashButton:
    Phaser.GameObjects.Arc;
  private readonly dashLabel:
    Phaser.GameObjects.Text;

  private movement: MovementIntent = {
    x: 0,
    y: 0,
  };
  private activePointerId:
    number | undefined;
  private dashQueued = false;
  private visible = false;

  constructor(
    private readonly scene: Phaser.Scene,
  ) {
    this.base = scene.add
      .circle(
        JOYSTICK_X,
        JOYSTICK_Y,
        JOYSTICK_RADIUS,
        0x0c1711,
        0.48,
      )
      .setStrokeStyle(
        3,
        0xd5e4ce,
        0.48,
      )
      .setScrollFactor(0)
      .setDepth(9000)
      .setInteractive();

    this.knob = scene.add
      .circle(
        JOYSTICK_X,
        JOYSTICK_Y,
        KNOB_RADIUS,
        0xe7ead9,
        0.72,
      )
      .setScrollFactor(0)
      .setDepth(9001);

    this.dashButton = scene.add
      .circle(
        DASH_X,
        DASH_Y,
        DASH_RADIUS,
        0x7f4f2d,
        0.76,
      )
      .setStrokeStyle(
        3,
        0xf2d7a1,
        0.72,
      )
      .setScrollFactor(0)
      .setDepth(9000)
      .setInteractive();

    this.dashLabel = scene.add
      .text(
        DASH_X,
        DASH_Y,
        'РЫВОК',
        {
          fontFamily:
            'system-ui, sans-serif',
          fontSize: '14px',
          fontStyle: 'bold',
          color: '#fff3d7',
        },
      )
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(9001);

    this.base.on(
      Phaser.Input.Events.POINTER_DOWN,
      this.handleJoystickDown,
      this,
    );
    this.dashButton.on(
      Phaser.Input.Events.POINTER_DOWN,
      this.handleDashDown,
      this,
    );

    scene.input.on(
      Phaser.Input.Events.POINTER_MOVE,
      this.handlePointerMove,
      this,
    );
    scene.input.on(
      Phaser.Input.Events.POINTER_UP,
      this.handlePointerUp,
      this,
    );
    scene.input.on(
      Phaser.Input.Events.POINTER_UP_OUTSIDE,
      this.handlePointerUp,
      this,
    );

    this.setVisible(false);
  }

  getMovement(): MovementIntent {
    return this.visible
      ? this.movement
      : { x: 0, y: 0 };
  }

  consumeDash(): boolean {
    if (!this.visible) {
      this.dashQueued = false;
      return false;
    }

    const queued = this.dashQueued;
    this.dashQueued = false;
    return queued;
  }

  setVisible(visible: boolean): void {
    this.visible = visible;
    this.base.setVisible(visible);
    this.knob.setVisible(visible);
    this.dashButton.setVisible(visible);
    this.dashLabel.setVisible(visible);

    if (!visible) {
      this.resetJoystick();
      this.dashQueued = false;
    }
  }

  destroy(): void {
    this.scene.input.off(
      Phaser.Input.Events.POINTER_MOVE,
      this.handlePointerMove,
      this,
    );
    this.scene.input.off(
      Phaser.Input.Events.POINTER_UP,
      this.handlePointerUp,
      this,
    );
    this.scene.input.off(
      Phaser.Input.Events.POINTER_UP_OUTSIDE,
      this.handlePointerUp,
      this,
    );

    this.base.destroy();
    this.knob.destroy();
    this.dashButton.destroy();
    this.dashLabel.destroy();
  }

  private handleJoystickDown(
    pointer: Phaser.Input.Pointer,
  ): void {
    if (!this.visible) return;

    this.activePointerId = pointer.id;
    this.updateJoystick(pointer);
  }

  private handlePointerMove(
    pointer: Phaser.Input.Pointer,
  ): void {
    if (
      !this.visible ||
      pointer.id !== this.activePointerId ||
      !pointer.isDown
    ) {
      return;
    }

    this.updateJoystick(pointer);
  }

  private handlePointerUp(
    pointer: Phaser.Input.Pointer,
  ): void {
    if (
      pointer.id !== this.activePointerId
    ) {
      return;
    }

    this.resetJoystick();
  }

  private handleDashDown(): void {
    if (!this.visible) return;

    this.dashQueued = true;

    this.scene.tweens.add({
      targets: [
        this.dashButton,
        this.dashLabel,
      ],
      scale: 0.9,
      duration: 70,
      yoyo: true,
      ease: 'Quad.Out',
    });
  }

  private updateJoystick(
    pointer: Phaser.Input.Pointer,
  ): void {
    const position =
      this.getHudPointerPosition(pointer);
    const dx = position.x - JOYSTICK_X;
    const dy = position.y - JOYSTICK_Y;
    const distance = Math.hypot(dx, dy);

    if (distance <= 0.001) {
      this.movement = {
        x: 0,
        y: 0,
      };
      this.knob.setPosition(
        JOYSTICK_X,
        JOYSTICK_Y,
      );
      return;
    }

    const clampedDistance = Math.min(
      JOYSTICK_RADIUS - KNOB_RADIUS * 0.35,
      distance,
    );
    const nx = dx / distance;
    const ny = dy / distance;

    this.knob.setPosition(
      JOYSTICK_X +
        nx * clampedDistance,
      JOYSTICK_Y +
        ny * clampedDistance,
    );

    const strength = Phaser.Math.Clamp(
      distance / JOYSTICK_RADIUS,
      0,
      1,
    );

    this.movement = {
      x: nx * strength,
      y: ny * strength,
    };
  }

  private getHudPointerPosition(
    pointer: Phaser.Input.Pointer,
  ): Phaser.Math.Vector2 {
    const camera =
      this.scene.cameras.main;

    return new Phaser.Math.Vector2(
      (pointer.x - camera.x) /
        camera.zoom,
      (pointer.y - camera.y) /
        camera.zoom,
    );
  }

  private resetJoystick(): void {
    this.activePointerId = undefined;
    this.movement = {
      x: 0,
      y: 0,
    };
    this.knob.setPosition(
      JOYSTICK_X,
      JOYSTICK_Y,
    );
  }
}
