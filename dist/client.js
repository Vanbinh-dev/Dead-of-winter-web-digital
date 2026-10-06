import { Client } from 'boardgame.io/client';
import { SocketIO } from 'boardgame.io/multiplayer';
import { TicTacToeGame } from './Game.js';
const urlParams = new URLSearchParams(window.location.search);
const playerID = urlParams.get('player') || '0';
const client = Client({
    game: TicTacToeGame,
    multiplayer: SocketIO({ server: 'localhost:8000' }),
    playerID: playerID,
});
client.start();
const statusEl = document.getElementById('status');
const cells = document.querySelectorAll('.cell');
client.subscribe((state) => {
    if (!state)
        return;
    state.G.cells.forEach((cellValue, index) => {
        const cellEl = cells[index];
        cellEl.textContent = cellValue ? cellValue : '';
    });
    if (state.ctx.gameover) {
        if (state.ctx.gameover.winner) {
            statusEl.textContent = `Trận đấu kết thúc! Người thắng: Player ${state.ctx.gameover.winner}`;
        }
        else {
            statusEl.textContent = 'Trận đấu kết thúc! Hòa!';
        }
    }
    else {
        const isMyTurn = state.ctx.currentPlayer === playerID;
        statusEl.textContent = `Bạn là Player ${playerID}. ${isMyTurn ? '👉 Đến lượt BẠN đánh!' : '⏳ Đang chờ đối thủ...'}`;
    }
});
cells.forEach((cell) => {
    cell.addEventListener('click', (e) => {
        const target = e.target;
        const id = parseInt(target.getAttribute('data-id') || '0', 10);
        client.moves.clickCell?.(id);
    });
});
//# sourceMappingURL=client.js.map