import type { ItemCard } from "./Card.js";
import type { Survivor, WoundType } from "./Survivor.js";
import type { LocationType } from "./type.js";

export enum ConditionType {
  NO_CONDITION = "NO_CONDITION",
  IS_CURRENT_PLAY = 'IS_CURRENT_PLAY',
  IS_REMOVE_FROM_PLAY = 'IS_REMOVE_FROM_PLAY',
  PLAYER_CURRENT_CONTROL = 'PLAYER_CURRENT_CONTROL',
  HAVE_NOT_APPEAR = 'HAVE_NOT_APPEAR'
}

export enum CostType {
  REMOVE_FROM_GAME = 'REMOVE_FROM_GAME',
  SPEND_ACTION_DICE = 'SPEND_ACTION_DICE',
  DISCARD_CARDS = 'DISCARD_CARDS',
  NOTHING = 'NOTHING'
}

export enum ActiveEffectType {
  SEARCH_EXTRA_CARDS = 'SEARCH_EXTRA_CARDS',
  KILL_ZOMBIES = 'KILL_ZOMBIES',
  REVEAL_CARDS = 'REVEAL_CARDS',
  DRAW_FROM_REVEALED = 'DRAW_FROM_REVEALED',
  ADD_FOOD = 'ADD_FOOD',
  HEAL_WOUNDS = 'HEAL_WOUNDS',
  REROLL_DICE = 'REROLL_DICE',
  MODIFY_DICE_VALUE = 'MODIFY_DICE_VALUE',
  MODIFY_MORALE = 'MODIFY_MORALE',
  PREVENT_EXPOSURE_ROLL = 'PREVENT_EXPOSURE_ROLL',
  MOVE_SURVIVOR = 'MOVE_SURVIVOR',
  ADD_RANDOM_SURVIVORS = 'ADD_RANDOM_SURVIVORS',
  ADD_SPECIFIC_SURVIVOR = 'ADD_SPECIFIC_SURVIVOR',
  ADD_HELPLESS_SURVIVORS = 'ADD_HELPLESS_SURVIVORS',
  CLEAR_WASTE = 'CLEAR_WASTE',
  SPAWN_ZOMBIES = 'SPAWN_ZOMBIES'
}

export enum PassiveEffectType {
  CONVERT_FROSTBITE_TO_WOUND = 'CONVERT_FROSTBITE_TO_WOUND',
  IGNORE_BITE_SPREAD = 'IGNORE_BITE_SPREAD',
  CONVERT_BITE_TO_WOUND = 'CONVERT_BITE_TO_WOUND'
}

export type Skill = {
  costs: Cost[],
  locations: LocationType[],
  conditions: Condition[],
  activeEffect: ActiveEffect[],
  passiveEffect: PassiveEffect[],
}

export const INVALID_SKILL: Skill = {
  costs: [],
  locations: [],
  conditions: [],
  activeEffect: [],
  passiveEffect: []
};

export type Condition =
  | { name: ConditionType.NO_CONDITION }
  | { name: ConditionType.IS_CURRENT_PLAY }
  | { name: ConditionType.IS_REMOVE_FROM_PLAY }
  | { name: ConditionType.PLAYER_CURRENT_CONTROL }
  | { name: ConditionType.HAVE_NOT_APPEAR };

export type Cost =
  | { type: CostType.REMOVE_FROM_GAME }
  | { type: CostType.SPEND_ACTION_DICE; minDieValue: number }
  | { type: CostType.DISCARD_CARDS; cards: ItemCard[] }
  | { type: CostType.NOTHING };

export type ActiveEffect =
  | {
    type: ActiveEffectType.SEARCH_EXTRA_CARDS;
    location: LocationType;
    count: number;
  }
  | {
    type: ActiveEffectType.KILL_ZOMBIES;
    location: LocationType;
    count: number;
  }
  | {
    type: ActiveEffectType.REVEAL_CARDS;
    count: number;
  }
  | {
    type: ActiveEffectType.DRAW_FROM_REVEALED;
    count: number;
  }
  | {
    type: ActiveEffectType.ADD_FOOD;
    count: number;
  }
  | {
    type: ActiveEffectType.HEAL_WOUNDS;
    count: number;
    allowedWoundTypes: WoundType[];
  }
  | {
    type: ActiveEffectType.REROLL_DICE;
    maxDiceCount: number;
  }
  | {
    type: ActiveEffectType.MODIFY_DICE_VALUE;
    maxDiceCount: number;
    delta: number;
  }
  | {
    type: ActiveEffectType.MODIFY_MORALE;
    delta: number;
  }
  | {
    type: ActiveEffectType.PREVENT_EXPOSURE_ROLL;
  }
  | {
    type: ActiveEffectType.MOVE_SURVIVOR;
    targetLocation: LocationType;
  }
  | {
    type: ActiveEffectType.ADD_RANDOM_SURVIVORS;
    count: number;
  }
  | {
    type: ActiveEffectType.ADD_SPECIFIC_SURVIVOR;
    survivor: Survivor;
  }
  | {
    type: ActiveEffectType.ADD_HELPLESS_SURVIVORS;
    count: number;
  }
  | {
    type: ActiveEffectType.CLEAR_WASTE;
    count: number;
  }
  | {
    type: ActiveEffectType.SPAWN_ZOMBIES;
    location: LocationType;
    count: number;
  };

export type PassiveEffect =
  | { type: PassiveEffectType.CONVERT_FROSTBITE_TO_WOUND }
  | { type: PassiveEffectType.IGNORE_BITE_SPREAD }
  | { type: PassiveEffectType.CONVERT_BITE_TO_WOUND };

export const Conditions = {
  NO_CONDITION: { name: ConditionType.NO_CONDITION } as const,
  IS_CURRENT_PLAY: { name: ConditionType.IS_CURRENT_PLAY } as const,
  IS_REMOVE_FROM_PLAY: { name: ConditionType.IS_REMOVE_FROM_PLAY } as const,
  PLAYER_CURRENT_CONTROL: { name: ConditionType.PLAYER_CURRENT_CONTROL } as const,
  HAVE_NOT_APPEAR: { name: ConditionType.HAVE_NOT_APPEAR } as const,
} as const;

export const PassiveEffects = {
  CONVERT_FROSTBITE_TO_WOUND: { type: PassiveEffectType.CONVERT_FROSTBITE_TO_WOUND } as const,
  IGNORE_BITE_SPREAD: { type: PassiveEffectType.IGNORE_BITE_SPREAD } as const,
  CONVERT_BITE_TO_WOUND: { type: PassiveEffectType.CONVERT_BITE_TO_WOUND } as const,
} as const;