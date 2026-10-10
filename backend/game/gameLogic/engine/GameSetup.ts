import type { Ctx } from "boardgame.io";
import { NON_COLONY_LOCATIONS, type CardId, type EffectId, type LocationId, type PlayerId } from "../Type.js";
import type { GameState, BasicReturnState } from "./EffectEngine.js";
import type { Effect } from "../Effect.js";
import type { CardDeck } from "../../deck/Card.js";
import type { G, PublicPlayerState, PrivatePlayerState, PublicLocationState, PublicColonyState, PublicGameState, PrivateGameState } from "../GameState.js";

export interface GameSetup {
     setUp(): G;
     chooseGameMode(state: GameState, ctx: Ctx, gameMode: 'normal' | 'co-op'): BasicReturnState;
     chooseMainObject(state: GameState, mainObjective: CardId, isRandom?: boolean): BasicReturnState;
     gameStart(state: GameState): BasicReturnState;    
}

export function setupGame(ctx: Ctx, setupData?: { gameMode?: 'normal' | 'co-op' }): G {
     const publicPlayers: Record<string, PublicPlayerState> = {};
     const privatePlayers: Record<string, PrivatePlayerState> = {};

     for (let i = 0; i < ctx.numPlayers; i++) {
          const pId = i.toString();
          publicPlayers[pId] = {
               id: pId,
               status: "active",
               survivorIds: [],
               leaderId: "",
               handSize: 0,
               dice: { unused: [], used: [] },
               hasInitiatedExileVote: false,
               hasVoted: false,
          };

          privatePlayers[pId] = {
               hand: [],
               secretObjectiveId: null,
               exileObjectiveId: null,
               heldCrossroadId: null,
               vote: null,
          };
     }

     const locations = {} as Record<LocationId, PublicLocationState>;
     const searchDecks = {} as Record<LocationId, CardDeck>;

     for (const loc of NON_COLONY_LOCATIONS) {
          locations[loc] = {
               id: loc,
               maxSurvivorSlot: 4,
               survivorSlot: 0,
               entrance: { capacity: 3, zombies: 0, barricades: 0 },
               noise: 0,
               searchDeckSize: 0,
          };
          searchDecks[loc] = {
               deck: getItemIdsByLocation(loc),
               revealCard: []
          }
     }

     const colony: PublicColonyState = {
          maxSurvivorSlot: 99,
          survivorSlot: 0,
          entrances: Array(6).fill(null).map(() => ({ capacity: 3, zombies: 0, barricades: 0 })),
          helpless: 0,
          food: 0,
          starvation: 0,
          wastePile: 0,
     };

     const publicState: PublicGameState = {
          rules: {
               coop: setupData?.gameMode === 'co-op',
               hardcore: false,
               betrayer: setupData?.gameMode !== 'co-op',
               elimination: true
          },
          round: 0,
          morale: 0,
          firstPlayerId: ctx.playOrder[0] || "0",
          turnOrder: [...ctx.playOrder],
          mainObjectiveId: "",
          mainObjectiveProgress: 0,
          currentCrisisId: null,
          crisisContributionCount: 0,
          additionEffect: [],

          players: publicPlayers,
          survivors: {},
          locations: locations,
          colony: colony,

          effects: { active: [], used: { turn: [], round: [] } },
          pending: null,
          removedSurvivorIds: [],
          result: null
     };

     const privateState: PrivateGameState = {
          players: privatePlayers,
          decks: {
               crisis: {
                    deck: getAllCrisisIds(),
                    revealCard: []
               },
               crossroads: {
                    deck: getAllCrisisIds(),
                    revealCard: []
               },
               survivor: {
                    deck: getAllSurvivorIds(),
                    revealCard: []
               },

               exile: {
                    deck: getAllExileId('exile'),
                    revealCard: []
               }
          },
          searchDecks: searchDecks,
          crisisContribution: [],
     };

     return {
          public: publicState,
          private: privateState,
     };
}

export const GAME_SETUP: GameSetup = {
     setUp:  (),

}

function getItemIdsByLocation(loc: string): string[] {
     throw new Error("Function not implemented.");
}


function getAllCrisisIds(): string[] {
     throw new Error("Function not implemented.");
}


function getAllSurvivorIds(): string[] {
     throw new Error("Function not implemented.");
}


function getAllExileId(arg0: string): string[] {
     throw new Error("Function not implemented.");
}
