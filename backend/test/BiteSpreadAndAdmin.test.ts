import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { setupInitialGame } from '../gameSetup/GameSetup.js';
import {
    applyExposureResult,
    resolveBiteAcceptDeath,
    resolveBiteRollRisk,
    startAdminTrigger,
    castAdminVote,
    resolveNewSurvivorPlacement,
    confirmPendingResolution
} from '../gameLogic/GameScaleLogic.js';
import { spawnSurvivor, addFood } from '../gameLogic/Game.js';
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
            Die: () => 1
        } as any
    };
}

describe('Bite Spread Reaction and Admin Snapshot Rollback', () => {
    it('should convert bite to 1 wound for Sparky (passive CHANGE_BITE_TO_WOUND) without spreading', () => {
        const context = createMockContext();
        const { G } = context;

        spawnSurvivor(context, 'sparky', '0', 'library');
        applyExposureResult(context, 'sparky', 'bite');

        assert.equal(G.public.survivorInfo['sparky']!.wound.length, 1);
        assert.equal(G.public.survivorInfo['sparky']!.wound[0], 'wound');
        assert.equal(G.public.pending, null, 'No biteSpread pending should be triggered for Sparky');
    });

    it('should spread bite infection to lowest influence survivor and skip IGNORE_BITE_SPREADING', () => {
        const context = createMockContext();
        const { G } = context;

        // Đặt 3 survivor ở library:
        // officer_grey (influent 58)
        // sparky (influent 2, nhưng có IGNORE_BITE_SPREADING)
        // loretta_clay (influent 22)
        spawnSurvivor(context, 'officer_grey', '0', 'library');
        spawnSurvivor(context, 'sparky', '0', 'library');
        spawnSurvivor(context, 'loretta_clay', '1', 'library');

        // Grey bị cắn -> Chết!
        applyExposureResult(context, 'officer_grey', 'bite');

        assert.equal(G.public.survivorInfo['officer_grey'], undefined);
        assert.ok(G.public.pending !== null);
        assert.equal(G.public.pending?.type, 'biteSpread');
        // Sparky được miễn nhiễm IGNORE_BITE_SPREADING -> Dịch bệnh phải lây sang Loretta Clay!
        assert.equal(G.public.pending?.survivorId, 'loretta_clay');
    });

    it('should NOT spread bite infection to helpless survivors if no regular survivors remain', () => {
        const context = createMockContext();
        const { G } = context;

        // Di chuyển toàn bộ survivor ra ngoài, chỉ để 1 survivor ở Colony cùng helpless
        for (const sId of Object.keys(G.public.survivorInfo)) {
            G.public.survivorInfo[sId]!.location = 'policeStation';
        }
        G.public.colony.survivor = 0;
        G.public.colony.helpless = 4;

        spawnSurvivor(context, 'ashley_ross', '0', 'colony');
        assert.equal(G.public.colony.helpless, 4);

        // Ashley Ross bị cắn chết ở Colony
        applyExposureResult(context, 'ashley_ross', 'bite');

        assert.equal(G.public.survivorInfo['ashley_ross'], undefined);
        // Tuyệt đối không lây sang helpless survivors -> Pending kết thúc ngay!
        assert.equal(G.public.pending, null, 'Bite spread must NOT infect helpless survivors');
        assert.equal(G.public.colony.helpless, 4, 'Helpless count must remain untouched by bite spread');
    });

    it('should resolve bite spread with sacrifice stopping infection', () => {
        const context = createMockContext();
        const { G } = context;

        spawnSurvivor(context, 'ashley_ross', '0', 'groceryStore');
        // Đảm bảo groupLeader không phải ashley_ross để tránh kích hoạt chooseNewLeader
        const player0 = G.public.players['0']!;
        const otherSurvivor = player0.survivorList.find(s => s !== 'ashley_ross') || 'sparky';
        player0.groupLeader = otherSurvivor;

        G.public.pending = {
            type: 'biteSpread',
            survivorId: 'ashley_ross',
            location: 'groceryStore'
        };

        resolveBiteAcceptDeath(context);

        assert.equal(G.public.survivorInfo['ashley_ross'], undefined);
        assert.equal(G.public.pending, null, 'Bite spread pending must be stopped');
    });

    it('should save snapshot on Admin Trigger and ROLLBACK if vote is rejected', () => {
        const context = createMockContext(2);
        const { G } = context;

        const initialMorale = G.public.morale;
        const initialFood = G.public.colony.food;

        // 1. Khởi động Admin Trigger
        startAdminTrigger(context, '0', 'Admin adjusting supplies');
        assert.ok(G.snapshot !== null && G.snapshot !== undefined);
        assert.equal(G.public.pending?.type, 'voteAdminAction');

        // 2. Admin sửa đổi trái phép / can thiệp state
        G.public.morale = 999;
        G.public.colony.food = 999;

        // 3. Người chơi biểu quyết: Player 0 vote YES, Player 1 vote NO
        context.playerID = '0';
        castAdminVote(context, 'yes');

        context.playerID = '1';
        castAdminVote(context, 'no');

        // Kết quả hòa (1 YES vs 1 NO) -> Không vượt quá -> Bị REJECT -> Tự động ROLLBACK!
        assert.equal(G.public.morale, initialMorale, 'Morale should be rolled back');
        assert.equal(G.public.colony.food, initialFood, 'Food should be rolled back');
        assert.equal(G.snapshot, null);
        assert.equal(G.public.pending, null);
    });

    it('should commit state and clear snapshot if Admin Trigger vote is approved', () => {
        const context = createMockContext(2);
        const { G } = context;

        startAdminTrigger(context, '0', 'Admin legal adjustment');
        G.public.colony.food = 10;

        context.playerID = '0';
        castAdminVote(context, 'yes');

        context.playerID = '1';
        castAdminVote(context, 'yes');

        // 2 YES vs 0 NO -> Approved!
        assert.equal(G.public.colony.food, 10, 'Approved changes should remain');
        assert.equal(G.snapshot, null);
        assert.equal(G.public.pending, null);
    });

    it('should handle pending confirmation requirement before clearing pending state', () => {
        const context = createMockContext(2);
        const { G } = context;

        G.public.pending = {
            type: 'selectNewSurvivorPlacement',
            playerId: '0',
            newSurvivorId: 'forest_plum',
            confirmedBy: []
        };

        // Player 0 chọn vị trí đặt
        context.playerID = '0';
        resolveNewSurvivorPlacement(context, 'colony');

        assert.equal(G.public.survivorInfo['forest_plum']?.location, 'colony');
        // Chưa xong: Đang ở confirmPending
        assert.equal(G.public.pending?.type, 'confirmPending');

        // Player 1 xác nhận
        context.playerID = '1';
        confirmPendingResolution(context);

        // Tất cả người chơi khác đã confirm -> Hoàn tất!
        assert.equal(G.public.pending, null);
    });
});
