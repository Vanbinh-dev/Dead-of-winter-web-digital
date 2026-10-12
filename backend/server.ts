import { Server, Origins } from "boardgame.io/server";
import { DEAD_OF_WINTER_GAME } from "./gameLogic/Game.js";
import type { PrivateGameState, PrivatePlayerState } from "./state/GameState.js";

// ---------------------------------------------------------------------------
// boardgame.io Server
// ---------------------------------------------------------------------------

const server = Server({
    games: [DEAD_OF_WINTER_GAME],
    origins: [Origins.LOCALHOST, Origins.LOCALHOST_IN_DEVELOPMENT, "*"],
});

const PORT = Number(process.env.PORT ?? 8000);

server.run({ port: PORT }, () => {
    console.log(`[Dead of Winter] Server running on http://localhost:${PORT}`);
});

// ---------------------------------------------------------------------------
// Private state lưu ngoài G (không gửi qua mạng) — để dùng sau nếu cần
// ---------------------------------------------------------------------------
export const PRIVATE_MATCH_INFORMATION: Map<string, PrivateGameState> = new Map();
export const PRIVATE_PLAYER_STATE: Map<string, PrivatePlayerState> = new Map();