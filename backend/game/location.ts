import { HELPLESS_SURVIVOR, type Survivor } from "./Survivor.js";

export enum LocationType {
    POLICE_STATION,
    GROCERY_STORE,
    SCHOOL,
    LIBRARY,
    HOSPITAL,
    GAS_STATION,
    ANYWHERE,
    CURRENT_LOCATION
}

export abstract class BaseLocationException extends Error {
    constructor(message: string) {
        super(message);
        this.name = this.constructor.name;
    }
}

export class FullZombieException extends BaseLocationException {
    constructor(
        public readonly location: LocationType,
        public readonly overFlowNumber: number,
        public readonly entranceNumber?: number,
        message?: string
    ) {
        const entranceDetail = entranceNumber !== undefined ? ` at entrance ${entranceNumber}` : "";
        super(message ?? `Zombie overrun at location ${location}${entranceDetail}. ${overFlowNumber} zombies`);
    }
}

export class FullSurvivorException extends BaseLocationException {
    constructor(
        public readonly survivor: Survivor,
        public readonly location: LocationType
    ) {
        super(`Cannot place survivor '${survivor.id}' at ${location}: capacity reached.`);
    }
}

export class FullBarricadeException extends BaseLocationException {
    constructor(
        public readonly location: LocationType,
        public readonly entranceNumber?: number
    ) {
        const entranceDetail = entranceNumber !== undefined ? ` at entrance ${entranceNumber}` : "";
        super(`Cannot place barricade at ${location}${entranceDetail}: maximum capacity reached.`);
    }
}

export class CanNotMoveException extends BaseLocationException {
    constructor(message: string) {
        super(message);
    }
}

export class InvalidHelplessSurvivorException extends BaseLocationException {
    constructor(
        public readonly survivor: Survivor,
        public readonly location: LocationType
    ) {
        super(`Helpless survivors cannot be placed at non-colony location: ${location}`);
    }
}

export interface ILocation {
    type: LocationType;
    maxSurvivorCapacity: number;
    maxZombieCapacity: number;
    maxBarricadeCapacity: number;
    survivors: Survivor[];
    zombieCount: number;
    barricadeCount: number;

    addSurvivor(survivor: Survivor): void;
    removeSurvivor(survivor: Survivor): Survivor;
    addZombies(count: number): void;
    removeZombies(count: number): void;
    addBarricades(count: number): void;
    moveSurvivorTo(survivor: Survivor, targetLocation: ILocation): void;
    moveZombieTo(targetLocation: ILocation): void;
}

export abstract class BaseLocation implements ILocation {
    protected _survivors: Survivor[] = [];
    protected _zombieCount: number = 0;
    protected _barricadeCount: number = 0;

    constructor(
        public readonly type: LocationType,
        public readonly maxSurvivorCapacity: number,
        public readonly maxZombieCapacity: number,
        public readonly maxBarricadeCapacity: number
    ) { }

    get survivors(): ReadonlyArray<Survivor> {
        return this._survivors;
    }

    get zombieCount(): number {
        return this._zombieCount;
    }

    get barricadeCount(): number {
        return this._barricadeCount;
    }

    addSurvivor(survivor: Survivor): void {
        if (this._survivors.length >= this.maxSurvivorCapacity) {
            throw new FullSurvivorException(survivor, this.type);
        }
        this._survivors.push(survivor);
    }

    removeSurvivor(survivor: Survivor): Survivor {
        const index = this._survivors.findIndex(s => s.id === survivor.id);
        if (index === -1) {
            throw new Error(`Survivor ${survivor.id} is not present at ${this.type}`);
        }
        return this._survivors.splice(index, 1)[0]!;
    }

    addZombies(count: number): void {
        if (count <= 0) return;

        const availableSpaces = this.maxZombieCapacity - this._zombieCount;

        if (count > availableSpaces) {
            this._zombieCount = this.maxZombieCapacity;
            const overflownCount = count - availableSpaces;

            throw new FullZombieException(
                this.type,
                overflownCount,
                undefined,
                `Location ${this.type} placed ${availableSpaces} zombies and overflowed by ${overflownCount}.`
            );
        }

        this._zombieCount += count;
    }

    removeZombies(count: number): void {
        this._zombieCount = Math.max(0, this._zombieCount - count);
    }

    addBarricades(count: number): void {
        if (count <= 0) return;

        const availableSpaces = this.maxBarricadeCapacity - this._barricadeCount;
        if (count > availableSpaces) {
            this._barricadeCount = this.maxBarricadeCapacity;
            throw new FullBarricadeException(this.type);
        }

        this._barricadeCount += count;
    }

    moveSurvivorTo(survivor: Survivor, targetLocation: ILocation): void {
        const removed = this.removeSurvivor(survivor);
        try {
            targetLocation.addSurvivor(removed);
        } catch (error) {
            this._survivors.push(removed);
            throw error;
        }
    }

    moveZombieTo(targetLocation: ILocation): void {
        if (this._zombieCount <= 0) {
            throw new CanNotMoveException(`No zombies available at ${this.type} to move.`);
        }

        try {
            targetLocation.addZombies(1);
            this._zombieCount--;
        } catch (error) {
            if (error instanceof BaseLocationException) {
                throw new CanNotMoveException(`Cannot move zombie from ${this.type} to ${targetLocation.type}: ${error.message}`);
            }
            throw error;
        }
    }
}

export class NonColonyLocation extends BaseLocation {
    constructor(
        type: LocationType,
        maxSurvivorCapacity: number,
        maxZombieCapacity: number,
        maxBarricadeCapacity: number
    ) {
        super(type, maxSurvivorCapacity, maxZombieCapacity, maxBarricadeCapacity);
    }

    override addSurvivor(survivor: Survivor): void {
        if (HELPLESS_SURVIVOR) {
            throw new InvalidHelplessSurvivorException(survivor, this.type);
        }
        super.addSurvivor(survivor);
    }
}