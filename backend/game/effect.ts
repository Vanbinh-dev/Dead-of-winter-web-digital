import type { ItemCard } from "./Card.js";
import type { LocationType } from "./location.js";
import type { Survivor, WoundType } from "./Survivor.js";

export type Skill = {
  condition: Condition[],
  location: LocationType[]
  cost: Cost[],
  activeEffect: ActiveEffect[],
  passiveEffect: PassiveEffect[]
};

export type Condition =
  { name: 'IS_CURRENT_PLAY' } |
  { name: 'IS_REMOVE_FROM_PLAY' } |
  { name: 'PLAYER_CURRENT_CONTROL' } |
  { name: 'HAVE_NOT_APPEAR' }

export type Cost =
  | { type: 'REMOVE_FROM_GAME' }
  | { type: 'SPEND_ACTION_DICE'; minDieValue: number }
  | { type: 'DISCARD_CARDS'; cards: ItemCard[] }
  | { type: 'NOTHING' }

export type ActiveEffect =
  | { type: 'SEARCH_EXTRA_CARDS'; location: LocationType; count: number }
  | { type: 'KILL_ZOMBIES'; location: LocationType; count: number }
  | { type: 'REVEAL_CARDS'; count: number }
  | { type: 'DRAW_FROM_REVEALED'; count: number }
  | { type: 'ADD_FOOD'; count: number }
  | { type: 'HEAL_WOUNDS'; count: number; allowedWoundTypes: WoundType[] }
  | { type: 'REROLL_DICE'; maxDiceCount: number }
  | { type: 'MODIFY_DIE_VALUE'; maxDiceCount: number; delta: number }
  | { type: 'MODIFY_MORALE'; delta: number }
  | { type: 'PREVENT_EXPOSURE_ROLL' }
  | { type: 'MOVE_SURVIVOR'; targetLocation: LocationType }
  | { type: 'ADD_RANDOM_SURVIVORS'; count: number }
  | { type: 'ADD_SPECIFIC_SURVIVOR'; survivor: Survivor }
  | { type: 'ADD_HELPLESS_SURVIVORS'; count: number }
  | { type: 'CLEAR_WASTE'; count: number }
  | { type: 'SPAWN_ZOMBIES'; location: LocationType; count: number };

export type PassiveEffect =
  | { type: 'CONVERT_FROSTBITE_TO_WOUND' }
  | { type: 'IGNORE_BITE_SPREAD' }
  | { type: 'CONVERT_BITE_TO_WOUND' };