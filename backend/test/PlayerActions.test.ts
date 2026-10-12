import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { setupInitialGame } from '../gameSetup/GameSetup.js';
import {
    playerMoveSurvivor,
    playerSpendFoodToken,
    playerSpendFoodCard,
    playerAttackSurvivor,
    playerSearch,
    playerSearchMakeNoise,
    playerFinishSearch
} from '../gameLogic/PlayerAction.js';
import { exilePlayer } from '../gameLogic/GameScaleLogic.js';
import { spawnSurvivor } from '../gameLogic/SurvivorLogic.js';
import type { MoveContext } from '../gameLogic/Action.js';

function createMockContext(numPlayers = 2): MoveContext {
    const G = setupInitialGame(numPlayers);
    return {
        G,
        ctx: {
            numPlayers,
            playOrder: ['0', '1'],
            playOrderPos: 0,
            activePlayers: null,
            currentPlayer: '0',
            numMoves: 0,
            turn: 1,
            phase: 'playerPhase'
        } as any,
        playerID: '0',
        random: {
            Die: (max: number) => 1 // luôn roll ra 1 (thành công trong attackSurvivor)
        } as any
    };
}

describe('Player Actions and Execution Chains', () => {
    it('should move survivor and avoid exposure roll if using fuel card', () => {
        const context = createMockContext();
        const { G } = context;

        const sId = G.public.players['0']!.survivorList[0]!;
        // Đảm bảo player '0' có 'starter_fuel'
        G.private.players['0']!.hand.push('starter_fuel');

        playerMoveSurvivor(context, sId, 'policeStation', 'starter_fuel');

        assert.equal(G.public.survivorInfo[sId]?.location, 'policeStation');
        assert.equal(G.public.survivorInfo[sId]?.hasMoved, true);
        assert.ok(G.public.colony.waste.includes('starter_fuel'), 'Fuel card should go to waste pile');
        assert.ok(!G.private.players['0']!.hand.includes('starter_fuel'), 'Fuel card removed from hand');
        assert.equal(G.public.survivorInfo[sId]?.wound.length, 0, 'No wound should be rolled with fuel');
    });

    it('should allow Sparky to move without exposure dice roll (passive NO_EXPOSURE_WHEN_MOVING)', () => {
        const context = createMockContext();
        const { G } = context;

        // Cho Sparky vào player 0
        spawnSurvivor(context, 'sparky', '0', 'colony');
        assert.equal(G.public.survivorInfo['sparky']!.wound.length, 0);

        playerMoveSurvivor(context, 'sparky', 'hospital');
        assert.equal(G.public.survivorInfo['sparky']!.location, 'hospital');
        assert.equal(G.public.survivorInfo['sparky']!.wound.length, 0);
    });

    it('should handle food token vs food card correctly for normal and exiled players', () => {
        const context = createMockContext();
        const { G } = context;

        // 1. Normal player spending food token from Colony
        G.public.players['0']!.die.unused = [2];
        G.public.colony.food = 3;
        playerSpendFoodToken(context, 0);

        assert.equal(G.public.players['0']!.die.unused[0], 3, 'Action die should increase by 1');
        assert.equal(G.public.colony.food, 2, 'Colony food supply should decrease by 1');

        // 2. Normal player spending food card from hand
        G.private.players['0']!.hand.push('starter_food');
        playerSpendFoodCard(context, 'starter_food', 0);
        assert.equal(G.public.players['0']!.die.unused[0], 4);
        assert.ok(G.public.colony.waste.includes('starter_food'), 'Non-exiled food card should go to waste');

        // 3. Exiled player trying to spend food token (FORBIDDEN)
        exilePlayer(context, '0');
        const resToken = playerSpendFoodToken(context, 0);
        assert.equal(resToken, 'INVALID_MOVE', 'Exiled player cannot spend food tokens');

        // 4. Exiled player spending food card from hand (ALLOWED -> goes to removedItem)
        G.private.players['0']!.hand.push('starter_food');
        playerSpendFoodCard(context, 'starter_food', 0);
        assert.equal(G.public.players['0']!.die.unused[0], 5);
        assert.ok(G.private.players['0'] || G.public.removeItemCard);
    });

    it('should steal random card from target BEFORE killing them in playerAttackSurvivor', () => {
        const context = createMockContext();
        const { G } = context;

        // Đặt attacker và target cùng ở policeStation
        spawnSurvivor(context, 'officer_grey', '0', 'policeStation');
        spawnSurvivor(context, 'forest_plum', '1', 'policeStation');

        // Đảm bảo target chỉ còn 1 máu (đã có 2 wounds)
        G.public.survivorInfo['forest_plum']!.wound = ['wound', 'wound'];

        // Target (Player 1) chỉ có đúng 1 survivor này (forest_plum)
        // và trên tay có 1 lá quan trọng
        G.public.players['1']!.survivorList = ['forest_plum'];
        G.private.players['1']!.hand = ['starter_medicine'];

        // Attacker có xúc xắc giá trị 5 để dùng
        G.public.players['0']!.die.unused = [5];
        const initialAttackerHandSize = G.private.players['0']!.hand.length;

        // Attacker tấn công target
        playerAttackSurvivor(context, 'officer_grey', 'forest_plum', 0);

        // Attacker phải cướp được lá 'starter_medicine' vào tay TRƯỚC KHI target chết
        assert.equal(G.private.players['0']!.hand.length, initialAttackerHandSize + 1);
        assert.ok(G.private.players['0']!.hand.includes('starter_medicine'));

        // Target phải chết (vì nhận vết thương thứ 3)
        assert.equal(G.public.survivorInfo['forest_plum'], undefined);
    });

    it('should execute Search -> Make Noise -> Finish Search keeping 1 card and returning rest to bottom', () => {
        const context = createMockContext();
        const { G } = context;

        spawnSurvivor(context, 'ashley_ross', '0', 'policeStation');
        G.public.players['0']!.die.unused = [5]; // searchIndex of Ashley is 5

        // 1. Search ban đầu
        playerSearch(context, 'ashley_ross', 0);
        assert.ok(G.public.pending !== null);
        assert.equal(G.public.pending?.type, 'drawFromReveal');
        assert.equal(G.private.location['policeStation']!.reveal.length, 1);

        // 2. Make noise để xem thêm bài
        playerSearchMakeNoise(context, 'ashley_ross');
        assert.equal(G.public.location['policeStation']!.noise, 1);
        assert.equal(G.private.location['policeStation']!.reveal.length, 2);

        // 3. Finish search: Chọn giữ lá đầu tiên trong reveal
        const keptCard = G.private.location['policeStation']!.reveal[0]!;
        const remainingCard = G.private.location['policeStation']!.reveal[1]!;
        const deckLengthBefore = G.private.location['policeStation']!.cards.length;

        playerFinishSearch(context, 'ashley_ross', keptCard);

        assert.equal(G.public.pending, null);
        assert.equal(G.private.location['policeStation']!.reveal.length, 0, 'Reveal should be cleared to empty []');
        assert.ok(G.private.players['0']!.hand.includes(keptCard), 'Kept card should be in hand');
        assert.equal(G.private.location['policeStation']!.cards.length, deckLengthBefore + 1, 'Unchosen card returned to deck');
        assert.equal(G.private.location['policeStation']!.cards[G.private.location['policeStation']!.cards.length - 1], remainingCard, 'Unchosen card went to bottom of deck');
    });
});
