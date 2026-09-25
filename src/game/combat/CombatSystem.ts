import Phaser from 'phaser';
import type {
  BossSystem,
  BossUnit,
} from '../bosses/BossSystem';
import type {
  EnemySystem,
  EnemyUnit,
} from '../enemies/EnemySystem';
import type {
  PlayerController,
} from '../player/PlayerController';
import { CombatAudio } from './CombatAudio';
import { DropSystem } from './DropSystem';
import {
  SETTLEMENT_CENTER,
  SETTLEMENT_SAFE_RADIUS,
} from '../world/WorldPrototype';
import {
  getMaxHealth,
} from '../progression/UpgradeBalance';
import {
  WEAPON_RARITIES,
  getWeaponDamageMultiplier,
  type EquippedWeaponProfile,
} from '../progression/WeaponInventory';
import {
  WEAPON_DEFINITIONS,
  isWeaponId,
  type WeaponAttackStyle,
  type WeaponId,
} from './WeaponDefinitions';

type CombatTarget =
  | EnemyUnit
  | BossUnit;

type OrbitingWeaponVisual = {
  slot: number;
  profile: EquippedWeaponProfile;
  container:
    Phaser.GameObjects.Container;
  nextHitAt: number;
};

export type HealthPotionUseResult =
  | 'used'
  | 'dead'
  | 'empty'
  | 'full-health'
  | 'cooldown';

export const MAX_HEALTH_POTIONS = 3;
export const HEALTH_POTION_HEAL_FRACTION = 0.35;
export const HEALTH_POTION_COOLDOWN_MS = 8_000;

export type CombatProgression = {
  maxHealthLevel: number;
  weaponProfiles:
    Record<
      WeaponId,
      EquippedWeaponProfile
    >;
  loadoutProfiles?:
    Array<
      EquippedWeaponProfile |
      null
    >;
  primarySlot?: number;
};

export type CombatState = {
  health: number;
  maxHealth: number;
  healthPotions: number;
  healthPotionCooldownMs: number;
  healthPotionCooldownRemainingMs: number;
  weaponId: WeaponId;
  unlockedWeaponIds: WeaponId[];
  weaponSlots:
    Array<
      EquippedWeaponProfile |
      null
    >;
  primarySlot: number;
};

export class CombatSystem {
  private maxHealth = 100;
  private health =
    this.maxHealth;
  private weaponProfiles:
    Record<
      WeaponId,
      EquippedWeaponProfile
    > = {
    axe: {
      weaponId: 'axe',
      rarity: 'common',
      level: 1,
      stars: 0,
    },
    sword: {
      weaponId: 'sword',
      rarity: 'common',
      level: 1,
      stars: 0,
    },
    hammer: {
      weaponId: 'hammer',
      rarity: 'common',
      level: 1,
      stars: 0,
    },
    spear: {
      weaponId: 'spear',
      rarity: 'common',
      level: 1,
      stars: 0,
    },
    daggers: {
      weaponId: 'daggers',
      rarity: 'common',
      level: 1,
      stars: 0,
    },
  };
  private weaponId:
    WeaponId = 'axe';
  private loadoutProfiles:
    Array<
      EquippedWeaponProfile |
      null
    > = [
      {
        weaponId: 'axe',
        rarity: 'common',
        level: 1,
        stars: 0,
      },
      null,
      null,
      null,
      null,
    ];
  private primarySlot = 0;
  private orbitals:
    OrbitingWeaponVisual[] = [];

  private readonly unlockedWeapons =
    new Set<WeaponId>([
      'axe',
    ]);

  private nextAttackAt = 0;
  private invulnerableUntil = 0;
  private lastCombatAt = 0;
  private nextRegenTickAt = 0;
  private dead = false;
  private healthPotions =
    MAX_HEALTH_POTIONS;
  private nextHealthPotionAt = 0;
  private temporaryDamageMultiplier = 1;
  private temporaryHealthMultiplier = 1;
  private rewardedReviveUsed = false;

  private readonly drops:
    DropSystem;
  private readonly audio =
    new CombatAudio();

  constructor(
    private readonly scene:
      Phaser.Scene,
    private readonly player:
      PlayerController,
    private readonly enemies:
      EnemySystem,
    private readonly bosses:
      BossSystem,
    private readonly respawn:
      Phaser.Math.Vector2,
    private readonly onStateChanged:
      (state: CombatState) => void,
    initialWeaponId: unknown =
      'axe',
    initialUnlockedWeaponIds:
      readonly unknown[] = [
        'axe',
      ],
    progression:
      CombatProgression,
    initialHealthPotions: number,
    onCoinsCollected:
      (value: number) => number,
    private readonly onTargetKilled?:
      (
        kind:
          'species' | 'boss',
        entityId: string,
        elite: boolean,
      ) => void,
    private readonly onPlayerDefeated?:
      () => void,
    private readonly onPlayerRespawned?:
      () => void,
  ) {
    this.drops =
      new DropSystem(
        scene,
        onCoinsCollected,
      );

    this.maxHealth =
      getMaxHealth(
        progression.maxHealthLevel,
      );
    this.health =
      this.maxHealth;
    this.weaponProfiles = {
      ...progression.weaponProfiles,
    };
    this.loadoutProfiles =
      progression.loadoutProfiles
        ? [...progression.loadoutProfiles]
        : [
            this.weaponProfiles.axe,
            null,
            null,
            null,
            null,
          ];
    this.primarySlot =
      Math.max(
        0,
        Math.min(
          this.loadoutProfiles.length - 1,
          progression.primarySlot ?? 0,
        ),
      );
    this.healthPotions =
      Phaser.Math.Clamp(
        Math.floor(
          initialHealthPotions,
        ),
        0,
        MAX_HEALTH_POTIONS,
      );

    this.unlockedWeapons.clear();

    for (
      const weaponId of
      initialUnlockedWeaponIds
    ) {
      if (
        isWeaponId(weaponId)
      ) {
        this.unlockedWeapons.add(
          weaponId,
        );
      }
    }

    if (
      this.unlockedWeapons.size === 0
    ) {
      this.unlockedWeapons.add(
        'axe',
      );
    }

    const requestedWeaponId =
      isWeaponId(initialWeaponId) &&
      this.unlockedWeapons.has(
        initialWeaponId,
      )
        ? initialWeaponId
        : 'axe';

    this.unlockedWeapons.add(
      'axe',
    );

    const requestedSlot =
      this.loadoutProfiles
        .findIndex(
          (profile) =>
            profile?.weaponId ===
            requestedWeaponId,
        );

    if (requestedSlot >= 0) {
      this.primarySlot =
        requestedSlot;
    }

    const primary =
      this.getPrimaryProfile();
    this.weaponId =
      primary.weaponId;

    this.player.setWeapon(
      this.weaponId,
    );
    this.rebuildOrbitals();
    this.player.setHealth(
      this.health,
      this.maxHealth,
    );

    this.emitState();
  }

  get canRewardedRevive(): boolean {
    return (
      this.dead &&
      !this.rewardedReviveUsed
    );
  }

  get state(): CombatState {
    return {
      health:
        this.health,
      maxHealth:
        this.maxHealth,
      healthPotions:
        this.healthPotions,
      healthPotionCooldownMs:
        HEALTH_POTION_COOLDOWN_MS,
      healthPotionCooldownRemainingMs:
        Math.max(
          0,
          this.nextHealthPotionAt -
            this.scene.time.now,
        ),
      weaponId:
        this.weaponId,
      unlockedWeaponIds:
        [...this.unlockedWeapons],
      weaponSlots:
        [...this.loadoutProfiles],
      primarySlot:
        this.primarySlot,
    };
  }

  setProgression(
    maxHealthLevel: number,
    weaponProfiles:
      Record<
        WeaponId,
        EquippedWeaponProfile
      >,
    loadoutProfiles?:
      Array<
        EquippedWeaponProfile |
        null
      >,
    primarySlot?:
      number,
  ): void {
    const previousMax =
      this.maxHealth;
    this.maxHealth =
      Math.max(
        1,
        Math.round(
          getMaxHealth(
            maxHealthLevel,
          ) *
            this.temporaryHealthMultiplier,
        ),
      );

    if (
      this.maxHealth >
      previousMax
    ) {
      this.health =
        Math.min(
          this.maxHealth,
          this.health +
            (
              this.maxHealth -
              previousMax
            ),
        );
    } else {
      this.health =
        Math.min(
          this.health,
          this.maxHealth,
        );
    }

    this.weaponProfiles = {
      ...weaponProfiles,
    };

    if (loadoutProfiles) {
      this.loadoutProfiles =
        [...loadoutProfiles];
    }

    if (
      primarySlot !== undefined
    ) {
      this.primarySlot =
        Math.max(
          0,
          Math.min(
            this.loadoutProfiles.length - 1,
            Math.floor(primarySlot),
          ),
        );
    }

    const primary =
      this.getPrimaryProfile();
    this.weaponId =
      primary.weaponId;
    this.player.setWeapon(
      this.weaponId,
    );
    this.rebuildOrbitals();

    this.player.setHealth(
      this.health,
      this.maxHealth,
    );
    this.emitState();
  }

  setTemporaryModifiers(
    damageMultiplier: number,
    healthMultiplier: number,
    maxHealthLevel: number,
  ): void {
    this.temporaryDamageMultiplier =
      Math.max(
        0.1,
        damageMultiplier,
      );
    this.temporaryHealthMultiplier =
      Math.max(
        0.1,
        healthMultiplier,
      );
    this.setProgression(
      maxHealthLevel,
      this.weaponProfiles,
      this.loadoutProfiles,
      this.primarySlot,
    );
  }

  setWeapon(
    weaponId: WeaponId,
  ): boolean {
    if (
      !this.unlockedWeapons.has(
        weaponId,
      )
    ) {
      return false;
    }

    const slot =
      this.loadoutProfiles
        .findIndex(
          (profile) =>
            profile?.weaponId ===
            weaponId,
        );

    if (slot < 0) {
      return false;
    }

    return this.setPrimarySlot(
      slot,
    );
  }

  setPrimarySlot(
    slotIndex: number,
  ): boolean {
    const safe =
      Math.floor(slotIndex);
    const profile =
      this.loadoutProfiles[
        safe
      ];

    if (!profile) {
      return false;
    }

    this.primarySlot =
      safe;
    this.weaponId =
      profile.weaponId;
    this.nextAttackAt = 0;

    this.player.setWeapon(
      this.weaponId,
    );
    this.rebuildOrbitals();
    this.emitState();
    return true;
  }

  unlockWeapon(
    weaponId: WeaponId,
  ): void {
    if (
      this.unlockedWeapons.has(
        weaponId,
      )
    ) {
      return;
    }

    this.unlockedWeapons.add(
      weaponId,
    );
    this.emitState();
  }

  update(
    time: number,
    delta: number,
    threatened: boolean,
  ): void {
    this.drops.update(
      delta,
      this.player.position,
    );

    this.updateOrbitals(
      time,
    );

    if (this.dead) {
      return;
    }

    if (threatened) {
      this.lastCombatAt =
        time;
      this.nextRegenTickAt =
        time + 500;
    } else {
      this.regenerateHealth(
        time,
      );
    }

    const playerPosition =
      this.player.position;
    const playerSafe =
      Phaser.Math.Distance.Between(
        playerPosition.x,
        playerPosition.y,
        SETTLEMENT_CENTER.x,
        SETTLEMENT_CENTER.y,
      ) <=
      SETTLEMENT_SAFE_RADIUS;

    if (playerSafe) {
      return;
    }

    const primaryProfile =
      this.getPrimaryProfile();
    const definition =
      WEAPON_DEFINITIONS[
        primaryProfile.weaponId
      ];

    const target =
      this.findNearestTarget(
        definition.range,
      );

    if (
      !target ||
      time <
        this.nextAttackAt
    ) {
      return;
    }

    this.lastCombatAt =
      time;
    this.nextRegenTickAt =
      time + 500;
    this.nextAttackAt =
      time +
      definition.cooldownMs;

    this.player.faceTowards(
      target.combatPosition.x,
    );

    this.attackMelee(
      target,
      primaryProfile,
      definition.damage,
      definition.attackStyle,
    );
  }

  useHealthPotion():
    HealthPotionUseResult {
    const now =
      this.scene.time.now;

    if (this.dead) {
      return 'dead';
    }

    if (
      this.healthPotions <= 0
    ) {
      return 'empty';
    }

    if (
      this.health >=
      this.maxHealth
    ) {
      return 'full-health';
    }

    if (
      now <
      this.nextHealthPotionAt
    ) {
      return 'cooldown';
    }

    const healAmount =
      Math.max(
        1,
        Math.round(
          this.maxHealth *
            HEALTH_POTION_HEAL_FRACTION,
        ),
      );
    const before =
      this.health;

    this.health =
      Math.min(
        this.maxHealth,
        this.health +
          healAmount,
      );
    this.healthPotions -= 1;
    this.nextHealthPotionAt =
      now +
      HEALTH_POTION_COOLDOWN_MS;

    this.player.setHealth(
      this.health,
      this.maxHealth,
    );

    this.showPlayerHeal(
      this.health - before,
    );

    this.emitState();
    return 'used';
  }

  restoreForLevelUp(): void {
    if (this.dead) {
      return;
    }

    this.health =
      this.maxHealth;
    this.healthPotions =
      MAX_HEALTH_POTIONS;
    this.nextHealthPotionAt = 0;
    this.nextRegenTickAt = 0;

    this.player.setHealth(
      this.health,
      this.maxHealth,
    );
    this.emitState();
  }

  refillHealthPotions(): boolean {
    const changed =
      this.healthPotions !==
        MAX_HEALTH_POTIONS ||
      this.nextHealthPotionAt !== 0;

    this.healthPotions =
      MAX_HEALTH_POTIONS;
    this.nextHealthPotionAt = 0;

    if (changed) {
      this.emitState();
    }

    return changed;
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
    this.lastCombatAt =
      now;
    this.nextRegenTickAt =
      now + 500;

    this.health =
      Math.max(
        0,
        this.health - amount,
      );

    this.player.setHealth(
      this.health,
      this.maxHealth,
    );
    this.player.flashDamage();

    this.audio.playDamage();
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
    this.destroyOrbitals();
    this.drops.destroy();
  }

  private regenerateHealth(
    time: number,
  ): void {
    if (
      this.health >=
        this.maxHealth ||
      time - this.lastCombatAt <
        5000 ||
      time <
        this.nextRegenTickAt
    ) {
      return;
    }

    this.nextRegenTickAt =
      time + 500;

    this.health =
      Math.min(
        this.maxHealth,
        this.health + 3,
      );

    this.player.setHealth(
      this.health,
      this.maxHealth,
    );

    this.emitState();
  }

  private findNearestTarget(
    range: number,
  ): CombatTarget | undefined {
    return this.findNearestTargetFrom(
      this.player.combatPosition,
      range,
      this.player.combatRadius,
    );
  }

  private findNearestTargetFrom(
    origin:
      Phaser.Math.Vector2,
    range: number,
    originRadius = 0,
  ): CombatTarget | undefined {
    const enemy =
      this.enemies.findNearest(
        origin,
        range,
        originRadius,
      );
    const boss =
      this.bosses.findNearest(
        origin,
        range,
        originRadius,
      );

    if (!enemy) {
      return boss;
    }

    if (!boss) {
      return enemy;
    }

    const enemyDistance =
      enemy.combatDistanceTo(
        origin,
        originRadius,
      );

    const bossDistance =
      boss.combatDistanceTo(
        origin,
        originRadius,
      );

    return bossDistance <
      enemyDistance
      ? boss
      : enemy;
  }

  private attackMelee(
    target: CombatTarget,
    profile:
      EquippedWeaponProfile,
    baseDamage: number,
    style: WeaponAttackStyle,
  ): void {
    this.audio.playSwing();

    const origin =
      this.player.combatPosition;
    const targetPosition =
      target.combatPosition;
    const direction =
      new Phaser.Math.Vector2(
        targetPosition.x -
          origin.x,
        targetPosition.y -
          origin.y,
      ).normalize();

    this.showAttackEffect(
      origin,
      direction,
      style,
    );

    this.damageTarget(
      target,
      profile,
      baseDamage,
      1,
    );
  }

  private showAttackEffect(
    origin: Phaser.Math.Vector2,
    direction: Phaser.Math.Vector2,
    style: WeaponAttackStyle,
  ): void {
    const angle =
      Math.atan2(
        direction.y,
        direction.x,
      );

    if (
      style === 'smash'
    ) {
      const impact =
        this.scene.add
          .circle(
            origin.x +
              direction.x * 50,
            origin.y +
              direction.y * 34,
            20,
            0xe8d1a1,
            0.18,
          )
          .setStrokeStyle(
            6,
            0xffdda1,
            0.88,
          )
          .setDepth(
            origin.y + 220,
          );

      this.scene.tweens.add({
        targets: impact,
        scale: 1.9,
        alpha: 0,
        duration: 170,
        ease: 'Quad.Out',
        onComplete: () => {
          impact.destroy();
        },
      });

      return;
    }

    if (
      style === 'thrust'
    ) {
      const line =
        this.scene.add
          .rectangle(
            origin.x +
              direction.x * 58,
            origin.y +
              direction.y * 42,
            94,
            8,
            0xf4ead0,
            0.78,
          )
          .setRotation(angle)
          .setDepth(
            origin.y + 220,
          );

      this.scene.tweens.add({
        targets: line,
        scaleX: 1.25,
        alpha: 0,
        duration: 125,
        ease: 'Quad.Out',
        onComplete: () => {
          line.destroy();
        },
      });

      return;
    }

    const radius =
      style === 'wide-slash'
        ? 49
        : style ===
            'dual-slash'
          ? 34
          : 40;

    const stroke =
      style === 'wide-slash'
        ? 9
        : 6;

    const slash =
      this.scene.add
        .arc(
          origin.x +
            direction.x * 44,
          origin.y +
            direction.y * 34,
          radius,
          -62,
          62,
          false,
          0xfff0a8,
          0.13,
        )
        .setStrokeStyle(
          stroke,
          style ===
            'dual-slash'
            ? 0xffd3ec
            : 0xfff4c7,
          0.88,
        )
        .setRotation(angle)
        .setDepth(
          origin.y + 220,
        );

    this.scene.tweens.add({
      targets: slash,
      scale: 1.28,
      alpha: 0,
      duration:
        style === 'dual-slash'
          ? 95
          : 145,
      ease: 'Quad.Out',
      onComplete: () => {
        slash.destroy();
      },
    });

    if (
      style === 'dual-slash'
    ) {
      const second =
        this.scene.add
          .arc(
            origin.x +
              direction.x * 36,
            origin.y +
              direction.y * 28,
            29,
            -60,
            60,
            false,
            0xffd3ec,
            0.1,
          )
          .setStrokeStyle(
            5,
            0xffffff,
            0.75,
          )
          .setRotation(
            angle + 0.24,
          )
          .setDepth(
            origin.y + 221,
          );

      this.scene.tweens.add({
        targets: second,
        scale: 1.22,
        alpha: 0,
        duration: 105,
        ease: 'Quad.Out',
        onComplete: () => {
          second.destroy();
        },
      });
    }
  }

  private getPrimaryProfile():
    EquippedWeaponProfile {
    return (
      this.loadoutProfiles[
        this.primarySlot
      ] ??
      this.loadoutProfiles.find(
        (
          profile,
        ): profile is EquippedWeaponProfile =>
          Boolean(profile),
      ) ??
      this.weaponProfiles[
        this.weaponId
      ]
    );
  }

  private rebuildOrbitals():
    void {
    this.destroyOrbitals();

    const secondary =
      this.loadoutProfiles
        .map(
          (profile, slot) => ({
            profile,
            slot,
          }),
        )
        .filter(
          (
            entry,
          ): entry is {
            profile:
              EquippedWeaponProfile;
            slot: number;
          } =>
            Boolean(
              entry.profile,
            ) &&
            entry.slot !==
              this.primarySlot,
        );

    for (
      const entry of secondary
    ) {
      const rarity =
        WEAPON_RARITIES[
          entry.profile.rarity
        ];
      const color =
        Number.parseInt(
          rarity.color.slice(1),
          16,
        );
      const circle =
        this.scene.add.circle(
          0,
          0,
          17,
          color,
          0.9,
        )
        .setStrokeStyle(
          3,
          0xfff1c2,
          0.8,
        );
      const label =
        this.scene.add.text(
          0,
          0,
          WEAPON_DEFINITIONS[
            entry.profile.weaponId
          ].shortName
            .slice(0, 1),
          {
            fontFamily:
              'system-ui, sans-serif',
            fontSize: '16px',
            fontStyle: 'bold',
            color: '#1f2722',
          },
        )
        .setOrigin(0.5);
      const container =
        this.scene.add
          .container(
            this.player.position.x,
            this.player.position.y,
            [
              circle,
              label,
            ],
          )
          .setDepth(
            this.player.position.y +
            150,
          );

      this.orbitals.push({
        slot:
          entry.slot,
        profile:
          entry.profile,
        container,
        nextHitAt: 0,
      });
    }
  }

  private destroyOrbitals():
    void {
    for (
      const orbital of
      this.orbitals
    ) {
      orbital.container.destroy(
        true,
      );
    }

    this.orbitals = [];
  }

  private updateOrbitals(
    time: number,
  ): void {
    const count =
      this.orbitals.length;

    if (count <= 0) {
      return;
    }

    const center =
      this.player.combatPosition;
    const radius =
      82 +
      Math.min(
        22,
        count * 4,
      );

    this.orbitals.forEach(
      (
        orbital,
        index,
      ) => {
        const angle =
          time * 0.00215 +
          index *
            (
              Math.PI *
              2 /
              count
            );
        const x =
          center.x +
          Math.cos(angle) *
            radius;
        const y =
          center.y +
          Math.sin(angle) *
            radius *
            0.72;

        orbital.container
          .setPosition(x, y)
          .setRotation(
            angle +
            Math.PI / 2,
          )
          .setDepth(y + 150)
          .setVisible(
            !this.dead,
          );

        if (
          this.dead ||
          time <
            orbital.nextHitAt
        ) {
          return;
        }

        const target =
          this.findNearestTargetFrom(
            new Phaser.Math.Vector2(
              x,
              y,
            ),
            34,
            17,
          );

        if (!target) {
          return;
        }

        const definition =
          WEAPON_DEFINITIONS[
            orbital.profile
              .weaponId
          ];

        orbital.nextHitAt =
          time +
          Math.max(
            280,
            definition.cooldownMs *
              1.25,
          );

        this.damageTarget(
          target,
          orbital.profile,
          definition.damage,
          0.65,
        );

        this.showOrbitalHit(
          x,
          y,
          orbital.profile,
        );
      },
    );
  }

  private damageTarget(
    target: CombatTarget,
    profile:
      EquippedWeaponProfile,
    baseDamage: number,
    damageScale: number,
  ): void {
    const damageProfile =
      target.getDamageProfile(
        profile.weaponId,
      );
    const finalDamage =
      Math.max(
        1,
        Math.round(
          baseDamage *
            damageScale *
            this.temporaryDamageMultiplier *
            getWeaponDamageMultiplier(
              profile.level,
              profile.rarity,
              profile.stars,
            ) *
            damageProfile.multiplier,
        ),
      );
    const killed =
      target.takeDamage(
        finalDamage,
        damageProfile.effectiveness,
      );

    this.audio.playHit();

    if (!killed) {
      return;
    }

    this.audio.playKill();
    this.onTargetKilled?.(
      target.bestiaryKind,
      target.bestiaryId,
      target.bestiaryElite,
    );
    this.drops.spawn(
      target.sprite.x,
      target.sprite.y,
      target.dropCoins,
    );
  }

  private showOrbitalHit(
    x: number,
    y: number,
    profile:
      EquippedWeaponProfile,
  ): void {
    const color =
      Number.parseInt(
        WEAPON_RARITIES[
          profile.rarity
        ].color.slice(1),
        16,
      );
    const pulse =
      this.scene.add.circle(
        x,
        y,
        14,
        color,
        0.18,
      )
      .setStrokeStyle(
        3,
        color,
        0.85,
      )
      .setDepth(y + 190);

    this.scene.tweens.add({
      targets: pulse,
      scale: 1.7,
      alpha: 0,
      duration: 120,
      ease: 'Quad.Out',
      onComplete: () => {
        pulse.destroy();
      },
    });
  }

  reviveHere(
    healthRatio: number,
    invulnerabilityMs: number,
  ): boolean {
    if (
      !this.dead ||
      this.rewardedReviveUsed
    ) {
      return false;
    }

    this.rewardedReviveUsed =
      true;
    this.dead = false;
    this.health =
      Math.max(
        1,
        Math.round(
          this.maxHealth *
            Phaser.Math.Clamp(
              healthRatio,
              0.1,
              1,
            ),
        ),
      );
    this.invulnerableUntil =
      this.scene.time.now +
      Math.max(
        0,
        invulnerabilityMs,
      );
    this.lastCombatAt =
      this.scene.time.now;
    this.nextRegenTickAt =
      this.scene.time.now + 500;

    this.player.setHealth(
      this.health,
      this.maxHealth,
    );
    this.player.sprite
      .setAlpha(1)
      .setScale(1)
      .clearTint();
    this.player.setEnabled(true);
    this.player
      .setAliveVisualsVisible(true);

    this.scene.cameras.main.flash(
      220,
      155,
      235,
      170,
    );
    this.emitState();
    return true;
  }

  respawnAtHome(): void {
    if (!this.dead) {
      return;
    }

    this.player.teleport(
      this.respawn.x,
      this.respawn.y,
    );
    this.health =
      this.maxHealth;
    this.dead = false;
    this.rewardedReviveUsed =
      false;
    this.invulnerableUntil =
      this.scene.time.now + 1200;
    this.lastCombatAt =
      this.scene.time.now;
    this.nextRegenTickAt =
      this.scene.time.now + 500;

    this.player.setHealth(
      this.health,
      this.maxHealth,
    );
    this.player.sprite
      .setAlpha(1)
      .setScale(1)
      .clearTint();
    this.player.setEnabled(true);
    this.player
      .setAliveVisualsVisible(true);

    this.onPlayerRespawned?.();

    this.scene.cameras.main.flash(
      220,
      255,
      245,
      190,
    );
    this.emitState();
  }

  private handleDeath(): void {
    this.dead = true;
    this.player.setEnabled(false);
    this.player.sprite
      .setAlpha(0.42)
      .setTint(0x9e8f99);
    this.onPlayerDefeated?.();
    this.emitState();
  }

  private showPlayerHeal(
    amount: number,
  ): void {
    if (amount <= 0) {
      return;
    }

    const position =
      this.player.position;

    const label =
      this.scene.add
        .text(
          position.x,
          position.y - 76,
          `+${amount}`,
          {
            fontFamily:
              'system-ui, sans-serif',
            fontSize: '19px',
            fontStyle: 'bold',
            color: '#78e889',
            stroke: '#ffffff',
            strokeThickness: 3,
          },
        )
        .setOrigin(0.5)
        .setDepth(
          position.y + 251,
        );

    this.scene.tweens.add({
      targets: label,
      y: label.y - 30,
      alpha: 0,
      duration: 520,
      ease: 'Quad.Out',
      onComplete: () => {
        label.destroy();
      },
    });
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
}
