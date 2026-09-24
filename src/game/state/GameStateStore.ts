import { queueYandexCloudSave } from '../../platform/yandex/YandexCloudSave';
import {
  SAVE_SCHEMA_VERSION,
  createDefaultGameState,
  type BuildingId,
  type GameState,
} from './GameState';

export const LOCAL_SAVE_KEY = 'ruinstead.save.v1';
export const LOCAL_SAVE_META_KEY = `${LOCAL_SAVE_KEY}.meta`;

const BUILDING_IDS: BuildingId[] = [
  'forge',
  'storage',
  'sawmill',
  'workshop',
  'house',
  'infirmary',
  'gate',
  'bridge',
];

function asRecord(value: unknown): Record<string, unknown> | undefined {
  return value && typeof value === 'object'
    ? (value as Record<string, unknown>)
    : undefined;
}

function nonNegativeInt(value: unknown, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value)
    ? Math.max(0, Math.floor(value))
    : fallback;
}

function booleanValue(value: unknown, fallback: boolean): boolean {
  return typeof value === 'boolean' ? value : fallback;
}

function stringValue(value: unknown, fallback: string): string {
  return typeof value === 'string' && value.length > 0
    ? value
    : fallback;
}

function nullableString(
  value: unknown,
  fallback: string | null,
): string | null {
  return value === null || typeof value === 'string'
    ? value
    : fallback;
}

function stringArray(value: unknown, fallback: string[]): string[] {
  if (!Array.isArray(value)) return [...fallback];

  return value.filter(
    (entry): entry is string => typeof entry === 'string',
  );
}

export function sanitizeGameState(value: unknown): GameState {
  const defaults = createDefaultGameState();
  const root = asRecord(value);
  const player = asRecord(root?.player);
  const settlement = asRecord(root?.settlement);
  const savedBuildings = asRecord(settlement?.buildings);
  const world = asRecord(root?.world);
  const resources = asRecord(root?.resources);
  const progression = asRecord(root?.progression);
  const quests = asRecord(root?.quests);
  const settings = asRecord(root?.settings);

  const buildings = { ...defaults.settlement.buildings };

  for (const id of BUILDING_IDS) {
    buildings[id] = nonNegativeInt(
      savedBuildings?.[id],
      defaults.settlement.buildings[id],
    );
  }

  return {
    schemaVersion: SAVE_SCHEMA_VERSION,
    savedAt: nonNegativeInt(root?.savedAt, defaults.savedAt),
    player: {
      weaponId: stringValue(
        player?.weaponId,
        defaults.player.weaponId,
      ),
      maxHealthLevel: nonNegativeInt(
        player?.maxHealthLevel,
        defaults.player.maxHealthLevel,
      ),
      damageLevel: nonNegativeInt(
        player?.damageLevel,
        defaults.player.damageLevel,
      ),
      moveSpeedLevel: nonNegativeInt(
        player?.moveSpeedLevel,
        defaults.player.moveSpeedLevel,
      ),
      backpackLevel: nonNegativeInt(
        player?.backpackLevel,
        defaults.player.backpackLevel,
      ),
      dashLevel: nonNegativeInt(
        player?.dashLevel,
        defaults.player.dashLevel,
      ),
    },
    settlement: {
      level: nonNegativeInt(
        settlement?.level,
        defaults.settlement.level,
      ),
      buildings,
    },
    world: {
      unlockedZones: stringArray(
        world?.unlockedZones,
        defaults.world.unlockedZones,
      ),
      defeatedBosses: stringArray(
        world?.defeatedBosses,
        defaults.world.defeatedBosses,
      ),
    },
    resources: {
      wood: nonNegativeInt(
        resources?.wood,
        defaults.resources.wood,
      ),
      stone: nonNegativeInt(
        resources?.stone,
        defaults.resources.stone,
      ),
      metal: nonNegativeInt(
        resources?.metal,
        defaults.resources.metal,
      ),
      coins: nonNegativeInt(
        resources?.coins,
        defaults.resources.coins,
      ),
    },
    progression: {
      settlementXp: nonNegativeInt(
        progression?.settlementXp,
        defaults.progression.settlementXp,
      ),
      expeditionCount: nonNegativeInt(
        progression?.expeditionCount,
        defaults.progression.expeditionCount,
      ),
    },
    quests: {
      activeId: nullableString(
        quests?.activeId,
        defaults.quests.activeId,
      ),
      completedIds: stringArray(
        quests?.completedIds,
        defaults.quests.completedIds,
      ),
    },
    settings: {
      soundEnabled: booleanValue(
        settings?.soundEnabled,
        defaults.settings.soundEnabled,
      ),
      musicEnabled: booleanValue(
        settings?.musicEnabled,
        defaults.settings.musicEnabled,
      ),
    },
  };
}

export class GameStateStore {
  load(): GameState {
    try {
      const raw = window.localStorage.getItem(LOCAL_SAVE_KEY);

      if (!raw) {
        return createDefaultGameState();
      }

      return sanitizeGameState(JSON.parse(raw));
    } catch (error) {
      console.warn(
        'Ruinstead local save could not be loaded.',
        error,
      );
      return createDefaultGameState();
    }
  }

  save(state: GameState): GameState {
    const next: GameState = {
      ...state,
      schemaVersion: SAVE_SCHEMA_VERSION,
      savedAt: Date.now(),
    };

    try {
      window.localStorage.setItem(
        LOCAL_SAVE_KEY,
        JSON.stringify(next),
      );
      window.localStorage.setItem(
        LOCAL_SAVE_META_KEY,
        JSON.stringify({
          savedAt: next.savedAt,
          version: next.schemaVersion,
        }),
      );
      queueYandexCloudSave(next);
    } catch (error) {
      console.warn(
        'Ruinstead local save could not be written.',
        error,
      );
    }

    return next;
  }
}
