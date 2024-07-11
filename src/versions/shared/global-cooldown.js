export function findGlobalCooldowns(cooldownDurationSeconds, gameState) {
    const timeOfLastActionOnCooldown = (Date.now() / 1000) - cooldownDurationSeconds;

    return gameState.board.getAllEntities()
        .filter(entity => timeOfLastActionOnCooldown <= entity.attributes.last_action_time)
        .map(entity => {
            const playerName = entity.players[0]?.name;
            const timeRemaining = (entity.attributes.last_action_time - timeOfLastActionOnCooldown) + 1;

            return {
                playerName,
                timeRemaining,
            };
        });
}