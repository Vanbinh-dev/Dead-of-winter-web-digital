import type { Effect } from "./gameLogic/Effect.js";
import type { SurvivorLocationId } from "./gameLogic/GameState.js";
import type { CardId, PlayerId, SurvivorId, WoundType } from "./gameLogic/Type.js";

export interface SurvivorDef {
  kind: "survivor";
  id: SurvivorId;
  name: string;
  influence: number;
  attack: number;                        
  search: number;
  effectDescription: string;
  effect: Effect;
}

export interface SurvivorState {
  id: SurvivorId;
  owner: PlayerId;
  location: SurvivorLocationId;
  wounds: WoundType[];                   
  equipment: CardId[];
  movedThisTurn: boolean;
  abilityUsedThisRound: boolean;
  equipmentUsedThisRound: CardId[];  
}    