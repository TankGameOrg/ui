import { GameVersion } from "./base/index.js";
import { rawV4Config } from "./default-v4.js";
import { DestructibleFloor } from "./shared/destructible-floor.js";
import { HealthPoolDescriptor } from "./shared/health-pool.js";
import { UnwalkableFloor } from "./shared/unwalkable-floor.js";
import { ShootActionSource } from "../game/possible-actions/shoot.js";
import { Dice } from "../game/possible-actions/die.js";
import { LavaDescriptor } from "./shared/lava.js";


function getDiceForShot() {
    return [new Dice(1, "d4")];
}

function actionFactory(engine) {
    let actionSources = [
        new ShootActionSource({
            diceField: "damage_roll",
            getDiceForTarget: getDiceForShot,
            playerCanShoot: player => player.type == "tank",
        }),
    ];

    const engineSpecificSource = engine.getEngineSpecificSource &&
        engine.getEngineSpecificSource({ actionsToSkip: ["shoot"] });

    if(engineSpecificSource) {
        actionSources.push(engineSpecificSource);
    }

    return actionSources;
}

export const rawV5Config = {
    ...rawV4Config,
    floorTileDescriptors: {
        ...rawV4Config.floorTileDescriptors,
        health_pool: HealthPoolDescriptor,
        unwalkable_floor: UnwalkableFloor,
        destructible_floor: DestructibleFloor,
        Lava: LavaDescriptor,
    },
    actionFactory,
};

export const version5 = new GameVersion(rawV5Config);
