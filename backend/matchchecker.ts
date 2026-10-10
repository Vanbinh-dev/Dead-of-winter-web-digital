// backend/matchmaker.ts
import { LobbyClient } from 'boardgame.io/client';

export const SERVER_URL = 'http://localhost:8000';
export const GAME_NAME = 'dead-of-winter';
const lobbyClient = new LobbyClient({ server: SERVER_URL });

export async function autoJoinOrCreateMatch(): Promise<{ matchID: string; playerID: string; credentials: string }> {
    const { matches } = await lobbyClient.listMatches(GAME_NAME);

    const openMatch = matches.find((m) => m.players.some((p) => !p.name));

    if (openMatch) {
        const freeSlot = openMatch.players.find((p) => !p.name);
        const playerID = freeSlot ? String(freeSlot.id) : '1';

        const { playerCredentials } = await lobbyClient.joinMatch(
            GAME_NAME,
            openMatch.matchID,
            {
                playerID: playerID,
                playerName: `Player_${playerID}`,
            }
        );

        return {
            matchID: openMatch.matchID,
            playerID,
            credentials: playerCredentials,
        };
    }

    const { matchID } = await lobbyClient.createMatch(GAME_NAME, {
        numPlayers: 2,
    });

    const { playerCredentials } = await lobbyClient.joinMatch(
        GAME_NAME,
        matchID,
        {
            playerID: '0',
            playerName: 'Player_0',
        }
    );

    return {
        matchID,
        playerID: '0',
        credentials: playerCredentials,
    };
}