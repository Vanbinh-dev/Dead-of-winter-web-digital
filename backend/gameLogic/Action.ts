import type { Ctx, PlayerID } from "boardgame.io";
import type { EventsAPI } from "boardgame.io/dist/types/src/plugins/events/events.js";
import type { RandomAPI } from "boardgame.io/dist/types/src/plugins/random/random.js";
import type { INVALID_MOVE } from "boardgame.io/dist/types/src/core/constants.js";
import type { CardID, ItemID, SurvivorID } from "../state/Card.js";
import type { Skill } from "../state/Effect.js";
import type { GameState } from "../state/GameState.js";
import type { LocationID } from "../state/Location.js";
import type { WoundType } from "../state/Survivor.js";

export type State = typeof INVALID_MOVE | void;

export interface MoveContext {
     G: GameState;
     ctx: Ctx;
     playerID?: PlayerID;
     events?: EventsAPI;
     random?: RandomAPI;
}

export type MoveFunction<Args extends any[] = any[]> = (
     context: MoveContext,
     ...args: Args
) => State;

export type DeckID =
     | LocationID
     | 'survivor'
     | 'removedSurvivor'
     | 'starterItem'
     | 'waste'
     | 'removedItem'
     | 'crisis'
     | 'crisisContribution'
     | 'exile'
     | 'crossroad'
     | 'mainObjective'
     | 'secretObjective';

export interface DiceAction {
     rollSixSideDice: MoveFunction<[]>;
     rollExposureDice: MoveFunction<[]>;

     changeActionDie: MoveFunction<[targetPlayerId: PlayerID, dieIndex: number, newValue: number]>;
     rerollActionDie: MoveFunction<[targetPlayerId: PlayerID, dieIndex: number]>;

     bringUsedDieToUnused: MoveFunction<[targetPlayerId: PlayerID, dieIndex: number]>;
     bringUnusedDieToUsed: MoveFunction<[targetPlayerId: PlayerID, dieIndex: number]>;

     removeActionDie: MoveFunction<[targetPlayerId: PlayerID, dieIndex: number, from: 'unused' | 'used']>;
     addActionDie: MoveFunction<[targetPlayerId: PlayerID, value?: number, to?: 'unused' | 'used']>;

     rerollAllActionDie: MoveFunction<[targetPlayerId: PlayerID]>;
     spendActionDice: MoveFunction<[targetPlayerId: PlayerID, dieIndex: number, requireMin: number]>;
}

export interface DeckAction {
     isExisted(G: GameState, card: CardID, deckId: DeckID): boolean;
     getCardCountInDeck(G: GameState, card: CardID, deckId: DeckID): { total: number; inCards: number; inReveal: number };

     draw: MoveFunction<[deckId: DeckID, toPlayerId?: PlayerID]>;
     removeCardFromDeck: MoveFunction<[deckId: DeckID, cards: CardID[]]>;
     putCardToDeck: MoveFunction<[deckId: DeckID, cards: CardID[], pos: 'bottom' | 'top' | 'shuffle', fromPlayerId?: PlayerID]>;
     shuffleDeck: MoveFunction<[deckId: DeckID]>;

     reveal: MoveFunction<[deckId: DeckID, amount: number]>;
     clearReveal: MoveFunction<[deckId: DeckID, returnPos: 'bottom' | 'top' | 'shuffle']>;

     takeCardFromReveal: MoveFunction<[deckId: DeckID, cardId: CardID, toPlayerId?: PlayerID]>;
     takeCardFromDeck: MoveFunction<[deckId: DeckID, cardId: CardID, toPlayerId?: PlayerID]>;

     moveCardBetweenDecks: MoveFunction<[fromDeck: DeckID, toDeck: DeckID, cards: CardID[], pos?: 'bottom' | 'top' | 'shuffle']>;

     addCardToHand: MoveFunction<[playerId: PlayerID, cards: ItemID[]]>;
     removeCardFromHand: MoveFunction<[playerId: PlayerID, cards: ItemID[]]>;
     transferCardBetweenPlayers: MoveFunction<[fromPlayerId: PlayerID, toPlayerId: PlayerID, cardId: ItemID]>;

     addCardToWaste: MoveFunction<[cards: ItemID[]]>;
     removeCardFromWaste: MoveFunction<[cards: ItemID[]]>;
}

export interface LocationAction {
     moveSurvivor: MoveFunction<[survivorId: SurvivorID, to: LocationID | 'colony']>;

     spawnSurvivor: MoveFunction<[survivorId: SurvivorID, playerId: PlayerID, atLoc: LocationID | 'colony']>;
     removeSurvivor: MoveFunction<[survivorId: SurvivorID]>;

     addHelplessSurvivor: MoveFunction<[amount: number]>;
     removeHelplessSurvivor: MoveFunction<[amount: number]>;

     addFood: MoveFunction<[amount: number]>;
     removeFood: MoveFunction<[amount: number]>;
     addStarvation: MoveFunction<[amount: number]>;
     removeStarvation: MoveFunction<[amount: number]>;

     spawnZombieAtColony: MoveFunction<[entranceIndex: number, amount: number]>;
     removeZombieAtColony: MoveFunction<[entranceIndex: number, amount: number]>;

     spawnZombieAtLocation: MoveFunction<[atLoc: LocationID, amount: number]>;
     removeZombieAtLocation: MoveFunction<[atLoc: LocationID, amount: number]>;

     buildBarricadeAtColony: MoveFunction<[entranceIndex: number, amount: number]>;
     removeBarricadeAtColony: MoveFunction<[entranceIndex: number, amount: number]>;

     buildBarricadeAtLocation: MoveFunction<[atLoc: LocationID, amount: number]>;
     removeBarricadeAtLocation: MoveFunction<[atLoc: LocationID, amount: number]>;

     addNoise: MoveFunction<[atLoc: LocationID, amount: number]>;
     removeNoise: MoveFunction<[atLoc: LocationID, amount: number]>;
}

export interface SurvivorAction {
     markAsMoved: MoveFunction<[survivorId: SurvivorID]>;
     markAsNotMoved: MoveFunction<[survivorId: SurvivorID]>;

     receiveWound: MoveFunction<[survivorId: SurvivorID, wound: WoundType]>;
     removeWound: MoveFunction<[survivorId: SurvivorID, wound: WoundType, amount: number]>;
     removeAllWound: MoveFunction<[survivorId: SurvivorID]>;

     equipCard: MoveFunction<[survivorId: SurvivorID, itemCard: ItemID]>;
     unequipCard: MoveFunction<[survivorId: SurvivorID, itemCard: ItemID, returnToPlayerId?: PlayerID]>;
     transferEquip: MoveFunction<[fromSurvivorId: SurvivorID, toSurvivorId: SurvivorID, equip: ItemID]>;

     removeSurvivor: MoveFunction<[survivorId: SurvivorID]>;
     killHelplessSurvivor: MoveFunction<[amount: number]>;
}

export interface GameAction {
     changeMorale: MoveFunction<[delta: number]>;
     changeRound: MoveFunction<[delta: number]>;

     setFirstPlayer: MoveFunction<[targetPlayerId: PlayerID]>;
     exilePlayer: MoveFunction<[targetPlayerId: PlayerID]>;
     unexilePlayer: MoveFunction<[targetPlayerId: PlayerID]>;

     applySkill: MoveFunction<[skill: Skill]>;
     useItemCard: MoveFunction<[playerId: PlayerID, itemCard: ItemID[]]>;

     setPendingAction: MoveFunction<[pending: GameState['public']['pending']]>;
     clearPendingAction: MoveFunction<[]>;

     applyExposureResult: MoveFunction<[survivorId: SurvivorID, result: 'blank' | 'wound' | 'frostbite' | 'bite']>;

     resolveBiteAcceptDeath: MoveFunction<[]>;
     resolveBiteRollRisk: MoveFunction<[]>;

     initiateVoteExile: MoveFunction<[targetPlayerId: PlayerID]>;
     castVote: MoveFunction<[vote: 'yes' | 'no']>;
     cancelVote: MoveFunction<[]>;

     triggerPendingEffect: MoveFunction<[effectDescription: string]>;
     resolveTriggerEffect: MoveFunction<[choice: string]>;
}

export type { GamePhase, GamePhaseType } from "../state/GamePhase.js";