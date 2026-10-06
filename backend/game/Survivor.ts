export class Survivor {
    id: string;
    name: string;
    hp: number;
    attackPower: number;
    searchPower: number;
    skillDescription: string;
    wounds: Array<WoundType>
    deathReason: string

    constructor(name: string, hp: number, attackPower: number, searchPower: number, skillDescription: string) {
        this.id = ''
        this.name = name;
        this.hp = hp;
        this.attackPower = attackPower;
        this.searchPower = searchPower;
        this.skillDescription = skillDescription;
        this.wounds = []
        this.deathReason = ''
    }

    receiveWound(wound: WoundType) {
        if (wound == null)
            throw Error("Add null wound?")
        if (wound == WoundType.BITE) {
            this.kill('Death because have been bite!')
            this.wounds = []
        }
        this.wounds.push(wound)
        if (this.wounds.length == 3)
            this.kill('Death because having 3 wound!')
    }

    kill(reason: string) {
        this.hp = 0
    }

    isAlive() {
        return this.hp == 0
    }

    removeWound(removedWound: WoundType) {
        for (let i = 0; i < this.wounds.length; i++) {
            let wound = this.wounds[i]
            if (wound === removedWound)
                this.wounds = this.wounds.slice(i, 1)
        }
    }

    activeSkill() {

    }
}

export const HELPLESS_SURVIVOR = new Survivor("helpless", 1, 7, 7, "This is helpless")

export enum WoundType {
    WOUND = 'WOUND',
    FROSTBITE = 'FROSTBITE',
    BITE = 'BITE'
}