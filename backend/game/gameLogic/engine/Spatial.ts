import { INVALID_MOVE } from "boardgame.io/dist/types/src/core/constants.js";
import type { EntranceState } from "../GameState.js";
import type { SurvivorId, LocationId, PlayerId, WoundType, SurvivorLocationId } from "../Type.js";
import type { GameState, BasicReturnState } from "./EffectEngine.js";

export interface ISpatialPrimitives {
     moveSurvivor(state: GameState, survivorId: SurvivorId, toLocationId: LocationId | 'colony'): BasicReturnState;

     moveZombie(state: GameState, fromLocationId: LocationId | 'colony', toLocationId: LocationId | 'colony', amount?: number): BasicReturnState;
     spawnZombie(state: GameState, locationId: LocationId | 'colony', amount?: number, entranceNumber?: number): BasicReturnState;
     destroyZombie(state: GameState, locationId: LocationId | 'colony', amount?: number, entranceNumber?: number): BasicReturnState;

     spawnSurvivor(state: GameState, playerId: PlayerId, survivorId: SurvivorId, locationId: LocationId | 'colony'): BasicReturnState;
     removeSurvivor(state: GameState, survivorId: SurvivorId): BasicReturnState;
     killSurvivor(state: GameState, survivorId: SurvivorId): BasicReturnState;

     receiveWound(state: GameState, survivorId: SurvivorId, wound: WoundType, amount?: number): BasicReturnState;
     removeWound(state: GameState, survivorId: SurvivorId, wound: WoundType, amount?: number): BasicReturnState;
     removeAllWound(state: GameState, survivorId: SurvivorId): BasicReturnState;

     placeBarricade(state: GameState, loc: LocationId | 'colony', amount?: number, entranceNumber?: number): BasicReturnState;
     removeBarricade(state: GameState, loc: LocationId | 'colony', amount?: number, entranceNumber?: number): BasicReturnState;
     placeNoise(state: GameState, loc: LocationId | 'colony', amount?: number): BasicReturnState;
     removeNoise(state: GameState, loc: LocationId | 'colony', amount?: number): BasicReturnState;
}

export function countSurvivorsAt(state: GameState, loc: LocationId | "colony"): number {
     if (loc === "colony")
          return Object.values(state.survivors).filter(s => s.location === "colony").length;
     return Object.values(state.survivors).filter(s => s.location === loc).length;
}

export function getMaxSurvivorSlot(state: GameState, loc: SurvivorLocationId): number {
     if (loc === "colony")
          return state.colony.survivorSlot;
     return state.locations[loc]?.survivorSlot ?? 0;
}

export function getEntrance(
     state: GameState,
     loc: LocationId | 'colony',
     entranceNumber?: number,
): EntranceState | undefined {
     if (loc === 'colony' || entranceNumber)
          return state.colony.entrances[(entranceNumber ?? 1) - 1];
     return state.locations[loc]?.entrance;
}

export const SpatialPrimitives: ISpatialPrimitives = {
     moveSurvivor(
          state: GameState,
          survivorId: SurvivorId,
          toLocationId: LocationId,
          isColony?: boolean
     ): BasicReturnState {
          const survivor = state.survivors[survivorId];
          const targetLoc: SurvivorLocationId = isColony ? "colony" : toLocationId;

          if (!survivor || survivor.movedThisTurn || survivor.location === targetLoc)
               return INVALID_MOVE;

          if (countSurvivorsAt(state, targetLoc) >= getMaxSurvivorSlot(state, targetLoc))
               return INVALID_MOVE;

          survivor.location = targetLoc;
          survivor.movedThisTurn = true;
     },

     spawnSurvivor(
          state: GameState,
          playerId: PlayerId,
          survivorId: SurvivorId,
          locationId: LocationId,
          isColony?: boolean
     ): BasicReturnState {
          const player = state.players[playerId];
          const targetLoc: SurvivorLocationId = isColony ? "colony" : locationId;

          if (!player || state.survivors[survivorId])
               return INVALID_MOVE;

          if (countSurvivorsAt(state, targetLoc) >= getMaxSurvivorSlot(state, targetLoc))
               return INVALID_MOVE;

          state.survivors[survivorId] = {
               id: survivorId,
               owner: playerId,
               location: targetLoc,
               wounds: [],
               equipment: [],
               movedThisTurn: false,
          };

          player.survivorIds.push(survivorId);
          if (!player.leaderId)
               player.leaderId = survivorId;
     },

     removeSurvivor(state: GameState, survivorId: SurvivorId): BasicReturnState {
          const survivor = state.survivors[survivorId];
          if (!survivor)
               return INVALID_MOVE;

          const player = state.players[survivor.owner];
          if (player) {
               player.survivorIds = player.survivorIds.filter(id => id !== survivorId);
               if (player.leaderId === survivorId)
                    player.leaderId = player.survivorIds[0] ?? "";
          }

          delete state.survivors[survivorId];
     },

     killSurvivor(state: GameState, survivorId: SurvivorId): BasicReturnState {
          const survivor = state.survivors[survivorId];
          if (!survivor)
               return INVALID_MOVE;

          state.morale = Math.max(0, state.morale - 1);
          state.removedSurvivorIds.push(survivorId);

          return this.removeSurvivor(state, survivorId);
     },

     receiveWound(
          state: GameState,
          survivorId: SurvivorId,
          wound: WoundType,
          amount = 1
     ): BasicReturnState {
          const survivor = state.survivors[survivorId];
          if (!survivor || amount <= 0)
               return INVALID_MOVE;

          for (let i = 0; i < amount; i++) {
               survivor.wounds.push(wound);
               if (survivor.wounds.length >= 3)
                    return this.killSurvivor(state, survivorId);
          }
     },

     removeWound(
          state: GameState,
          survivorId: SurvivorId,
          wound: WoundType,
          amount = 1
     ): BasicReturnState {
          const survivor = state.survivors[survivorId];
          if (!survivor || amount <= 0)
               return INVALID_MOVE;

          let removed = 0;
          while (removed < amount) {
               const idx = survivor.wounds.indexOf(wound);
               if (idx === -1)
                    break;
               survivor.wounds.splice(idx, 1);
               removed++;
          }

          if (removed === 0)
               return INVALID_MOVE;
     },

     removeAllWound(state: GameState, survivorId: SurvivorId): BasicReturnState {
          const survivor = state.survivors[survivorId];
          if (!survivor)
               return INVALID_MOVE;
          survivor.wounds = [];
     },

     spawnZombie(
          state: GameState,
          locationId: LocationId,
          amount = 1,
          entranceNumber?: number,
     ): BasicReturnState {
          const entrance = getEntrance(state, locationId, entranceNumber);
          if (!entrance || amount <= 0)
               return INVALID_MOVE;

          entrance.zombies += amount;
     },

     destroyZombie(
          state: GameState,
          locationId: LocationId | 'colony',
          amount = 1,
          entranceNumber?: number,
          isColony?: boolean
     ): BasicReturnState {
          const entrance = getEntrance(state, locationId, entranceNumber);
          if (!entrance || amount <= 0 || entrance.zombies === 0)
               return INVALID_MOVE;

          const killCount = Math.min(amount, entrance.zombies);
          entrance.zombies -= killCount;
     },

     moveZombie(
          state: GameState,
          fromLocationId: LocationId,
          toLocationId: LocationId,
          amount = 1
     ): BasicReturnState {
          const sourceEntrance = state.locations[fromLocationId]?.entrance;
          const targetEntrance = state.locations[toLocationId]?.entrance;

          if (!sourceEntrance || !targetEntrance || amount <= 0 || sourceEntrance.zombies === 0)
               return INVALID_MOVE;

          const moveCount = Math.min(amount, sourceEntrance.zombies);
          sourceEntrance.zombies -= moveCount;
          targetEntrance.zombies += moveCount;
     },

     placeBarricade(
          state: GameState,
          loc: LocationId | 'colony',
          amount = 1,
          entranceNumber?: number,
          isColony?: boolean
     ): BasicReturnState {
          const entrance = getEntrance(state, loc, entranceNumber);
          if (!entrance || amount <= 0)
               return INVALID_MOVE;

          const availableSlots = entrance.capacity - (entrance.zombies + entrance.barricades);
          if (availableSlots <= 0)
               return INVALID_MOVE;

          const placedCount = Math.min(amount, availableSlots);
          entrance.barricades += placedCount;
     },

     removeBarricade(
          state: GameState,
          loc: LocationId | 'colony',
          amount = 1,
          entranceNumber?: number,
     ): BasicReturnState {
          const entrance = getEntrance(state, loc, entranceNumber);
          if (!entrance || amount <= 0 || entrance.barricades === 0)
               return INVALID_MOVE;

          const removeCount = Math.min(amount, entrance.barricades);
          entrance.barricades -= removeCount;
     },

     placeNoise(state: GameState, loc: LocationId, amount = 1): BasicReturnState {
          const location = state.locations[loc];
          if (!location || amount <= 0)
               return INVALID_MOVE;

          const availableSlots = 4 - location.noise;
          if (availableSlots <= 0)
               return INVALID_MOVE;

          const placedCount = Math.min(amount, availableSlots);
          location.noise += placedCount;
     },

     removeNoise(state: GameState, loc: LocationId, amount = 1): BasicReturnState {
          const location = state.locations[loc];
          if (!location || amount <= 0 || location.noise === 0)
               return INVALID_MOVE;

          const removeCount = Math.min(amount, location.noise);
          location.noise -= removeCount;
     },
};