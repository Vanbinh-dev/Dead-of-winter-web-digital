import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { setupInitialGame } from '../gameSetup/GameSetup.js';
import {
    spawnSurvivor,
    removeSurvivor,
    receiveWound,
    handleSurvivorDeath
} from '../gameLogic/SurvivorLogic.js';
import { exilePlayer } from '../gameLogic/GameScaleLogic.js';
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
        playerID: '0'
    };
}

describe('Survivor Management and Invariant Death Handling', () => {
    it('should spawn survivor and register to player and location', () => {
        const context = createMockContext();
        const { G } = context;

        // Cho survivor vào hospital
        spawnSurvivor(context, 'officer_grey', '0', 'hospital');

        assert.equal(G.public.survivorInfo['officer_grey']?.location, 'hospital');
        assert.equal(G.public.survivorInfo['officer_grey']?.belongPlayer, '0');
        assert.ok(G.public.players['0']!.survivorList.includes('officer_grey'));
        assert.equal(G.public.location['hospital']?.survivorNumber, 1);
    });

    it('should remove survivor without lowering morale (rule line 176)', () => {
        const context = createMockContext();
        const { G } = context;
        const initialMorale = G.public.morale;

        const survivorToTest = G.public.players['0']!.survivorList[0]!;
        removeSurvivor(context, survivorToTest);

        assert.equal(G.public.morale, initialMorale, 'Morale must not decrease when removeSurvivor is called');
        assert.equal(G.public.survivorInfo[survivorToTest], undefined);
        assert.ok(!G.public.players['0']!.survivorList.includes(survivorToTest));
    });

    it('should automatically trigger handleSurvivorDeath when wounds reach max hp', () => {
        const context = createMockContext();
        const { G } = context;
        const initialMorale = G.public.morale;

        const sId = G.public.players['0']!.survivorList[0]!;
        
        // Nhận 1 wound
        receiveWound(context, sId, 'wound');
        assert.equal(G.public.survivorInfo[sId]?.wound.length, 1);
        assert.equal(G.public.morale, initialMorale);

        // Nhận 1 frostbite
        receiveWound(context, sId, 'frostbite');
        assert.equal(G.public.survivorInfo[sId]?.wound.length, 2);
        assert.equal(G.public.morale, initialMorale);

        // Nhận wound thứ 3 -> Chạm ngưỡng 3 máu -> Tự động chết!
        receiveWound(context, sId, 'wound');

        // Phải tự động chết: Morale giảm 1, survivor bị remove khỏi board
        assert.equal(G.public.morale, initialMorale - 1, 'Morale should decrease by 1 upon death');
        assert.equal(G.public.survivorInfo[sId], undefined, 'Survivor should be removed from survivorInfo');
        assert.ok(G.private.players['0'] || G.public.removeSurvivor);
    });

    it('should NOT decrease morale when an EXILE player survivor dies', () => {
        const context = createMockContext();
        const { G } = context;
        
        // Exile player '0'
        exilePlayer(context, '0');
        assert.equal(G.public.players['0']!.isExiled, true);

        const initialMorale = G.public.morale;
        const sId = G.public.players['0']!.survivorList[0]!;

        // Giết survivor của player bị exile
        receiveWound(context, sId, 'wound');
        receiveWound(context, sId, 'wound');
        receiveWound(context, sId, 'wound');

        assert.equal(G.public.morale, initialMorale, 'Exile player survivor death must NOT lower colony morale');
    });

    it('should drop equipped items to hand if dying in Colony, and shuffle into location deck if dying outside', () => {
        const context = createMockContext();
        const { G } = context;

        // 1. Chết ở Colony
        const s1 = G.public.players['0']!.survivorList[0]!;
        G.public.survivorInfo[s1]!.equippedItems = ['police_pistol'];
        G.public.survivorInfo[s1]!.location = 'colony';
        
        const initialHandSize = G.private.players['0']!.hand.length;
        handleSurvivorDeath(context, s1);

        assert.equal(G.private.players['0']!.hand.length, initialHandSize + 1, 'Equipped item should return to player hand');
        assert.ok(G.private.players['0']!.hand.includes('police_pistol'));

        // 2. Chết ở ngoài Colony
        const s2 = G.public.players['1']!.survivorList[0]!;
        G.public.survivorInfo[s2]!.equippedItems = ['police_shotgun'];
        G.public.survivorInfo[s2]!.location = 'policeStation';
        const initialDeckSize = G.private.location['policeStation']!.cards.length;

        handleSurvivorDeath(context, s2);
        assert.equal(G.private.location['policeStation']!.cards.length, initialDeckSize + 1, 'Equipped item should be shuffled into location deck');
        assert.ok(G.private.location['policeStation']!.cards.includes('police_shotgun'));
    });

    it('should trigger pending selectNewSurvivorPlacement when player last survivor is killed', () => {
        const context = createMockContext();
        const { G } = context;

        // Giết toàn bộ survivor của player 0 cho đến khi hết
        const survivors = [...G.public.players['0']!.survivorList];
        for (const sId of survivors) {
            handleSurvivorDeath(context, sId);
        }

        assert.equal(G.public.players['0']!.survivorList.length, 0);
        assert.equal(G.private.players['0']!.hand.length, 0, 'Hand cards should be removed from game');
        assert.ok(G.public.pending !== null);
        assert.equal(G.public.pending?.type, 'selectNewSurvivorPlacement');
        assert.equal(G.public.pending?.playerId, '0');
    });
});
