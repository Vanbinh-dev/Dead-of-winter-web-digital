export const PLAYER_TRIGGER = 'PLAYER_TRIGGER'; // When catching this game will change to pending mode! The effect and trigger condition will be define by user. Need to confirm any action from another player

export type Condition = {
     type: 'PLAYER_TRIGGER'
};

export type Cost = {
     type: 'PLAYER_TRIGGER'
};

export type ActiveEffect = {
     type: 'PLAYER_TRIGGER'
};

export type PassiveEffectTag =
     | 'IGNORE_BITE_SPREADING'
     | 'CHANGE_BITE_TO_WOUND'
     | 'CHANGE_FROSTBITE_TO_WOUND'
     | 'NO_EXPOSURE_WHEN_ATTACK'
     | 'NO_EXPOSURE_WHEN_MOVING';

export type PassiveEffect =
     | PassiveEffectTag
     | { type: 'PLAYER_TRIGGER' | PassiveEffectTag };

export interface Skill {
     condition: Condition[];
     cost: Cost[];
     activeEffect: ActiveEffect[];
     passiveEffect: PassiveEffect[];
}

