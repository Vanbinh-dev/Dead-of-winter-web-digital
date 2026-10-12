import type { MoveContext } from "./Action.js";
import type { LocationID } from "../state/Location.js";
import type { ItemID, SurvivorID } from "../state/Card.js";
import { INVALID_MOVE } from "boardgame.io/core";
import { SURVIVOR_CATALOG } from "../gameSetup/GameSetup.js";

// TÁI SỬ DỤNG TRỰC TIẾP TỪ CÁC HÀNH ĐỘNG NGUYÊN TỬ:
import {
    spendActionDice,
    changeActionDie,
    rollExposureDice
} from "./DiceLogic.js";

import {
    moveSurvivor,
    markAsMoved,
    equipCard,
    transferEquip,
    receiveWound
} from "./SurvivorLogic.js";

import {
    draw,
    addCardToWaste,
    removeCardFromHand,
    removeCardFromWaste,
    putCardToDeck,
    addCardToHand,
    transferCardBetweenPlayers
} from "./DeckLogic.js";

import {
    removeFood,
    removeZombieAtColony,
    removeZombieAtLocation,
    buildBarricadeAtColony,
    buildBarricadeAtLocation,
    spawnZombieAtColony,
    spawnZombieAtLocation,
    addNoise
} from "./LocationLogic.js";

import {
    applyExposureResult
} from "./GameScaleLogic.js";

/**
 * Trợ giúp thực hiện đổ và áp dụng xúc xắc Exposure cho survivor:
 * Tái sử dụng rollExposureDice + applyExposureResult nguyên tử.
 */
function performExposureRollForSurvivor(context: MoveContext, survivorId: SurvivorID): void {
    const { random } = context;
    // 12 mặt: 6 blank, 3 wound, 2 frostbite, 1 bite
    const roll = random ? random.Die(12) : Math.floor(Math.random() * 12) + 1;
    let result: 'blank' | 'wound' | 'frostbite' | 'bite' = 'blank';
    if (roll >= 1 && roll <= 6) result = 'blank';
    else if (roll >= 7 && roll <= 9) result = 'wound';
    else if (roll >= 10 && roll <= 11) result = 'frostbite';
    else result = 'bite';

    // Cập nhật log
    context.G.public.previousLog = {
        player: context.G.public.currentPlayerID,
        playerName: context.G.public.players[context.G.public.currentPlayerID]?.playerName || "Player",
        reason: "Exposure Roll",
        description: `${SURVIVOR_CATALOG[survivorId]?.name || survivorId} rolled: ${result.toUpperCase()} (die: ${roll})`
    };

    // Áp dụng kết quả qua atomic move
    applyExposureResult(context, survivorId, result);
}

// ============================================================================
// I. CÁC HÀNH ĐỘNG MIỄN PHÍ CỦA PLAYER (TÁI CHẾ TỪ ATOMIC MOVES)
// ============================================================================

/**
 * 1. Di chuyển Survivor:
 * - Kiểm tra điều kiện: người chơi sở hữu, survivor chưa di chuyển trong turn (!hasMoved).
 * - Tái sử dụng:
 *   + moveSurvivor(...)
 *   + markAsMoved(...)
 *   + removeCardFromHand + addCardToWaste (nếu dùng Fuel)
 *   + applyExposureResult (nếu không dùng Fuel và không phải Sparky)
 */
export const playerMoveSurvivor = (
    context: MoveContext,
    survivorId: SurvivorID,
    to: LocationID | 'colony',
    useFuelCardId?: ItemID
) => {
    const { G, playerID } = context;
    const actorId = playerID ?? G.public.currentPlayerID;
    const survivor = G.public.survivorInfo[survivorId];

    // Kiểm tra quyền điều khiển & lượt di chuyển
    if (!survivor || survivor.belongPlayer !== actorId || survivor.hasMoved) {
        return INVALID_MOVE;
    }

    // 1. Tái sử dụng atomic moveSurvivor (đã có kiểm tra sức chứa địa điểm đích)
    const moveRes = moveSurvivor(context, survivorId, to);
    if (moveRes === INVALID_MOVE) return INVALID_MOVE;

    // 2. Tái sử dụng atomic markAsMoved
    markAsMoved(context, survivorId);

    // 3. Xử lý Thẻ Fuel (nếu có dùng để né Exposure)
    let usedFuel = false;
    if (useFuelCardId) {
        const privPl = G.private.players[actorId];
        if (privPl && privPl.hand.includes(useFuelCardId)) {
            removeCardFromHand(context, actorId, [useFuelCardId]);
            addCardToWaste(context, [useFuelCardId]);
            usedFuel = true;
        }
    }

    // 4. Đổ xúc xắc mạo hiểm Exposure nếu không dùng fuel (và không phải Sparky)
    if (!usedFuel && survivorId !== 'sparky') {
        performExposureRollForSurvivor(context, survivorId);
    }
};

/**
 * 2. Tiêu thụ Food Token để tăng Action Die:
 * - Tái sử dụng:
 *   + removeFood(...)
 *   + changeActionDie(...)
 */
export const playerSpendFoodToken = (
    context: MoveContext,
    dieIndex: number
) => {
    const { G, playerID } = context;
    const actorId = playerID ?? G.public.currentPlayerID;
    const player = G.public.players[actorId];

    if (!player || G.public.colony.food <= 0) return INVALID_MOVE;
    const currentVal = player.die.unused[dieIndex];
    if (currentVal === undefined || currentVal >= 6) return INVALID_MOVE;

    // Tái sử dụng atomic removeFood & changeActionDie
    removeFood(context, 1);
    changeActionDie(context, actorId, dieIndex, currentVal + 1);
};

/**
 * 3. Chơi thẻ bài từ tay (Play Card):
 * - Tái sử dụng:
 *   + equipCard(...) nếu là trang bị
 *   + removeCardFromHand(...) + addCardToWaste(...) nếu là thẻ thông thường
 */
export const playerPlayCard = (
    context: MoveContext,
    cardId: ItemID,
    equipTargetSurvivorId?: SurvivorID
) => {
    const { G, playerID } = context;
    const actorId = playerID ?? G.public.currentPlayerID;
    const privPl = G.private.players[actorId];

    if (!privPl || !privPl.hand.includes(cardId)) return INVALID_MOVE;

    const itemDef = SURVIVOR_CATALOG[cardId] as any; // hoặc catalog
    const isEquip = equipTargetSurvivorId !== undefined;

    if (isEquip) {
        // Tái sử dụng atomic equipCard (hàm này đã tự gỡ bài khỏi tay và đưa vào survivor)
        return equipCard(context, equipTargetSurvivorId, cardId);
    } else {
        // Tái sử dụng atomic removeCardFromHand + addCardToWaste
        const remRes = removeCardFromHand(context, actorId, [cardId]);
        if (remRes === INVALID_MOVE) return INVALID_MOVE;
        addCardToWaste(context, [cardId]);
    }
};

/**
 * 4. Đóng góp bài vào Crisis (Contribute to Crisis):
 * - Tái sử dụng:
 *   + removeCardFromHand(...)
 *   + putCardToDeck('crisisContribution', cards, 'bottom')
 */
export const playerContributeToCrisis = (
    context: MoveContext,
    cards: ItemID[]
) => {
    const { playerID, G } = context;
    const actorId = playerID ?? G.public.currentPlayerID;

    // Tái sử dụng atomic removeCardFromHand + putCardToDeck
    const remRes = removeCardFromHand(context, actorId, cards);
    if (remRes === INVALID_MOVE) return INVALID_MOVE;
    putCardToDeck(context, 'crisisContribution', cards, 'bottom');
};

/**
 * 5. Trao đổi trang bị giữa 2 survivor cùng vị trí (Hand off):
 * - Tái sử dụng atomic transferEquip(...)
 */
export const playerHandOff = (
    context: MoveContext,
    fromSurvivorId: SurvivorID,
    toSurvivorId: SurvivorID,
    itemId: ItemID
) => {
    const { G, playerID } = context;
    const actorId = playerID ?? G.public.currentPlayerID;
    const s1 = G.public.survivorInfo[fromSurvivorId];
    const s2 = G.public.survivorInfo[toSurvivorId];

    if (!s1 || !s2 || s1.belongPlayer !== actorId || s1.location !== s2.location) {
        return INVALID_MOVE;
    }

    // Tái sử dụng atomic transferEquip
    return transferEquip(context, fromSurvivorId, toSurvivorId, itemId);
};

// ============================================================================
// II. CÁC HÀNH ĐỘNG TỐN XÚC XẮC (TÁI CHẾ TỪ ATOMIC MOVES)
// ============================================================================

/**
 * 1. Tấn công (Attack):
 * - Tái sử dụng:
 *   + spendActionDice(...)
 *   + removeZombieAtColony(...) hoặc removeZombieAtLocation(...)
 *   + performExposureRollForSurvivor(...)
 */
export const playerAttackZombie = (
    context: MoveContext,
    survivorId: SurvivorID,
    dieIndex: number,
    colonyEntranceIndex?: number
) => {
    const { G, playerID } = context;
    const actorId = playerID ?? G.public.currentPlayerID;
    const survivor = G.public.survivorInfo[survivorId];

    if (!survivor || survivor.belongPlayer !== actorId) return INVALID_MOVE;

    const reqAttack = SURVIVOR_CATALOG[survivorId]?.powerIndex ?? 2;

    // 1. Tái sử dụng atomic spendActionDice (đã kiểm tra dieIndex và requireMin)
    const spendRes = spendActionDice(context, actorId, dieIndex, reqAttack);
    if (spendRes === INVALID_MOVE) return INVALID_MOVE;

    // 2. Tái sử dụng atomic removeZombie
    if (survivor.location === 'colony') {
        let entIdx = colonyEntranceIndex;
        if (!entIdx) {
            const foundIdx = G.public.colony.entrances.findIndex(e => e.zombie > 0);
            if (foundIdx === -1) return INVALID_MOVE; // Không có zombie nào ở Colony
            entIdx = foundIdx + 1;
        }
        const remZRes = removeZombieAtColony(context, entIdx, 1);
        if (remZRes === INVALID_MOVE) return INVALID_MOVE;
    } else {
        const remZRes = removeZombieAtLocation(context, survivor.location, 1);
        if (remZRes === INVALID_MOVE) return INVALID_MOVE;
    }

    // 3. Đổ xúc xắc exposure nếu không được miễn nhiễm (Mike Cho & Sparky miễn)
    if (survivorId !== 'mike_cho' && survivorId !== 'sparky') {
        performExposureRollForSurvivor(context, survivorId);
    }
};

/**
 * 2. Tìm kiếm (Search):
 * - Chi tiêu 1 xúc xắc >= search requirement của survivor.
 * - Rút 1 lá từ deck địa điểm vào reveal của địa điểm đó.
 * - Đặt pending = { type: 'drawFromReveal', ... } để người chơi chọn giữ bài hoặc make noise.
 */
export const playerSearch = (
    context: MoveContext,
    survivorId: SurvivorID,
    dieIndex: number
) => {
    const { G, playerID } = context;
    const actorId = playerID ?? G.public.currentPlayerID;
    const survivor = G.public.survivorInfo[survivorId];

    if (!survivor || survivor.belongPlayer !== actorId || survivor.location === 'colony') {
        return INVALID_MOVE; // Không search ở Colony
    }

    const reqSearch = SURVIVOR_CATALOG[survivorId]?.searchIndex ?? 4;

    // 1. Tái sử dụng atomic spendActionDice
    const spendRes = spendActionDice(context, actorId, dieIndex, reqSearch);
    if (spendRes === INVALID_MOVE) return INVALID_MOVE;

    const locDeck = G.private.location[survivor.location];
    if (!locDeck || locDeck.cards.length === 0) return INVALID_MOVE;

    // 2. Rút lá đầu tiên vào reveal
    const card = locDeck.cards.shift()!;
    locDeck.reveal.push(card);

    // 3. Đặt trạng thái pending
    G.public.pending = {
        type: 'drawFromReveal',
        playerId: actorId,
        card: [...locDeck.reveal],
        survivorId,
        location: survivor.location
    };

    G.public.previousLog = {
        player: actorId,
        playerName: G.public.players[actorId]?.playerName || "Player",
        reason: "Search Begun",
        description: `${SURVIVOR_CATALOG[survivorId]?.name || survivorId} searched at ${survivor.location}. Revealed 1 card. Decide to keep or make noise.`
    };
};

/**
 * 3. Xây rào chắn (Barricade):
 * - Tái sử dụng:
 *   + spendActionDice(actorId, dieIndex, 1)
 *   + buildBarricadeAtColony(...) hoặc buildBarricadeAtLocation(...)
 */
export const playerBarricade = (
    context: MoveContext,
    survivorId: SurvivorID,
    dieIndex: number,
    colonyEntranceIndex?: number
) => {
    const { G, playerID } = context;
    const actorId = playerID ?? G.public.currentPlayerID;
    const survivor = G.public.survivorInfo[survivorId];

    if (!survivor || survivor.belongPlayer !== actorId) return INVALID_MOVE;

    // 1. Tái sử dụng atomic spendActionDice (bất kỳ die nào, min 1)
    const spendRes = spendActionDice(context, actorId, dieIndex, 1);
    if (spendRes === INVALID_MOVE) return INVALID_MOVE;

    // 2. Tái sử dụng atomic buildBarricade (đã có kiểm tra giới hạn slot)
    if (survivor.location === 'colony') {
        let entIdx = colonyEntranceIndex;
        if (!entIdx) {
            const foundIdx = G.public.colony.entrances.findIndex(e => (e.barricade + e.zombie) < e.maxZombieCapacity);
            if (foundIdx === -1) return INVALID_MOVE;
            entIdx = foundIdx + 1;
        }
        return buildBarricadeAtColony(context, entIdx, 1);
    } else {
        return buildBarricadeAtLocation(context, survivor.location, 1);
    }
};

/**
 * 4. Dọn rác (Clean Waste):
 * - Tái sử dụng:
 *   + spendActionDice(actorId, dieIndex, 1)
 *   + removeCardFromWaste(cards)
 *   + putCardToDeck('removedItem', cards, 'bottom')
 */
export const playerCleanWaste = (
    context: MoveContext,
    dieIndex: number
) => {
    const { G, playerID } = context;
    const actorId = playerID ?? G.public.currentPlayerID;
    const player = G.public.players[actorId];

    if (!player) return INVALID_MOVE;

    // Bắt buộc phải có ít nhất 1 survivor ở Colony
    const hasAtColony = player.survivorList.some(sId => G.public.survivorInfo[sId]?.location === 'colony');
    if (!hasAtColony) return INVALID_MOVE;

    // 1. Tái sử dụng atomic spendActionDice
    const spendRes = spendActionDice(context, actorId, dieIndex, 1);
    if (spendRes === INVALID_MOVE) return INVALID_MOVE;

    // 2. Tái sử dụng atomic removeCardFromWaste & putCardToDeck('removedItem')
    const cardsToClean = G.public.colony.waste.slice(0, 3);
    if (cardsToClean.length > 0) {
        removeCardFromWaste(context, cardsToClean);
        putCardToDeck(context, 'removedItem', cardsToClean, 'bottom');
    }
};

/**
 * 5. Dụ Zombie (Attract):
 * - Tái sử dụng:
 *   + spendActionDice(actorId, dieIndex, 1)
 *   + removeZombieAtColony / removeZombieAtLocation (tại nguồn)
 *   + spawnZombieAtColony / spawnZombieAtLocation (tại đích - tự động chạy quy tắc triệt tiêu rào chắn & overrun!)
 */
export const playerAttractZombies = (
    context: MoveContext,
    survivorId: SurvivorID,
    dieIndex: number,
    fromLocations: { location: LocationID | 'colony'; entranceIndex?: number }[]
) => {
    const { G, playerID } = context;
    const actorId = playerID ?? G.public.currentPlayerID;
    const survivor = G.public.survivorInfo[survivorId];

    if (!survivor || survivor.belongPlayer !== actorId) return INVALID_MOVE;
    if (fromLocations.length === 0 || fromLocations.length > 2) return INVALID_MOVE;

    // 1. Tái sử dụng atomic spendActionDice
    const spendRes = spendActionDice(context, actorId, dieIndex, 1);
    if (spendRes === INVALID_MOVE) return INVALID_MOVE;

    // 2. Di chuyển từng zombie từ vị trí nguồn về vị trí của survivor
    for (const src of fromLocations) {
        let removed = false;
        if (src.location === 'colony') {
            const entIdx = src.entranceIndex ?? 1;
            const res = removeZombieAtColony(context, entIdx, 1);
            if (res !== INVALID_MOVE) removed = true;
        } else {
            const res = removeZombieAtLocation(context, src.location, 1);
            if (res !== INVALID_MOVE) removed = true;
        }

        if (removed) {
            // Tái sử dụng atomic spawnZombie (đã tích hợp sẵn triệt tiêu rào chắn / overrun!)
            if (survivor.location === 'colony') {
                spawnZombieAtColony(context, 1, 1);
            } else {
                spawnZombieAtLocation(context, survivor.location, 1);
            }
        }
    }
};

/**
 * 6. Tấn công Survivor khác (Attack another survivor):
 * - Dòng 146-152 GAME_RULE.md:
 * - Chọn survivor mình và survivor mục tiêu tại cùng vị trí.
 * - Chi tiêu 1 xúc xắc >= attack requirement của survivor mình.
 * - Đổ lại xúc xắc spent die: Nếu kết quả <= attack requirement của survivor bị tấn công:
 *   + Đặt 1 wound lên survivor bị tấn công.
 *   + Người tấn công rút ngẫu nhiên 1 lá từ tay người bị tấn công.
 * - Không đổ xúc xắc Exposure.
 */
export const playerAttackSurvivor = (
    context: MoveContext,
    attackerSurvivorId: SurvivorID,
    targetSurvivorId: SurvivorID,
    dieIndex: number
) => {
    const { G, playerID, random } = context;
    const actorId = playerID ?? G.public.currentPlayerID;
    const attacker = G.public.survivorInfo[attackerSurvivorId];
    const target = G.public.survivorInfo[targetSurvivorId];

    if (!attacker || !target || attacker.belongPlayer !== actorId) return INVALID_MOVE;
    if (attacker.location !== target.location) return INVALID_MOVE; // Cùng vị trí

    const attackerReq = SURVIVOR_CATALOG[attackerSurvivorId]?.powerIndex ?? 2;
    const targetReq = SURVIVOR_CATALOG[targetSurvivorId]?.powerIndex ?? 2;

    // 1. Tiêu tốn xúc xắc
    const spendRes = spendActionDice(context, actorId, dieIndex, attackerReq);
    if (spendRes === INVALID_MOVE) return INVALID_MOVE;

    // 2. Đổ lại xúc xắc spent
    const reroll = random ? random.Die(6) : Math.floor(Math.random() * 6) + 1;

    // 3. Nếu kết quả <= attack requirement của survivor bị tấn công -> Thành công
    if (reroll <= targetReq) {
        // Nhận 1 wound
        receiveWound(context, targetSurvivorId, 'wound');

        // Cướp ngẫu nhiên 1 lá từ tay đối thủ
        const targetPriv = G.private.players[target.belongPlayer];
        if (targetPriv && targetPriv.hand.length > 0) {
            const stealIdx = random ? random.Die(targetPriv.hand.length) - 1 : Math.floor(Math.random() * targetPriv.hand.length);
            const stolenCard = targetPriv.hand[stealIdx];
            if (stolenCard) {
                transferCardBetweenPlayers(context, target.belongPlayer, actorId, stolenCard);
            }
        }
    }
};

/**
 * 7. Tìm kiếm với tiếng ồn (Search make noise):
 * - Dòng 229-232 GAME_RULE.md:
 * - Thêm 1 noise token vào vị trí (nếu còn slot trống).
 * - Rút thêm 1 lá từ deck địa điểm đó vào reveal (để người chơi xem).
 */
export const playerSearchMakeNoise = (
    context: MoveContext,
    survivorId: SurvivorID
) => {
    const { G, playerID } = context;
    const actorId = playerID ?? G.public.currentPlayerID;
    const survivor = G.public.survivorInfo[survivorId];

    if (!survivor || survivor.belongPlayer !== actorId || survivor.location === 'colony') {
        return INVALID_MOVE;
    }

    const loc = G.public.location[survivor.location];
    if (!loc || loc.noise >= loc.maxNoise) return INVALID_MOVE;

    const locDeck = G.private.location[survivor.location];
    if (!locDeck || locDeck.cards.length === 0) return INVALID_MOVE;

    // 1. Tái sử dụng atomic addNoise
    addNoise(context, survivor.location, 1);

    // 2. Rút thêm 1 lá xem vào reveal
    const card = locDeck.cards.shift()!;
    locDeck.reveal.push(card);

    // 3. Cập nhật pending nếu đang trong trạng thái drawFromReveal
    if (G.public.pending && G.public.pending.type === 'drawFromReveal') {
        G.public.pending.card = [...locDeck.reveal];
    }
};

/**
 * 8. Hoàn tất tìm kiếm (Finish search):
 * - Dòng 233-235 GAME_RULE.md:
 * - Chọn giữ 1 lá trong reveal vào tay.
 * - Trả toàn bộ bài còn lại trong reveal về đáy deck địa điểm đó.
 */
export const playerFinishSearch = (
    context: MoveContext,
    survivorId: SurvivorID,
    keptCardId: ItemID
) => {
    const { G, playerID } = context;
    const actorId = playerID ?? G.public.currentPlayerID;
    const survivor = G.public.survivorInfo[survivorId];

    if (!survivor || survivor.belongPlayer !== actorId || survivor.location === 'colony') {
        return INVALID_MOVE;
    }

    const locDeck = G.private.location[survivor.location];
    if (!locDeck || !locDeck.reveal.includes(keptCardId)) return INVALID_MOVE;

    // 1. Giữ lá bài chọn vào tay
    const keptIdx = locDeck.reveal.indexOf(keptCardId);
    locDeck.reveal.splice(keptIdx, 1);
    addCardToHand(context, actorId, [keptCardId]);

    // 2. Trả toàn bộ bài thừa trong reveal về đáy deck địa điểm đó
    if (locDeck.reveal.length > 0) {
        const remaining = [...locDeck.reveal];
        locDeck.reveal = [];
        putCardToDeck(context, survivor.location, remaining, 'bottom');
    }

    // 3. Hoàn tất và dọn trạng thái pending
    if (G.public.pending && G.public.pending.type === 'drawFromReveal') {
        G.public.pending = null;
    }
};

/**
 * 9. Yêu cầu/xin thẻ bài từ người chơi khác (Request card):
 * - Dòng 103-105 GAME_RULE.md:
 * - Chuyển thẻ bài từ người cho sang người nhận.
 */
export const playerRequestCard = (
    context: MoveContext,
    fromPlayerId: string,
    toPlayerId: string,
    cardId: ItemID
) => {
    // Tái sử dụng atomic transferCardBetweenPlayers
    return transferCardBetweenPlayers(context, fromPlayerId, toPlayerId, cardId);
};

