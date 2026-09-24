import Phaser from 'phaser';
import {
  LOGICAL_WIDTH,
} from '../layout/Viewport';
import type {
  CombatState,
} from './CombatSystem';
import {
  WEAPON_DEFINITIONS,
  type WeaponId,
} from './WeaponDefinitions';

export class CombatHud {
  private readonly healthFill:
    Phaser.GameObjects.Rectangle;
  private readonly healthText:
    Phaser.GameObjects.Text;
  private readonly coinText:
    Phaser.GameObjects.Text;
  private readonly weaponButtons:
    Record<
      WeaponId,
      Phaser.GameObjects.Rectangle
    >;
  private readonly weaponLabels:
    Record<
      WeaponId,
      Phaser.GameObjects.Text
    >;

  constructor(
    scene: Phaser.Scene,
    onWeaponSelected:
      (weaponId: WeaponId) => void,
  ) {
    scene.add
      .rectangle(
        28,
        92,
        236,
        30,
        0x294826,
        0.82,
      )
      .setOrigin(0, 0)
      .setStrokeStyle(
        2,
        0xffffff,
        0.28,
      )
      .setScrollFactor(0)
      .setDepth(8500);

    this.healthFill = scene.add
      .rectangle(
        34,
        98,
        224,
        18,
        0xf05f62,
        0.95,
      )
      .setOrigin(0, 0)
      .setScrollFactor(0)
      .setDepth(8501);

    this.healthText = scene.add
      .text(
        146,
        107,
        '',
        {
          fontFamily:
            'system-ui, sans-serif',
          fontSize: '13px',
          fontStyle: 'bold',
          color: '#ffffff',
        },
      )
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(8502);

    this.coinText = scene.add
      .text(
        30,
        132,
        '',
        {
          fontFamily:
            'system-ui, sans-serif',
          fontSize: '16px',
          fontStyle: 'bold',
          color: '#75521c',
          backgroundColor:
            '#fff3b8dd',
          padding: {
            x: 9,
            y: 5,
          },
        },
      )
      .setScrollFactor(0)
      .setDepth(8500);

    const blade =
      this.createWeaponButton(
        scene,
        LOGICAL_WIDTH - 230,
        88,
        '1 · Меч',
        () => {
          onWeaponSelected(
            'blade',
          );
        },
      );

    const bow =
      this.createWeaponButton(
        scene,
        LOGICAL_WIDTH - 112,
        88,
        '2 · Лук',
        () => {
          onWeaponSelected(
            'bow',
          );
        },
      );

    this.weaponButtons = {
      blade:
        blade.background,
      bow:
        bow.background,
    };

    this.weaponLabels = {
      blade:
        blade.label,
      bow:
        bow.label,
    };
  }

  update(
    state: CombatState,
  ): void {
    const ratio =
      Phaser.Math.Clamp(
        state.health /
          state.maxHealth,
        0,
        1,
      );

    this.healthFill.setDisplaySize(
      224 * ratio,
      18,
    );

    this.healthText.setText(
      `HP ${state.health} / ${state.maxHealth}`,
    );

    this.coinText.setText(
      `● ${state.coins}`,
    );

    for (
      const weaponId of
      ['blade', 'bow'] as
        WeaponId[]
    ) {
      const selected =
        weaponId ===
        state.weaponId;

      this.weaponButtons[
        weaponId
      ].setFillStyle(
        selected
          ? 0x68458f
          : 0x315f35,
        selected
          ? 0.94
          : 0.78,
      );

      this.weaponLabels[
        weaponId
      ].setText(
        selected
          ? `${WEAPON_DEFINITIONS[weaponId].name} ✓`
          : weaponId === 'blade'
            ? '1 · Меч'
            : '2 · Лук',
      );
    }
  }

  private createWeaponButton(
    scene: Phaser.Scene,
    x: number,
    y: number,
    label: string,
    onClick: () => void,
  ): {
    background:
      Phaser.GameObjects.Rectangle;
    label:
      Phaser.GameObjects.Text;
  } {
    const background =
      scene.add
        .rectangle(
          x,
          y,
          104,
          38,
          0x315f35,
          0.78,
        )
        .setStrokeStyle(
          2,
          0xf3f5dd,
          0.5,
        )
        .setScrollFactor(0)
        .setDepth(8500)
        .setInteractive({
          useHandCursor: true,
        });

    const text =
      scene.add
        .text(
          x,
          y,
          label,
          {
            fontFamily:
              'system-ui, sans-serif',
            fontSize: '14px',
            fontStyle: 'bold',
            color: '#ffffff',
          },
        )
        .setOrigin(0.5)
        .setScrollFactor(0)
        .setDepth(8501);

    background.on(
      Phaser.Input.Events.POINTER_DOWN,
      onClick,
    );

    return {
      background,
      label: text,
    };
  }
}
