import { INVALID_MOVE } from "boardgame.io/core";
import type { CardID, ItemID } from "../state/Card.js";
import type { GameState } from "../state/GameState.js";
import type { LocationID } from "../state/Location.js";
import type { DeckID, MoveContext } from "./Action.js";

/**
 * Trợ giúp truy xuất Deck từ GameState theo DeckID
 */
export function getDeck(G: GameState, deckId: DeckID): { cards: CardID[]; reveal: CardID[] } | null {
    const priv = G.private;
    const pub = G.public;

    switch (deckId) {
        case 'survivor':
            return priv.survivorDeck;
        case 'starterItem':
            return priv.starterItemDeck;
        case 'crisis':
            return priv.crisisDeck;
        case 'crossroad':
            return priv.crossroadDeck;
        case 'mainObjective':
            return priv.mainObjectiveDeck;
        case 'secretObjective':
            return priv.secretObjective;
        case 'exile':
            return priv.exileObjective;
        case 'crisisContribution':
            return priv.crisisContribution;
        case 'waste':
            return { cards: pub.colony.waste, reveal: [] };
        case 'removedSurvivor':
            return { cards: pub.removeSurvivor, reveal: [] };
        case 'removedItem':
            return { cards: pub.removeItemCard, reveal: [] };
        default:
            if (priv.location[deckId as LocationID]) {
                return priv.location[deckId as LocationID];
            }
            return null;
    }
}

/**
 * Kiểm tra xem thẻ bài có tồn tại trong Deck (cards hoặc reveal) hay không
 */
export function isExisted(G: GameState, card: CardID, deckId: DeckID): boolean {
    const deck = getDeck(G, deckId);
    if (!deck) return false;
    return deck.cards.includes(card) || deck.reveal.includes(card);
}

/**
 * Đếm số lượng thẻ bài trùng ID trong Deck (hỗ trợ trường hợp nhiều lá chung ID)
 */
export function getCardCountInDeck(G: GameState, card: CardID, deckId: DeckID): { total: number; inCards: number; inReveal: number } {
    const deck = getDeck(G, deckId);
    if (!deck) return { total: 0, inCards: 0, inReveal: 0 };
    const inCards = deck.cards.filter(c => c === card).length;
    const inReveal = deck.reveal.filter(c => c === card).length;
    return {
        total: inCards + inReveal,
        inCards,
        inReveal
    };
}

export const draw = (context: MoveContext, deckId: DeckID, toPlayerId?: string) => {
    const { G, playerID } = context;
    const deck = getDeck(G, deckId);
    if (!deck) return INVALID_MOVE;

    // Nếu một lá bài được reveal (lật trên đầu deck), lá được rút đầu tiên PHẢI là lá reveal
    let card: CardID | undefined;
    if (deck.reveal.length > 0) {
        card = deck.reveal.shift();
    } else if (deck.cards.length > 0) {
        card = deck.cards.shift();
    }

    if (!card) return INVALID_MOVE;

    const targetId = toPlayerId ?? playerID ?? G.public.currentPlayerID;
    if (targetId) {
        const privPl = G.private.players[targetId];
        const pubPl = G.public.players[targetId];
        if (privPl) privPl.hand.push(card);
        if (pubPl) pubPl.handSize = privPl ? privPl.hand.length : pubPl.handSize + 1;
    }
};

export const removeCardFromDeck = ({ G }: MoveContext, deckId: DeckID, cards: CardID[]) => {
    const deck = getDeck(G, deckId);
    if (!deck) return INVALID_MOVE;

    for (const card of cards) {
        const idx = deck.cards.indexOf(card);
        const revIdx = deck.reveal.indexOf(card);
        if (idx === -1 && revIdx === -1) {
            return INVALID_MOVE;
        }
    }

    cards.forEach(card => {
        const idx = deck.cards.indexOf(card);
        if (idx !== -1) deck.cards.splice(idx, 1);
        else {
            const revIdx = deck.reveal.indexOf(card);
            if (revIdx !== -1) deck.reveal.splice(revIdx, 1);
        }
    });
};

export const putCardToDeck = ({ G, random }: MoveContext, deckId: DeckID, cards: CardID[], pos: 'bottom' | 'top' | 'shuffle', fromPlayerId?: string) => {
    const deck = getDeck(G, deckId);
    if (!deck || cards.length === 0) return INVALID_MOVE;

    if (fromPlayerId) {
        const privPl = G.private.players[fromPlayerId];
        if (!privPl) return INVALID_MOVE;
        for (const card of cards) {
            if (!privPl.hand.includes(card)) {
                return INVALID_MOVE;
            }
        }
        cards.forEach(card => {
            const idx = privPl.hand.indexOf(card);
            if (idx !== -1) privPl.hand.splice(idx, 1);
        });
        const pubPl = G.public.players[fromPlayerId];
        if (pubPl) pubPl.handSize = privPl.hand.length;
    }

    if (pos === 'top') {
        deck.cards.unshift(...cards);
    } else if (pos === 'bottom') {
        deck.cards.push(...cards);
    } else {
        deck.cards.push(...cards);
        const shuffled = random ? random.Shuffle(deck.cards) : [...deck.cards].sort(() => Math.random() - 0.5);
        deck.cards.splice(0, deck.cards.length, ...shuffled);
    }
};

export const shuffleDeck = ({ G, random }: MoveContext, deckId: DeckID) => {
    const deck = getDeck(G, deckId);
    if (!deck) return INVALID_MOVE;
    const shuffled = random ? random.Shuffle(deck.cards) : [...deck.cards].sort(() => Math.random() - 0.5);
    deck.cards.splice(0, deck.cards.length, ...shuffled);
};

export const reveal = ({ G }: MoveContext, deckId: DeckID, amount: number) => {
    const deck = getDeck(G, deckId);
    if (!deck || deck.cards.length === 0 || amount <= 0) return INVALID_MOVE;
    const count = Math.min(amount, deck.cards.length);
    const drawn = deck.cards.splice(0, count);
    deck.reveal.push(...drawn);
};

export const clearReveal = ({ G, random }: MoveContext, deckId: DeckID, returnPos: 'bottom' | 'top' | 'shuffle') => {
    const deck = getDeck(G, deckId);
    if (!deck || deck.reveal.length === 0) return;
    const cards = [...deck.reveal];
    deck.reveal = [];
    if (returnPos === 'top') {
        deck.cards.unshift(...cards);
    } else if (returnPos === 'bottom') {
        deck.cards.push(...cards);
    } else {
        deck.cards.push(...cards);
        const shuffled = random ? random.Shuffle(deck.cards) : [...deck.cards].sort(() => Math.random() - 0.5);
        deck.cards.splice(0, deck.cards.length, ...shuffled);
    }
};

export const takeCardFromReveal = (context: MoveContext, deckId: DeckID, cardId: CardID, toPlayerId?: string) => {
    const { G, playerID } = context;
    const deck = getDeck(G, deckId);
    if (!deck) return INVALID_MOVE;
    const idx = deck.reveal.indexOf(cardId);
    if (idx === -1) return INVALID_MOVE;
    const [card] = deck.reveal.splice(idx, 1);
    const targetId = toPlayerId ?? playerID ?? G.public.currentPlayerID;
    if (targetId && card) {
        const privPl = G.private.players[targetId];
        const pubPl = G.public.players[targetId];
        if (privPl) privPl.hand.push(card);
        if (pubPl) pubPl.handSize = privPl ? privPl.hand.length : pubPl.handSize + 1;
    }
};

export const takeCardFromDeck = (context: MoveContext, deckId: DeckID, cardId: CardID, toPlayerId?: string) => {
    const { G, playerID } = context;
    const deck = getDeck(G, deckId);
    if (!deck) return INVALID_MOVE;

    let card: CardID | undefined;
    const revIdx = deck.reveal.indexOf(cardId);
    if (revIdx !== -1) {
        [card] = deck.reveal.splice(revIdx, 1);
    } else {
        const idx = deck.cards.indexOf(cardId);
        if (idx !== -1) {
            [card] = deck.cards.splice(idx, 1);
        }
    }

    if (!card) return INVALID_MOVE;

    const targetId = toPlayerId ?? playerID ?? G.public.currentPlayerID;
    if (targetId) {
        const privPl = G.private.players[targetId];
        const pubPl = G.public.players[targetId];
        if (privPl) privPl.hand.push(card);
        if (pubPl) pubPl.handSize = privPl ? privPl.hand.length : pubPl.handSize + 1;
    }
};

export const moveCardBetweenDecks = ({ G, random }: MoveContext, fromDeck: DeckID, toDeck: DeckID, cards: CardID[], pos: 'bottom' | 'top' | 'shuffle' = 'bottom') => {
    const src = getDeck(G, fromDeck);
    const dest = getDeck(G, toDeck);
    if (!src || !dest || cards.length === 0) return INVALID_MOVE;

    for (const card of cards) {
        if (!src.cards.includes(card) && !src.reveal.includes(card)) {
            return INVALID_MOVE;
        }
    }

    cards.forEach(card => {
        const idx = src.cards.indexOf(card);
        if (idx !== -1) src.cards.splice(idx, 1);
        else {
            const revIdx = src.reveal.indexOf(card);
            if (revIdx !== -1) src.reveal.splice(revIdx, 1);
        }
    });

    if (pos === 'top') {
        dest.cards.unshift(...cards);
    } else if (pos === 'bottom') {
        dest.cards.push(...cards);
    } else {
        dest.cards.push(...cards);
        if (random) dest.cards = random.Shuffle(dest.cards);
    }
};

export const addCardToHand = ({ G }: MoveContext, playerId: string, cards: ItemID[]) => {
    const privPl = G.private.players[playerId];
    const pubPl = G.public.players[playerId];
    if (!privPl || !pubPl || cards.length === 0) return INVALID_MOVE;
    privPl.hand.push(...cards);
    pubPl.handSize = privPl.hand.length;
};

export const removeCardFromHand = ({ G }: MoveContext, playerId: string, cards: ItemID[]) => {
    const privPl = G.private.players[playerId];
    const pubPl = G.public.players[playerId];
    if (!privPl || !pubPl || cards.length === 0) return INVALID_MOVE;

    for (const card of cards) {
        if (!privPl.hand.includes(card)) {
            return INVALID_MOVE;
        }
    }

    cards.forEach(card => {
        const idx = privPl.hand.indexOf(card);
        if (idx !== -1) privPl.hand.splice(idx, 1);
    });
    pubPl.handSize = privPl.hand.length;
};

export const transferCardBetweenPlayers = ({ G }: MoveContext, fromPlayerId: string, toPlayerId: string, cardId: ItemID) => {
    const fromPriv = G.private.players[fromPlayerId];
    const toPriv = G.private.players[toPlayerId];
    if (!fromPriv || !toPriv) return INVALID_MOVE;
    const idx = fromPriv.hand.indexOf(cardId);
    if (idx === -1) return INVALID_MOVE;
    fromPriv.hand.splice(idx, 1);
    toPriv.hand.push(cardId);
    const fromPub = G.public.players[fromPlayerId];
    const toPub = G.public.players[toPlayerId];
    if (fromPub) fromPub.handSize = fromPriv.hand.length;
    if (toPub) toPub.handSize = toPriv.hand.length;
};

export const addCardToWaste = ({ G }: MoveContext, cards: ItemID[]) => {
    G.public.colony.waste.push(...cards);
};

export const removeCardFromWaste = ({ G }: MoveContext, cards: ItemID[]) => {
    for (const card of cards) {
        if (!G.public.colony.waste.includes(card)) return INVALID_MOVE;
    }
    cards.forEach(card => {
        const idx = G.public.colony.waste.indexOf(card);
        if (idx !== -1) G.public.colony.waste.splice(idx, 1);
    });
};
