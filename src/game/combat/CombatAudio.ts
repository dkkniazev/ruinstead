import { gameAudio } from '../audio/GameAudio';

export class CombatAudio {
  playSwing(): void { gameAudio.play('attack'); }
  playShot(): void { gameAudio.play('shot'); }
  playHit(): void { gameAudio.play('hit'); }
  playKill(): void { gameAudio.play('kill'); }
  playDamage(): void { gameAudio.play('damage'); }
}
