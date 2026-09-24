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
  WEAPON_ORDER,
  type WeaponId,
} from '../game/combat/WeaponDefinitions';
import {
  HUD_AREA_EVENT,
  HUD_COMBAT_STATE_EVENT,
  HUD_NOTICE_EVENT,
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
  private noticeText?:
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
    this.createNoticeLayer();

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
    this.game.events.on(
      HUD_NOTICE_EVENT,
      this.handleNotice,
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
        LOGICAL_WIDTH - 435,
        24,
        409,
        116,
        0x234b2b,
        0.9,
      )
      .setOrigin(0, 0)
      .setStrokeStyle(
        2,
        0xf4f0cf,
        0.58,
      )
      .setDepth(100);

    this.add
      .text(
        LOGICAL_WIDTH - 421,
        34,
        'Оружие',
        {
          fontFamily:
            'system-ui, sans-serif',
          fontSize: '15px',
          fontStyle: 'bold',
          color: '#fff7d6',
        },
      )
      .setDepth(101);

    const positions:
      Record<
        WeaponId,
        readonly [number, number]
      > = {
      axe: [
        LOGICAL_WIDTH - 365,
        72,
      ],
      sword: [
        LOGICAL_WIDTH - 242,
        72,
      ],
      hammer: [
        LOGICAL_WIDTH - 119,
        72,
      ],
      spear: [
        LOGICAL_WIDTH - 303,
        116,
      ],
      daggers: [
        LOGICAL_WIDTH - 180,
        116,
      ],
    };

    WEAPON_ORDER.forEach(
      (weaponId, index) => {
        const [
          x,
          y,
        ] =
          positions[
            weaponId
          ];

        const button =
          this.createWeaponButton(
            x,
            y,
            `${index + 1} · ${WEAPON_DEFINITIONS[weaponId].shortName}`,
            weaponId,
          );

        this.weaponButtons[
          weaponId
        ] =
          button.background;

        this.weaponLabels[
          weaponId
        ] =
          button.label;
      },
    );
  }

  private createControlsHint(): void {
    this.add
      .text(
        LOGICAL_WIDTH - 24,
        154,
        'Автобой · 1–5 оружие · Space/Shift — рывок',
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

  private createNoticeLayer(): void {
    this.noticeText =
      this.add
        .text(
          LOGICAL_WIDTH / 2,
          205,
          '',
          {
            fontFamily:
              'system-ui, sans-serif',
            fontSize: '22px',
            fontStyle: 'bold',
            color: '#fff7d6',
            backgroundColor:
              '#2a402ddd',
            padding: {
              x: 16,
              y: 10,
            },
            align: 'center',
          },
        )
        .setOrigin(0.5)
        .setDepth(180)
        .setAlpha(0);
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
          112,
          34,
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
            fontSize: '12px',
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
      WEAPON_ORDER
    ) {
      const unlocked =
        state.unlockedWeaponIds
          .includes(weaponId);
      const selected =
        weaponId ===
        state.weaponId;

      this.weaponButtons[
        weaponId
      ]?.setFillStyle(
        selected
          ? 0x7751a1
          : unlocked
            ? 0x315f35
            : 0x4b4f4a,
        unlocked
          ? 1
          : 0.72,
      );

      this.weaponButtons[
        weaponId
      ]?.setStrokeStyle(
        2,
        selected
          ? 0xffe590
          : unlocked
            ? 0xf3f5dd
            : 0x8d948d,
        selected
          ? 0.95
          : 0.5,
      );

      const index =
        WEAPON_ORDER.indexOf(
          weaponId,
        ) + 1;

      const name =
        WEAPON_DEFINITIONS[
          weaponId
        ].shortName;

      this.weaponLabels[
        weaponId
      ]?.setText(
        selected
          ? `${name} ✓`
          : unlocked
            ? `${index} · ${name}`
            : `${name} · ЗАКР.`,
      );

      this.weaponLabels[
        weaponId
      ]?.setColor(
        unlocked
          ? '#ffffff'
          : '#b9bdb8',
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

  private handleNotice(
    message: string,
  ): void {
    if (!this.noticeText) {
      return;
    }

    this.tweens.killTweensOf(
      this.noticeText,
    );

    this.noticeText
      .setText(message)
      .setAlpha(1)
      .setScale(0.96);

    this.tweens.add({
      targets:
        this.noticeText,
      scale: 1,
      duration: 120,
      ease: 'Back.Out',
      onComplete: () => {
        this.time.delayedCall(
          1450,
          () => {
            if (
              !this.noticeText
            ) {
              return;
            }

            this.tweens.add({
              targets:
                this.noticeText,
              alpha: 0,
              y:
                this.noticeText.y -
                10,
              duration: 260,
              onComplete: () => {
                this.noticeText?.setY(
                  205,
                );
              },
            });
          },
        );
      },
    });
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
    this.game.events.off(
      HUD_NOTICE_EVENT,
      this.handleNotice,
      this,
    );
    this.scale.off(
      Phaser.Scale.Events.RESIZE,
      this.handleResize,
      this,
    );
  }
}
