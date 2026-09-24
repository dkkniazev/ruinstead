import Phaser from 'phaser';
import {
  LOGICAL_WIDTH,
  configureLogicalCamera,
} from '../game/layout/Viewport';
import type {
  CombatState,
} from '../game/combat/CombatSystem';
import {
  WEAPON_DEFINITIONS,
  type WeaponId,
} from '../game/combat/WeaponDefinitions';
import {
  HUD_AREA_EVENT,
  HUD_COMBAT_STATE_EVENT,
  HUD_WEAPON_SELECT_EVENT,
} from '../game/ui/HudEvents';

type HudSceneData = {
  initialCombatState:
    CombatState;
  initialAreaName: string;
};

export class HudScene
  extends Phaser.Scene {
  private initialCombatState?:
    CombatState;
  private initialAreaName =
    'Руины поселения';

  private healthFill?:
    Phaser.GameObjects.Rectangle;
  private healthText?:
    Phaser.GameObjects.Text;
  private coinText?:
    Phaser.GameObjects.Text;
  private areaText?:
    Phaser.GameObjects.Text;

  private weaponButtons:
    Partial<
      Record<
        WeaponId,
        Phaser.GameObjects.Rectangle
      >
    > = {};

  private weaponLabels:
    Partial<
      Record<
        WeaponId,
        Phaser.GameObjects.Text
      >
    > = {};

  constructor() {
    super('HudScene');
  }

  init(data: HudSceneData): void {
    this.initialCombatState =
      data.initialCombatState;
    this.initialAreaName =
      data.initialAreaName;
  }

  create(): void {
    configureLogicalCamera(this);

    this.createTopLeftStatus();
    this.createWeaponSelector();
    this.createControlsHint();

    this.game.events.on(
      HUD_COMBAT_STATE_EVENT,
      this.handleCombatState,
      this,
    );
    this.game.events.on(
      HUD_AREA_EVENT,
      this.handleAreaName,
      this,
    );

    this.scale.on(
      Phaser.Scale.Events.RESIZE,
      this.handleResize,
      this,
    );

    this.events.once(
      Phaser.Scenes.Events.SHUTDOWN,
      this.cleanup,
      this,
    );

    this.handleAreaName(
      this.initialAreaName,
    );

    if (
      this.initialCombatState
    ) {
      this.handleCombatState(
        this.initialCombatState,
      );
    }
  }

  private createTopLeftStatus(): void {
    this.add
      .rectangle(
        26,
        24,
        276,
        126,
        0x234b2b,
        0.88,
      )
      .setOrigin(0, 0)
      .setStrokeStyle(
        2,
        0xf4f0cf,
        0.58,
      )
      .setDepth(100);

    this.areaText = this.add
      .text(
        42,
        38,
        '',
        {
          fontFamily:
            'system-ui, sans-serif',
          fontSize: '20px',
          fontStyle: 'bold',
          color: '#fff7d6',
        },
      )
      .setDepth(101);

    this.add
      .rectangle(
        42,
        76,
        244,
        30,
        0x2b3129,
        0.94,
      )
      .setOrigin(0, 0)
      .setStrokeStyle(
        2,
        0xffffff,
        0.24,
      )
      .setDepth(101);

    this.healthFill = this.add
      .rectangle(
        47,
        81,
        234,
        20,
        0xf05f62,
        1,
      )
      .setOrigin(0, 0)
      .setDepth(102);

    this.healthText = this.add
      .text(
        164,
        91,
        '',
        {
          fontFamily:
            'system-ui, sans-serif',
          fontSize: '13px',
          fontStyle: 'bold',
          color: '#ffffff',
          stroke: '#7a3034',
          strokeThickness: 2,
        },
      )
      .setOrigin(0.5)
      .setDepth(103);

    this.coinText = this.add
      .text(
        43,
        116,
        '',
        {
          fontFamily:
            'system-ui, sans-serif',
          fontSize: '16px',
          fontStyle: 'bold',
          color: '#76501d',
          backgroundColor:
            '#fff0a8',
          padding: {
            x: 10,
            y: 5,
          },
        },
      )
      .setDepth(103);
  }

  private createWeaponSelector(): void {
    this.add
      .rectangle(
        LOGICAL_WIDTH - 176,
        24,
        326,
        70,
        0x234b2b,
        0.88,
      )
      .setOrigin(0, 0)
      .setStrokeStyle(
        2,
        0xf4f0cf,
        0.58,
      )
      .setDepth(100);

    const blade =
      this.createWeaponButton(
        LOGICAL_WIDTH - 94,
        59,
        '1 · Меч',
        'blade',
      );

    const bow =
      this.createWeaponButton(
        LOGICAL_WIDTH - 258,
        59,
        '2 · Лук',
        'bow',
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

  private createControlsHint(): void {
    this.add
      .text(
        LOGICAL_WIDTH - 24,
        108,
        'Автобой · Space/Shift — рывок',
        {
          fontFamily:
            'system-ui, sans-serif',
          fontSize: '13px',
          color: '#31502f',
          backgroundColor:
            '#efffd0dd',
          padding: {
            x: 10,
            y: 6,
          },
        },
      )
      .setOrigin(1, 0)
      .setDepth(100);
  }

  private createWeaponButton(
    x: number,
    y: number,
    label: string,
    weaponId: WeaponId,
  ): {
    background:
      Phaser.GameObjects.Rectangle;
    label:
      Phaser.GameObjects.Text;
  } {
    const background =
      this.add
        .rectangle(
          x,
          y,
          140,
          42,
          0x315f35,
          0.88,
        )
        .setStrokeStyle(
          2,
          0xf3f5dd,
          0.62,
        )
        .setDepth(102)
        .setInteractive({
          useHandCursor: true,
        });

    const text =
      this.add
        .text(
          x,
          y,
          label,
          {
            fontFamily:
              'system-ui, sans-serif',
            fontSize: '15px',
            fontStyle: 'bold',
            color: '#ffffff',
          },
        )
        .setOrigin(0.5)
        .setDepth(103);

    background.on(
      Phaser.Input.Events.POINTER_DOWN,
      () => {
        this.game.events.emit(
          HUD_WEAPON_SELECT_EVENT,
          weaponId,
        );
      },
    );

    return {
      background,
      label: text,
    };
  }

  private handleCombatState(
    state: CombatState,
  ): void {
    const ratio =
      Phaser.Math.Clamp(
        state.health /
          state.maxHealth,
        0,
        1,
      );

    this.healthFill?.setDisplaySize(
      234 * ratio,
      20,
    );

    this.healthText?.setText(
      `HP ${state.health} / ${state.maxHealth}`,
    );

    this.coinText?.setText(
      `● Монеты: ${state.coins}`,
    );

    for (
      const weaponId of
      ['blade', 'bow'] as WeaponId[]
    ) {
      const selected =
        weaponId ===
        state.weaponId;

      this.weaponButtons[
        weaponId
      ]?.setFillStyle(
        selected
          ? 0x7751a1
          : 0x315f35,
        selected
          ? 1
          : 0.88,
      );

      const fallback =
        weaponId === 'blade'
          ? '1 · Меч'
          : '2 · Лук';

      this.weaponLabels[
        weaponId
      ]?.setText(
        selected
          ? `${WEAPON_DEFINITIONS[weaponId].name} ✓`
          : fallback,
      );
    }
  }

  private handleAreaName(
    areaName: string,
  ): void {
    this.areaText?.setText(
      areaName,
    );
  }

  private handleResize(): void {
    configureLogicalCamera(this);
  }

  private cleanup(): void {
    this.game.events.off(
      HUD_COMBAT_STATE_EVENT,
      this.handleCombatState,
      this,
    );
    this.game.events.off(
      HUD_AREA_EVENT,
      this.handleAreaName,
      this,
    );
    this.scale.off(
      Phaser.Scale.Events.RESIZE,
      this.handleResize,
      this,
    );
  }
}
