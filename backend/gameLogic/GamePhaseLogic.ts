import type { MoveContext, MoveFunction } from "./Action.js";
import type { GamePhase } from "../state/GamePhase.js";
import type { PlayerID } from "boardgame.io";
import type { ItemID, ItemSymbol, SurvivorID } from "../state/Card.js";
import { INVALID_MOVE } from "boardgame.io/core";
import { SURVIVOR_CATALOG, ITEM_CATALOG } from "../gameSetup/GameSetup.js";

// Tái sử dụng các atomic moves:
import {
    removeFood,
    addStarvation,
    spawnZombieAtColony,
    spawnZombieAtLocation,
    removeNoise
} from "./LocationLogic.js";

import {
    changeMorale,
    changeRound
} from "./GameScaleLogic.js";

import {
    putCardToDeck
} from "./DeckLogic.js";

import {
    receiveWound
} from "./SurvivorLogic.js";

import {
    playerAttackSurvivor,
    playerSearchMakeNoise,
    playerFinishSearch,
    playerRequestCard
} from "./PlayerAction.js";

// Định nghĩa thông tin Crisis
export interface CrisisCardInfo {
    id: string;
    name: string;
    requiredSymbol: ItemSymbol;
    amountMultiplier: number;
    description: string;
    failPenalty: {
        morale?: number;
        starvation?: number;
        zombiesAtColony?: number;
    };
}

export const CRISIS_CATALOG: Record<string, CrisisCardInfo> = {
    crisis_food_shortage: {
        id: "crisis_food_shortage",
        name: "Food Shortage",
        requiredSymbol: "food",
        amountMultiplier: 1,
        description: "Colony needs food rations. 1 Food per player.",
        failPenalty: { morale: -1, starvation: 1 }
    },
    crisis_fuel_leak: {
        id: "crisis_fuel_leak",
        name: "Fuel Leak",
        requiredSymbol: "fuel",
        amountMultiplier: 1,
        description: "Heaters need fuel to survive the cold. 1 Fuel per player.",
        failPenalty: { morale: -1 }
    },
    crisis_zombie_surge: {
        id: "crisis_zombie_surge",
        name: "Zombie Surge",
        requiredSymbol: "weapon",
        amountMultiplier: 1,
        description: "Colony barricades under attack. 1 Weapon per player.",
        failPenalty: { morale: -2, zombiesAtColony: 2 }
    }
};

/**
 * Trợ giúp xác định symbol của thẻ bài
 */
export function getItemCardSymbol(cardId: ItemID): ItemSymbol {
    if (ITEM_CATALOG[cardId]?.symbol) {
        return ITEM_CATALOG[cardId].symbol;
    }
    const lower = cardId.toLowerCase();
    if (lower.includes("food")) return "food";
    if (lower.includes("fuel")) return "fuel";
    if (lower.includes("medicine")) return "medicine";
    if (lower.includes("junk") || lower.includes("tool") || lower.includes("lighter")) return "tool";
    if (lower.includes("pistol") || lower.includes("shotgun") || lower.includes("weapon")) return "weapon";
    if (lower.includes("book") || lower.includes("library")) return "book";
    if (lower.includes("outsider")) return "outside";
    return "tool";
}

// ============================================================================
// 1. PHASE: beforeGameStart
// ============================================================================

/**
 * Người chơi chọn giữ 2 survivor từ danh sách được chia, trả phần còn lại vào survivor deck
 */
export const chooseStartingSurvivors: MoveFunction<[playerId: PlayerID, keepSurvivorIds: [SurvivorID, SurvivorID]]> = (
    context: MoveContext,
    playerId: PlayerID,
    keepSurvivorIds: [SurvivorID, SurvivorID]
) => {
    const { G } = context;
    const player = G.public.players[playerId];
    if (!player) return INVALID_MOVE;

    // Xác nhận 2 survivor chọn phải nằm trong survivorList hiện tại
    const [s1, s2] = keepSurvivorIds;
    if (s1 === s2 || !player.survivorList.includes(s1) || !player.survivorList.includes(s2)) {
        return INVALID_MOVE;
    }

    const removed = player.survivorList.filter(id => id !== s1 && id !== s2);
    player.survivorList = [s1, s2];

    // Trả survivor thừa vào deck và gỡ khỏi survivorInfo
    if (removed.length > 0) {
        removed.forEach(id => {
            delete G.public.survivorInfo[id];
        });
        putCardToDeck(context, "survivor", removed, "shuffle");
    }

    G.public.colony.survivor = Object.values(G.public.survivorInfo).filter(s => s.location === "colony").length;

    G.public.previousLog = {
        player: playerId,
        playerName: player.playerName,
        reason: "Choose Starting Survivors",
        description: `Kept ${s1} & ${s2}. Returned [${removed.join(", ")}] to deck.`
    };
};

/**
 * Người chơi chọn Group Leader
 */
export const chooseGroupLeader: MoveFunction<[playerId: PlayerID, leaderSurvivorId: SurvivorID]> = (
    context: MoveContext,
    playerId: PlayerID,
    leaderSurvivorId: SurvivorID
) => {
    const { G } = context;
    const player = G.public.players[playerId];
    if (!player || !player.survivorList.includes(leaderSurvivorId)) return INVALID_MOVE;

    // Đưa survivor leader lên đầu mảng survivorList để biểu diễn leader
    player.survivorList = [
        leaderSurvivorId,
        ...player.survivorList.filter(id => id !== leaderSurvivorId)
    ];

    G.public.previousLog = {
        player: playerId,
        playerName: player.playerName,
        reason: "Choose Group Leader",
        description: `Selected ${SURVIVOR_CATALOG[leaderSurvivorId]?.name || leaderSurvivorId} as Group Leader.`
    };
};

/**
 * Bắt đầu trận đấu: Tìm người có leader influence cao nhất làm First Player và chuyển sang startRound
 */
export const startGame: MoveFunction<[]> = (context: MoveContext) => {
    const { G } = context;
    if (G.public.gameStatus === "on-going") return INVALID_MOVE;

    let highestInfluence = -1;
    let firstPlayer = G.public.playerOrder[0] || "0";

    for (const pId of G.public.playerOrder) {
        const pl = G.public.players[pId];
        if (pl && pl.survivorList.length > 0) {
            const leaderId = pl.survivorList[0]; // leader là survivor đầu tiên
            if (leaderId) {
                const infl = SURVIVOR_CATALOG[leaderId]?.influent ?? 0;
                if (infl > highestInfluence) {
                    highestInfluence = infl;
                    firstPlayer = pId;
                }
            }
        }
    }

    G.public.currentPlayerID = firstPlayer;
    G.public.gameStatus = "on-going";
    G.public.phase = "startRound";

    // Reset cờ hasMoved cho tất cả survivor
    Object.values(G.public.survivorInfo).forEach(s => {
        s.hasMoved = false;
    });

    G.public.previousLog = {
        player: firstPlayer,
        playerName: G.public.players[firstPlayer]?.playerName || "Player",
        reason: "Start Game",
        description: `Game started! First player is Player ${firstPlayer} (Influence: ${highestInfluence}).`
    };
};

// ============================================================================
// 2. PHASE: startRound
// ============================================================================

/**
 * Lật Crisis đầu tiên từ crisis deck cho vòng chơi mới
 */
export const revealCrisis: MoveFunction<[]> = (context: MoveContext) => {
    const { G } = context;
    if (G.private.crisisDeck.cards.length === 0) {
        // Nếu hết bài, dùng mặc định
        G.public.currentCrisis = "crisis_food_shortage";
    } else {
        G.public.currentCrisis = G.private.crisisDeck.cards.shift() || null;
    }

    const def = G.public.currentCrisis ? CRISIS_CATALOG[G.public.currentCrisis] : null;
    G.public.previousLog = {
        player: G.public.currentPlayerID,
        playerName: "System",
        reason: "Reveal Crisis",
        description: def ? `Crisis revealed: ${def.name} - ${def.description}` : "No crisis active."
    };
};

/**
 * Đổ toàn bộ xúc xắc hành động cho tất cả người chơi (1 cơ bản + 1 cho mỗi survivor)
 */
export const rollRoundActionDice: MoveFunction<[]> = (context: MoveContext) => {
    const { G, random } = context;

    for (const pId of G.public.playerOrder) {
        const pl = G.public.players[pId];
        if (!pl) continue;

        const count = 1 + pl.survivorList.length;
        const newDice: number[] = [];
        for (let i = 0; i < count; i++) {
            newDice.push(random ? random.Die(6) : Math.floor(Math.random() * 6) + 1);
        }

        pl.die.unused = newDice;
        pl.die.used = [];
    }

    // Reset lượt di chuyển của tất cả survivor
    Object.values(G.public.survivorInfo).forEach(s => {
        s.hasMoved = false;
    });

    G.public.previousLog = {
        player: G.public.currentPlayerID,
        playerName: "System",
        reason: "Roll Round Action Dice",
        description: "Action dice rolled for all players. Survivors ready."
    };
};

/**
 * Chuyển từ startRound sang playerPhase
 */
export const startPlayerPhase: MoveFunction<[]> = (context: MoveContext) => {
    const { G } = context;
    G.public.phase = "playerPhase";

    // Bắt đầu lượt của First Player và áp dụng Frostbite
    return startPlayerTurn(context, G.public.currentPlayerID);
};

// ============================================================================
// 3. PHASE: playerPhase
// ============================================================================

/**
 * Bắt đầu lượt của 1 người chơi: Áp dụng sát thương Frostbite (1 frostbite -> nhận 1 wound)
 */
export const startPlayerTurn: MoveFunction<[playerId: PlayerID]> = (
    context: MoveContext,
    playerId: PlayerID
) => {
    const { G } = context;
    const pl = G.public.players[playerId];
    if (!pl) return INVALID_MOVE;

    G.public.currentPlayerID = playerId;

    // Áp dụng sát thương Frostbite: Dòng 113-115 GAME_RULE.md
    let frostbiteDamaged = 0;
    pl.survivorList.forEach(sId => {
        const s = G.public.survivorInfo[sId];
        if (s && s.wound.includes("frostbite")) {
            receiveWound(context, sId, "wound");
            frostbiteDamaged++;
        }
    });

    G.public.previousLog = {
        player: playerId,
        playerName: pl.playerName,
        reason: "Start Player Turn",
        description: `Turn started for ${pl.playerName}.${frostbiteDamaged > 0 ? ` ${frostbiteDamaged} survivor(s) took damage from Frostbite.` : ""}`
    };
};

/**
 * Kết thúc lượt người chơi hiện tại, chuyển sang người tiếp theo hoặc sang colonyPhase
 */
export const endPlayerTurn: MoveFunction<[]> = (context: MoveContext) => {
    const { G } = context;
    const order = G.public.playerOrder;
    const currentIdx = order.indexOf(G.public.currentPlayerID);

    if (currentIdx !== -1 && currentIdx < order.length - 1) {
        // Còn người chơi tiếp theo trong vòng
        const nextPlayer = order[currentIdx + 1];
        if (nextPlayer) {
            return startPlayerTurn(context, nextPlayer);
        }
    } else {
        // Tất cả người chơi đã hoàn thành lượt -> Chuyển sang Colony Phase
        G.public.phase = "colonyPhase";
        G.public.previousLog = {
            player: G.public.currentPlayerID,
            playerName: "System",
            reason: "End Player Phase",
            description: "All players finished their turns. Advancing to Colony Phase."
        };
    }
};

/**
 * Tái sử dụng các hành động tốn xúc xắc & tương tác người chơi từ PlayerAction
 */
export const attackSurvivor = playerAttackSurvivor;
export const searchMakeNoise = playerSearchMakeNoise;
export const finishSearch = playerFinishSearch;
export const requestCard = playerRequestCard;

// ============================================================================
// 4. PHASE: colonyPhase
// ============================================================================

/**
 * Trả thức ăn Colony: 1 food cho mỗi 2 survivor (làm tròn lên).
 * Nếu không đủ: Không trừ food, thêm 1 starvation token và giảm morale bằng số starvation token hiện có.
 */
export const payFood: MoveFunction<[]> = (context: MoveContext) => {
    const { G } = context;
    const colonySurvivors = Object.values(G.public.survivorInfo).filter(s => s.location === "colony").length;
    const totalHeadcount = colonySurvivors + G.public.colony.helpless;
    const foodNeeded = Math.ceil(totalHeadcount / 2);

    if (G.public.colony.food >= foodNeeded) {
        removeFood(context, foodNeeded);
        G.public.previousLog = {
            player: G.public.currentPlayerID,
            playerName: "System",
            reason: "Pay Food",
            description: `Colony consumed ${foodNeeded} food for ${totalHeadcount} survivors/helpless. Food remaining: ${G.public.colony.food}.`
        };
    } else {
        // Thiếu thức ăn -> Starvation!
        addStarvation(context, 1);
        changeMorale(context, -G.public.colony.starvation);
        G.public.previousLog = {
            player: G.public.currentPlayerID,
            playerName: "System",
            reason: "Starvation Occurred",
            description: `Not enough food (${G.public.colony.food}/${foodNeeded})! Added 1 starvation token (total: ${G.public.colony.starvation}). Morale decreased by ${G.public.colony.starvation}.`
        };
    }
};

/**
 * Kiểm tra bãi rác Colony: Giảm 1 morale cho mỗi 10 lá bài trong waste pile
 */
export const checkWaste: MoveFunction<[]> = (context: MoveContext) => {
    const { G } = context;
    const wasteCount = G.public.colony.waste.length;
    const penalty = Math.floor(wasteCount / 10);

    if (penalty > 0) {
        changeMorale(context, -penalty);
        G.public.previousLog = {
            player: G.public.currentPlayerID,
            playerName: "System",
            reason: "Check Waste",
            description: `Waste pile overflow (${wasteCount} cards)! Morale decreased by ${penalty}.`
        };
    } else {
        G.public.previousLog = {
            player: G.public.currentPlayerID,
            playerName: "System",
            reason: "Check Waste",
            description: `Waste pile checked (${wasteCount}/10 cards). Morale is safe.`
        };
    }
};

/**
 * Giải quyết Khủng hoảng (Crisis Resolution):
 * Xáo & lật bài đóng góp, tính điểm khớp (+1) và không khớp (-1).
 * Nếu thất bại -> áp dụng phạt.
 * Chuyển toàn bộ bài đóng góp vào removedItem.
 */
export const resolveCrisis: MoveFunction<[]> = (context: MoveContext) => {
    const { G, random } = context;
    const crisisId = G.public.currentCrisis;
    const contributionCards = [...G.private.crisisContribution.cards];

    if (!crisisId) {
        G.public.previousLog = {
            player: G.public.currentPlayerID,
            playerName: "System",
            reason: "Resolve Crisis",
            description: "No active crisis to resolve."
        };
        return;
    }

    const def = CRISIS_CATALOG[crisisId] || {
        id: crisisId,
        name: crisisId,
        requiredSymbol: "food",
        amountMultiplier: 1,
        description: "",
        failPenalty: { morale: -1 }
    };

    // Xáo bài đóng góp để ẩn danh người đóng góp theo luật
    for (let i = contributionCards.length - 1; i > 0; i--) {
        const j = random ? random.Die(i + 1) - 1 : Math.floor(Math.random() * (i + 1));
        const temp = contributionCards[i]!;
        contributionCards[i] = contributionCards[j]!;
        contributionCards[j] = temp;
    }

    let score = 0;
    contributionCards.forEach(cId => {
        const sym = getItemCardSymbol(cId);
        if (sym === def.requiredSymbol) {
            score += 1;
        } else {
            score -= 1;
        }
    });

    const targetRequirement = def.amountMultiplier * G.public.playerOrder.length;
    const passed = score >= targetRequirement;

    if (passed) {
        G.public.previousLog = {
            player: G.public.currentPlayerID,
            playerName: "System",
            reason: "Crisis Resolved: Success",
            description: `Crisis ${def.name} PASSED! Score: ${score}/${targetRequirement} matching symbols.`
        };
    } else {
        // Thất bại -> áp phạt
        if (def.failPenalty.morale) {
            changeMorale(context, def.failPenalty.morale);
        }
        if (def.failPenalty.starvation) {
            addStarvation(context, def.failPenalty.starvation);
        }
        if (def.failPenalty.zombiesAtColony) {
            spawnZombieAtColony(context, 1, def.failPenalty.zombiesAtColony);
        }

        G.public.previousLog = {
            player: G.public.currentPlayerID,
            playerName: "System",
            reason: "Crisis Resolved: Failed",
            description: `Crisis ${def.name} FAILED! Score: ${score}/${targetRequirement}. Penalties applied: ${JSON.stringify(def.failPenalty)}.`
        };
    }

    // Chuyển toàn bộ bài đóng góp vào removedItem
    if (contributionCards.length > 0) {
        putCardToDeck(context, "removedItem", contributionCards, "bottom");
        G.private.crisisContribution.cards = [];
    }
    G.public.currentCrisis = null;
};

/**
 * Thêm Zombie cuối vòng:
 * - Thêm zombie vào Colony (1 zombie mỗi 2 survivor, chia xoay vòng từ cổng 1 đến 6).
 * - Thêm zombie vào các địa điểm có survivor (1 zombie cho mỗi survivor).
 * - Đổ xúc xắc cho mỗi Noise token (1-3 thêm zombie), dọn noise.
 * Tái sử dụng triệt để spawnZombieAtColony & spawnZombieAtLocation (tự động triệt tiêu rào chắn & overrun!).
 */
export const addColonyZombies: MoveFunction<[]> = (context: MoveContext) => {
    const { G, random } = context;

    // 1. Zombie ở Colony
    const colonySurvivors = Object.values(G.public.survivorInfo).filter(s => s.location === "colony").length;
    const totalColonyHeads = colonySurvivors + G.public.colony.helpless;
    const colonyZombiesToAdd = Math.ceil(totalColonyHeads / 2);

    for (let i = 0; i < colonyZombiesToAdd; i++) {
        const entranceIdx = (i % 6) + 1;
        // spawnZombieAtColony tự động kiểm tra barricade & overrun
        spawnZombieAtColony(context, entranceIdx, 1);
    }

    // 2. Zombie ở 6 địa điểm bên ngoài
    const LOCATIONS = ["gasStation", "hospital", "library", "school", "groceryStore", "policeStation"] as const;
    LOCATIONS.forEach(locId => {
        const survivorCount = Object.values(G.public.survivorInfo).filter(s => s.location === locId).length;
        for (let i = 0; i < survivorCount; i++) {
            spawnZombieAtLocation(context, locId, 1);
        }

        // 3. Giải quyết Noise tokens tại địa điểm
        const locState = G.public.location[locId];
        if (locState && locState.noise > 0) {
            const currentNoise = locState.noise;
            for (let i = 0; i < currentNoise; i++) {
                const roll = random ? random.Die(6) : Math.floor(Math.random() * 6) + 1;
                if (roll <= 3) {
                    spawnZombieAtLocation(context, locId, 1);
                }
            }
            removeNoise(context, locId, currentNoise);
        }
    });

    G.public.previousLog = {
        player: G.public.currentPlayerID,
        playerName: "System",
        reason: "Add Zombies & Noise",
        description: `Added ${colonyZombiesToAdd} zombies at Colony entrances. Location zombies and noise tokens resolved.`
    };
};

/**
 * Kiểm tra mục tiêu chính (Main Objective)
 */
export const checkMainObjective: MoveFunction<[]> = (context: MoveContext) => {
    const { G, events } = context;

    // Ví dụ mặc định nếu hoàn thành mục tiêu chính
    if (G.public.mainObjectiveToken >= 10 && events) {
        events.endGame({ winner: "survivors", reason: "Main objective requirements achieved!" });
        G.public.gameStatus = "endGame";
    }

    G.public.previousLog = {
        player: G.public.currentPlayerID,
        playerName: "System",
        reason: "Check Main Objective",
        description: `Objective checked: tokens = ${G.public.mainObjectiveToken}. Game status: ${G.public.gameStatus}.`
    };
};

/**
 * Giảm Round tracker đi 1 nấc (nếu về 0 thì game kết thúc)
 */
export const advanceRoundTracker: MoveFunction<[]> = (context: MoveContext) => {
    const { G } = context;
    changeRound(context, -1);

    G.public.previousLog = {
        player: G.public.currentPlayerID,
        playerName: "System",
        reason: "Advance Round Tracker",
        description: `Round tracker moved to ${G.public.leftRound}.`
    };
};

/**
 * Chuyển First Player Token sang người chơi kế tiếp và bắt đầu vòng chơi mới (chuyển về startRound)
 */
export const passFirstPlayerToken: MoveFunction<[]> = (context: MoveContext) => {
    const { G } = context;
    const order = G.public.playerOrder;
    if (order.length === 0) return INVALID_MOVE;
    const currentIdx = order.indexOf(G.public.currentPlayerID);
    const nextIdx = currentIdx === -1 ? 0 : (currentIdx + 1) % order.length;
    const nextFirstPlayer = order[nextIdx] ?? "0";

    G.public.currentPlayerID = nextFirstPlayer;
    G.public.phase = "startRound";

    G.public.previousLog = {
        player: nextFirstPlayer,
        playerName: G.public.players[nextFirstPlayer]?.playerName || "Player",
        reason: "Pass First Player Token",
        description: `First Player token passed to Player ${nextFirstPlayer}. Round ready to start.`
    };
};

/**
 * Object tập hợp các moves của GamePhase, tương thích hoàn toàn với interface GamePhase
 */
export const gamePhaseMoves: GamePhase = {
    chooseStartingSurvivors,
    chooseGroupLeader,
    startGame,
    revealCrisis,
    rollRoundActionDice,
    startPlayerPhase,
    startPlayerTurn,
    endPlayerTurn,
    attackSurvivor,
    searchMakeNoise,
    finishSearch,
    requestCard,
    payFood,
    checkWaste,
    resolveCrisis,
    addColonyZombies,
    checkMainObjective,
    advanceRoundTracker,
    passFirstPlayerToken
};
