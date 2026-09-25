import {
  createDefaultWeaponInventory,
  type WeaponInventoryState,
} from '../progression/WeaponInventory';

export const SAVE_SCHEMA_VERSION = 16 as const;

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
    /**
     * Legacy family levels are kept only for migration from v13 and older.
     * Runtime weapon power uses weaponInventory.
     */
    weaponLevels: {
      axe: number;
      sword: number;
      hammer: number;
      spear: number;
      daggers: number;
    };
    weaponInventory:
      WeaponInventoryState;
  };
  backpack: {
    wood: number;
    stone: number;
    metal: number;
    crystal: number;
    fiber: number;
    coins: number;
  };
  consumables: {
    healthPotions: number;
    returnTickets: number;
  };
  settlement: {
    level: number;
    buildings: Record<BuildingId, number>;
    repairStages:
      Record<BuildingId, number>;
    production: {
      lastTickAt: number;
      pending: {
        wood: number;
        stone: number;
        metal: number;
        coins: number;
      };
    };
  };
  world: {
    unlockedZones: string[];
    defeatedBosses: string[];
    bossRespawnAt:
      Record<string, number>;
    discoveredLandmarks:
      string[];
    uniqueRewards:
      string[];
    openedChests:
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
    crystal: number;
    fiber: number;
    coins: number;
  };
  progression: {
    settlementXp: number;
    settlementReturnCount: number;
  };
  monetization: {
    activeBlessing: {
      kind:
        | 'damage'
        | 'health'
        | 'speed'
        | 'gathering';
      expiresAt: number;
    } | null;
    lastBossRespawnAdAt: number;
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
        axe: 1,
        sword: 1,
        hammer: 1,
        spear: 1,
        daggers: 1,
      },
      weaponInventory:
        createDefaultWeaponInventory(),
    },
    backpack: {
      wood: 0,
      stone: 0,
      metal: 0,
      crystal: 0,
      fiber: 0,
      coins: 0,
    },
    consumables: {
      healthPotions: 3,
      returnTickets: 0,
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
      production: {
        lastTickAt: Date.now(),
        pending: {
          wood: 0,
          stone: 0,
          metal: 0,
          coins: 0,
        },
      },
    },
    world: {
      unlockedZones: ['settlement', 'forest-edge'],
      defeatedBosses: [],
      bossRespawnAt: {},
      discoveredLandmarks: [],
      uniqueRewards: [],
      openedChests: [],
      playerPosition: null,
    },
    resources: {
      wood: 0,
      stone: 0,
      metal: 0,
      crystal: 0,
      fiber: 0,
      coins: 0,
    },
    progression: {
      settlementXp: 0,
      settlementReturnCount: 0,
    },
    monetization: {
      activeBlessing: null,
      lastBossRespawnAdAt: 0,
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
