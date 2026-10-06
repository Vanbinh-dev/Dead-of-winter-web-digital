import { type Skill, PassiveEffects } from "./effect.js";
import { LocationType } from "./type.js";

export enum WoundType {
    WOUND = "WOUND",
    FROSTBITE = "FROSTBITE",
    BITE = "BITE"
}

export class SurvivorIsDeath extends Error {
    readonly survivor: Survivor;

    constructor(survivor: Survivor, action: string) {
        super(`${survivor.name} is death. ${action} is invalid!`)
        this.survivor = survivor;
    }
}

export class SpreadZombieException extends Error {
    readonly survivor: Survivor;

    constructor(survivor: Survivor, action: string) {
        super(`${survivor.name} is bite. Spreading the death!`)
        this.survivor = survivor;
    }
}

export class Survivor {
    readonly id: string;
    name: string;
    influenceScore: number;
    hp: number;
    attackPower: number;
    searchPower: number;
    skillDescription: string;
    skill: Skill | undefined;
    job?: string;

    constructor(
        id: string,
        name: string,
        hp: number,
        influenceScore: number,
        attackPower: number,
        searchPower: number,
        skillDescription: string,
        skill: Skill | undefined,
        job?: string
    ) {
        this.id = id;
        this.name = name;
        this.hp = hp;
        this.influenceScore = influenceScore;
        this.attackPower = attackPower;
        this.searchPower = searchPower;
        this.skillDescription = skillDescription;
        this.skill = skill;
        this.job = job || '';
    }
}

export class SurvivorInformation {
    readonly survivor: Survivor;
    __wounds: WoundType[];
    readonly currentLocation: LocationType;
    protected __isAlive: boolean;

    constructor(survivor: Survivor) {
        this.survivor = survivor;
        this.__wounds = []
        this.currentLocation = LocationType.COLONY;
        this.__isAlive = true;
    }

    receiveWound(wound: WoundType) {
        if (!this.__isAlive)
            throw new SurvivorIsDeath(this.survivor, "receive wound");
        wound = this.__changeWound(wound);
        if (wound == WoundType.BITE)
            this.receiveBite();

        this.__wounds.push(wound)
        if (this.__wounds.length == this.survivor.hp)
            this.__isAlive = false;
    }

    __changeWound(wound: WoundType): WoundType {
        let passiveEffects = this.survivor.skill?.passiveEffect;
        if (passiveEffects == undefined || null)
            return wound
        if (passiveEffects.includes(PassiveEffects.CONVERT_BITE_TO_WOUND) && wound == WoundType.BITE)
            return WoundType.WOUND;
        if (passiveEffects.includes(PassiveEffects.CONVERT_FROSTBITE_TO_WOUND) && wound == WoundType.FROSTBITE)
            return WoundType.WOUND;
        return wound;
    }

    receiveBite() {
        this.__isAlive = false;
        throw new SpreadZombieException(this.survivor, "receive bite!");
    }

    removeWoundByType(wounds: WoundType[], allWound?: boolean) {
        this.__wounds = wounds.filter(wound => wounds.includes(wound));
    }

    removeSingleWound(wound: WoundType) {
        let index = this.__wounds.indexOf(wound)
        if (index !== -1)
            this.__wounds.splice(index, 1);
    }

    kill() {
        this.__isAlive = false;
    }

    isAlive(): boolean {
        return this.__isAlive;
    }

    isDead(): boolean {
        return !this.__isAlive;
    }

    getWoundCount(): number {
        return this.__wounds.length;
    }

    getWounds(): Readonly<Array<WoundType>> {
        return this.__wounds;
    }

    hasWound(wound: WoundType): boolean {
        return this.__wounds.includes(wound);
    }
}

export const HELPLESS_SURVIVOR = new Survivor(
    'HELPLESS_SURVIVOR',
    'helpless',
    1,
    9999,
    0,
    0,
    '',
    undefined
);