export class DeckManager<T> {
    private cards: T[];
    private revealedCards: T[];

    constructor(initialCards: T[] = []) {
        this.cards = [...initialCards];
        this.revealedCards = [];
    }

    public shuffle(): void {
        let i = this.cards.length;
        while (i > 1) {
            const j = Math.floor(Math.random() * i--);
            const temp = this.cards[i]!;
            this.cards[i] = this.cards[j]!;
            this.cards[j] = temp;
        }
    }

    public reveal(count: number = 1): T[] {
        const revealed = this.cards.splice(0, Math.min(count, this.cards.length));
        this.revealedCards.push(...revealed);
        return revealed;
    }

    public getRevealCards = (): T[] => [...this.revealedCards];

    public getCardFromRevealList(cards: T[]): T[] {
        this.cards = this.cards.filter(card => cards.includes(card));
        return cards;
    }

    public placeCard(card: T, toBottom: boolean = true): void {
        if (toBottom) this.cards.push(card);
        else this.cards.unshift(card);
    }

    public placeCards(cards: T[], toBottom: boolean = true): void {
        if (toBottom) this.cards.push(...cards);
        else this.cards.unshift(...cards);
    }

    public removeCard(card: T): boolean {
        const index = this.cards.indexOf(card);
        if (index === -1) return false;
        this.cards.splice(index, 1);
        return true;
    }

    public removeCards(cardsToRemove: T[]): number {
        return cardsToRemove.reduce((count, card) => count + (this.removeCard(card) ? 1 : 0), 0);
    }

    public getCards = (): T[] => [...this.cards];
}