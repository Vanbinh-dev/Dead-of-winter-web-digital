import type { MoveContext } from "./Action.js";
import type { LocationID } from "../state/Location.js";
import type { ItemID, SurvivorID } from "../state/Card.js";
import type { WoundType } from "../state/Survivor.js";
import { INVALID_MOVE } from "boardgame.io/core";

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
 * KHÔNG tự ý can thiệp vào Morale (Morale do GameAction/người chơi điều khiển riêng).
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

/**
 * Gỡ hoàn toàn Survivor khỏi bàn chơi (board) và danh sách của Player (nguyên tử)
 */
export const removeSurvivor = ({ G }: MoveContext, survivorId: SurvivorID) => {
    const survivor = G.public.survivorInfo[survivorId];
    if (!survivor) return INVALID_MOVE;

    // Giảm số đếm vị trí
    if (survivor.location === 'colony') {
        G.public.colony.survivor = Math.max(0, G.public.colony.survivor - 1);
    } else {
        const loc = G.public.location[survivor.location];
        if (loc) loc.survivorNumber = Math.max(0, loc.survivorNumber - 1);
    }

    // Xóa khỏi danh sách player
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

export const receiveWound = ({ G }: MoveContext, survivorId: SurvivorID, wound: WoundType) => {
    const survivor = G.public.survivorInfo[survivorId];
    if (!survivor) return INVALID_MOVE;
    survivor.wound.push(wound);
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
