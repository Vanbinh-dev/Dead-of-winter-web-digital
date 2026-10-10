import type { ItemSymbol } from "../deck/Card.js";
import type { WoundType, SurvivorLocationId, EffectId } from "./Type.js";

export type GameEvent =
     | { type: "turnStart" }
     | { type: "survivorMoved" }
     | { type: "attacked" }
     | { type: "zombieKilled" }
     | { type: "woundReceived"; wound: WoundType | "any"; cause: "exposureAfterMove" | "any" };

export type Condition =
     | { type: "event"; event: GameEvent }
     | { type: "atLocation"; location: SurvivorLocationId | "anywhere" }
     | { type: "oncePer"; per: "turn" | "round" }
     | { type: "all"; of: Condition[] }
     | { type: "any"; of: Condition[] }
     | { type: "not"; of: Condition };

export type Cost =
     | { type: "spendDie"; min: number }
     | { type: "playCard"; symbol: ItemSymbol | null }
     | { type: "spendFood"; amount: number }
     | { type: "removeSelf" };

export type Action =
     | { type: "changeMorale"; delta: number }
     | { type: "killZombies"; count: number }
     | { type: "addWound"; wound: WoundType; count: number }
     | { type: "removeWound"; wound: WoundType | "any" }
     | { type: "rollDie"; maxResult: number; then: Action[] }
     | { type: "freeAction"; action: "barricade" | "search" | "attack" };

export type Passive =
     | { type: "trigger"; on: GameEvent; then: Action[] }
     | { type: "ignore"; what: "exposureRoll"; during: GameEvent }
     | { type: "restrict"; forbid: "move"; who: "nonExiled" };

export interface Effect {
     id: EffectId,
     condition: Condition[];
     cost: Cost[];
     active: Action[];
     passive: Passive[];
}    