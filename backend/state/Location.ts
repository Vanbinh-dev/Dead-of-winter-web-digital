import type { ItemID } from "./Card.js";

export type LocationID = 'hospital' | 'groceryStore' | 'policeStation'
     | 'school' | 'gasStation' | 'library';

export interface Entrance {
     zombie: number;
     barricade: number;
     maxZombieCapacity: number;
}

export interface PublicLocationState {
     id: LocationID;
     entrance: Entrance;

     maxSurvivorNumber: number;
     maxNoise: number;

     survivorNumber: number;
     noise: number;
}

export interface PublicColonyState {
     entrances: Entrance[],
     maxEntrance: number;
     maxSurvivor: number;
     survivor: number;
     helpless: number;
     food: number;
     starvation: number;
     waste: ItemID[]
}