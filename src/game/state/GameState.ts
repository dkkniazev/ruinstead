export const SAVE_SCHEMA_VERSION = 10 as const;

export type BuildingId =
  | 'forge'
  | 'storage'
  | 'sawmill'
  | 'workshop'
  | 'house'
  | 'infirmary'
  | 'gate'
  | 'bridge';

export type GameState = {
  schemaVersion: typeof SAVE_SCHEMA_VERSION;
  savedAt: number;
  player: {
    weaponId: string;
    unlockedWeaponIds: string[];
    maxHealthLevel: number;
    damageLevel: number;
    moveSpeedLevel: number;
    backpackLevel: number;
    dashLevel: number;
    weaponLevels: {
      axe: number;
      sword: number;
      hammer: number;
      spear: number;
      daggers: number;
    };
  };
  backpack: {
    wood: number;
    stone: number;
    metal: number;
    coins: number;
  };
  consumables: {
    healthPotions: number;
  };
  settlement: {
    level: number;
    buildings: Record<BuildingId, number>;
    repairStages:
      Record<BuildingId, number>;
  };
  world: {
    unlockedZones: string[];
    defeatedBosses: string[];
    bossRespawnAt:
      Record<string, number>;
    discoveredLandmarks:
      string[];
    playerPosition: {
      x: number;
      y: number;
    } | null;
  };
  resources: {
    wood: number;
    stone: number;
    metal: number;
    coins: number;
  };
  progression: {
    settlementXp: number;
    expeditionCount: number;
  };
  quests: {
    activeId: string | null;
    completedIds: string[];
  };
  bestiary: {
    discoveredSpecies: string[];
    discoveredElites: string[];
    discoveredBosses: string[];
    speciesKills:
      Record<string, number>;
    eliteKills:
      Record<string, number>;
    bossKills:
      Record<string, number>;
    claimedLevels:
      Record<string, number[]>;
  };
  settings: {
    soundEnabled: boolean;
    musicEnabled: boolean;
  };
};

export function createDefaultGameState(): GameState {
  return {
    schemaVersion: SAVE_SCHEMA_VERSION,
    savedAt: Date.now(),
    player: {
      weaponId: 'axe',
      unlockedWeaponIds: ['axe'],
      maxHealthLevel: 0,
      damageLevel: 0,
      moveSpeedLevel: 0,
      backpackLevel: 0,
      dashLevel: 0,
      weaponLevels: {
        axe: 0,
        sword: 0,
        hammer: 0,
        spear: 0,
        daggers: 0,
      },
    },
    backpack: {
      wood: 0,
      stone: 0,
      metal: 0,
      coins: 0,
    },
    consumables: {
      healthPotions: 3,
    },
    settlement: {
      level: 0,
      buildings: {
        forge: 0,
        storage: 0,
        sawmill: 0,
        workshop: 0,
        house: 0,
        infirmary: 0,
        gate: 0,
        bridge: 0,
      },
      repairStages: {
        forge: 0,
        storage: 0,
        sawmill: 0,
        workshop: 0,
        house: 0,
        infirmary: 0,
        gate: 0,
        bridge: 0,
      },
    },
    world: {
      unlockedZones: ['settlement', 'forest-edge'],
      defeatedBosses: [],
      bossRespawnAt: {},
      discoveredLandmarks: [],
      playerPosition: null,
    },
    resources: {
      wood: 0,
      stone: 0,
      metal: 0,
      coins: 0,
    },
    progression: {
      settlementXp: 0,
      expeditionCount: 0,
    },
    quests: {
      activeId: 'restore-forge',
      completedIds: [],
    },
    bestiary: {
      discoveredSpecies: [],
      discoveredElites: [],
      discoveredBosses: [],
      speciesKills: {},
      eliteKills: {},
      bossKills: {},
      claimedLevels: {},
    },
    settings: {
      soundEnabled: true,
      musicEnabled: true,
    },
  };
}
