import { Dice } from "../game/possible-actions/die.js";
import { ShootActionSource } from "../game/possible-actions/shoot.js";
import { StartOfDaySource } from "../game/possible-actions/start-of-day-source.js";
import { Position } from "../game/state/board/position.js";
import { GameVersion } from "./base/index.js";
import { LogEntryFormatter, baseEntryFunctions } from "./base/log-entry-formatter.js";
import { GoldMineDescriptor } from "./shared/gold-mine.js";
import { TankDescriptor } from "./shared/tank.js";
import { Wall } from "./shared/wall.js";

class V3WallDescriptor extends Wall {
    wallUrls = {
        1: "Wall-1",
        2: "Wall-2",
        3: "Wall-4",
    };
}

function getDiceForShot({ gameState, subject, target }) {
    // First action doesn't have state but it will always be start of day
    if(!gameState) return [];

    const player = gameState.players.getPlayerByName(subject);

    if(!player) {
        throw new Error(`No such player ${subject}`)
    }

    if(player.entities.length != 1) {
        throw new Error(`Expected player ${player.name} to have exactly 1 entity for shooting`);
    }

    const playerEntity = player.entities[0];
    const targetEntity = gameState.board.getEntityAt(Position.fromHumanReadable(target));

    // This target has health we must roll
    if(targetEntity.resources.health !== undefined) {
        const distance = playerEntity.position.distanceTo(targetEntity.position);
        const numDice = (playerEntity.resources.range.value - distance) + 1;

        return [new Dice(numDice, "hit die")];
    }

    return [];
}

function actionFactory(engine) {
    let actionSources = [
        new StartOfDaySource(),
        new ShootActionSource({
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

// V4 is almost identical to v3 so let it reuse everything
export const rawV3Config = {
    logFormatter: new LogEntryFormatter(baseEntryFunctions),
    entryDescriptors: {
        tank: TankDescriptor,
        wall: V3WallDescriptor,
    },
    floorTileDescriptors: {
        gold_mine: GoldMineDescriptor,
    },
    councilPlayerTypes: [
        "councilor",
        "senator",
    ],
    manualPath: "/manuals/Tank_Game_Rules_v3.pdf",
    actionFactory,
    entryFinalizers: {
        shoot(rawLogEntry) {
            // If the hit field wasn't set process the dice
            if(rawLogEntry.hit === undefined) {
                // If any dice hit the shot hits
                rawLogEntry.hit = !!rawLogEntry.hit_roll.roll.find(hit => hit);
            }

            return rawLogEntry;
        }
    },
    diceFactories: {
        shoot: {
            hit_roll({ gameState, rawLogEntry }) {
                // First action doesn't have state but it will always be start of day
                if(!gameState) return [];

                const player = gameState.players.getPlayerByName(rawLogEntry.subject);

                if(!player) {
                    throw new Error(`No such player ${rawLogEntry.subject}`)
                }

                if(player.entities.length != 1) {
                    throw new Error(`Expected player ${player.name} to have exactly 1 entity for shooting`);
                }

                const playerEntity = player.entities[0];

                const target = gameState.board.getEntityAt(Position.fromHumanReadable(rawLogEntry.target));

                // This target has health we must roll
                if(target.resources.health !== undefined) {
                    const distance = playerEntity.position.distanceTo(target.position);
                    const numDice = (playerEntity.resources.range.value - distance) + 1;

                    return [new Dice(numDice, "hit die")];
                }

                return [];
            }
        }
    }
};

export const version3 = new GameVersion(rawV3Config);
