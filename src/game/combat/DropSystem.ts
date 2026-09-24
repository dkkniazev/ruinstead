import Phaser from 'phaser';

const COIN_TEXTURE =
  'ruinstead-combat-coin';

type CoinDrop = {
  sprite:
    Phaser.GameObjects.Image;
  value: number;
};

export class DropSystem {
  private readonly drops:
    CoinDrop[] = [];

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly onCollect:
      (value: number) => void,
  ) {
    this.ensureCoinTexture();
  }

  spawn(
    x: number,
    y: number,
    value: number,
  ): void {
    const sprite =
      this.scene.add
        .image(
          x +
            Phaser.Math.Between(
              -16,
              16,
            ),
          y - 4,
          COIN_TEXTURE,
        )
        .setDepth(y + 80)
        .setScale(0.3);

    this.drops.push({
      sprite,
      value,
    });

    this.scene.tweens.add({
      targets: sprite,
      scale: 1,
      y: sprite.y - 13,
      duration: 170,
      ease: 'Back.Out',
      yoyo: true,
    });
  }

  update(
    delta: number,
    playerPosition:
      Phaser.Math.Vector2,
  ): void {
    const seconds =
      delta / 1000;

    for (
      let index =
        this.drops.length - 1;
      index >= 0;
      index -= 1
    ) {
      const drop =
        this.drops[index];

      const dx =
        playerPosition.x -
        drop.sprite.x;
      const dy =
        playerPosition.y -
        drop.sprite.y;
      const distance =
        Math.hypot(dx, dy);

      if (
        distance < 185 &&
        distance > 0.001
      ) {
        const speed =
          distance < 80
            ? 560
            : 330;

        drop.sprite.x +=
          (dx / distance) *
          speed *
          seconds;
        drop.sprite.y +=
          (dy / distance) *
          speed *
          seconds;
      }

      drop.sprite.setDepth(
        drop.sprite.y + 80,
      );

      if (distance <= 28) {
        this.collect(index);
      }
    }
  }

  destroy(): void {
    for (
      const drop of
      this.drops
    ) {
      drop.sprite.destroy();
    }

    this.drops.length = 0;
  }

  private collect(
    index: number,
  ): void {
    const [drop] =
      this.drops.splice(
        index,
        1,
      );

    if (!drop) return;

    this.onCollect(
      drop.value,
    );

    this.scene.tweens.add({
      targets: drop.sprite,
      scale: 1.45,
      alpha: 0,
      duration: 110,
      onComplete: () => {
        drop.sprite.destroy();
      },
    });
  }

  private ensureCoinTexture(): void {
    if (
      this.scene.textures.exists(
        COIN_TEXTURE,
      )
    ) {
      return;
    }

    const graphics =
      this.scene.make.graphics({
        x: 0,
        y: 0,
      });

    graphics.fillStyle(
      0xe3a724,
      1,
    );
    graphics.fillCircle(
      15,
      15,
      13,
    );

    graphics.fillStyle(
      0xffdf55,
      1,
    );
    graphics.fillCircle(
      13,
      12,
      8,
    );

    graphics.lineStyle(
      2,
      0xffef9a,
      0.9,
    );
    graphics.strokeCircle(
      15,
      15,
      10,
    );

    graphics.generateTexture(
      COIN_TEXTURE,
      30,
      30,
    );
    graphics.destroy();
  }
}
