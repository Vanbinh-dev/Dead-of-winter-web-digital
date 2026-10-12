import type { ActiveEffect, Condition, Skill } from "./Effect.js";
import type { LocationID } from "./Location.js";

export type SurvivorID = string;
export type CardID = string;

export type MainObjectiveID = CardID;
export type CrisisID = CardID;
export type SecretObjectiveID = CardID;
export type CrossroadID = CardID;
export type ItemID = CardID;

export type NonBetrayObjective = SecretObjectiveID;
export type BetrayObjective = SecretObjectiveID;
export type ExileObjectiveID = SecretObjectiveID;

export interface Deck<T extends CardID> {
     cards: T[],
     reveal: T[]
}

export type ItemSymbol  = 'food' | 'fuel' | 'medicine' | 'book' | 'weapon' | 'tool' | 'outside'

export interface ItemCardInfo {
     id: ItemID;
     name: string;
     location: LocationID | 'starterItem';
     symbol: ItemSymbol;
     isEquip: boolean;
     afterUsedLocation: 'waste' | 'removeFromGame';
     skill: Skill;

     skillDescription: string;
}

export interface MainObjectiveInfo {
     id: MainObjectiveID;
     setup: ActiveEffect[],
     finishCondition: Condition[],

     setUpDescription: string,
     finishConditionDescription: string;
}

export interface SecretObjectiveInfo {
     id: SecretObjectiveID;
     winCondition: Condition[];
     winConditionDescription: string;
}

export interface ExileObjectiveInfo {
     id: ExileObjectiveID;

     nonBetrayWinCondition: Condition[];
     nonBetrayWinConditionDescription: string;

     betrayWinCondition: Condition[];
     betrayWinConditionDescription: string;
}

export interface CrisisCardInfo {
     id: CrisisID;

     symbolRequired: ItemSymbol[];
     failEffect: ActiveEffect[];
}

export interface CrossroadCardInfo {
     id: CrossroadID;
     name: string;
     triggerCondition: Condition; // PLAYER_TRIGGER
     triggerDescription: string;
     options: {
         text: string;
         effects: ActiveEffect[];
     }[];
}