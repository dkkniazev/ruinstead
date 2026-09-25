import Phaser from 'phaser';
import type {
  PlayerController,
} from '../player/PlayerController';
import {
  PETS,
  type PetId,
} from './PremiumStoreConfig';

export class PetCompanion {
  private petId:
    PetId | null = null;
  private body:
    Phaser.GameObjects.Arc;
  private glow:
    Phaser.GameObjects.Arc;
  private label:
    Phaser.GameObjects.Text;
  private bobTime = 0;

  constructor(
    private readonly scene:
      Phaser.Scene,
    private readonly player:
      PlayerController,
  ) {
    this.glow =
      scene.add
        .circle(
          player.sprite.x,
          player.sprite.y,
          15,
          0xffffff,
          0.18,
        )
        .setVisible(false);

    this.body =
      scene.add
        .circle(
          player.sprite.x,
          player.sprite.y,
          9,
          0xffffff,
          1,
        )
        .setStrokeStyle(
          2,
          0xffffff,
          0.75,
        )
        .setVisible(false);

    this.label =
      scene.add
        .text(
          player.sprite.x,
          player.sprite.y,
          '',
          {
            fontFamily:
              'system-ui, sans-serif',
            fontSize: '9px',
            color: '#ffffff',
            backgroundColor:
              '#263229aa',
            padding: {
              x: 3,
              y: 1,
            },
          },
        )
        .setOrigin(0.5)
        .setVisible(false);
  }

  setPet(
    petId: PetId | null,
  ): void {
    this.petId =
      petId;

    if (!petId) {
      this.body.setVisible(false);
      this.glow.setVisible(false);
      this.label.setVisible(false);
      return;
    }

    const definition =
      PETS[petId];

    this.body
      .setFillStyle(
        definition.tint,
        1,
      )
      .setVisible(true);
    this.glow
      .setFillStyle(
        definition.tint,
        0.18,
      )
      .setVisible(true);
    this.label
      .setText(
        definition.name,
      )
      .setVisible(true);
  }

  update(delta: number): void {
    if (!this.petId) {
      return;
    }

    this.bobTime +=
      delta / 1000;

    const facingLeft =
      this.player.sprite
        .flipX;
    const targetX =
      this.player.sprite.x +
      (
        facingLeft
          ? 48
          : -48
      );
    const targetY =
      this.player.sprite.y +
      25 +
      Math.sin(
        this.bobTime * 4,
      ) *
        5;
    const factor =
      Math.min(
        1,
        delta / 95,
      );

    const x =
      Phaser.Math.Linear(
        this.body.x,
        targetX,
        factor,
      );
    const y =
      Phaser.Math.Linear(
        this.body.y,
        targetY,
        factor,
      );

    this.body
      .setPosition(x, y)
      .setDepth(y + 75);
    this.glow
      .setPosition(x, y)
      .setDepth(y + 74);
    this.label
      .setPosition(
        x,
        y + 18,
      )
      .setDepth(y + 76);
  }

  destroy(): void {
    this.body.destroy();
    this.glow.destroy();
    this.label.destroy();
  }
}
