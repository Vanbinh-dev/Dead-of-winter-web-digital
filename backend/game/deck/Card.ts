import { INVALID_MOVE } from "boardgame.io/dist/types/packages/core.js";
import type { Effect, Condition } from "../gameLogic/Effect.js";
import type { DeckId, BasicReturnState } from "../gameLogic/engine/EffectEngine.js";
import type { G } from "../gameLogic/GameState.js";
import { NON_COLONY_LOCATIONS, type CardId, type LocationId, type PlayerId, type SurvivorId } from "../gameLogic/Type.js";
import type { SurvivorDef } from "../Survivor.js";

export type ItemSymbol =
    'survivor' |
    'fuel' |
    'food' |
    'weapon' |
    'tool' |
    'education' |
    'medicine';

export interface ItemCardDef {
    type: "item"; id: CardId; name: string;
    symbol: ItemSymbol; origin: LocationId | "starter";
    usage: "waste" | "remove";
    isEquip: boolean;
    effect: Effect;
}

export interface CrisisCardDef {
    type: "crisis"; id: CardId; name: string;
    prevent: ItemSymbol[];
    fail: Effect;
    optional: { extraCards: number; reward: Effect } | null;
}

export interface CrossroadsCardDef {
    type: "crossroads"; id: CardId; name: string;
    trigger: Condition[];
    options: { text: string; effect: Effect }[];
    mature: boolean; coopCompatible: boolean;
}

export interface MainObjectiveDef {
    type: "main-objective"; id: CardId; name: string;
    time: "short" | "medium" | "long";
    setup: Effect; goal: Condition[];
}

export interface SecretObjectiveDef {
    type: "secret-objective"; id: CardId; name: string;
    category: "standard" | "betrayal" | "exiled";
    goal: Condition[];
}

export type CardDef =
    | SurvivorDef | ItemCardDef | CrisisCardDef
    | CrossroadsCardDef | MainObjectiveDef | SecretObjectiveDef;

export interface CardDeck {
    deck: CardId[],
    revealCard: CardId[]
}

export interface ICardDeckOperations {
    shuffle(deck: CardDeck, randomSource?: () => number): CardDeck;
    revealCards(deck: CardDeck, count: number): CardDeck;
    drawCards(deck: CardDeck, count: number): { nextDeck: CardDeck; drawnCardIds: CardId[] };
    takeCardFromDeck(deck: CardDeck, cardId: CardId): { nextDeck: CardDeck; cardId: CardId | null };
    takeCardFromRevealed(deck: CardDeck, cardId: CardId): { nextDeck: CardDeck; cardId: CardId | null };
    putCardsOnBottom(deck: CardDeck, cardIds: CardId[]): CardDeck;
    returnRevealedToBottom(deck: CardDeck, cardIds?: CardId[]): CardDeck;
}

export const CardDeckOperations: ICardDeckOperations = {
    shuffle(cardDeck, randomSource = Math.random) {
        const nextDeck = [...cardDeck.deck];
        for (let i = nextDeck.length - 1; i > 0; i--) {
            const j = Math.floor(randomSource() * (i + 1));
            const temp = nextDeck[i]!
            nextDeck[i] = nextDeck[j]!
            nextDeck[j] = temp
        }
        return {
            ...cardDeck,
            deck: nextDeck,
        };
    },

    revealCards(cardDeck, count) {
        const availableCount = Math.min(count, cardDeck.deck.length);
        const revealedPortion = cardDeck.deck.slice(0, availableCount);
        const remainingDeck = cardDeck.deck.slice(availableCount);

        return {
            deck: remainingDeck,
            revealCard: [...cardDeck.revealCard, ...revealedPortion],
        };
    },

    drawCards(cardDeck, count) {
        const availableCount = Math.min(count, cardDeck.deck.length);
        const drawnCardIds = cardDeck.deck.slice(0, availableCount);
        const remainingDeck = cardDeck.deck.slice(availableCount);

        return {
            nextDeck: {
                ...cardDeck,
                deck: remainingDeck,
            },
            drawnCardIds,
        };
    },

    takeCardFromDeck(cardDeck, cardId) {
        const index = cardDeck.deck.indexOf(cardId);
        if (index === -1) {
            return { nextDeck: cardDeck, cardId: null };
        }

        const nextDeck = [...cardDeck.deck];
        nextDeck.splice(index, 1);

        return {
            nextDeck: {
                ...cardDeck,
                deck: nextDeck,
            },
            cardId,
        };
    },

    takeCardFromRevealed(cardDeck, cardId) {
        const index = cardDeck.revealCard.indexOf(cardId);
        if (index === -1) {
            return { nextDeck: cardDeck, cardId: null };
        }

        const nextRevealed = [...cardDeck.revealCard];
        nextRevealed.splice(index, 1);

        return {
            nextDeck: {
                ...cardDeck,
                revealCard: nextRevealed,
            },
            cardId,
        };
    },

    putCardsOnBottom(cardDeck: CardDeck, cardIds: CardId[]): CardDeck {
        return {
            ...cardDeck,
            deck: [...cardDeck.deck, ...cardIds],
        };
    },

    returnRevealedToBottom(cardDeck, cardIds: CardId[]) {
        const cardsToBottom = cardDeck.revealCard.filter(id => cardIds.includes(id));
        const remainingReveal = cardDeck.revealCard.filter(id => !cardIds.includes(id));
        return {
            deck: [...cardDeck.deck, ...cardsToBottom],
            revealCard: remainingReveal,
        };
    }
}

export interface ICardPrimitives {
    drawCard(G: G, deckId: DeckId, playerId: PlayerId, count: number): BasicReturnState;
    discardCard(G: G, playerId: PlayerId, cardId: CardId): BasicReturnState;
    removeCardFromGame(G: G, cardId: CardId, deckId: DeckId): BasicReturnState;
    insertCard(G: G, cardId: CardId, deckId: DeckId, position?: "TOP" | "BOTTOM" | "RANDOM"): BasicReturnState;
    equipCard(G: G, cardId: CardId, survivorId: SurvivorId): BasicReturnState;
    transferCard(G: G, cardId: CardId, fromPlayerId: PlayerId, toPlayerId: PlayerId): BasicReturnState;
    transferEquipment(
        G: G,
        fromPlayerId: PlayerId,
        toPlayerId: PlayerId,
        fromSurvivorId: SurvivorId,
        toSurvivorId: SurvivorId,
        cardId: CardId
    ): BasicReturnState;
    shuffleDeck(G: G, deckId: DeckId, seed?: number): BasicReturnState;
    addCardToDeck(G: G, deckId: DeckId, cards: CardId[]): BasicReturnState;
}

export function getDeck(G: G, deckId: DeckId): CardDeck | undefined {
    if (deckId === "crisis" || deckId === "crossroads" || deckId === "survivor" || deckId === "exile")
        return G.private.decks[deckId];
    if (deckId === "crisisContribution")
        return {
            deck: G.private.crisisContribution,
            revealCard: []
        }
    if (NON_COLONY_LOCATIONS.includes(deckId as LocationId))
        return G.private.searchDecks[deckId as LocationId];
    return undefined;
}

function setDeckById(state: G, deckId: DeckId, nextDeck: CardDeck): void {
    if (deckId === "crisis" || deckId === "crossroads" || deckId === "survivor" || deckId === "exile")
        state.private.decks[deckId] = nextDeck;
    else if (deckId === "crisisContribution")
        state.private.crisisContribution = nextDeck.deck;
    else if (NON_COLONY_LOCATIONS.includes(deckId as LocationId)) {
        state.private.searchDecks[deckId as LocationId] = nextDeck;
        state.public.locations[deckId as LocationId].searchDeckSize = nextDeck.deck.length;
    }
}

export const CardPrimitives: ICardPrimitives = {
    drawCard(state: G, deckId: DeckId, playerId: PlayerId, count: number): BasicReturnState {
        const currentDeck = getDeck(state, deckId);
        const privatePlayer = state.private.players[playerId];
        const publicPlayer = state.public.players[playerId];

        if (!currentDeck || !privatePlayer || !publicPlayer || count <= 0)
            return INVALID_MOVE;

        const { nextDeck, drawnCardIds } = CardDeckOperations.drawCards(currentDeck, count);
        if (drawnCardIds.length === 0)
            return INVALID_MOVE;

        setDeckById(state, deckId, nextDeck);
        privatePlayer.hand.push(...drawnCardIds);
        publicPlayer.handSize = privatePlayer.hand.length;
    },

    discardCard(state: G, playerId: PlayerId, cardId: CardId): BasicReturnState {
        const privatePlayer = state.private.players[playerId];
        const publicPlayer = state.public.players[playerId];

        if (!privatePlayer || !publicPlayer)
            return INVALID_MOVE;

        const cardIndex = privatePlayer.hand.indexOf(cardId);
        if (cardIndex === -1)
            return INVALID_MOVE;

        privatePlayer.hand.splice(cardIndex, 1);
        publicPlayer.handSize = privatePlayer.hand.length;
        state.public.colony.wastePile += 1;
    },

    removeCardFromGame(state: G, cardId: CardId, deckId: DeckId): BasicReturnState {
        const currentDeck = getDeck(state, deckId);
        if (!currentDeck)
            return INVALID_MOVE;

        const fromDeckResult = CardDeckOperations.takeCardFromDeck(currentDeck, cardId);
        if (fromDeckResult.cardId !== null) {
            setDeckById(state, deckId, fromDeckResult.nextDeck);
            return;
        }

        const fromRevealedResult = CardDeckOperations.takeCardFromRevealed(currentDeck, cardId);
        if (fromRevealedResult.cardId !== null) {
            setDeckById(state, deckId, fromRevealedResult.nextDeck);
            return;
        }

        return INVALID_MOVE;
    },

    insertCard(
        state: G,
        cardId: CardId,
        deckId: DeckId,
        position: "TOP" | "BOTTOM" | "RANDOM" = "BOTTOM"
    ): BasicReturnState {
        const currentDeck = getDeck(state, deckId);
        if (!currentDeck)
            return INVALID_MOVE;

        let nextDeck: CardDeck;

        if (position === "BOTTOM")
            nextDeck = CardDeckOperations.putCardsOnBottom(currentDeck, [cardId]);
        else if (position === "TOP")
            nextDeck = { ...currentDeck, deck: [cardId, ...currentDeck.deck] };
        else {
            nextDeck = CardDeckOperations.putCardsOnBottom(currentDeck, [cardId]);
            nextDeck = CardDeckOperations.shuffle(nextDeck);
        }

        setDeckById(state, deckId, nextDeck);
    },

    equipCard(state: G, cardId: CardId, survivorId: SurvivorId): BasicReturnState {
        const survivor = state.public.survivors[survivorId];
        if (!survivor)
            return INVALID_MOVE;

        const privatePlayer = state.private.players[survivor.owner];
        const publicPlayer = state.public.players[survivor.owner];
        if (!privatePlayer || !publicPlayer)
            return INVALID_MOVE;

        const handIndex = privatePlayer.hand.indexOf(cardId);
        if (handIndex === -1)
            return INVALID_MOVE;

        privatePlayer.hand.splice(handIndex, 1);
        publicPlayer.handSize = privatePlayer.hand.length;
        survivor.equipment.push(cardId);
    },

    transferCard(state: G, cardId: CardId, fromPlayerId: PlayerId, toPlayerId: PlayerId): BasicReturnState {
        const fromPrivate = state.private.players[fromPlayerId];
        const toPrivate = state.private.players[toPlayerId];
        const fromPublic = state.public.players[fromPlayerId];
        const toPublic = state.public.players[toPlayerId];

        if (!fromPrivate || !toPrivate || !fromPublic || !toPublic)
            return INVALID_MOVE;

        const cardIndex = fromPrivate.hand.indexOf(cardId);
        if (cardIndex === -1)
            return INVALID_MOVE;

        fromPrivate.hand.splice(cardIndex, 1);
        toPrivate.hand.push(cardId);

        fromPublic.handSize = fromPrivate.hand.length;
        toPublic.handSize = toPrivate.hand.length;
    },

    transferEquipment(
        state: G,
        fromPlayerId: PlayerId,
        toPlayerId: PlayerId,
        fromSurvivorId: SurvivorId,
        toSurvivorId: SurvivorId,
        cardId: CardId
    ): BasicReturnState {
        const fromSurvivor = state.public.survivors[fromSurvivorId];
        const toSurvivor = state.public.survivors[toSurvivorId];

        if (!fromSurvivor || !toSurvivor)
            return INVALID_MOVE;

        if (fromSurvivor.owner !== fromPlayerId || toSurvivor.owner !== toPlayerId)
            return INVALID_MOVE;

        if (fromSurvivor.location !== toSurvivor.location)
            return INVALID_MOVE;

        const equipIndex = fromSurvivor.equipment.indexOf(cardId);
        if (equipIndex === -1)
            return INVALID_MOVE;

        fromSurvivor.equipment.splice(equipIndex, 1);
        toSurvivor.equipment.push(cardId);
    },

    shuffleDeck(state: G, deckId: DeckId, seed?: number): BasicReturnState {
        const currentDeck = getDeck(state, deckId);
        if (!currentDeck)
            return INVALID_MOVE;

        let randomSource: (() => number) | undefined = undefined;
        const nextDeck = CardDeckOperations.shuffle(currentDeck);
        setDeckById(state, deckId, nextDeck);
    },

    addCardToDeck(state: G, deckId: DeckId, cards: CardId[]): BasicReturnState {
        const currentDeck = getDeck(state, deckId);
        if (!currentDeck || cards.length === 0)
            return INVALID_MOVE;

        const nextDeck = CardDeckOperations.putCardsOnBottom(currentDeck, cards);
        setDeckById(state, deckId, nextDeck);
    },
};