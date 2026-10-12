import type { MoveContext } from "./Action.js";
import type { ItemID, SurvivorID } from "../state/Card.js";
import type { GameState } from "../state/GameState.js";
import type { LocationID } from "../state/Location.js";
import { INVALID_MOVE } from "boardgame.io/core";
import { handleSurvivorDeath, receiveWound, hasSurvivorPassive, spawnSurvivor } from "./SurvivorLogic.js";
import { SURVIVOR_CATALOG } from "../gameSetup/GameSetup.js";

export const changeMorale = ({ G, events }: MoveContext, delta: number) => {
    G.public.morale = Math.max(0, G.public.morale + delta);
    if (G.public.morale <= 0 && events) {
        events.endGame({ winner: 'betrayer_or_none', reason: 'Morale reached 0' });
    }
};

export const changeRound = ({ G, events }: MoveContext, delta: number) => {
    G.public.leftRound = Math.max(0, G.public.leftRound + delta);
    if (G.public.leftRound <= 0 && events) {
        events.endGame({ winner: 'betrayer_or_none', reason: 'Round reached 0' });
    }
};

export const setFirstPlayer = ({ G }: MoveContext, targetPlayerId: string) => {
    if (!G.public.players[targetPlayerId]) return INVALID_MOVE;
    G.public.currentPlayerID = targetPlayerId;
};

export const exilePlayer = ({ G }: MoveContext, targetPlayerId: string) => {
    const player = G.public.players[targetPlayerId];
    if (!player) return INVALID_MOVE;
    player.isExiled = true;

    // Rút 1 lá Exile Objective nếu còn
    if (G.private.exileObjective.cards.length > 0) {
        const exileCard = G.private.exileObjective.cards.shift()!;
        const privPl = G.private.players[targetPlayerId];
        if (privPl) privPl.secretObjective = exileCard;
    }

    // Di chuyển toàn bộ survivor của người chơi đó đang ở Colony ra ngoài
    const outsideLocations: LocationID[] = ['gasStation', 'hospital', 'policeStation', 'groceryStore', 'school', 'library'];
    player.survivorList.forEach(sId => {
        const info = G.public.survivorInfo[sId];
        if (info && info.location === 'colony') {
            const availableLoc = outsideLocations.find(l => G.public.location[l] && G.public.location[l].survivorNumber < G.public.location[l].maxSurvivorNumber) || 'policeStation';
            info.location = availableLoc;
            G.public.colony.survivor = Math.max(0, G.public.colony.survivor - 1);
            if (G.public.location[availableLoc]) {
                G.public.location[availableLoc].survivorNumber++;
            }
        }
    });

    G.public.previousLog = {
        player: targetPlayerId,
        playerName: player.playerName || "Player",
        reason: "Exile",
        description: `Player ${targetPlayerId} has been exiled!`
    };
};

export const unexilePlayer = ({ G }: MoveContext, targetPlayerId: string) => {
    const player = G.public.players[targetPlayerId];
    if (player) player.isExiled = false;
    G.public.previousLog = {
        player: targetPlayerId,
        playerName: G.public.players[targetPlayerId]?.playerName || "Player",
        reason: "Unexile",
        description: `Player ${targetPlayerId} exile status revoked.`
    };
};

export const useItemCard = ({ G }: MoveContext, playerId: string, itemCard: ItemID[]) => {
    const privPl = G.private.players[playerId];
    if (!privPl) return INVALID_MOVE;
    itemCard.forEach(c => {
        const idx = privPl.hand.indexOf(c);
        if (idx !== -1) {
            privPl.hand.splice(idx, 1);
            G.public.colony.waste.push(c);
        }
    });
    const pubPl = G.public.players[playerId];
    if (pubPl) pubPl.handSize = privPl.hand.length;
};

export const setPendingAction = ({ G }: MoveContext, pending: GameState['public']['pending']) => {
    G.public.pending = pending;
};

export const clearPendingAction = ({ G }: MoveContext) => {
    G.public.pending = null;
};

function findLowestInfluenceSurvivor(G: GameState, location: string, excludeIds: SurvivorID[]): SurvivorID | null {
    const candidates = Object.entries(G.public.survivorInfo)
        .filter(([id, s]) => s.location === location && !excludeIds.includes(id) && !hasSurvivorPassive(id, 'IGNORE_BITE_SPREADING'))
        .map(([id]) => id);

    if (candidates.length === 0) return null;
    let lowestId = candidates[0]!;
    let minInfl = SURVIVOR_CATALOG[lowestId]?.influent ?? 999;
    for (const id of candidates) {
        const inf = SURVIVOR_CATALOG[id]?.influent ?? 999;
        if (inf < minInfl) {
            minInfl = inf;
            lowestId = id;
        }
    }
    return lowestId;
}

export const applyExposureResult = (context: MoveContext, survivorId: SurvivorID, result: 'blank' | 'wound' | 'frostbite' | 'bite') => {
    const { G } = context;
    const survivor = G.public.survivorInfo[survivorId];
    if (!survivor) return INVALID_MOVE;

    if (result === 'blank') {
        return;
    }

    if (result === 'bite') {
        if (hasSurvivorPassive(survivorId, 'CHANGE_BITE_TO_WOUND')) {
            receiveWound(context, survivorId, 'wound');
            G.public.previousLog = {
                player: G.public.currentPlayerID,
                playerName: "System",
                reason: "Bite Immunity",
                description: `${SURVIVOR_CATALOG[survivorId]?.name || survivorId} converted bite to 1 wound.`
            };
            return;
        }

        const loc = survivor.location;
        handleSurvivorDeath(context, survivorId);

        // Kích hoạt lây lan Bite Spread
        const nextTarget = findLowestInfluenceSurvivor(G, loc, [survivorId]);
        if (nextTarget) {
            G.public.pending = { type: 'biteSpread', survivorId: nextTarget, location: loc };
            G.public.previousLog = {
                player: G.public.currentPlayerID,
                playerName: "System",
                reason: "Bite Infection Spreading",
                description: `${SURVIVOR_CATALOG[survivorId]?.name || survivorId} was bitten and died! Infection spreads to ${SURVIVOR_CATALOG[nextTarget]?.name || nextTarget}. Decision required.`
            };
        } else {
            G.public.pending = null;
        }
        return;
    }

    // result là 'wound' hoặc 'frostbite' (receiveWound tự động xử lý CHANGE_FROSTBITE_TO_WOUND và kiểm tra tử vong)
    receiveWound(context, survivorId, result);
};

/**
 * Quyết định 1 khi bị lây nhiễm Bite: Chấp nhận hy sinh survivor để dừng lây lan
 */
export const resolveBiteAcceptDeath = (context: MoveContext) => {
    const { G } = context;
    if (!G.public.pending || G.public.pending.type !== 'biteSpread') return INVALID_MOVE;
    const targetId = G.public.pending.survivorId;
    G.public.pending = null;

    handleSurvivorDeath(context, targetId);
    G.public.previousLog = {
        player: G.public.currentPlayerID,
        playerName: "System",
        reason: "Bite Infection Stopped",
        description: `${SURVIVOR_CATALOG[targetId]?.name || targetId} was sacrificed. The infection spread has stopped.`
    };
};

/**
 * Quyết định 2 khi bị lây nhiễm Bite: Đổ xúc xắc exposure mạo hiểm (blank = sống; khác blank = chết & tiếp tục lây lan)
 */
export const resolveBiteRollRisk = (context: MoveContext) => {
    const { G, random } = context;
    if (!G.public.pending || G.public.pending.type !== 'biteSpread') return INVALID_MOVE;
    const targetId = G.public.pending.survivorId;
    const loc = G.public.pending.location;

    // Đổ exposure: 1-6 blank, 7-9 wound, 10-11 frostbite, 12 bite
    const roll = random ? random.Die(12) : Math.floor(Math.random() * 12) + 1;
    const isBlank = roll >= 1 && roll <= 6;

    if (isBlank) {
        G.public.pending = null;
        G.public.previousLog = {
            player: G.public.currentPlayerID,
            playerName: "System",
            reason: "Bite Infection Resisted",
            description: `${SURVIVOR_CATALOG[targetId]?.name || targetId} rolled BLANK (die: ${roll})! Infection resisted and stopped.`
        };
    } else {
        // Dòng 131-133 GAME_RULE.md: "Any other result is the same as rolling a bitten symbol"
        handleSurvivorDeath(context, targetId);
        const nextTarget = findLowestInfluenceSurvivor(G, loc, [targetId]);
        if (nextTarget) {
            G.public.pending = { type: 'biteSpread', survivorId: nextTarget, location: loc };
            G.public.previousLog = {
                player: G.public.currentPlayerID,
                playerName: "System",
                reason: "Bite Infection Spread Continues",
                description: `${SURVIVOR_CATALOG[targetId]?.name || targetId} rolled non-blank (die: ${roll}) and died! Infection spreads to ${SURVIVOR_CATALOG[nextTarget]?.name || nextTarget}.`
            };
        } else {
            G.public.pending = null;
            G.public.previousLog = {
                player: G.public.currentPlayerID,
                playerName: "System",
                reason: "Bite Infection Stopped",
                description: `${SURVIVOR_CATALOG[targetId]?.name || targetId} died! No more survivors at location to infect.`
            };
        }
    }
};

/**
 * Khởi xướng biểu quyết trục xuất (Vote to Exile)
 */
export const initiateVoteExile = (context: MoveContext, targetPlayerId: string) => {
    const { G, playerID } = context;
    const actorId = playerID ?? G.public.currentPlayerID;
    if (!G.public.players[targetPlayerId]) return INVALID_MOVE;

    // Reset votes
    for (const pId of Object.keys(G.private.players)) {
        const pl = G.private.players[pId];
        if (pl) pl.vote = null;
    }

    G.public.pending = {
        type: 'vote',
        playerId: actorId,
        targetPlayerId,
        issue: `Vote to Exile Player ${targetPlayerId}`
    };

    G.public.previousLog = {
        player: actorId,
        playerName: G.public.players[actorId]?.playerName || "Player",
        reason: "Vote Initiated",
        description: `Initiated vote to exile Player ${targetPlayerId}.`
    };
};

/**
 * Người chơi bỏ phiếu biểu quyết
 */
export const castVote = (context: MoveContext, vote: 'yes' | 'no') => {
    const { G, playerID } = context;
    if (!G.public.pending || G.public.pending.type !== 'vote') return INVALID_MOVE;
    const actorId = playerID ?? G.public.currentPlayerID;
    const privPl = G.private.players[actorId];
    if (!privPl) return INVALID_MOVE;

    privPl.vote = vote;

    // Kiểm tra xem tất cả người chơi đã vote chưa
    const allVoted = Object.keys(G.public.players).every(pId => G.private.players[pId]?.vote !== null);
    if (allVoted) {
        let yesVotes = 0;
        let noVotes = 0;
        for (const pId of Object.keys(G.public.players)) {
            if (G.private.players[pId]?.vote === 'yes') yesVotes++;
            else if (G.private.players[pId]?.vote === 'no') noVotes++;
        }

        const target = G.public.pending.targetPlayerId;
        const passed = yesVotes > noVotes;
        if (passed && target) {
            exilePlayer(context, target);
        }

        G.public.previousLog = {
            player: G.public.currentPlayerID,
            playerName: "System",
            reason: "Vote Resolved",
            description: `Vote finished: ${yesVotes} YES vs ${noVotes} NO. Result: ${passed ? `Player ${target} EXILED!` : 'Motion Rejected.'}`
        };

        G.public.pending = null;
    }
};

export const cancelVote = ({ G }: MoveContext) => {
    if (G.public.pending?.type === 'vote') {
        G.public.pending = null;
    }
};

/**
 * Kích hoạt pending cho hiệu ứng sự kiện (Crossroads / Skill trigger)
 */
export const triggerPendingEffect = ({ G, playerID }: MoveContext, effectDescription: string) => {
    const actorId = playerID ?? G.public.currentPlayerID;
    G.public.pending = {
        type: 'resolveTriggerEffect',
        playerId: actorId,
        effectDescription
    };
};

/**
 * Giải quyết hiệu ứng trigger
 */
export const resolveTriggerEffect = ({ G, playerID }: MoveContext, choice: string) => {
    if (!G.public.pending || G.public.pending.type !== 'resolveTriggerEffect') return INVALID_MOVE;
    const actorId = playerID ?? G.public.currentPlayerID;
    const desc = G.public.pending.effectDescription || "Trigger Effect";
    G.public.pending = null;
    G.public.previousLog = {
        player: actorId,
        playerName: G.public.players[actorId]?.playerName || "Player",
        reason: "Effect Resolved",
        description: `Resolved [${desc}] with choice: ${choice}`
    };
};

/**
 * Bắt đầu hiệu ứng can thiệp Admin (PLAYER_TRIGGER): Lưu Snapshot trước khi sửa
 */
export const startAdminTrigger = ({ G }: MoveContext, adminPlayerId: string, description?: string) => {
    G.snapshot = JSON.stringify({ public: G.public, private: G.private });
    G.public.pending = {
        type: 'voteAdminAction',
        adminPlayerId,
        description: description || "Admin Trigger Action",
        votes: {}
    };
};

/**
 * Nộp kết quả Admin mode để các player khác vote
 */
export const submitAdminAction = ({ G }: MoveContext, adminPlayerId: string) => {
    if (!G.public.pending || G.public.pending.type !== 'voteAdminAction') return INVALID_MOVE;
};

/**
 * Rollback trạng thái GameState về Snapshot
 */
export const rollbackAdminSnapshot = ({ G }: MoveContext) => {
    if (!G.snapshot) return INVALID_MOVE;
    try {
        const saved = JSON.parse(G.snapshot);
        if (saved.public) Object.assign(G.public, saved.public);
        if (saved.private) Object.assign(G.private, saved.private);
    } catch (e) {
        // error handling
    }
    G.snapshot = null;
    G.public.pending = null;
    G.public.previousLog = {
        player: G.public.currentPlayerID,
        playerName: "System",
        reason: "Admin Action Rejected",
        description: "Admin action rejected by vote. State rolled back to snapshot."
    };
};

/**
 * Bỏ phiếu cho hành động Admin mode
 */
export const castAdminVote = (context: MoveContext, vote: 'yes' | 'no') => {
    const { G, playerID } = context;
    if (!G.public.pending || G.public.pending.type !== 'voteAdminAction') return INVALID_MOVE;
    const actorId = playerID ?? G.public.currentPlayerID;
    G.public.pending.votes[actorId] = vote;

    // Kiểm tra xem tất cả người chơi khác đã vote chưa
    const allPlayerIds = Object.keys(G.public.players);
    const allVoted = allPlayerIds.every(id => G.public.pending && G.public.pending.type === 'voteAdminAction' && G.public.pending.votes[id] !== undefined);

    if (allVoted) {
        let yes = 0;
        let no = 0;
        for (const id of allPlayerIds) {
            if (G.public.pending.votes[id] === 'yes') yes++;
            else if (G.public.pending.votes[id] === 'no') no++;
        }

        if (yes > no) {
            // Thông qua: giữ state mới, xóa snapshot
            G.snapshot = null;
            G.public.pending = null;
            G.public.previousLog = {
                player: G.public.currentPlayerID,
                playerName: "System",
                reason: "Admin Action Approved",
                description: `Admin action approved with ${yes} YES vs ${no} NO.`
            };
        } else {
            // Không thông qua: Rollback về Snapshot
            rollbackAdminSnapshot(context);
        }
    }
};

/**
 * Đặt survivor mới sau khi last survivor chết
 */
export const resolveNewSurvivorPlacement = (context: MoveContext, targetLocation: LocationID | 'colony') => {
    const { G, playerID } = context;
    if (!G.public.pending || G.public.pending.type !== 'selectNewSurvivorPlacement') return INVALID_MOVE;
    const pending = G.public.pending;
    const actorId = playerID ?? G.public.currentPlayerID;
    if (actorId !== pending.playerId) return INVALID_MOVE;

    const player = G.public.players[pending.playerId];
    if (!player) return INVALID_MOVE;

    // Kiểm tra quy định: Exiled hoặc Colony đầy không được đặt vào Colony
    if (targetLocation === 'colony') {
        if (player.isExiled || G.public.colony.survivor + G.public.colony.helpless >= G.public.colony.maxSurvivor) {
            return INVALID_MOVE;
        }
    } else {
        const loc = G.public.location[targetLocation];
        if (!loc || loc.survivorNumber >= loc.maxSurvivorNumber) {
            return INVALID_MOVE;
        }
    }

    spawnSurvivor(context, pending.newSurvivorId, pending.playerId, targetLocation);

    // Chuyển sang pending chờ các người chơi khác confirm
    G.public.pending = {
        type: 'confirmPending',
        pendingType: 'selectNewSurvivorPlacement',
        playerId: pending.playerId,
        confirmedBy: []
    };
};

/**
 * Chọn leader mới khi leader cũ chết
 */
export const resolveChooseLeader = ({ G, playerID }: MoveContext, newLeaderId: SurvivorID) => {
    if (!G.public.pending || G.public.pending.type !== 'chooseNewLeader') return INVALID_MOVE;
    const pending = G.public.pending;
    const actorId = playerID ?? G.public.currentPlayerID;
    if (actorId !== pending.playerId) return INVALID_MOVE;

    const player = G.public.players[pending.playerId];
    if (!player || !player.survivorList.includes(newLeaderId)) return INVALID_MOVE;

    player.groupLeader = newLeaderId;

    // Chuyển sang pending chờ các người chơi khác confirm
    G.public.pending = {
        type: 'confirmPending',
        pendingType: 'chooseNewLeader',
        playerId: pending.playerId,
        confirmedBy: []
    };
};

/**
 * Xác nhận (Confirm) lựa chọn pending của người chơi khác
 */
export const confirmPendingResolution = ({ G, playerID }: MoveContext) => {
    if (!G.public.pending || G.public.pending.type !== 'confirmPending') return INVALID_MOVE;
    const pending = G.public.pending;
    const actorId = playerID ?? G.public.currentPlayerID;
    if (!pending.confirmedBy.includes(actorId)) {
        pending.confirmedBy.push(actorId);
    }

    const otherPlayerIds = Object.keys(G.public.players).filter(id => id !== pending.playerId);
    const allConfirmed = otherPlayerIds.every(id => pending.confirmedBy.includes(id));

    if (allConfirmed) {
        G.public.pending = null;
    }
};

