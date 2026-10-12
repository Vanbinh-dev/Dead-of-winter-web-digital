import type { PlayerID } from "boardgame.io";
import type { CardID, CrisisID, CrossroadID, Deck, ExileObjectiveID, ItemID, MainObjectiveID, SecretObjectiveID, SurvivorID } from "./Card.js";
import type { LocationID, PublicColonyState, PublicLocationState } from "./Location.js";
import type { PublicSurvivorInfo } from "./Survivor.js";

export interface GameState {
     public: PublicGameState,
     private: PrivateGameState
}

export type GameMode = 'co-op' | 'contain-betrayer';

export interface PublicGameState {
     gameMode: GameMode;
     players: Record<PlayerID, PublicPlayerState>;
     playerOrder: PlayerID[];
     currentPlayerID: PlayerID;
     phase: string;
     gameStatus: 'non-start' | 'on-going' | 'endGame';

     leftRound: number;
     morale: number;

     mainObjective: MainObjectiveID | null;
     currentCrisis: CrisisID | null;

     mainObjectiveItemContribution: ItemID[];
     mainObjectiveToken: number;

     location: Record<LocationID, PublicLocationState>;
     colony: PublicColonyState;

     survivorInfo: Record<SurvivorID, PublicSurvivorInfo>;

     pending: PendingAction | null;
     removeSurvivor: SurvivorID[];
     removeItemCard: ItemID[];

     previousLog: GameLog;
}

export interface PublicPlayerState {
     playerName: string;
     survivorList: SurvivorID[];
     handSize: number;
     die: {
          unused: number[],
          used: number[]
     }
}

export interface PrivateGameState {
     id: PlayerID,
     survivorDeck: Deck<SurvivorID>,
     crisisDeck: Deck<CrisisID>,
     crossroadDeck: Deck<CrossroadID>,
     mainObjectiveDeck: Deck<MainObjectiveID>,
     secretObjective: Deck<SecretObjectiveID>,
     exileObjective: Deck<ExileObjectiveID>

     starterItemDeck: Deck<ItemID>,
     location: Record<LocationID, Deck<ItemID>>

     players: Record<PlayerID, PrivatePlayerState>

     crisisContribution: Deck<ItemID>
}

export interface PrivatePlayerState {
     hand: ItemID[],
     secretObjective: SecretObjectiveID | null,
     crossroadCardHolding: CrossroadID;
     vote: 'yes' | 'no' | null;
}

export type PendingAction =
     { type: 'reveal', playerId: PlayerID; location: LocationID; } |
     { type: 'drawFromReveal', playerId: PlayerID; card: CardID[]; survivorId?: SurvivorID; location?: LocationID } |
     { type: 'vote', playerId: PlayerID; targetPlayerId?: PlayerID; issue?: string } |
     { type: 'resolveTriggerEffect', playerId: PlayerID; effectDescription?: string } |
     { type: 'biteSpread', survivorId: SurvivorID; location: LocationID | 'colony' };

export interface GameLog {
     player: PlayerID,
     playerName: string,
     reason: string,
     description: string;
}