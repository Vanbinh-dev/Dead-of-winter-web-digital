import { LocationType } from "../type.js";
import { BaseLocation } from "./location.js";
import { FullBarricadeException, FullZombieException } from "./locationError.js";

export interface ColonyEntrance {
    readonly entranceNumber: number;
    zombieCount: number;
    barricadeCount: number;
}

export class ColonyLocation extends BaseLocation {
    private readonly _entrances: ColonyEntrance[] = [];
    public readonly MAX_ZOMBIES_PER_ENTRANCE = 3;

    constructor(
        maxSurvivorCapacity: number = 100,
        numberOfEntrances: number = 7
    ) {
        super(
            LocationType.COLONY,
            maxSurvivorCapacity,
            numberOfEntrances * 3,
            numberOfEntrances * 3
        );

        for (let i = 1; i <= numberOfEntrances; i++) {
            this._entrances.push({
                entranceNumber: i,
                zombieCount: 0,
                barricadeCount: 0
            });
        }
    }

    get entrances(): ReadonlyArray<ColonyEntrance> {
        return this._entrances;
    }

    override addZombies(count: number): void {
        let currentEntrance = 1;
        let overflowZombies = 0;
        let overFlowEntrances: number[] = []

        while (count != 0) {
            if (this.entrances[currentEntrance]?.zombieCount == this.MAX_ZOMBIES_PER_ENTRANCE) {
                overflowZombies++;
                if (!overFlowEntrances.includes(currentEntrance))
                    overFlowEntrances.push(currentEntrance)
            }
            else
                this.entrances[currentEntrance]!.zombieCount++;

            currentEntrance = (currentEntrance == 7) ? 1 : currentEntrance + 1;
            count--;
        }

        if (overflowZombies != 0)
            throw new FullZombieException(super.type, overflowZombies, overFlowEntrances, "Zombie has been overflow!");
    }

    addBarricadeAtEntrance(count: number, entranceNumber: number): void {
        if (count <= 0) return;

        const entrance = this._entrances.find(e => e.entranceNumber === entranceNumber);
        if (!entrance) {
            throw new Error(`Entrance ${entranceNumber} does not exist in Colony.`);
        }

        const available = this.MAX_ZOMBIES_PER_ENTRANCE - entrance.barricadeCount;

        if (available < count) {
            const added = available;
            entrance.barricadeCount = this.MAX_ZOMBIES_PER_ENTRANCE;
            this._barricadeCount += added;

            throw new FullBarricadeException(this.type, entranceNumber);
        }

        entrance.barricadeCount += count;
        this._barricadeCount += count;
    }

    removeZombieAtEntrance(count: number, entranceNumber: number): void {
        if (count <= 0) return;

        const entrance = this._entrances.find(e => e.entranceNumber === entranceNumber);
        if (!entrance) {
            throw new Error(`Entrance ${entranceNumber} does not exist in Colony.`);
        }

        const actualRemoved = Math.min(count, entrance.zombieCount);
        entrance.zombieCount -= actualRemoved;
        this._zombieCount -= actualRemoved;
    }
}