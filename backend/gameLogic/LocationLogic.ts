import type { MoveContext } from "./Action.js";
import type { LocationID } from "../state/Location.js";
import type { SurvivorID } from "../state/Card.js";
import { INVALID_MOVE } from "boardgame.io/core";
import { SURVIVOR_CATALOG } from "../gameSetup/GameSetup.js";
import { removeSurvivor, killHelplessSurvivor, spawnSurvivor, handleSurvivorDeath } from "./SurvivorLogic.js";
import { changeMorale } from "./GameScaleLogic.js";
import { putCardToDeck, addCardToHand } from "./DeckLogic.js";

export const addHelplessSurvivor = ({ G }: MoveContext, amount: number) => {
    const availableSlots = G.public.colony.maxSurvivor - (G.public.colony.survivor + G.public.colony.helpless);
    if (amount <= 0 || availableSlots <= 0) return INVALID_MOVE;
    const added = Math.min(amount, availableSlots);
    G.public.colony.helpless += added;
};

export const removeHelplessSurvivor = ({ G }: MoveContext, amount: number) => {
    if (amount <= 0 || G.public.colony.helpless <= 0) return INVALID_MOVE;
    G.public.colony.helpless = Math.max(0, G.public.colony.helpless - amount);
};

export const addFood = ({ G }: MoveContext, amount: number) => {
    if (amount <= 0) return INVALID_MOVE;
    G.public.colony.food += amount;
};

export const removeFood = ({ G }: MoveContext, amount: number) => {
    if (amount <= 0 || G.public.colony.food <= 0) return INVALID_MOVE;
    G.public.colony.food = Math.max(0, G.public.colony.food - amount);
};

export const addStarvation = ({ G }: MoveContext, amount: number) => {
    if (amount <= 0) return INVALID_MOVE;
    G.public.colony.starvation += amount;
};

export const removeStarvation = ({ G }: MoveContext, amount: number) => {
    if (amount <= 0 || G.public.colony.starvation <= 0) return INVALID_MOVE;
    G.public.colony.starvation = Math.max(0, G.public.colony.starvation - amount);
};

// ============================================================================
// QUY TẮC NGUYÊN THỦY KHI SINH ZOMBIE (SPAWN ZOMBIE PRIMITIVE RULE):
// 1. Nếu có rào chắn (barricade > 0) -> Triệt tiêu 1 rào chắn, không sinh zombie.
// 2. Nếu không có rào chắn và còn chỗ -> Sinh zombie.
// 3. Nếu không còn chỗ và không còn rào chắn (OVERRUN):
//    - Tìm survivor có lowest influence tại đó -> Giết survivor (giảm morale, rơi đồ, remove khỏi board).
//    - Nếu không có survivor nhưng có helpless survivors -> Giết 1 helpless survivor (giảm morale).
//    - Nếu không có survivor và không có helpless -> Không xảy ra chuyện gì, zombie bị loại bỏ.
// ============================================================================

export { handleSurvivorDeath } from "./SurvivorLogic.js";


/**
 * Xử lý Overrun tại 1 location:
 * Giết survivor có lowest influence, hoặc helpless survivor nếu ở Colony.
 */
function handleOverrunAtLocation(context: MoveContext, location: LocationID | 'colony'): void {
    const { G } = context;

    // Tìm tất cả survivor đang có mặt tại location này
    const survivorsHere: SurvivorID[] = Object.entries(G.public.survivorInfo)
        .filter(([_, info]) => info.location === location)
        .map(([sId]) => sId);

    if (survivorsHere.length > 0) {
        // Tìm survivor có influence thấp nhất
        let lowestSurvivorId = survivorsHere[0]!;
        let lowestInfluence = SURVIVOR_CATALOG[lowestSurvivorId]?.influent ?? 999;

        for (const sId of survivorsHere) {
            const inf = SURVIVOR_CATALOG[sId]?.influent ?? 999;
            if (inf < lowestInfluence) {
                lowestInfluence = inf;
                lowestSurvivorId = sId;
            }
        }

        handleSurvivorDeath(context, lowestSurvivorId);
    } else if (location === 'colony' && G.public.colony.helpless > 0) {
        killHelplessSurvivor(context, 1);
    }
}

/**
 * Thao tác thêm 1 zombie vào 1 entrance cụ thể tại Colony (kiểm tra barricade -> capacity -> overrun)
 */
export function spawnSingleZombieAtColonyEntrance(context: MoveContext, entranceIndex: number): void {
    const { G } = context;
    const entrance = G.public.colony.entrances[entranceIndex - 1];
    if (!entrance) return;

    if (entrance.barricade > 0) {
        entrance.barricade--;
        return;
    }

    if (entrance.zombie < entrance.maxZombieCapacity) {
        entrance.zombie++;
        return;
    }

    handleOverrunAtLocation(context, 'colony');
}

/**
 * Thêm zombie vào Colony:
 * - Khi thêm số lượng `amount`: Luôn xoay vòng bắt đầu từ cổng 1 (1 -> 2 -> 3 -> 4 -> 5 -> 6 -> 1...).
 * - Nếu chỉ định `entranceIndex`: Thêm vào đúng cổng đó.
 */
export const spawnZombieAtColony = (
    context: MoveContext,
    arg1: number = 1,
    arg2?: number
) => {
    // Nếu chỉ có 1 tham số -> hiểu là amount và xoay vòng luôn bắt đầu từ cổng 1
    if (arg2 === undefined) {
        const amount = arg1;
        if (amount <= 0) return INVALID_MOVE;
        for (let i = 0; i < amount; i++) {
            const entranceIndex = (i % 6) + 1;
            spawnSingleZombieAtColonyEntrance(context, entranceIndex);
        }
        return;
    }

    // Nếu có 2 tham số: (entranceIndex, amount) hoặc (amount, entranceIndex)
    let entranceIndex: number;
    let amount: number;
    if (arg1 >= 1 && arg1 <= 6 && arg2 > 0) {
        entranceIndex = arg1;
        amount = arg2;
    } else {
        amount = arg1;
        entranceIndex = arg2;
    }

    const { G } = context;
    const entrance = G.public.colony.entrances[entranceIndex - 1];
    if (!entrance || amount <= 0) return INVALID_MOVE;

    for (let i = 0; i < amount; i++) {
        spawnSingleZombieAtColonyEntrance(context, entranceIndex);
    }
};

export const spawnZombieAtColonyRoundRobin = spawnZombieAtColony;

export const removeZombieAtColony = ({ G }: MoveContext, entranceIndex: number, amount: number) => {
    const entrance = G.public.colony.entrances[entranceIndex - 1];
    if (!entrance || amount <= 0 || entrance.zombie <= 0) return INVALID_MOVE;
    entrance.zombie = Math.max(0, entrance.zombie - amount);
};

export const spawnZombieAtLocation = (context: MoveContext, atLoc: LocationID, amount: number = 1) => {
    const { G } = context;
    const loc = G.public.location[atLoc];
    if (!loc || amount <= 0) return INVALID_MOVE;

    for (let i = 0; i < amount; i++) {
        if (loc.entrance.barricade > 0) {
            loc.entrance.barricade--;
            continue;
        }

        if (loc.entrance.zombie < loc.entrance.maxZombieCapacity) {
            loc.entrance.zombie++;
            continue;
        }

        // 3. Quá tải (Overrun)
        handleOverrunAtLocation(context, atLoc);
    }
};

export const removeZombieAtLocation = ({ G }: MoveContext, atLoc: LocationID, amount: number) => {
    const loc = G.public.location[atLoc];
    if (!loc || amount <= 0 || loc.entrance.zombie <= 0) return INVALID_MOVE;
    loc.entrance.zombie = Math.max(0, loc.entrance.zombie - amount);
};

/**
 * Đặt rào chắn tại cổng Colony.
 * Barricade + Zombie <= maxZombieCapacity (3).
 */
export const buildBarricadeAtColony = ({ G }: MoveContext, entranceIndex: number, amount: number) => {
    const entrance = G.public.colony.entrances[entranceIndex - 1];
    if (!entrance || amount <= 0) return INVALID_MOVE;
    const available = entrance.maxZombieCapacity - (entrance.zombie + entrance.barricade);
    if (available <= 0) return INVALID_MOVE;
    entrance.barricade += Math.min(amount, available);
};

export const removeBarricadeAtColony = ({ G }: MoveContext, entranceIndex: number, amount: number) => {
    const entrance = G.public.colony.entrances[entranceIndex - 1];
    if (!entrance || amount <= 0 || entrance.barricade <= 0) return INVALID_MOVE;
    entrance.barricade = Math.max(0, entrance.barricade - amount);
};

/**
 * Đặt rào chắn tại địa điểm ngoài.
 * Barricade + Zombie <= maxZombieCapacity.
 */
export const buildBarricadeAtLocation = ({ G }: MoveContext, atLoc: LocationID, amount: number) => {
    const loc = G.public.location[atLoc];
    if (!loc || amount <= 0) return INVALID_MOVE;
    const available = loc.entrance.maxZombieCapacity - (loc.entrance.zombie + loc.entrance.barricade);
    if (available <= 0) return INVALID_MOVE;
    loc.entrance.barricade += Math.min(amount, available);
};

export const removeBarricadeAtLocation = ({ G }: MoveContext, atLoc: LocationID, amount: number) => {
    const loc = G.public.location[atLoc];
    if (!loc || amount <= 0 || loc.entrance.barricade <= 0) return INVALID_MOVE;
    loc.entrance.barricade = Math.max(0, loc.entrance.barricade - amount);
};

export const addNoise = ({ G }: MoveContext, atLoc: LocationID, amount: number) => {
    const loc = G.public.location[atLoc];
    if (!loc || amount <= 0) return INVALID_MOVE;
    const available = loc.maxNoise - loc.noise;
    if (available <= 0) return INVALID_MOVE;
    loc.noise += Math.min(amount, available);
};

export const removeNoise = ({ G }: MoveContext, atLoc: LocationID, amount: number) => {
    const loc = G.public.location[atLoc];
    if (!loc || amount <= 0 || loc.noise <= 0) return INVALID_MOVE;
    loc.noise = Math.max(0, loc.noise - amount);
};
