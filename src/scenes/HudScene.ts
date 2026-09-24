import Phaser from 'phaser';
import {
  LOGICAL_HEIGHT,
  LOGICAL_WIDTH,
  configureLogicalCamera,
} from '../game/layout/Viewport';
import type {
  CombatState,
} from '../game/combat/CombatSystem';
import {
  WEAPON_ORDER,
  type WeaponId,
} from '../game/combat/WeaponDefinitions';
import {
  HUD_AREA_EVENT,
  HUD_COMBAT_STATE_EVENT,
  HUD_GATHERING_STATE_EVENT,
  HUD_NOTICE_EVENT,
  HUD_SETTLEMENT_STATE_EVENT,
  HUD_FORGE_REPAIR_EVENT,
  HUD_WEAPON_SELECT_EVENT,
  type GatheringHudState,
} from '../game/ui/HudEvents';
import type {
  SettlementHudState,
} from '../game/settlement/SettlementSystem';

const WEAPON_ICON_TEXTURES:
  Record<WeaponId, string> = {
  axe: 'ruinstead-player-axe-v3',
  sword: 'ruinstead-player-sword-v3',
  hammer: 'ruinstead-player-hammer-v3',
  spear: 'ruinstead-player-spear-v3',
  daggers: 'ruinstead-player-daggers-v3',
};

type HudSceneData = {
  initialCombatState:
    CombatState;
  initialGatheringState:
    GatheringHudState;
  initialSettlementState:
    SettlementHudState;
  initialAreaName: string;
};

export class HudScene
  extends Phaser.Scene {
  private initialCombatState?:
    CombatState;
  private initialGatheringState?:
    GatheringHudState;
  private initialSettlementState?:
    SettlementHudState;
  private settlementState?:
    SettlementHudState;
  private forgePanelOpen = false;
  private initialAreaName =
    'Руины поселения';

  private healthFill?:
    Phaser.GameObjects.Rectangle;
  private healthText?:
    Phaser.GameObjects.Text;
  private areaText?:
    Phaser.GameObjects.Text;
  private noticeText?:
    Phaser.GameObjects.Text;
  private backpackFill?:
    Phaser.GameObjects.Rectangle;
  private backpackText?:
    Phaser.GameObjects.Text;
  private carriedText?:
    Phaser.GameObjects.Text;
  private storageText?:
    Phaser.GameObjects.Text;
  private forgePrompt?:
    Phaser.GameObjects.Rectangle;
  private forgePromptText?:
    Phaser.GameObjects.Text;
  private forgePanel?:
    Phaser.GameObjects.Container;
  private forgeStageText?:
    Phaser.GameObjects.Text;
  private forgeCostText?:
    Phaser.GameObjects.Text;
  private forgeStorageText?:
    Phaser.GameObjects.Text;
  private forgeNpcText?:
    Phaser.GameObjects.Text;
  private forgeRepairButton?:
    Phaser.GameObjects.Rectangle;
  private forgeRepairButtonText?:
    Phaser.GameObjects.Text;

  private weaponButtons:
    Partial<
      Record<
        WeaponId,
        Phaser.GameObjects.Rectangle
      >
    > = {};

  private weaponIcons:
    Partial<
      Record<
        WeaponId,
        Phaser.GameObjects.Image
      >
    > = {};

  constructor() {
    super('HudScene');
  }

  init(data: HudSceneData): void {
    this.initialCombatState =
      data.initialCombatState;
    this.initialGatheringState =
      data.initialGatheringState;
    this.initialSettlementState =
      data.initialSettlementState;
    this.initialAreaName =
      data.initialAreaName;
  }

  create(): void {
    configureLogicalCamera(this);

    this.createTopLeftStatus();
    this.createGatheringPanel();
    this.createWeaponSelector();
    this.createSettlementUi();
    this.createControlsHint();
    this.createNoticeLayer();

    this.game.events.on(
      HUD_COMBAT_STATE_EVENT,
      this.handleCombatState,
      this,
    );
    this.game.events.on(
      HUD_GATHERING_STATE_EVENT,
      this.handleGatheringState,
      this,
    );
    this.game.events.on(
      HUD_SETTLEMENT_STATE_EVENT,
      this.handleSettlementState,
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

    if (
      this.initialGatheringState
    ) {
      this.handleGatheringState(
        this.initialGatheringState,
      );
    }

    if (
      this.initialSettlementState
    ) {
      this.handleSettlementState(
        this.initialSettlementState,
      );
    }

    this.input.keyboard?.on(
      'keydown-E',
      this.handleForgeToggle,
      this,
    );
  }

  private createTopLeftStatus(): void {
    this.add
      .rectangle(
        26,
        24,
        276,
        102,
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
  }

  private createGatheringPanel(): void {
    this.add
      .rectangle(
        26,
        140,
        306,
        118,
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

    this.add
      .text(
        42,
        152,
        'Рюкзак',
        {
          fontFamily:
            'system-ui, sans-serif',
          fontSize: '15px',
          fontStyle: 'bold',
          color: '#fff7d6',
        },
      )
      .setDepth(101);

    this.add
      .rectangle(
        42,
        179,
        274,
        20,
        0x283128,
        0.92,
      )
      .setOrigin(0, 0)
      .setDepth(101);

    this.backpackFill = this.add
      .rectangle(
        45,
        182,
        268,
        14,
        0x67c96a,
        1,
      )
      .setOrigin(0, 0)
      .setDepth(102);

    this.backpackText = this.add
      .text(
        179,
        189,
        '',
        {
          fontFamily:
            'system-ui, sans-serif',
          fontSize: '11px',
          fontStyle: 'bold',
          color: '#ffffff',
        },
      )
      .setOrigin(0.5)
      .setDepth(103);

    this.carriedText = this.add
      .text(
        42,
        207,
        '',
        {
          fontFamily:
            'system-ui, sans-serif',
          fontSize: '13px',
          color: '#fff3cf',
        },
      )
      .setDepth(103);

    this.storageText = this.add
      .text(
        42,
        229,
        '',
        {
          fontFamily:
            'system-ui, sans-serif',
          fontSize: '12px',
          color: '#cde7c3',
        },
      )
      .setDepth(103);
  }

  private createWeaponSelector(): void {
    const spacing = 72;
    const y =
      LOGICAL_HEIGHT - 50;
    const centerX =
      LOGICAL_WIDTH / 2;
    const panelWidth =
      spacing * 5 + 24;

    this.add
      .rectangle(
        centerX,
        y,
        panelWidth,
        72,
        0x203e27,
        0.9,
      )
      .setStrokeStyle(
        2,
        0xf4f0cf,
        0.58,
      )
      .setDepth(100);

    WEAPON_ORDER.forEach(
      (weaponId, index) => {
        const x =
          centerX +
          (
            index -
            (WEAPON_ORDER.length - 1) /
              2
          ) *
            spacing;

        const button =
          this.add
            .rectangle(
              x,
              y,
              58,
              58,
              0x315f35,
              0.96,
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

        const icon =
          this.add
            .image(
              x,
              y - 1,
              WEAPON_ICON_TEXTURES[
                weaponId
              ],
            )
            .setScale(0.62)
            .setDepth(103);

        button.on(
          Phaser.Input.Events.POINTER_DOWN,
          () => {
            this.game.events.emit(
              HUD_WEAPON_SELECT_EVENT,
              weaponId,
            );
          },
        );

        this.weaponButtons[
          weaponId
        ] = button;
        this.weaponIcons[
          weaponId
        ] = icon;
      },
    );
  }

  private createSettlementUi(): void {
    const promptY =
      LOGICAL_HEIGHT - 118;

    this.forgePrompt = this.add
      .rectangle(
        LOGICAL_WIDTH / 2,
        promptY,
        238,
        42,
        0x304f35,
        0.94,
      )
      .setStrokeStyle(
        2,
        0xffe39a,
        0.82,
      )
      .setDepth(130)
      .setVisible(false)
      .setInteractive({
        useHandCursor: true,
      });

    this.forgePromptText =
      this.add
        .text(
          LOGICAL_WIDTH / 2,
          promptY,
          'E · Кузница',
          {
            fontFamily:
              'system-ui, sans-serif',
            fontSize: '16px',
            fontStyle: 'bold',
            color: '#fff6d5',
          },
        )
        .setOrigin(0.5)
        .setDepth(131)
        .setVisible(false);

    this.forgePrompt.on(
      Phaser.Input.Events.POINTER_DOWN,
      () => {
        this.toggleForgePanel();
      },
    );

    const panel =
      this.add.container(
        LOGICAL_WIDTH / 2,
        LOGICAL_HEIGHT / 2,
      );

    const bg =
      this.add
        .rectangle(
          0,
          0,
          520,
          360,
          0x233b2a,
          0.97,
        )
        .setStrokeStyle(
          3,
          0xf0d58b,
          0.92,
        );

    const title =
      this.add
        .text(
          0,
          -145,
          'Кузница',
          {
            fontFamily:
              'system-ui, sans-serif',
            fontSize: '28px',
            fontStyle: 'bold',
            color: '#fff0b3',
          },
        )
        .setOrigin(0.5);

    this.forgeStageText =
      this.add
        .text(
          0,
          -92,
          '',
          {
            fontFamily:
              'system-ui, sans-serif',
            fontSize: '19px',
            fontStyle: 'bold',
            color: '#ffffff',
            align: 'center',
          },
        )
        .setOrigin(0.5);

    this.forgeCostText =
      this.add
        .text(
          0,
          -35,
          '',
          {
            fontFamily:
              'system-ui, sans-serif',
            fontSize: '16px',
            color: '#ffe7ac',
            align: 'center',
          },
        )
        .setOrigin(0.5);

    this.forgeStorageText =
      this.add
        .text(
          0,
          18,
          '',
          {
            fontFamily:
              'system-ui, sans-serif',
            fontSize: '14px',
            color: '#cfe7c5',
            align: 'center',
          },
        )
        .setOrigin(0.5);

    this.forgeNpcText =
      this.add
        .text(
          0,
          64,
          '',
          {
            fontFamily:
              'system-ui, sans-serif',
            fontSize: '15px',
            color: '#ffffff',
            align: 'center',
          },
        )
        .setOrigin(0.5);

    this.forgeRepairButton =
      this.add
        .rectangle(
          0,
          118,
          300,
          52,
          0x6f9250,
          1,
        )
        .setStrokeStyle(
          2,
          0xffe7a0,
          0.9,
        )
        .setInteractive({
          useHandCursor: true,
        });

    this.forgeRepairButtonText =
      this.add
        .text(
          0,
          118,
          'Вложить ресурсы',
          {
            fontFamily:
              'system-ui, sans-serif',
            fontSize: '17px',
            fontStyle: 'bold',
            color: '#ffffff',
          },
        )
        .setOrigin(0.5);

    const close =
      this.add
        .text(
          226,
          -154,
          '×',
          {
            fontFamily:
              'system-ui, sans-serif',
            fontSize: '30px',
            fontStyle: 'bold',
            color: '#fff4d7',
          },
        )
        .setOrigin(0.5)
        .setInteractive({
          useHandCursor: true,
        });

    close.on(
      Phaser.Input.Events.POINTER_DOWN,
      () => {
        this.setForgePanelOpen(
          false,
        );
      },
    );

    this.forgeRepairButton.on(
      Phaser.Input.Events.POINTER_DOWN,
      () => {
        if (
          !this.settlementState
            ?.forge.restored &&
          this.settlementState
            ?.forge.canAfford
        ) {
          this.game.events.emit(
            HUD_FORGE_REPAIR_EVENT,
          );
        }
      },
    );

    panel.add([
      bg,
      title,
      this.forgeStageText,
      this.forgeCostText,
      this.forgeStorageText,
      this.forgeNpcText,
      this.forgeRepairButton,
      this.forgeRepairButtonText,
      close,
    ]);

    panel
      .setDepth(170)
      .setVisible(false);

    this.forgePanel =
      panel;
  }

  private createControlsHint(): void {
    this.add
      .text(
        LOGICAL_WIDTH - 24,
        26,
        '1–5 оружие · Space/Shift — рывок',
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
          110,
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

  private handleSettlementState(
    state: SettlementHudState,
  ): void {
    this.settlementState =
      state;

    this.forgePrompt
      ?.setVisible(
        state.nearForge,
      );
    this.forgePromptText
      ?.setVisible(
        state.nearForge,
      )
      .setText(
        state.forge.restored
          ? 'E · Кузница'
          : 'E · Восстановить кузницу',
      );

    if (!state.nearForge) {
      this.setForgePanelOpen(
        false,
      );
    }

    const forge =
      state.forge;

    this.forgeStageText?.setText(
      `Этап ${forge.repairStage} / ${forge.maxRepairStage}\n${forge.stageName}`,
    );

    const cost =
      forge.nextCost;

    this.forgeCostText?.setText(
      forge.restored
        ? 'Кузница снова работает'
        : cost
          ? `Следующий ремонт: дерево ${cost.wood} · камень ${cost.stone} · металл ${cost.metal}`
          : '',
    );

    this.forgeStorageText?.setText(
      `Склад: дерево ${forge.storage.wood} · камень ${forge.storage.stone} · металл ${forge.storage.metal}`,
    );

    this.forgeNpcText?.setText(
      forge.npcPresent
        ? 'Кузнец прибыл. Улучшение оружия откроется на Этапе 5.'
        : 'Каждая стадия ремонта визуально меняет кузницу.',
    );

    this.forgeRepairButton
      ?.setFillStyle(
        forge.restored
          ? 0x4b574b
          : forge.canAfford
            ? 0x6f9250
            : 0x555c51,
        1,
      );

    this.forgeRepairButtonText?.setText(
      forge.restored
        ? 'Восстановлено'
        : forge.canAfford
          ? 'Вложить ресурсы'
          : 'Не хватает ресурсов',
    );
  }

  private handleForgeToggle(): void {
    if (
      this.settlementState
        ?.nearForge
    ) {
      this.toggleForgePanel();
    }
  }

  private toggleForgePanel(): void {
    this.setForgePanelOpen(
      !this.forgePanelOpen,
    );
  }

  private setForgePanelOpen(
    open: boolean,
  ): void {
    this.forgePanelOpen =
      open &&
      Boolean(
        this.settlementState
          ?.nearForge,
      );

    this.forgePanel?.setVisible(
      this.forgePanelOpen,
    );
  }

  private handleGatheringState(
    state: GatheringHudState,
  ): void {
    const {
      carried,
      usedCapacity,
      capacity,
    } =
      state.backpack;
    const ratio =
      capacity > 0
        ? Phaser.Math.Clamp(
            usedCapacity /
              capacity,
            0,
            1,
          )
        : 0;

    this.backpackFill
      ?.setDisplaySize(
        268 * ratio,
        14,
      )
      .setFillStyle(
        ratio >= 1
          ? 0xe16b55
          : ratio >= 0.8
            ? 0xe0b64d
            : 0x67c96a,
        1,
      );

    this.backpackText?.setText(
      `${usedCapacity} / ${capacity}`,
    );

    this.carriedText?.setText(
      `С собой: Д ${carried.wood} · К ${carried.stone} · М ${carried.metal} · ● ${carried.coins}`,
    );

    this.storageText?.setText(
      `Склад: Д ${state.storage.wood} · К ${state.storage.stone} · М ${state.storage.metal} · ● ${state.storage.coins}`,
    );
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
            : 0x353a37,
        unlocked
          ? 1
          : 0.72,
      );

      this.weaponButtons[
        weaponId
      ]?.setStrokeStyle(
        selected
          ? 4
          : 2,
        selected
          ? 0xffe590
          : unlocked
            ? 0xf3f5dd
            : 0x777d78,
        selected
          ? 1
          : 0.5,
      );

      const icon =
        this.weaponIcons[
          weaponId
        ];

      if (!icon) {
        continue;
      }

      icon
        .setAlpha(
          unlocked
            ? 1
            : 0.24,
        )
        .setScale(
          selected
            ? 0.7
            : 0.62,
        );

      if (unlocked) {
        icon.clearTint();
      } else {
        icon.setTint(
          0x777777,
        );
      }
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
                  110,
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
      HUD_GATHERING_STATE_EVENT,
      this.handleGatheringState,
      this,
    );
    this.game.events.off(
      HUD_SETTLEMENT_STATE_EVENT,
      this.handleSettlementState,
      this,
    );
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
    this.input.keyboard?.off(
      'keydown-E',
      this.handleForgeToggle,
      this,
    );
    this.scale.off(
      Phaser.Scale.Events.RESIZE,
      this.handleResize,
      this,
    );
  }
}
