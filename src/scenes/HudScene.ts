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
  HUD_PLAYER_UPGRADE_EVENT,
  HUD_QUEST_STATE_EVENT,
  HUD_UPGRADE_STATE_EVENT,
  HUD_WEAPON_UPGRADE_EVENT,
  HUD_WEAPON_SELECT_EVENT,
  type GatheringHudState,
  type UpgradeHudState,
} from '../game/ui/HudEvents';
import type {
  SettlementHudState,
} from '../game/settlement/SettlementSystem';
import type {
  QuestHudState,
} from '../game/quests/QuestDirector';
import {
  MAX_UPGRADE_LEVEL,
  getPlayerUpgradeCost,
  getWeaponUpgradeCost,
  canAffordUpgrade,
  type PlayerUpgradeId,
} from '../game/progression/UpgradeBalance';
import {
  WEAPON_DEFINITIONS,
} from '../game/combat/WeaponDefinitions';

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
  initialUpgradeState:
    UpgradeHudState;
  initialQuestState:
    QuestHudState;
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
  private upgradeState?:
    UpgradeHudState;
  private questState?:
    QuestHudState;
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
  private upgradeTitle?:
    Phaser.GameObjects.Text;
  private playerUpgradeButtons:
    Partial<
      Record<
        PlayerUpgradeId,
        Phaser.GameObjects.Text
      >
    > = {};
  private weaponUpgradeButton?:
    Phaser.GameObjects.Text;
  private questTitleText?:
    Phaser.GameObjects.Text;
  private questObjectiveText?:
    Phaser.GameObjects.Text;
  private questProgressText?:
    Phaser.GameObjects.Text;
  private questHintText?:
    Phaser.GameObjects.Text;
  private questOptionalText?:
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
    this.upgradeState =
      data.initialUpgradeState;
    this.questState =
      data.initialQuestState;
    this.initialAreaName =
      data.initialAreaName;
  }

  create(): void {
    configureLogicalCamera(this);

    this.createTopLeftStatus();
    this.createGatheringPanel();
    this.createWeaponSelector();
    this.createSettlementUi();
    this.createQuestPanel();
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
      HUD_UPGRADE_STATE_EVENT,
      this.handleUpgradeState,
      this,
    );
    this.game.events.on(
      HUD_QUEST_STATE_EVENT,
      this.handleQuestState,
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

    if (this.upgradeState) {
      this.handleUpgradeState(
        this.upgradeState,
      );
    }

    if (this.questState) {
      this.handleQuestState(
        this.questState,
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
          620,
          560,
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
          -245,
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
          -198,
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
          -145,
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
          -102,
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
          -60,
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
          -2,
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
          -2,
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
          276,
          -254,
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

    this.upgradeTitle =
      this.add
        .text(
          0,
          50,
          'Улучшения',
          {
            fontFamily:
              'system-ui, sans-serif',
            fontSize: '18px',
            fontStyle: 'bold',
            color: '#ffe7a0',
          },
        )
        .setOrigin(0.5);

    const playerUpgrades:
      Array<{
        id: PlayerUpgradeId;
        y: number;
      }> = [
      {
        id: 'max-health',
        y: 90,
      },
      {
        id: 'move-speed',
        y: 126,
      },
      {
        id: 'backpack',
        y: 162,
      },
      {
        id: 'dash',
        y: 198,
      },
    ];

    for (
      const item of
      playerUpgrades
    ) {
      const button =
        this.add
          .text(
            0,
            item.y,
            '',
            {
              fontFamily:
                'system-ui, sans-serif',
              fontSize: '14px',
              fontStyle: 'bold',
              color: '#ffffff',
              backgroundColor:
                '#486b43',
              padding: {
                x: 12,
                y: 7,
              },
              fixedWidth: 500,
              align: 'center',
            },
          )
          .setOrigin(0.5)
          .setInteractive({
            useHandCursor: true,
          });

      button.on(
        Phaser.Input.Events.POINTER_DOWN,
        () => {
          this.game.events.emit(
            HUD_PLAYER_UPGRADE_EVENT,
            item.id,
          );
        },
      );

      this.playerUpgradeButtons[
        item.id
      ] = button;
    }

    this.weaponUpgradeButton =
      this.add
        .text(
          0,
          238,
          '',
          {
            fontFamily:
              'system-ui, sans-serif',
            fontSize: '14px',
            fontStyle: 'bold',
            color: '#ffffff',
            backgroundColor:
              '#76538d',
            padding: {
              x: 12,
              y: 8,
            },
            fixedWidth: 500,
            align: 'center',
          },
        )
        .setOrigin(0.5)
        .setInteractive({
          useHandCursor: true,
        });

    this.weaponUpgradeButton.on(
      Phaser.Input.Events.POINTER_DOWN,
      () => {
        const weaponId =
          this.upgradeState
            ?.selectedWeaponId;

        if (weaponId) {
          this.game.events.emit(
            HUD_WEAPON_UPGRADE_EVENT,
            weaponId,
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
      this.upgradeTitle,
      ...Object.values(
        this.playerUpgradeButtons,
      ),
      this.weaponUpgradeButton,
      close,
    ]);

    panel
      .setDepth(170)
      .setVisible(false);

    this.forgePanel =
      panel;
  }

  private createQuestPanel(): void {
    const right =
      LOGICAL_WIDTH - 26;
    const top = 72;

    this.add
      .rectangle(
        right,
        top,
        350,
        174,
        0x203e27,
        0.9,
      )
      .setOrigin(1, 0)
      .setStrokeStyle(
        2,
        0xf4f0cf,
        0.5,
      )
      .setDepth(100);

    this.questTitleText =
      this.add
        .text(
          right - 16,
          top + 14,
          '',
          {
            fontFamily:
              'system-ui, sans-serif',
            fontSize: '16px',
            fontStyle: 'bold',
            color: '#fff2b5',
            align: 'right',
          },
        )
        .setOrigin(1, 0)
        .setDepth(101);

    this.questObjectiveText =
      this.add
        .text(
          right - 16,
          top + 42,
          '',
          {
            fontFamily:
              'system-ui, sans-serif',
            fontSize: '14px',
            color: '#ffffff',
            align: 'right',
            wordWrap: {
              width: 316,
            },
          },
        )
        .setOrigin(1, 0)
        .setDepth(101);

    this.questProgressText =
      this.add
        .text(
          right - 16,
          top + 88,
          '',
          {
            fontFamily:
              'system-ui, sans-serif',
            fontSize: '13px',
            fontStyle: 'bold',
            color: '#bde4a9',
            align: 'right',
          },
        )
        .setOrigin(1, 0)
        .setDepth(101);

    this.questHintText =
      this.add
        .text(
          right - 16,
          top + 111,
          '',
          {
            fontFamily:
              'system-ui, sans-serif',
            fontSize: '11px',
            color: '#cad7c6',
            align: 'right',
            wordWrap: {
              width: 316,
            },
          },
        )
        .setOrigin(1, 0)
        .setDepth(101);

    this.questOptionalText =
      this.add
        .text(
          right - 16,
          top + 148,
          '',
          {
            fontFamily:
              'system-ui, sans-serif',
            fontSize: '11px',
            color: '#d9c9f0',
            align: 'right',
          },
        )
        .setOrigin(1, 0)
        .setDepth(101);
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

  private handleQuestState(
    state: QuestHudState,
  ): void {
    this.questState =
      state;

    this.questTitleText?.setText(
      `${state.title} · ${state.sequenceProgress}`,
    );
    this.questObjectiveText?.setText(
      state.objective,
    );
    this.questProgressText?.setText(
      `${state.progress}${state.rewardText ? ` · награда ${state.rewardText}` : ''}`,
    );
    this.questHintText?.setText(
      state.hint,
    );
    this.questOptionalText?.setText(
      state.optional
        ? `Доп.: ${state.optional.title} · ${state.optional.progress} · ${state.optional.rewardText}`
        : 'Дополнительные цели выполнены',
    );
  }

  private handleUpgradeState(
    state: UpgradeHudState,
  ): void {
    this.upgradeState =
      state;

    const labels:
      Record<
        PlayerUpgradeId,
        string
      > = {
      'max-health': 'Здоровье',
      'move-speed': 'Скорость',
      backpack: 'Рюкзак',
      dash: 'Рывок',
    };

    const levels:
      Record<
        PlayerUpgradeId,
        number
      > = {
      'max-health':
        state.player
          .maxHealthLevel,
      'move-speed':
        state.player
          .moveSpeedLevel,
      backpack:
        state.player
          .backpackLevel,
      dash:
        state.player
          .dashLevel,
    };

    for (
      const id of
      [
        'max-health',
        'move-speed',
        'backpack',
        'dash',
      ] as const
    ) {
      const level =
        levels[id];
      const cost =
        getPlayerUpgradeCost(
          id,
          level,
        );
      const affordable =
        canAffordUpgrade(
          state.storage,
          cost,
        );
      const button =
        this.playerUpgradeButtons[
          id
        ];

      button?.setText(
        cost
          ? `${labels[id]} Lv.${level} → ${level + 1}   ●${cost.coins} Д${cost.wood} К${cost.stone} М${cost.metal}`
          : `${labels[id]} Lv.${MAX_UPGRADE_LEVEL} · MAX`,
      );

      button?.setStyle({
        backgroundColor:
          cost && affordable
            ? '#486b43'
            : '#444b45',
        color:
          cost
            ? '#ffffff'
            : '#bfc5bf',
      });
    }

    const weaponId =
      state.selectedWeaponId;
    const weaponLevel =
      state.weaponLevels[
        weaponId
      ];
    const unlocked =
      state.unlockedWeaponIds
        .includes(weaponId);
    const weaponCost =
      unlocked
        ? getWeaponUpgradeCost(
            weaponId,
            weaponLevel,
          )
        : null;
    const weaponAffordable =
      unlocked &&
      canAffordUpgrade(
        state.storage,
        weaponCost,
      );

    this.weaponUpgradeButton
      ?.setText(
        !unlocked
          ? `${WEAPON_DEFINITIONS[weaponId].name} · закрыто`
          : weaponCost
            ? `${WEAPON_DEFINITIONS[weaponId].name} Lv.${weaponLevel} → ${weaponLevel + 1}   ●${weaponCost.coins} К${weaponCost.stone} М${weaponCost.metal}`
            : `${WEAPON_DEFINITIONS[weaponId].name} Lv.${MAX_UPGRADE_LEVEL} · MAX`,
      )
      .setStyle({
        backgroundColor:
          weaponAffordable
            ? '#76538d'
            : '#4a4350',
        color:
          unlocked
            ? '#ffffff'
            : '#9f9aa2',
      });
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
        ? 'Кузнец готов улучшать снаряжение.'
        : '',
    );

    this.forgeRepairButton
      ?.setVisible(
        !forge.restored,
      );
    this.forgeRepairButtonText
      ?.setVisible(
        !forge.restored,
      );
    this.upgradeTitle?.setVisible(
      forge.restored,
    );

    for (
      const button of
      Object.values(
        this.playerUpgradeButtons,
      )
    ) {
      button.setVisible(
        forge.restored,
      );
    }

    this.weaponUpgradeButton
      ?.setVisible(
        forge.restored,
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
    if (this.upgradeState) {
      this.handleUpgradeState({
        ...this.upgradeState,
        selectedWeaponId:
          state.weaponId,
        unlockedWeaponIds:
          [...state.unlockedWeaponIds],
      });
    }
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
      HUD_UPGRADE_STATE_EVENT,
      this.handleUpgradeState,
      this,
    );
    this.game.events.off(
      HUD_QUEST_STATE_EVENT,
      this.handleQuestState,
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
