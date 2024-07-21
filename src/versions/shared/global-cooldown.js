export function findGlobalCooldowns(cooldownDurationSeconds, gameState) {
    const timeOfLastActionOnCooldown = (Date.now() / 1000) - cooldownDurationSeconds;

    return gameState.players.getAllPlayers()
        .filter(player => timeOfLastActionOnCooldown <= player.attributes.time_of_last_action)
        .map(player => {
            const playerName = player.name;
            const timeRemaining = (player.attributes.time_of_last_action - timeOfLastActionOnCooldown) + 1;

            return {
                playerName,
                timeRemaining,
            };
        });
}