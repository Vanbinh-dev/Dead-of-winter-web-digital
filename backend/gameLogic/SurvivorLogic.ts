import type { MoveContext } from "./Action.js";
import type { LocationID } from "../state/Location.js";
import type { ItemID, SurvivorID } from "../state/Card.js";
import type { WoundType } from "../state/Survivor.js";
import type { PassiveEffectTag } from "../state/Effect.js";
import { INVALID_MOVE } from "boardgame.io/core";
import { SURVIVOR_CATALOG } from "../gameSetup/GameSetup.js";
import { changeMorale } from "./GameScaleLogic.js";
import { putCardToDeck, addCardToHand } from "./DeckLogic.js";

export function hasSurvivorPassive(survivorId: SurvivorID, tag: PassiveEffectTag): boolean {
    const info = SURVIVOR_CATALOG[survivorId];
    if (!info || !info.skill || !info.skill.passiveEffect) return false;
    return info.skill.passiveEffect.some((p: any) => {
        if (typeof p === 'string') return p === tag;
        return typeof p === 'object' && p !== null && 'type' in p && p.type === tag;
    });
}

export const moveSurvivor = ({ G }: MoveContext, survivorId: SurvivorID, to: LocationID | 'colony') => {
    const survivor = G.public.survivorInfo[survivorId];
    if (!survivor || survivor.location === to) return INVALID_MOVE;

    // Kiểm tra sức chứa tại vị trí đích
    if (to === 'colony') {
        if (G.public.colony.survivor + G.public.colony.helpless >= G.public.colony.maxSurvivor) {
            return INVALID_MOVE; // Colony đầy
        }
    } else {
        const targetLoc = G.public.location[to];
        if (!targetLoc || targetLoc.survivorNumber >= targetLoc.maxSurvivorNumber) {
            return INVALID_MOVE; // Địa điểm ngoài đã đủ số survivor tối đa
        }
    }

    // Giảm số lượng ở vị trí cũ
    if (survivor.location === 'colony') {
        G.public.colony.survivor = Math.max(0, G.public.colony.survivor - 1);
    } else {
        const oldLoc = G.public.location[survivor.location];
        if (oldLoc) oldLoc.survivorNumber = Math.max(0, oldLoc.survivorNumber - 1);
    }

    // Tăng số lượng ở vị trí mới
    survivor.location = to;
    if (to === 'colony') {
        G.public.colony.survivor++;
    } else {
        const newLoc = G.public.location[to];
        if (newLoc) newLoc.survivorNumber++;
    }
};

/**
 * Đặt Survivor lên bàn chơi (Spawn).
 * LƯU Ý: Đây là hành động nguyên tử thuần túy để đưa survivor vào map & gán cho player.
 * KHÔNG tự ý can thiệp vào Morale.
 */
export const spawnSurvivor = ({ G }: MoveContext, survivorId: SurvivorID, playerId: string, atLoc: LocationID | 'colony') => {
    const player = G.public.players[playerId];
    if (!player) return INVALID_MOVE;

    // Kiểm tra sức chứa vị trí
    if (atLoc === 'colony') {
        if (G.public.colony.survivor + G.public.colony.helpless >= G.public.colony.maxSurvivor) {
            return INVALID_MOVE;
        }
    } else {
        const targetLoc = G.public.location[atLoc];
        if (!targetLoc || targetLoc.survivorNumber >= targetLoc.maxSurvivorNumber) {
            return INVALID_MOVE;
        }
    }

    if (!player.survivorList.includes(survivorId)) {
        player.survivorList.push(survivorId);
    }

    G.public.survivorInfo[survivorId] = {
        location: atLoc,
        belongPlayer: playerId,
        wound: [],
        hasMoved: false,
        equippedItems: []
    };

    if (atLoc === 'colony') {
        G.public.colony.survivor++;
    } else {
        const loc = G.public.location[atLoc];
        if (loc) loc.survivorNumber++;
    }
};

export const removeSurvivor = ({ G }: MoveContext, survivorId: SurvivorID) => {
    const survivor = G.public.survivorInfo[survivorId];
    if (!survivor) return INVALID_MOVE;

    if (survivor.location === 'colony') {
        G.public.colony.survivor = Math.max(0, G.public.colony.survivor - 1);
    } else {
        const loc = G.public.location[survivor.location];
        if (loc) loc.survivorNumber = Math.max(0, loc.survivorNumber - 1);
    }

    const player = G.public.players[survivor.belongPlayer];
    if (player) {
        const idx = player.survivorList.indexOf(survivorId);
        if (idx !== -1) player.survivorList.splice(idx, 1);
    }

    delete G.public.survivorInfo[survivorId];
};

export const markAsMoved = ({ G }: MoveContext, survivorId: SurvivorID) => {
    const survivor = G.public.survivorInfo[survivorId];
    if (!survivor) return INVALID_MOVE;
    survivor.hasMoved = true;
};

export const markAsNotMoved = ({ G }: MoveContext, survivorId: SurvivorID) => {
    const survivor = G.public.survivorInfo[survivorId];
    if (!survivor) return INVALID_MOVE;
    survivor.hasMoved = false;
};

export function handleSurvivorDeath(context: MoveContext, survivorId: SurvivorID): void {
    const { G } = context;
    const survivor = G.public.survivorInfo[survivorId];
    if (!survivor) return;

    const belongPlayer = survivor.belongPlayer;
    const loc = survivor.location;
    const player = G.public.players[belongPlayer];

    // 1. Giảm Morale nếu người chơi không bị Exile
    if (!player?.isExiled) {
        changeMorale(context, -1);
    }

    // 2. Chuyển thẻ bài nhân vật sang removedSurvivor deck
    putCardToDeck(context, 'removedSurvivor', [survivorId], 'top');

    // 3. Rơi trang bị: Colony -> về tay người chơi; Ngoài Colony -> shuffle vào cọc bài địa điểm đó
    if (survivor.equippedItems && survivor.equippedItems.length > 0) {
        const items = [...survivor.equippedItems];
        if (loc === 'colony') {
            addCardToHand(context, belongPlayer, items);
        } else {
            putCardToDeck(context, loc, items, 'shuffle');
        }
    }

    // 4. Gỡ survivor khỏi board
    removeSurvivor(context, survivorId);

    // 5. Kiểm tra luật Survivor cuối cùng chết (GAME_RULE.md dòng 170-172)
    if (player && player.survivorList.length === 0) {
        // Mất toàn bộ bài trên tay khỏi game
        const privPl = G.private.players[belongPlayer];
        if (privPl && privPl.hand.length > 0) {
            putCardToDeck(context, 'removedItem', [...privPl.hand], 'bottom');
            privPl.hand = [];
            player.handSize = 0;
        }

        // Rút 1 survivor mới từ survivorDeck
        if (G.private.survivorDeck.cards.length > 0) {
            const newSurvivorId = G.private.survivorDeck.cards.shift()!;
            player.groupLeader = newSurvivorId;
            G.public.pending = {
                type: 'selectNewSurvivorPlacement',
                playerId: belongPlayer,
                newSurvivorId,
                confirmedBy: []
            };
            G.public.previousLog = {
                player: belongPlayer,
                playerName: player.playerName,
                reason: "Last Survivor Killed",
                description: `${SURVIVOR_CATALOG[survivorId]?.name || survivorId} was last survivor! Hand cards removed. Drew new survivor: ${SURVIVOR_CATALOG[newSurvivorId]?.name || newSurvivorId}. Location selection pending.`
            };
        }
    } else if (player && player.groupLeader === survivorId) {
        // 6. Nếu leader chết nhưng vẫn còn survivor khác
        G.public.pending = {
            type: 'chooseNewLeader',
            playerId: belongPlayer,
            confirmedBy: []
        };
    }
}

export const receiveWound = (context: MoveContext, survivorId: SurvivorID, wound: WoundType) => {
    const { G } = context;
    const survivor = G.public.survivorInfo[survivorId];
    if (!survivor) return INVALID_MOVE;

    let woundToAdd = wound;
    if (wound === 'frostbite' && hasSurvivorPassive(survivorId, 'CHANGE_FROSTBITE_TO_WOUND')) {
        woundToAdd = 'wound';
    }
    survivor.wound.push(woundToAdd);

    const maxHp = SURVIVOR_CATALOG[survivorId]?.hp ?? 3;
    if (survivor.wound.length >= maxHp) {
        handleSurvivorDeath(context, survivorId);
    }
};

export const removeWound = ({ G }: MoveContext, survivorId: SurvivorID, wound: WoundType, amount: number) => {
    const survivor = G.public.survivorInfo[survivorId];
    if (!survivor || amount <= 0) return INVALID_MOVE;
    let removed = 0;
    for (let i = survivor.wound.length - 1; i >= 0 && removed < amount; i--) {
        if (survivor.wound[i] === wound) {
            survivor.wound.splice(i, 1);
            removed++;
        }
    }
};

export const removeAllWound = ({ G }: MoveContext, survivorId: SurvivorID) => {
    const survivor = G.public.survivorInfo[survivorId];
    if (!survivor) return INVALID_MOVE;
    survivor.wound = [];
};

export const equipCard = ({ G }: MoveContext, survivorId: SurvivorID, itemCard: ItemID) => {
    const survivor = G.public.survivorInfo[survivorId];
    if (!survivor) return INVALID_MOVE;
    if (!survivor.equippedItems) survivor.equippedItems = [];
    survivor.equippedItems.push(itemCard);

    const privPl = G.private.players[survivor.belongPlayer];
    if (privPl) {
        const idx = privPl.hand.indexOf(itemCard);
        if (idx !== -1) privPl.hand.splice(idx, 1);
        const pubPl = G.public.players[survivor.belongPlayer];
        if (pubPl) pubPl.handSize = privPl.hand.length;
    }
};

export const unequipCard = ({ G }: MoveContext, survivorId: SurvivorID, itemCard: ItemID, returnToPlayerId?: string) => {
    const survivor = G.public.survivorInfo[survivorId];
    if (!survivor || !survivor.equippedItems) return INVALID_MOVE;
    const idx = survivor.equippedItems.indexOf(itemCard);
    if (idx !== -1) survivor.equippedItems.splice(idx, 1);

    const targetPlayer = returnToPlayerId || survivor.belongPlayer;
    const privPl = G.private.players[targetPlayer];
    if (privPl) {
        privPl.hand.push(itemCard);
        const pubPl = G.public.players[targetPlayer];
        if (pubPl) pubPl.handSize = privPl.hand.length;
    }
};

export const transferEquip = ({ G }: MoveContext, fromSurvivorId: SurvivorID, toSurvivorId: SurvivorID, equip: ItemID) => {
    const s1 = G.public.survivorInfo[fromSurvivorId];
    const s2 = G.public.survivorInfo[toSurvivorId];
    if (!s1 || !s2 || !s1.equippedItems) return INVALID_MOVE;
    const idx = s1.equippedItems.indexOf(equip);
    if (idx === -1) return INVALID_MOVE;
    s1.equippedItems.splice(idx, 1);
    if (!s2.equippedItems) s2.equippedItems = [];
    s2.equippedItems.push(equip);
};

export const killHelplessSurvivor = ({ G }: MoveContext, amount: number) => {
    if (amount <= 0 || G.public.colony.helpless <= 0) return INVALID_MOVE;
    const killed = Math.min(amount, G.public.colony.helpless);
    G.public.colony.helpless -= killed;
    G.public.morale = Math.max(0, G.public.morale - killed);
};

