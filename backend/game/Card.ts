import type { LocationType } from "./location.js";

export enum ItemCardType {
    FUEL,
    FOOD,
    TOOL,
    EVENT,
    WEAPON,
    BOOK
}

export enum AfterUseLocation {
    WASTE_PILE,
    REMOVE_FROM_GAME
}

export class ItemCard {
    id: string;
    name: string;
    type: ItemCardType;
    location: LocationType;
    afterUseLocation: AfterUseLocation;
    effectDescription: string;
    
    constructor(id: string, name: string, type: ItemCardType, location: LocationType, afterUseLocation: AfterUseLocation, effectDescription: string) {
        this.id = ''
        this.name = name
        this.type = type;
        this.location = location
        this.afterUseLocation = afterUseLocation
        this.effectDescription = effectDescription
    }

    use() {
        
    }
}

export class CrisisCard {
    id: string;
    name: string;
    requireResource: ItemCardType;
    effect: string;
    
    constructor(name: string, requireResource: ItemCardType, effect: string) {
        this.id = ''
        this.name = name
        this.requireResource = requireResource
        this.effect = effect
    }

    triggerIfFail() {

    }

    triggerIfPreventOverSuccess() {

    }
}