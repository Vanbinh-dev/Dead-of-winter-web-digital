export class Dice {
    maxFace: number;
    allocate: Map<String, number>;
    roll_list: Array<string>;

    constructor(allocate: Map<string, number>) {
        this.allocate = allocate;
        this.roll_list = []

        allocate.forEach((numberAppear, face) => {
            this.roll_list.push(face);
        })

        this.maxFace = this.roll_list.length;
    }

    roll() {
        const randomIndex = Math.floor(Math.random() * this.maxFace);
        return this.roll_list[randomIndex]!;
    }

    getAllDiceFace() {
        return this.allocate.keys()
    }
}

export function random(begin: number, end: number) {
    return Math.floor(Math.random() * (end - begin + 1)) + begin;
}

export const SIX_SIDE_DICE = new Dice(
    new Map([
        ['1', 1],
        ['2', 1],
        ['3', 1],
        ['4', 1],
        ['5', 1],
        ['6', 1]
    ])
)

export const EXPOSURE_DICE = new Dice(
    new Map(
        [
            ['blank', 8],
            ['wound', 4],
            ['frostbite', 2],
            ['bite', 1]
        ]
    )
)