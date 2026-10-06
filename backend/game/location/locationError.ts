import type { Survivor } from "../Survivor.js";
import type { LocationType } from "../type.js";
import { BaseLocationException } from "./location.js";

export class FullZombieException extends BaseLocationException {
    constructor(
        public readonly location: LocationType,
        public readonly overFlowNumber: number,
        public readonly entranceNumber?: number[],
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