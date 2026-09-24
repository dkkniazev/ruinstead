import type { CombatState } from '../combat/CombatSystem';
import type { WeaponId } from '../combat/WeaponDefinitions';
import type {
  BackpackState,
} from '../gathering/BackpackSystem';
import type {
  ResourceCounts,
} from '../gathering/ResourceTypes';
import type {
  SettlementHudState,
} from '../settlement/SettlementSystem';

export type GatheringHudState = {
  backpack: BackpackState;
  storage: ResourceCounts;
};

export const HUD_COMBAT_STATE_EVENT =
  'ruinstead:hud:combat-state';
export const HUD_AREA_EVENT =
  'ruinstead:hud:area';
export const HUD_WEAPON_SELECT_EVENT =
  'ruinstead:hud:weapon-select';
export const HUD_NOTICE_EVENT =
  'ruinstead:hud:notice';
export const HUD_GATHERING_STATE_EVENT =
  'ruinstead:hud:gathering-state';
export const HUD_SETTLEMENT_STATE_EVENT =
  'ruinstead:hud:settlement-state';
export const HUD_FORGE_REPAIR_EVENT =
  'ruinstead:hud:forge-repair';

export type HudCombatStateHandler =
  (state: CombatState) => void;
export type HudAreaHandler =
  (areaName: string) => void;
export type HudWeaponSelectHandler =
  (weaponId: WeaponId) => void;
export type HudNoticeHandler =
  (message: string) => void;
export type HudGatheringStateHandler =
  (state: GatheringHudState) => void;
export type HudSettlementStateHandler =
  (state: SettlementHudState) => void;
