import { unixNow } from "../../utils.js";

export function findGlobalCooldowns(gameState) {
    const now = unixNow();

    return gameState.players.getAllPlayers()
        .filter(player => player.global_cooldown_end_time >= now)
        .map(player => {
            const playerName = player.name;
            const timeRemaining = player.global_cooldown_end_time - now;

            return {
                playerName,
                timeRemaining,
            };
        });
}