import { Server, Origins } from 'boardgame.io/server';
import { TicTacToeGame } from './Game.js';
const server = Server({
    games: [TicTacToeGame],
    origins: [Origins.LOCALHOST]
});
server.run(8000, () => {
    console.log('Board game io is running!');
});
//# sourceMappingURL=server.js.map