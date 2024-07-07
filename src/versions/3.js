import { Dice } from "../game/possible-actions/die.js";
import { ShootActionSource } from "../game/possible-actions/shoot.js";
import { Position } from "../game/state/board/position.js";
import { GameVersion } from "./base/index.js";
import { LogEntryFormatter, baseEntryFunctions } from "./base/log-entry-formatter.js";
import { commonAttributeDescriptors } from "./shared/attributes.js";
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

    const entities = gameState.getEntitiesByPlayer(player);

    if(entities.length != 1) {
        throw new Error(`Expected player ${player.name} to have exactly 1 entity for shooting`);
    }

    const playerEntity = entities[0];
    const targetEntity = gameState.board.getEntityAt(new Position(target));

    // This target has health we must roll
    if(targetEntity.attributes.health !== undefined) {
        const distance = playerEntity.position.distanceTo(targetEntity.position);
        const numDice = (playerEntity.attributes.range - distance) + 1;

        if(numDice < 0) {
            throw new Error(`Dice were negative (${numDice}) when getting dice for ${player.name} (${playerEntity.position.humanReadable}) shooting ${target}`);
        }

        return [new Dice(numDice, "hit die")];
    }

    return [];
}

function actionFactory(engine) {
    let actionSources = [
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

const builderConfig = {
    entity: {
        tank: {
            defaultAttributes: {
                health: 3,
                range: 3,
                actions: 0,
                gold: 0,
                bounty: 0,
            },
            attributes: {
                health: { type: "number", min: 1, max: 3 },
                range: { type: "number", min: 1 },
                actions: { type: "number", min: 0, max: 5, description: "Tank will start game with actions + 1" },
                gold: { type: "number", min: 0 },
                bounty: { type: "number", min: 0 },
            },
        },
        wall: {
            defaultAttributes: {
                durability: 3,
            },
            attributes: {
                durability: { type: "number", min: 1, max: 3 },
            },
        },
    },
    floorTile: {
        gold_mine: {},
    },
    board: {
        maxWidth: 26,
        maxHeight: 26,
    },
};

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
    attributeDescriptors: commonAttributeDescriptors,
    manualPath: "/manuals/Tank_Game_Rules_v3.pdf",
    actionFactory,
    builderConfig,
};

export const version3 = new GameVersion(rawV3Config);
