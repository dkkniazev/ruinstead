import Phaser from 'phaser';
import {
  LOGICAL_HEIGHT,
  LOGICAL_WIDTH,
  configureLogicalCamera,
} from '../game/layout/Viewport';
import {
  InputModeTracker,
  type InputMode,
} from '../game/input/PlayerInput';
import { DebugOverlay } from '../game/qa/DebugOverlay';
import { GameStateStore } from '../game/state/GameStateStore';
import {
  markYandexGameReady,
  startYandexGameplay,
} from '../platform/yandex/YandexPlatform';

export class SettlementScene
  extends Phaser.Scene {
  private readonly stateStore =
    new GameStateStore();

  private inputMode?:
    InputModeTracker;
  private unsubscribeInputMode?:
    () => void;
  private debugOverlay?:
    DebugOverlay;
  private inputLabel?:
    Phaser.GameObjects.Text;
  private expeditionKey?:
    Phaser.Input.Keyboard.Key;

  constructor() {
    super('SettlementScene');
  }

  create(): void {
    configureLogicalCamera(this);

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

    const state =
      this.stateStore.load();
    this.stateStore.save(state);

    this.drawFoundationScene();
    this.createExpeditionButton();

    this.inputMode =
      new InputModeTracker();
    this.inputLabel = this.add
      .text(
        LOGICAL_WIDTH / 2,
        478,
        '',
        {
          fontFamily:
            'system-ui, sans-serif',
          fontSize: '18px',
          color: '#bfd0b8',
        },
      )
      .setOrigin(0.5);

    this.updateInputLabel(
      this.inputMode.current,
    );

    this.unsubscribeInputMode =
      this.inputMode.subscribe(
        (mode) => {
          this.updateInputLabel(mode);
        },
      );

    this.expeditionKey =
      this.input.keyboard?.addKey(
        Phaser.Input.Keyboard.KeyCodes.E,
      );

    this.debugOverlay =
      new DebugOverlay(this);
    this.debugOverlay.create();

    markYandexGameReady();
    startYandexGameplay();
  }

  update(): void {
    this.debugOverlay?.update();

    if (
      this.expeditionKey &&
      Phaser.Input.Keyboard.JustDown(
        this.expeditionKey,
      )
    ) {
      this.startExpedition();
    }
  }

  private drawFoundationScene(): void {
    const graphics =
      this.add.graphics();

    graphics.fillStyle(
      0x17231c,
      1,
    );
    graphics.fillRect(
      0,
      0,
      LOGICAL_WIDTH,
      LOGICAL_HEIGHT,
    );

    graphics.fillStyle(
      0x213329,
      1,
    );
    graphics.fillRoundedRect(
      110,
      120,
      1060,
      470,
      38,
    );

    graphics.lineStyle(
      2,
      0x39523e,
      0.65,
    );

    for (
      let x = 160;
      x <= 1120;
      x += 80
    ) {
      graphics.lineBetween(
        x,
        160,
        x,
        550,
      );
    }

    for (
      let y = 160;
      y <= 550;
      y += 65
    ) {
      graphics.lineBetween(
        160,
        y,
        1120,
        y,
      );
    }

    graphics.fillStyle(
      0xd68b45,
      1,
    );
    graphics.fillCircle(
      640,
      360,
      34,
    );

    graphics.fillStyle(
      0xf2bd65,
      0.85,
    );
    graphics.fillCircle(
      640,
      350,
      16,
    );

    graphics.fillStyle(
      0x4a5048,
      1,
    );
    graphics.fillRoundedRect(
      820,
      292,
      126,
      104,
      12,
    );

    graphics.lineStyle(
      7,
      0x2e342e,
      1,
    );
    graphics.lineBetween(
      832,
      305,
      930,
      382,
    );
    graphics.lineBetween(
      930,
      305,
      832,
      382,
    );

    this.add
      .text(
        LOGICAL_WIDTH / 2,
        74,
        'RUINSTEAD',
        {
          fontFamily:
            'system-ui, sans-serif',
          fontSize: '48px',
          fontStyle: 'bold',
          color: '#f3ead3',
        },
      )
      .setOrigin(0.5);

    this.add
      .text(
        LOGICAL_WIDTH / 2,
        625,
        'Settlement prototype',
        {
          fontFamily:
            'system-ui, sans-serif',
          fontSize: '22px',
          color: '#d8dfcf',
        },
      )
      .setOrigin(0.5);

    this.add
      .text(
        640,
        415,
        'Костёр',
        {
          fontFamily:
            'system-ui, sans-serif',
          fontSize: '16px',
          color: '#f3ead3',
        },
      )
      .setOrigin(0.5);

    this.add
      .text(
        883,
        415,
        'Развалины кузницы',
        {
          fontFamily:
            'system-ui, sans-serif',
          fontSize: '16px',
          color: '#d8dfcf',
        },
      )
      .setOrigin(0.5);
  }

  private createExpeditionButton(): void {
    const button =
      this.add
        .rectangle(
          LOGICAL_WIDTH / 2,
          545,
          300,
          58,
          0x456d4d,
          1,
        )
        .setStrokeStyle(
          2,
          0xb8ceb1,
          0.8,
        )
        .setInteractive({
          useHandCursor: true,
        });

    this.add
      .text(
        LOGICAL_WIDTH / 2,
        545,
        'В тестовую вылазку  [E]',
        {
          fontFamily:
            'system-ui, sans-serif',
          fontSize: '19px',
          fontStyle: 'bold',
          color: '#f4f0dc',
        },
      )
      .setOrigin(0.5);

    button.on(
      Phaser.Input.Events.POINTER_DOWN,
      () => {
        this.startExpedition();
      },
    );
  }

  private startExpedition(): void {
    this.scene.start(
      'ExpeditionScene',
    );
  }

  private updateInputLabel(
    mode: InputMode,
  ): void {
    this.inputLabel?.setText(
      mode === 'touch'
        ? 'Input profile: touch'
        : 'Input profile: keyboard + pointer',
    );
  }

  private handleResize(): void {
    configureLogicalCamera(this);
  }

  private cleanup(): void {
    this.scale.off(
      Phaser.Scale.Events.RESIZE,
      this.handleResize,
      this,
    );
    this.unsubscribeInputMode?.();
    this.unsubscribeInputMode =
      undefined;
    this.inputMode?.destroy();
    this.inputMode = undefined;
    this.debugOverlay?.destroy();
    this.debugOverlay = undefined;
  }
}
