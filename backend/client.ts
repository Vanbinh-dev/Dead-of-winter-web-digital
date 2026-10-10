import { Client } from 'boardgame.io/client';
import { SocketIO } from 'boardgame.io/multiplayer';
import { DEAD_OF_WINTER_GAME } from './game/gameLogic/Game.js';
import { GAME_NAME } from './matchchecker.js';
import { ALL_MAIN_OBJECT_MISSION_IDS } from './game/gameLogic/GameDefinition.js';

export const gameClient = Client({
  game: DEAD_OF_WINTER_GAME,
  numPlayers: 1,
  debug:
  {
  },
});

gameClient.start();

const selectEl = document.getElementById("mission-select") as HTMLSelectElement | null;
const currentObjEl = document.getElementById("current-objective");
const btnChoose = document.getElementById("btn-choose");
const btnRandom = document.getElementById("btn-random");

if (selectEl) {
  selectEl.innerHTML = ALL_MAIN_OBJECT_MISSION_IDS.map(
    (id) => `<option value="${id}">${id}</option>`
  ).join("");
}

gameClient.subscribe((state) => {
  if (!state || !currentObjEl) return;
  currentObjEl.textContent = state.G.mainObjective ?? "Chưa chọn";
});

btnChoose?.addEventListener("click", () => {
  const selectedId = selectEl?.value;
  if (!selectedId) return;
  gameClient.moves?.changeMainObjective?.(selectedId, false);
});

btnRandom?.addEventListener("click", () => {
  gameClient.moves?.changeMainObjective?.(undefined, true);
});