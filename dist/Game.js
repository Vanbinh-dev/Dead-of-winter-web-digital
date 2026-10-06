import { INVALID_MOVE } from "boardgame.io/core";
const clickCell = ({ G, playerID }, id) => {
    if (G.cells[id] !== null)
        return INVALID_MOVE;
    G.cells[id] = playerID;
};
export const TicTacToeGame = {
    name: 'tic-tac-toe',
    setup: () => ({
        cells: Array(9).fill(null)
    }),
    turn: {
        minMoves: 1,
        maxMoves: 1
    },
    moves: {
        clickCell
    },
    endIf: ({ G, ctx }) => {
        const lines = [
            [0, 1, 2], [3, 4, 5], [6, 7, 8],
            [0, 3, 6], [1, 4, 7], [2, 5, 8],
            [0, 4, 8], [2, 4, 6]
        ];
        for (let line of lines) {
            let [a, b, c] = line;
            if (a == undefined || b == undefined || c == undefined)
                return;
            if (G.cells[a] && G.cells[b] == G.cells[a] && G.cells[c] == G.cells[a])
                return {
                    winner: G.cells[a]
                };
            if (G.cells.every((cell) => cell !== null)) {
                return { draw: true };
            }
        }
    }
};
//# sourceMappingURL=Game.js.map