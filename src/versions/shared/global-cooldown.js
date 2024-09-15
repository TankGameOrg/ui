import { unixNow } from "../../utils.js";

export function findGlobalCooldowns(gameState) {
    const now = unixNow();

    return gameState.players.getAllPlayers()
        .filter(player => player.globalCooldownEndTime >= now)
        .map(player => {
            const playerName = player.name;
            const timeRemaining = player.globalCooldownEndTime - now;

            return {
                playerName,
                timeRemaining,
            };
        });
}