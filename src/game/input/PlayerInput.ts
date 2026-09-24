export type InputMode = 'desktop' | 'touch';

export type MovementIntent = {
  x: number;
  y: number;
};

export interface PlayerInputSource {
  readonly mode: InputMode;
  getMovement(): MovementIntent;
  consumeDash(): boolean;
  destroy(): void;
}

export function detectInputMode(): InputMode {
  const coarsePointer =
    window.matchMedia?.('(pointer: coarse)').matches ?? false;

  return navigator.maxTouchPoints > 0 && coarsePointer
    ? 'touch'
    : 'desktop';
}

export class InputModeTracker {
  private mode: InputMode = detectInputMode();
  private readonly listeners = new Set<(mode: InputMode) => void>();
  private readonly pointerMedia = window.matchMedia?.('(pointer: coarse)');

  private readonly handleChange = (): void => {
    const next = detectInputMode();

    if (next === this.mode) return;

    this.mode = next;

    for (const listener of this.listeners) {
      listener(next);
    }
  };

  constructor() {
    this.pointerMedia?.addEventListener('change', this.handleChange);
    window.addEventListener('pointerdown', this.handleChange, {
      passive: true,
    });
  }

  get current(): InputMode {
    return this.mode;
  }

  subscribe(listener: (mode: InputMode) => void): () => void {
    this.listeners.add(listener);

    return () => {
      this.listeners.delete(listener);
    };
  }

  destroy(): void {
    this.pointerMedia?.removeEventListener('change', this.handleChange);
    window.removeEventListener('pointerdown', this.handleChange);
    this.listeners.clear();
  }
}
