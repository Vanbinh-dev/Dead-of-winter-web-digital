import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { setupInitialGame } from '../gameSetup/GameSetup.js';
import {
    spawnZombieAtColony,
    spawnZombieAtLocation,
    buildBarricadeAtColony,
    buildBarricadeAtLocation,
    addHelplessSurvivor
} from '../gameLogic/LocationLogic.js';
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
        playerID: '0'
    };
}

describe('Zombie Spawning, Barricades, and Overrun Invariants', () => {
    it('should consume barricade instead of spawning zombie', () => {
        const context = createMockContext();
        const { G } = context;

        // Xây 1 barricade ở cổng 1 Colony
        buildBarricadeAtColony(context, 1, 1);
        assert.equal(G.public.colony.entrances[0]?.barricade, 1);
        assert.equal(G.public.colony.entrances[0]?.zombie, 0);

        // Spawn 1 zombie ở cổng 1
        spawnZombieAtColony(context, 1, 1);

        // Rào chắn bị phá, zombie không được thêm
        assert.equal(G.public.colony.entrances[0]?.barricade, 0);
        assert.equal(G.public.colony.entrances[0]?.zombie, 0);
    });

    it('should fill zombie capacity up to maximum', () => {
        const context = createMockContext();
        const { G } = context;

        // Cổng 1 có max 3 zombie
        spawnZombieAtColony(context, 1, 2);
        assert.equal(G.public.colony.entrances[0]?.zombie, 2);

        spawnZombieAtColony(context, 1, 1);
        assert.equal(G.public.colony.entrances[0]?.zombie, 3);
    });

    it('should trigger OVERRUN and kill lowest influence survivor when capacity is full', () => {
        const context = createMockContext();
        const { G } = context;

        // Đặt 2 survivor vào hospital:
        // sparky: influent = 2
        // ashley_ross: influent = 52
        spawnSurvivor(context, 'sparky', '0', 'hospital');
        spawnSurvivor(context, 'ashley_ross', '1', 'hospital');

        // Hospital max 4 zombies. Đổ đầy 4 zombie vào hospital
        spawnZombieAtLocation(context, 'hospital', 4);
        assert.equal(G.public.location['hospital'].entrance.zombie, 4);

        // Thêm 1 zombie nữa -> Quá tải (Overrun)!
        // sparky (influent 2) thấp hơn ashley_ross (52) nên sparky phải chết!
        spawnZombieAtLocation(context, 'hospital', 1);

        assert.equal(G.public.survivorInfo['sparky'], undefined, 'Lowest influence survivor (Sparky) should be killed');
        assert.ok(G.public.survivorInfo['ashley_ross'] !== undefined, 'Ashley Ross should survive');
    });

    it('should kill helpless survivor in Colony on overrun if NO regular survivors remain', () => {
        const context = createMockContext();
        const { G } = context;

        // Gỡ toàn bộ survivor khỏi Colony (cho đi location khác)
        for (const sId of Object.keys(G.public.survivorInfo)) {
            G.public.survivorInfo[sId]!.location = 'policeStation';
        }
        G.public.colony.survivor = 0;

        // Thêm 2 helpless survivors vào Colony
        addHelplessSurvivor(context, 2);
        assert.equal(G.public.colony.helpless, 2);
        const initialMorale = G.public.morale;

        // Đổ đầy cổng 1 Colony (max 3 zombie)
        spawnZombieAtColony(context, 1, 3);

        // Zombie thứ 4 -> Overrun cổng 1. Không có survivor thường -> Giết 1 helpless survivor
        spawnZombieAtColony(context, 1, 1);

        assert.equal(G.public.colony.helpless, 1, '1 helpless survivor should be killed on overrun');
        assert.equal(G.public.morale, initialMorale - 1, 'Morale should decrease by 1 when helpless is killed');
    });

    it('should do nothing if location is overrun and has neither survivors nor helpless', () => {
        const context = createMockContext();
        const { G } = context;

        // Đảm bảo gasStation không có survivor
        assert.equal(G.public.location['gasStation'].survivorNumber, 0);

        // Đổ đầy gasStation (max 3 zombie)
        spawnZombieAtLocation(context, 'gasStation', 3);
        const initialMorale = G.public.morale;

        // Overrun khi không có ai ở đó
        spawnZombieAtLocation(context, 'gasStation', 1);

        assert.equal(G.public.morale, initialMorale, 'Morale must not decrease if overrun on empty location');
        assert.equal(G.public.location['gasStation'].entrance.zombie, 3);
    });

    it('should spawn zombies at Colony in round-robin order starting from entrance 1', () => {
        const context = createMockContext();
        const { G } = context;

        // Thêm 7 zombie: cổng 1 nhận 2, các cổng 2-6 nhận 1
        spawnZombieAtColony(context, 7);

        assert.equal(G.public.colony.entrances[0]?.zombie, 2, 'Entrance 1 should have 2 zombies');
        for (let i = 1; i < 6; i++) {
            assert.equal(G.public.colony.entrances[i]?.zombie, 1, `Entrance ${i + 1} should have 1 zombie`);
        }

        // Lần gọi tiếp theo thêm 2 zombie: luôn bắt đầu lại từ cổng 1
        spawnZombieAtColony(context, 2);
        assert.equal(G.public.colony.entrances[0]?.zombie, 3, 'Entrance 1 should now have 3 zombies');
        assert.equal(G.public.colony.entrances[1]?.zombie, 2, 'Entrance 2 should now have 2 zombies');
    });
});
