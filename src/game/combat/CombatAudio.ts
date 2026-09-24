export class CombatAudio {
  private context?: AudioContext;

  playSwing(): void {
    this.playTone(
      170,
      105,
      0.055,
      0.025,
    );
  }

  playShot(): void {
    this.playTone(
      420,
      250,
      0.075,
      0.018,
    );
  }

  playHit(): void {
    this.playTone(
      120,
      78,
      0.045,
      0.022,
    );
  }

  playKill(): void {
    this.playTone(
      150,
      55,
      0.11,
      0.03,
    );
  }

  private playTone(
    startFrequency: number,
    endFrequency: number,
    duration: number,
    volume: number,
  ): void {
    try {
      const context =
        this.context ??
        new AudioContext();

      this.context = context;

      if (
        context.state !== 'running'
      ) {
        void context.resume().then(
          () => {
            this.emitTone(
              context,
              startFrequency,
              endFrequency,
              duration,
              volume,
            );
          },
        );
        return;
      }

      this.emitTone(
        context,
        startFrequency,
        endFrequency,
        duration,
        volume,
      );
    } catch {
      // Combat remains playable when WebAudio is unavailable.
    }
  }

  private emitTone(
    context: AudioContext,
    startFrequency: number,
    endFrequency: number,
    duration: number,
    volume: number,
  ): void {
    const oscillator =
      context.createOscillator();
    const gain =
      context.createGain();
    const now =
      context.currentTime;

    oscillator.type = 'triangle';
    oscillator.frequency.setValueAtTime(
      startFrequency,
      now,
    );
    oscillator.frequency.exponentialRampToValueAtTime(
      Math.max(1, endFrequency),
      now + duration,
    );

    gain.gain.setValueAtTime(
      volume,
      now,
    );
    gain.gain.exponentialRampToValueAtTime(
      0.0001,
      now + duration,
    );

    oscillator.connect(gain);
    gain.connect(
      context.destination,
    );

    oscillator.start(now);
    oscillator.stop(
      now + duration,
    );
  }
}
