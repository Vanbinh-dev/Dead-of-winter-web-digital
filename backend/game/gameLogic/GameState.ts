import type { LargeNumberLike } from "node:crypto";
import type { Passive } from "./Effect.js";
import type { CardId, EffectId, LocationId, PlayerId, SurvivorId, SurvivorLocationId, WoundType } from "./Type.js";
import type { CardDeck } from "../deck/Card.js";

export interface EntranceState { capacity: number; zombies: number; barricades: number }

export interface PublicSurvivorState {
  id: SurvivorId; owner: PlayerId; location: SurvivorLocationId;
  wounds: WoundType[]; equipment: CardId[]; movedThisTurn: boolean;
}

export interface PublicPlayerState {
  id: PlayerId; status: "active" | "exiled" | "eliminated";
  survivorIds: SurvivorId[]; leaderId: SurvivorId;
  handSize: number;
  dice: { unused: number[]; used: number[] };
  hasInitiatedExileVote: boolean; hasVoted: boolean; 
}

export interface PublicLocationState {
  id: LocationId;
  maxSurvivorSlot: number;
  survivorSlot: number;
  entrance: EntranceState; noise: number; searchDeckSize: number;
}

export interface PublicColonyState {
  maxSurvivorSlot: number;
  survivorSlot: number;
  entrances: EntranceState[];
  helpless: number;
  food: number;
  starvation: number;
  wastePile: number;
}

export interface ActiveEffect {
  id: string; sourceCardId: CardId; passive: Passive[];
  expires: { type: "game" } | { type: "endOfRound"; round: number };
}

export type PendingAction =
  | { type: "search"; playerId: PlayerId; survivorId: SurvivorId; location: LocationId; drawnCount: number }
  | { type: "biteSpread"; playerId: PlayerId; survivorId: SurvivorId }
  | { type: "request"; from: PlayerId; to: PlayerId }
  | { type: "vote"; kind: "exile" | "crossroads"; initiator: PlayerId; target: PlayerId | null };

export interface PublicGameState {
  rules: { coop: boolean; hardcore: boolean; betrayer: boolean; elimination: boolean };
  round: number; morale: number;
  firstPlayerId: PlayerId; turnOrder: PlayerId[];
  mainObjectiveId: CardId; mainObjectiveProgress: number;
  currentCrisisId: CardId | null; crisisContributionCount: number;
  players: Record<PlayerId, PublicPlayerState>;
  survivors: Record<SurvivorId, PublicSurvivorState>;
  locations: Record<LocationId, PublicLocationState>;
  colony: PublicColonyState;
  effects: { active: ActiveEffect[]; used: { turn: string[]; round: string[] } };
  pending: PendingAction | null;
  removedSurvivorIds: SurvivorId[];
  result: { endReason: "morale" | "round" | "objective"; winners: PlayerId[] } | null;
  additionEffect: Array<EffectId>;
}

export interface PrivatePlayerState {
  hand: CardId[];
  secretObjectiveId: CardId | null;
  exileObjectiveId: CardId | null;
  heldCrossroadId: CardId | null;
  vote: "yes" | "no" | null;
}

export interface PrivateGameState {
  players: Record<PlayerId, PrivatePlayerState>;
  decks: { crisis: CardDeck; crossroads: CardDeck; survivor: CardDeck; exile: CardDeck };
  searchDecks: Record<LocationId, CardDeck>;
  crisisContribution: CardId[];
}

export interface G { public: PublicGameState; private: PrivateGameState }

export type MessageCode = '';

export interface GameMessage {
  id: number;
  round: number;
  code: MessageCode;
  params: Record<string, string | number>;
}