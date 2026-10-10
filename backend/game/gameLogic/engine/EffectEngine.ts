import type { RandomAPI } from "boardgame.io/dist/types/src/plugins/random/random.js";
import type { PrivateGameState, PublicGameState } from "../GameState.js";
import { type LocationId, type PlayerId, type WoundType } from "../Type.js";

export type GameState = PublicGameState;

export type CommonDeckId = "crisis" | "crossroads" | "survivor" | "exile";
export type SearchDeckId = LocationId;
export type DeckId = CommonDeckId | SearchDeckId | "crisisContribution";

export type BasicReturnState = void | 'INVALID_MOVE' | PublicGameState;

export interface G {
     public: PublicGameState,
     private: PrivateGameState
}

export interface ITokenAndSupplyPrimitives {
     modifyMorale(state: G, delta: number): BasicReturnState;
     modifyRound(state: G, delta: number): BasicReturnState;
     modifySupply(state: G, delta: number): BasicReturnState;
     modifyStarvationToken(state: G, delta: number): BasicReturnState;
}

export const TokenAndSupplyPrimitives: ITokenAndSupplyPrimitives = {
     modifyMorale(state: G, delta: number): BasicReturnState {
          state.public.morale = Math.max(0, state.public.morale + delta);
     },

     modifyRound(state: G, delta: number): BasicReturnState {
          state.public.round = Math.max(0, state.public.round + delta);
     },

     modifySupply(state: G, delta: number): BasicReturnState {
          state.public.colony.food = Math.max(0, state.public.colony.food + delta);
     },

     modifyStarvationToken(state: G, delta: number): BasicReturnState {
          state.public.colony.starvation = Math.max(0, state.public.colony.starvation + delta);
     },
};

export interface IDicePrimitives {
     rollSixSideDice(random: RandomAPI): number;
     rollExposureDice(random: RandomAPI): WoundType | "blank" | "bite";
     spendActionDie(G: GameState, playerId: PlayerId, dieValue: number): BasicReturnState;
     rerollActionDice(G: GameState, random: RandomAPI, playerId: PlayerId, dieIndices?: number[]): BasicReturnState;
     changeActionDiceValue(G: GameState, playerId: PlayerId, dieIndex: number, delta: number): BasicReturnState;
}

export const DicePrimitives: IDicePrimitives = {
     rollSixSideDice(random: RandomAPI): number {
          return random.D6();
     },

     rollExposureDice(random: RandomAPI): WoundType | "blank" | "bite" {
          const roll = random.D12();
          if (roll <= 6) return "blank";
          if (roll <= 9) return "wound";
          if (roll <= 11) return "frostbite";
          return "bite";
     },

     spendActionDie(G: GameState, playerId: PlayerId, dieValue: number): BasicReturnState {
          const player = G.players[playerId];
          if (!player) return "INVALID_MOVE";

          const index = player.dice.unused.indexOf(dieValue);
          if (index === -1) return "INVALID_MOVE";

          const [spent] = player.dice.unused.splice(index, 1);
          player.dice.used.push(spent!);
     },

     rerollActionDice(G: GameState, random: RandomAPI, playerId: PlayerId, dieIndices?: number[]): BasicReturnState {
          const player = G.players[playerId];
          if (!player) return "INVALID_MOVE";

          if (!dieIndices || dieIndices.length === 0) {
               player.dice.unused = player.dice.unused.map(() => this.rollSixSideDice(random));
          } else {
               for (const idx of dieIndices) {
                    if (idx < 0 || idx >= player.dice.unused.length) {
                         return "INVALID_MOVE";
                    }
                    player.dice.unused[idx] = this.rollSixSideDice(random);
               }
          }
     },

     changeActionDiceValue(G: GameState, playerId: PlayerId, dieIndex: number, delta: number): BasicReturnState {
          const player = G.players[playerId];
          if (!player) return "INVALID_MOVE";

          if (dieIndex < 0 || dieIndex >= player.dice.unused.length) {
               return "INVALID_MOVE";
          }

          const currentVal = player.dice.unused[dieIndex];
          player.dice.unused[dieIndex] = Math.min(6, Math.max(1, currentVal! + delta));
     },
};