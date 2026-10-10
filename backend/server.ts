import { Server, Origins } from 'boardgame.io/server';
import { DEAD_OF_WINTER_GAME } from './game/gameLogic/Game.js';
import type { PrivateGameState, PrivatePlayerState } from './game/gameLogic/GameState.js';

const server = Server({
    games: [DEAD_OF_WINTER_GAME],   
    origins: [Origins.LOCALHOST]
})

server.run(8000, () => {
    console.log("Sever is run at port 8000")
})

export const PRIVATE_MATCH_INFORMATION: Map<string, PrivateGameState> = new Map()
export const PRIVATE_PLAYER_STATE: Map<string, PrivatePlayerState> = new Map()