import { listEndpoints } from "node:quic";
import type { Survivor } from "./Survivor.js";

class Player {
    survivors: Map<Survivor, number> 
    actionDices: Array<String>
    itemCards: Array<String>

    constructor() {
        this.survivors = new Map();
        this.actionDices = []
        this.itemCards = []
    }

    resetTurn() {

    }
    
    attackZombie() {

    }

    attackPlayer() {

    }

    search() {

    }

    useSurvivorSkill() {
        
    }

    attractZombie() {

    }

    removeGarbage() {

    }

    makeBarricade() {

    }

    moveSurvivor(survivor: Survivor, location: any) {

    }

    playCard(card: any) {

    }

    askForHelp() {

    }

    voteBan() {

    }
}