import type { PlayerID } from "boardgame.io";

export type PlayerId = PlayerID;
export type CardId = string;
export type SurvivorId = string;
export type EffectId = string;

export const NON_COLONY_LOCATIONS = [
  "policeStation", "groceryStore", "school",
  "gasStation", "library", "hospital",
] as const;
export type LocationId = (typeof NON_COLONY_LOCATIONS)[number];
export type SurvivorLocationId = LocationId | "colony";

export type WoundType = "wound" | "frostbite";