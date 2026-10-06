import type { ItemCard } from "../Card.js";
import type { DeckManager } from "../deck/Deck.js";
import { HELPLESS_SURVIVOR, Survivor } from "../Survivor.js";
import type { LocationType } from "../type.js";
import { BaseLocation, BaseLocationException } from "./location.js";
import { InvalidHelplessSurvivorException } from "./locationError.js";

export class NoiseCapacityExceededException extends BaseLocationException {
    public readonly overflow: number;

    constructor(overflow: number) {
        super(`Noise capacity exceeded by ${overflow}.`);
        this.overflow = overflow;
    }
}

export class NoiseUnderflowException extends BaseLocationException {
    public readonly overflow: number;

    constructor(overflow: number) {
        super(`Cannot remove ${overflow} noise: minimum level (0) reached.`);
        this.overflow = overflow;
    }
}

export class CardNotFoundException extends BaseLocationException {
    public readonly overflow: number;

    constructor(overflow: number) {
        super(`Failed to remove ${overflow} card(s): card(s) not found in deck.`);
        this.overflow = overflow;
    }
}

export class NonColonyLocation extends BaseLocation {
    readonly maxNoise: number;
    readonly deck: DeckManager<ItemCard>
    extraReveal: number;
    noise: number;

    constructor(
        type: LocationType,
        maxSurvivorCapacity: number,
        maxZombieCapacity: number,
        maxBarricadeCapacity: number,
        maxNoise: number,
        deck: DeckManager<ItemCard>
    ) {
        super(type, maxSurvivorCapacity, maxZombieCapacity, maxBarricadeCapacity);
        this.maxNoise = maxNoise;
        this.extraReveal = 0;
        this.deck = deck;
        this.noise = 0;
    }

    override addSurvivor(survivor: Survivor): void {
        if (HELPLESS_SURVIVOR) {
            throw new InvalidHelplessSurvivorException(survivor, this.type);
        }
        super.addSurvivor(survivor);
    }

    public reveal(count: number ): ItemCard[] {
        const totalToReveal = count + this.extraReveal;
        this.addNoise(count);
        return this.deck.reveal(totalToReveal);
    }

    public revealWithoutMakingNoise(count: number = 1): ItemCard[] {
        const totalToReveal = count + this.extraReveal;
        return this.deck.reveal(totalToReveal);
    }

    public getAllRevealCard(): ItemCard[] {
        return this.deck.getRevealCards();
    }

    public getCard(card: ItemCard[]): ItemCard[] {
        return this.deck.getCardFromRevealList(card);
    }

    public addNoise(amount: number = 1): void {
        const availableSpace = this.maxNoise - this.noise;
        const actualAdd = Math.min(amount, Math.max(0, availableSpace));
        this.noise += actualAdd;

        const overflow = amount - actualAdd;
        if (overflow > 0) {
            throw new NoiseCapacityExceededException(overflow);
        }
    }

    public removeNoise(amount: number = 1): void {
        const actualRemove = Math.min(amount, this.noise);
        this.noise -= actualRemove;

        const overflow = amount - actualRemove;
        if (overflow > 0) {
            throw new NoiseUnderflowException(overflow);
        }
    }

    public resolveNoise(): void {
        this.addZombies(this.noise);
        this.noise = 0;
    }

    public addCard(cards: ItemCard[]): void {
        this.deck.placeCards(cards);
    }

    public removeCard(cards: ItemCard[]): number {
        const removedCount = this.deck.removeCards(cards);
        const overflow = cards.length - removedCount;

        if (overflow > 0) {
            throw new CardNotFoundException(overflow);
        }

        return removedCount;
    }
}