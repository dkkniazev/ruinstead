import Phaser from 'phaser';
import type {
  EnemySystem,
  EnemyUnit,
} from '../enemies/EnemySystem';
import type { PlayerController } from '../player/PlayerController';
import { CombatAudio } from './CombatAudio';
import { DropSystem } from './DropSystem';
import {
  WEAPON_DEFINITIONS,
  type WeaponId,
} from './WeaponDefinitions';

const ARROW_TEXTURE =
  'ruinstead-arrow-prototype';

type Projectile = {
  sprite:
    Phaser.GameObjects.Image;
  target: EnemyUnit;
  damage: number;
  speed: number;
  expiresAt: number;
};

export type CombatState = {
  health: number;
  maxHealth: number;
  coins: number;
  weaponId: WeaponId;
};

export class CombatSystem {
  private readonly maxHealth =
    100;
  private health =
    this.maxHealth;
  private coins = 0;
  private weaponId:
    WeaponId = 'blade';

  private nextAttackAt = 0;
  private invulnerableUntil = 0;
  private dead = false;

  private readonly projectiles:
    Projectile[] = [];
  private readonly drops:
    DropSystem;
  private readonly audio =
    new CombatAudio();

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly player:
      PlayerController,
    private readonly enemies:
      EnemySystem,
    private readonly respawn:
      Phaser.Math.Vector2,
    private readonly onStateChanged:
      (state: CombatState) => void,
  ) {
    this.ensureArrowTexture();

    this.drops =
      new DropSystem(
        scene,
        (value) => {
          this.coins += value;
          this.emitState();
        },
      );

    this.emitState();
  }

  get state(): CombatState {
    return {
      health:
        this.health,
      maxHealth:
        this.maxHealth,
      coins:
        this.coins,
      weaponId:
        this.weaponId,
    };
  }

  setWeapon(
    weaponId: WeaponId,
  ): void {
    if (
      this.weaponId ===
      weaponId
    ) {
      return;
    }

    this.weaponId =
      weaponId;
    this.nextAttackAt = 0;
    this.emitState();
  }

  update(
    time: number,
    delta: number,
  ): void {
    this.drops.update(
      delta,
      this.player.position,
    );
    this.updateProjectiles(
      time,
      delta,
    );

    if (this.dead) {
      return;
    }

    const definition =
      WEAPON_DEFINITIONS[
        this.weaponId
      ];

    const target =
      this.enemies.findNearest(
        this.player.position,
        definition.range,
      );

    if (
      !target ||
      time <
        this.nextAttackAt
    ) {
      return;
    }

    this.nextAttackAt =
      time +
      definition.cooldownMs;

    this.player.faceTowards(
      target.sprite.x,
    );

    if (
      definition.kind ===
      'melee'
    ) {
      this.attackMelee(
        target,
        definition.damage,
      );
    } else {
      this.attackRanged(
        target,
        definition.damage,
        definition.projectileSpeed ??
          650,
        time,
      );
    }
  }

  damagePlayer(
    amount: number,
  ): void {
    const now =
      this.scene.time.now;

    if (
      this.dead ||
      now <
        this.invulnerableUntil
    ) {
      return;
    }

    this.invulnerableUntil =
      now + 360;

    this.health =
      Math.max(
        0,
        this.health - amount,
      );

    this.player.flashDamage();
    this.audio.playHit();
    this.showPlayerDamage(
      amount,
    );

    this.scene.cameras.main.shake(
      70,
      0.002,
    );

    this.emitState();

    if (this.health <= 0) {
      this.handleDeath();
    }
  }

  destroy(): void {
    for (
      const projectile of
      this.projectiles
    ) {
      projectile.sprite.destroy();
    }

    this.projectiles.length = 0;
    this.drops.destroy();
  }

  private attackMelee(
    target: EnemyUnit,
    damage: number,
  ): void {
    this.audio.playSwing();

    const origin =
      this.player.position;
    const direction =
      new Phaser.Math.Vector2(
        target.sprite.x - origin.x,
        target.sprite.y - origin.y,
      ).normalize();

    const slash =
      this.scene.add
        .arc(
          origin.x +
            direction.x * 46,
          origin.y +
            direction.y * 36,
          42,
          -58,
          58,
          false,
          0xfff0a8,
          0.18,
        )
        .setStrokeStyle(
          7,
          0xfff4c7,
          0.88,
        )
        .setRotation(
          Math.atan2(
            direction.y,
            direction.x,
          ),
        )
        .setDepth(
          origin.y + 220,
        );

    this.scene.tweens.add({
      targets: slash,
      scale: 1.35,
      alpha: 0,
      duration: 145,
      ease: 'Quad.Out',
      onComplete: () => {
        slash.destroy();
      },
    });

    this.damageEnemy(
      target,
      damage,
    );
  }

  private attackRanged(
    target: EnemyUnit,
    damage: number,
    speed: number,
    time: number,
  ): void {
    this.audio.playShot();

    const origin =
      this.player.position;
    const targetPosition =
      target.position;

    const angle =
      Phaser.Math.Angle.Between(
        origin.x,
        origin.y,
        targetPosition.x,
        targetPosition.y,
      );

    const projectile =
      this.scene.add
        .image(
          origin.x,
          origin.y + 2,
          ARROW_TEXTURE,
        )
        .setRotation(angle)
        .setDepth(
          origin.y + 170,
        );

    this.projectiles.push({
      sprite:
        projectile,
      target,
      damage,
      speed,
      expiresAt:
        time + 1400,
    });
  }

  private updateProjectiles(
    time: number,
    delta: number,
  ): void {
    const seconds =
      delta / 1000;

    for (
      let index =
        this.projectiles.length -
        1;
      index >= 0;
      index -= 1
    ) {
      const projectile =
        this.projectiles[index];

      if (
        !projectile.target.alive ||
        time >=
          projectile.expiresAt
      ) {
        this.removeProjectile(
          index,
        );
        continue;
      }

      const target =
        projectile.target.position;
      const dx =
        target.x -
        projectile.sprite.x;
      const dy =
        target.y -
        projectile.sprite.y;
      const distance =
        Math.hypot(dx, dy);

      if (distance <= 30) {
        this.damageEnemy(
          projectile.target,
          projectile.damage,
        );
        this.removeProjectile(
          index,
        );
        continue;
      }

      if (distance > 0.001) {
        const move =
          Math.min(
            distance,
            projectile.speed *
              seconds,
          );

        projectile.sprite.x +=
          (dx / distance) *
          move;
        projectile.sprite.y +=
          (dy / distance) *
          move;

        projectile.sprite.setRotation(
          Math.atan2(dy, dx),
        );
        projectile.sprite.setDepth(
          projectile.sprite.y +
            170,
        );
      }
    }
  }

  private damageEnemy(
    target: EnemyUnit,
    damage: number,
  ): void {
    const killed =
      target.takeDamage(
        damage,
      );

    this.audio.playHit();

    if (!killed) {
      return;
    }

    this.audio.playKill();

    this.drops.spawn(
      target.sprite.x,
      target.sprite.y,
      target.definition.dropCoins,
    );
  }

  private removeProjectile(
    index: number,
  ): void {
    const [projectile] =
      this.projectiles.splice(
        index,
        1,
      );

    projectile?.sprite.destroy();
  }

  private handleDeath(): void {
    this.dead = true;
    this.player.setEnabled(
      false,
    );

    this.scene.tweens.add({
      targets:
        this.player.sprite,
      alpha: 0,
      scaleX: 0.78,
      scaleY: 0.78,
      duration: 300,
      ease: 'Quad.In',
    });

    this.scene.time.delayedCall(
      520,
      () => {
        this.player.teleport(
          this.respawn.x,
          this.respawn.y,
        );
        this.player.sprite
          .setAlpha(1)
          .setScale(1)
          .clearTint();

        this.health =
          this.maxHealth;
        this.dead = false;
        this.invulnerableUntil =
          this.scene.time.now +
          1200;

        this.player.setEnabled(
          true,
        );

        this.scene.cameras.main.flash(
          220,
          255,
          245,
          190,
        );

        this.emitState();
      },
    );
  }

  private showPlayerDamage(
    amount: number,
  ): void {
    const position =
      this.player.position;

    const label =
      this.scene.add
        .text(
          position.x,
          position.y - 70,
          `-${amount}`,
          {
            fontFamily:
              'system-ui, sans-serif',
            fontSize: '18px',
            fontStyle: 'bold',
            color: '#ff6169',
            stroke: '#ffffff',
            strokeThickness: 3,
          },
        )
        .setOrigin(0.5)
        .setDepth(
          position.y + 250,
        );

    this.scene.tweens.add({
      targets: label,
      y: label.y - 28,
      alpha: 0,
      duration: 480,
      ease: 'Quad.Out',
      onComplete: () => {
        label.destroy();
      },
    });
  }

  private emitState(): void {
    this.onStateChanged(
      this.state,
    );
  }

  private ensureArrowTexture(): void {
    if (
      this.scene.textures.exists(
        ARROW_TEXTURE,
      )
    ) {
      return;
    }

    const graphics =
      this.scene.make.graphics({
        x: 0,
        y: 0,
      });

    graphics.lineStyle(
      4,
      0x6d4728,
      1,
    );
    graphics.lineBetween(
      4,
      10,
      25,
      10,
    );

    graphics.fillStyle(
      0xe8eef0,
      1,
    );
    graphics.fillTriangle(
      25,
      4,
      35,
      10,
      25,
      16,
    );

    graphics.generateTexture(
      ARROW_TEXTURE,
      38,
      20,
    );
    graphics.destroy();
  }
}
