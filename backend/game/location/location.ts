import type { PublicGameState } from "../gameLogic/GameState.js";
import type { CardId, LocationId, SurvivorId } from "../gameLogic/Type.js";

export interface EntranceState {
  capacity: number;
  zombies: number;
  barricades: number;
}

export interface LocationState {
  id: LocationId;
  survivorSlots: number;
  entrance: EntranceState;
  noise: number;
  searchDeck: CardId[];
}

export interface ColonyState {
  survivorSlots: number;
  entrances: EntranceState[];
  helpless: number;
  food: number;
  starvation: number;
  wastePile: number;
}

const survivorAt = (g: PublicGameState, loc: LocationId) => {
  Object.values(g.survivors).filter(s => s.location === loc)
}