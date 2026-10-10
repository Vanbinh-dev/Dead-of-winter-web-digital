import { INVALID_MOVE } from "boardgame.io/dist/types/src/core/constants.js";
import type { EntranceState, PublicSurvivorState } from "../GameState.js";
import type { LocationId, PlayerId, SurvivorId, SurvivorLocationId, WoundType } from "../Type.js";
import { type BasicReturnState, type GameState } from "./EffectEngine.js";
import { SURVIVOR_CARDS } from "./GameData.js";

export interface ISpatialPrimitives {
     moveSurvivor(state: GameState, survivorId: SurvivorId, toLocationId: LocationId | 'colony'): BasicReturnState;

     moveZombie(state: GameState, fromLocationId: LocationId, toLocationId: LocationId, amount?: number): BasicReturnState;
     spawnZombie(state: GameState, locationId: LocationId, amount?: number): BasicReturnState;
     destroyZombie(state: GameState, locationId: LocationId, amount?: number, entranceNumber?: number): BasicReturnState;

     moveZombieToColony(state: GameState, fromLocationId: LocationId, amount: number, entranceNumber?: number): BasicReturnState;
     moveZombieFromColony(state: GameState, toLocationId: LocationId, amount: number, entranceNumber: number): BasicReturnState;
     spawnZombieToColony(state: GameState, amount: number): BasicReturnState;
     placeBarricadeToColony(state: GameState, entranceNumber: number, amount: number): BasicReturnState;
     destroyZombieFromColony(state: GameState, entranceNumber: number, amount: number): BasicReturnState;

     spawnSurvivor(state: GameState, playerId: PlayerId, survivorId: SurvivorId, locationId: LocationId | 'colony'): BasicReturnState;
     removeSurvivor(state: GameState, survivorId: SurvivorId): BasicReturnState;
     killSurvivor(state: GameState, survivorId: SurvivorId): BasicReturnState;

     receiveWound(state: GameState, survivorId: SurvivorId, wound: WoundType, amount?: number): BasicReturnState;
     removeWound(state: GameState, survivorId: SurvivorId, wound: WoundType, amount?: number): BasicReturnState;
     removeAllWound(state: GameState, survivorId: SurvivorId): BasicReturnState;

     placeBarricade(state: GameState, loc: LocationId, amount: number): BasicReturnState;
     removeBarricade(state: GameState, loc: LocationId, amount: number): BasicReturnState;
     placeNoise(state: GameState, loc: LocationId, amount: number): BasicReturnState;
     removeNoise(state: GameState, loc: LocationId, amount: number): BasicReturnState;
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
          // This count is effect!
     },

     spawnSurvivor(
          state: GameState,
          playerId: PlayerId,
          survivorId: SurvivorId,
          locationId: LocationId,
          isColony?: boolean,
          forceMove?: boolean
     ): BasicReturnState {
          const player = state.players[playerId];

          let targetLoc = locationId;
          if (!player || state.survivors[survivorId])
               return INVALID_MOVE;
          if (isColony && state.colony.maxSurvivorSlot > state.colony.survivorSlot + state.colony.helpless) {
               state.colony.maxSurvivorSlot + 1;
               state.survivors[survivorId] = {
                    id: survivorId,
                    equipment: [],
                    location: "colony",
                    movedThisTurn: false,
                    owner: playerId,
                    wounds: [],
               };

               player.survivorIds.push(survivorId);
               return;
          }

          const ALL_SURVIVOR_LOCATION: Array<LocationId> = ["policeStation", "groceryStore", "school",
               "gasStation", "library", "hospital"];
          let canAdd = state.locations[targetLoc].maxSurvivorSlot == countSurvivorsAt(state, targetLoc);
          if (!forceMove)
               for (const location of ALL_SURVIVOR_LOCATION) {
                    if (canAdd)
                         break;






                    else
                         targetLoc = location;
                    canAdd = state.locations[targetLoc].maxSurvivorSlot == countSurvivorsAt(state, targetLoc);
               }

          if (!canAdd)
               return INVALID_MOVE;
          state.locations[targetLoc].survivorSlot + 1;
          state.survivors[survivorId] = {
               id: survivorId,
               equipment: [],
               location: targetLoc,
               movedThisTurn: false,
               owner: playerId,
               wounds: [],
          };

          player.survivorIds.push(survivorId);
     },

     removeSurvivor(state: GameState, survivorId: SurvivorId): BasicReturnState {
          const survivor = state.survivors[survivorId];
          if (!survivor)
               return INVALID_MOVE;

          const player = state.players[survivor.owner];
          if (!player)
               return INVALID_MOVE;
          const index = player.survivorIds.indexOf(survivorId);
          player.survivorIds.splice(index, 1);
          const location = survivor.location;
          if (location == 'colony')
               state.colony.survivorSlot--;






          else
               state.locations[location].survivorSlot--;
          delete state.survivors[survivorId];
          state.removedSurvivorIds.push(survivorId);
     },

     killSurvivor(state: GameState, survivorId: SurvivorId): BasicReturnState {
          const survivor = state.survivors[survivorId];
          if (!survivor)
               return INVALID_MOVE;
          const player = state.players[survivor.owner];
          if (player === undefined)
               return INVALID_MOVE;
          if (player.status != 'exiled')
               state.morale = Math.max(0, state.morale - 1);

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

     spawnZombie: function (state: GameState, locationId: LocationId, amount: number): BasicReturnState {
          const location = state.locations[locationId];
          const survivorInfo: Array<PublicSurvivorState> = getSurvivorsAt(state, locationId)
               .sort((s1, s2) => INFLUENT_COMPARATOR(s1.id, s2.id));

          for (let i = 0; i < amount; i++)
               if (location.entrance.barricades > 0)
                    location.entrance.barricades--;
               else if (location.entrance.zombies < location.entrance.capacity)
                    location.entrance.zombies++;
               else if (survivorInfo.length > 0) {
                    this.killSurvivor(state, survivorInfo[0]!.id);
                    survivorInfo.shift();
               }
     },
     destroyZombie: function (state: GameState, locationId: LocationId, amount: number): BasicReturnState {
          const location = state.locations[locationId];
          location.entrance.zombies = Math.max(location.entrance.zombies - amount, 0);
     },
     moveZombieToColony: function (state: GameState, fromLocationId: LocationId, amount: number, entranceNumber: number): BasicReturnState {
          if (amount <= 0) return INVALID_MOVE;

          const fromEntrance = state.locations[fromLocationId]?.entrance;
          const toEntrance = getColonyEntrance(state, entranceNumber);
          if (!fromEntrance || !toEntrance || fromEntrance.zombies === 0) return INVALID_MOVE;

          const availableSlots = toEntrance.capacity - toEntrance.zombies;
          if (availableSlots <= 0) return INVALID_MOVE;

          const actualAmount = Math.min(amount, fromEntrance.zombies, availableSlots);
          spawnZombieToColonyEntrance(state, entranceNumber, actualAmount);

          this.destroyZombie(state, fromLocationId, actualAmount);

          return state;
     },
     spawnZombieToColony: function (state: GameState, amount: number): BasicReturnState {
          if (amount <= 0)
               return INVALID_MOVE;
          const survivorAtColony = Object.values(state.survivors).filter(survivor => survivor.location === 'colony')
               .sort((s1, s2) => INFLUENT_COMPARATOR(s1.id, s2.id));
          let e = 0;
          for (let i = 0; i < amount; i++) {
               const location = state.colony.entrances[e]!;
               if (location.barricades > 0)
                    location.barricades--;
               else if (location.zombies < location.capacity)
                    location.zombies++;
               else if (survivorAtColony.length > 0) {
                    this.killSurvivor(state, survivorAtColony[0]!.id);
                    survivorAtColony.shift();
               } else if (state.colony.helpless > 0) {
                    state.colony.helpless--;
                    state.morale--;
               }
          }
     },
     placeBarricadeToColony: function (state: GameState, entranceNumber: number, amount: number): BasicReturnState {
          if (amount <= 0) return INVALID_MOVE;
          const entrance = getColonyEntrance(state, entranceNumber);
          if (!entrance) return INVALID_MOVE;

          const maxBarricades = entrance.capacity - entrance.zombies;
          entrance.barricades = Math.min(entrance.barricades + amount, Math.max(0, maxBarricades));
          return state;
     },
     placeBarricade: function (state: GameState, loc: LocationId, amount: number): BasicReturnState {
          const { entrance } = state.locations[loc];
          const maxBarricades = entrance.capacity - entrance.zombies;

          entrance.barricades = Math.min(entrance.barricades + amount, maxBarricades);
     },
     removeBarricade: function (state: GameState, loc: LocationId, amount: number): BasicReturnState {
          const location = state.locations[loc];
          location.entrance.barricades = Math.max(0, location.entrance.barricades - amount);
     },
     moveZombieFromColony: function (state: GameState, toLocationId: LocationId, amount: number, entranceNumber: number): BasicReturnState {
          if (amount <= 0) return INVALID_MOVE;

          const fromEntrance = getColonyEntrance(state, entranceNumber);
          const toEntrance = state.locations[toLocationId]?.entrance;
          if (!fromEntrance || !toEntrance || fromEntrance.zombies === 0) return INVALID_MOVE;

          const availableSlots = toEntrance.capacity - toEntrance.zombies;
          if (availableSlots <= 0) return INVALID_MOVE;

          const actualAmount = Math.min(amount, fromEntrance.zombies, availableSlots);

          fromEntrance.zombies -= actualAmount;
          this.spawnZombie(state, toLocationId, actualAmount);

          return state;
     },
     moveZombie: function (state: GameState, fromLocationId: LocationId, toLocationId: LocationId, amount: number): BasicReturnState {
          if (amount <= 0)
               return INVALID_MOVE;
          if (toLocationId === fromLocationId)
               return INVALID_MOVE;
          const fromLocationZombie = state.locations[fromLocationId].entrance.zombies;

          if (fromLocationZombie == 0)
               return INVALID_MOVE;
          if (amount > fromLocationZombie) {
               this.destroyZombie(state, fromLocationId, fromLocationZombie);
               this.spawnZombie(state, toLocationId, fromLocationZombie);
          } else {
               this.destroyZombie(state, fromLocationId, amount);
               this.spawnZombie(state, toLocationId, amount);
          }
     },
     destroyZombieFromColony: function (state: GameState, entranceNumber: number, amount: number): BasicReturnState {
          if (amount <= 0) return INVALID_MOVE;

          if (entranceNumber < 1 || entranceNumber > 7) return INVALID_MOVE;

          const entrance = state.colony.entrances[entranceNumber - 1] ?? state.colony.entrances[entranceNumber];
          if (!entrance) return INVALID_MOVE;

          entrance.zombies = Math.max(0, entrance.zombies - amount);

          return state;
     }
};

function getSurvivorsAt(state: GameState, location: LocationId): PublicSurvivorState[] {
     return Object.values(state.survivors).filter(survivor => survivor.location === location)
}

export const INFLUENT_COMPARATOR = (s1: SurvivorId, s2: SurvivorId) => {
     const infoS1 = SURVIVOR_CARDS.get(s1);
     const infoS2 = SURVIVOR_CARDS.get(s2);

     if (!infoS1 && !infoS2) return 0;
     if (!infoS1) return 1;
     if (!infoS2) return -1;

     return (infoS1.influence ?? 0) - (infoS2.influence ?? 0);
}

export function getColonyEntrance(state: GameState, entranceNumber: number) {
     if (entranceNumber < 1 || entranceNumber > 7) return null;
     return state.colony.entrances[entranceNumber - 1] ?? state.colony.entrances[entranceNumber];
}

function spawnZombieToColonyEntrance(state: GameState, entranceNumber: number, amount: number): BasicReturnState {
     if (amount <= 0) return INVALID_MOVE;
     const entrance = getColonyEntrance(state, entranceNumber);
     if (!entrance) return INVALID_MOVE;

     const survivorAtColony = Object.values(state.survivors)
          .filter(survivor => survivor.location === 'colony')
          .sort((s1, s2) => INFLUENT_COMPARATOR(s1.id, s2.id));

     for (let i = 0; i < amount; i++) {
          if (entrance.barricades > 0) {
               entrance.barricades--;
          } else if (entrance.zombies < entrance.capacity) {
               entrance.zombies++;
          } else if (survivorAtColony.length > 0) {
               SpatialPrimitives.killSurvivor(state, survivorAtColony[0]!.id);
               survivorAtColony.shift();
          } else if (state.colony.helpless > 0) {
               state.colony.helpless--;
               state.morale--;
          }
     }
     return state;
}