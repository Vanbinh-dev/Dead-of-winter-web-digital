import type { MoveContext } from "./Action.js";
import { INVALID_MOVE } from "boardgame.io/core";

export const rollSixSideDice = ({ random, G }: MoveContext) => {
    const roll = random ? random.Die(6) : Math.floor(Math.random() * 6) + 1;
    G.public.previousLog = {
        player: G.public.currentPlayerID,
        playerName: G.public.players[G.public.currentPlayerID]?.playerName || "Player",
        reason: "Roll D6",
        description: `Rolled a 6-sided die: ${roll}`
    };
};

export const rollExposureDice = ({ random, G }: MoveContext) => {
    const roll = random ? random.Die(12) : Math.floor(Math.random() * 12) + 1;
    let result: 'blank' | 'wound' | 'frostbite' | 'bite' = 'blank';
    if (roll >= 1 && roll <= 6) result = 'blank';
    else if (roll >= 7 && roll <= 9) result = 'wound';
    else if (roll >= 10 && roll <= 11) result = 'frostbite';
    else result = 'bite';

    G.public.previousLog = {
        player: G.public.currentPlayerID,
        playerName: G.public.players[G.public.currentPlayerID]?.playerName || "Player",
        reason: "Exposure Roll",
        description: `Rolled exposure die: ${result.toUpperCase()} (die result: ${roll})`
    };
};

export const changeActionDie = ({ G }: MoveContext, targetPlayerId: string, dieIndex: number, newValue: number) => {
    const player = G.public.players[targetPlayerId];
    if (!player || dieIndex < 0 || dieIndex >= player.die.unused.length) return INVALID_MOVE;
    if (newValue < 1 || newValue > 6) return INVALID_MOVE;
    player.die.unused[dieIndex] = newValue;
};

/**
 * Đổ lại 1 viên xúc xắc hành động chưa sử dụng (Reroll 1 die)
 */
export const rerollActionDie = ({ G, random }: MoveContext, targetPlayerId: string, dieIndex: number) => {
    const player = G.public.players[targetPlayerId];
    if (!player || dieIndex < 0 || dieIndex >= player.die.unused.length) return INVALID_MOVE;
    const newVal = random ? random.Die(6) : Math.floor(Math.random() * 6) + 1;
    player.die.unused[dieIndex] = newVal;
};

/**
 * Mang xúc xắc hành động từ ĐÃ SỬ DỤNG (used) qua CHƯA SỬ DỤNG (unused)
 */
export const bringUsedDieToUnused = ({ G }: MoveContext, targetPlayerId: string, dieIndex: number) => {
    const player = G.public.players[targetPlayerId];
    if (!player || dieIndex < 0 || dieIndex >= player.die.used.length) return INVALID_MOVE;
    const die = player.die.used.splice(dieIndex, 1)[0];
    if (die !== undefined) player.die.unused.push(die);
};

/**
 * Mang xúc xắc hành động từ CHƯA SỬ DỤNG (unused) qua ĐÃ SỬ DỤNG (used)
 */
export const bringUnusedDieToUsed = ({ G }: MoveContext, targetPlayerId: string, dieIndex: number) => {
    const player = G.public.players[targetPlayerId];
    if (!player || dieIndex < 0 || dieIndex >= player.die.unused.length) return INVALID_MOVE;
    const die = player.die.unused.splice(dieIndex, 1)[0];
    if (die !== undefined) player.die.used.push(die);
};

/**
 * Thêm xúc xắc hành động (Add action die)
 */
export const addActionDie = ({ G, random }: MoveContext, targetPlayerId: string, value?: number, to: 'unused' | 'used' = 'unused') => {
    const player = G.public.players[targetPlayerId];
    if (!player) return INVALID_MOVE;
    const dieVal = (value !== undefined && value >= 1 && value <= 6)
        ? value
        : (random ? random.Die(6) : Math.floor(Math.random() * 6) + 1);
    const targetArr = to === 'unused' ? player.die.unused : player.die.used;
    targetArr.push(dieVal);
};

/**
 * Xóa xúc xắc hành động
 */
export const removeActionDie = ({ G }: MoveContext, targetPlayerId: string, dieIndex: number, from: 'unused' | 'used') => {
    const player = G.public.players[targetPlayerId];
    if (!player) return INVALID_MOVE;
    const targetArr = from === 'unused' ? player.die.unused : player.die.used;
    if (dieIndex < 0 || dieIndex >= targetArr.length) return INVALID_MOVE;
    targetArr.splice(dieIndex, 1);
};

export const rerollAllActionDie = ({ G, random }: MoveContext, targetPlayerId: string) => {
    const player = G.public.players[targetPlayerId];
    if (!player) return INVALID_MOVE;
    const totalDice = 1 + player.survivorList.length;
    player.die.used = [];
    player.die.unused = [];
    for (let i = 0; i < totalDice; i++) {
        const val = random ? random.Die(6) : Math.floor(Math.random() * 6) + 1;
        player.die.unused.push(val);
    }
};

export const spendActionDice = ({ G }: MoveContext, targetPlayerId: string, dieIndex: number, requireMin: number) => {
    const player = G.public.players[targetPlayerId];
    if (!player || dieIndex < 0 || dieIndex >= player.die.unused.length) return INVALID_MOVE;
    const currentVal = player.die.unused[dieIndex];
    if (currentVal === undefined || currentVal < requireMin) return INVALID_MOVE;
    const spentVal = player.die.unused.splice(dieIndex, 1)[0];
    if (spentVal !== undefined) player.die.used.push(spentVal);
};
