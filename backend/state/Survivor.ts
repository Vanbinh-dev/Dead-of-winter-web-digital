import type { PlayerID } from "boardgame.io";
import type { ItemID, SurvivorID } from "./Card.js";
import type { Skill } from "./Effect.js";
import type { LocationID } from "./Location.js";

export interface PublicSurvivorInfo {
     location: LocationID | 'colony';
     belongPlayer: PlayerID;
     wound: WoundType[];
     hasMoved: boolean;
     equippedItems?: ItemID[];
}

export interface SurvivorInfo {
     id: SurvivorID;
     name: string;
     job: string;
     hp: number;
     influent: number;
     searchIndex: number;
     powerIndex: number;
     skillDescription: string;
     skill: Skill;  
}

export type WoundType = 'wound' | 'frostbite';