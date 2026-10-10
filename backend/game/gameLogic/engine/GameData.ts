import type { ItemCardDef, CrisisCardDef, CrossroadsCardDef, MainObjectiveDef, SecretObjectiveDef, CardDef } from "../../deck/Card.js";
import type { SurvivorDef } from "../../Survivor.js";
import type { CardId, LocationId } from "../Type.js";

export const SURVIVOR_CARDS: ReadonlyMap<CardId, SurvivorDef> = new Map([
     // ["survivor_01", { ... }]
]);

export const ITEM_CARDS: ReadonlyMap<CardId, ItemCardDef> = new Map([
     // ["item_01", { ... }]
]);

export const CRISIS_CARDS: ReadonlyMap<CardId, CrisisCardDef> = new Map([
     // ["crisis_01", { ... }]
]);

export const CROSSROADS_CARDS: ReadonlyMap<CardId, CrossroadsCardDef> = new Map([
     // ["crossroads_01", { ... }]
]);

export const MAIN_OBJECTIVE_CARDS: ReadonlyMap<CardId, MainObjectiveDef> = new Map([
     // ["main_obj_01", { ... }]
]);

export const SECRET_OBJECTIVE_CARDS: ReadonlyMap<CardId, SecretObjectiveDef> = new Map([
     // ["secret_obj_01", { ... }]
]);

export const EXILE_CARDS: ReadonlyMap<CardId, SecretObjectiveDef> = new Map([]);

export function getAllSurvivorIds(): CardId[] {
     return Array.from(SURVIVOR_CARDS.keys());
}

export function getAllItemIds(): CardId[] {
     return Array.from(ITEM_CARDS.keys());
}

export function getItemIdsByLocation(location: LocationId | "starter"): CardId[] {
     const result: CardId[] = [];
     for (const [id, card] of ITEM_CARDS.entries()) {
          if (card.origin === location) {
               result.push(id);
          }
     }
     return result;
}

export function getAllCrisisIds(): CardId[] {
     return Array.from(CRISIS_CARDS.keys());
}

export function getAllCrossroadsIds(): CardId[] {
     return Array.from(CROSSROADS_CARDS.keys());
}

export function getAllMainObjectiveIds(): CardId[] {
     return Array.from(MAIN_OBJECTIVE_CARDS.keys());
}

export function getAllSecretObjectiveIds(category?: "standard" | "betrayal" | "exiled"): CardId[] {
     if (!category) {
          return Array.from(SECRET_OBJECTIVE_CARDS.keys());
     }
     const result: CardId[] = [];
     for (const [id, card] of SECRET_OBJECTIVE_CARDS.entries()) {
          if (card.category === category) {
               result.push(id);
          }
     }
     return result;
}

export function getCardDefById(id: CardId): CardDef | undefined {
     return (
          ITEM_CARDS.get(id) ||
          SURVIVOR_CARDS.get(id) ||
          CRISIS_CARDS.get(id) ||
          CROSSROADS_CARDS.get(id) ||
          MAIN_OBJECTIVE_CARDS.get(id) ||
          SECRET_OBJECTIVE_CARDS.get(id)
     );
}