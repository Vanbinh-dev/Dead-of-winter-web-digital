class GameLogic {
    endGame;

    turnSetUpPhase() {

    }

    colonyPhase() {

    }

    playerPhase(playerId: string) {

    }

    turn() {
        while (!this.endGame) {
            this.turnSetUpPhase()
            let playerIds = ['0', '1']
            for (let playerId of playerIds)
                this.playerPhase(playerId)
            this.colonyPhase()
        }
    }

    constructor() {
        this.endGame = false;
    }
}