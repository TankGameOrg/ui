// State translation functions
//
// These functions serve to create an abstraction between tank_game_ui and TankGame engine.
// By doing so we limit the scope of the changes required to support new versions of the engine.
//
// This file specifically targets the current main version v0.0.3

import Board from "../../game/state/board/board.js";
import Entity from "../../game/state/board/entity.js";
import { GameState } from "../../game/state/game-state.js";
import Player from "../../game/state/players/player.js";
import { Position } from "../../game/state/board/position.js";


const deadTankAttributesToRemove = ["$ACTIONS", "$RANGE", "$BOUNTY"];

function mapTypeToClass(type, boardType, gameVersion) {
    if(type == "empty") {
        return boardType == "entity" ? "EmptyUnit" : "WalkableFloor";
    }

    let className = {
        tank: "GenericTank",
        wall: "Wall",
        gold_mine: "GoldMine",
        health_pool: "HealthPool",
        destructible_floor: "DestructibleFloor",
        unwalkable_floor: "UnwalkableFloor",
    }[type];

    if(className === undefined) className = type;

    return className;
}

function mapClassToType(className) {
    let type = {
        Wall: "wall",
        GoldMine: "gold_mine",
        GenericTank: "tank",
        EmptyUnit: "empty",
        WalkableFloor: "empty",
        GlobalCooldownTank: "tank",
        HealthPool: "health_pool",
        DestructibleFloor: "destructible_floor",
        UnwalkableFloor: "unwalkable_floor",
    }[className];

    if(type === undefined) type = className; // throw new Error(`Could not find type for ${className}`);

    return type;
}


export function gameStateFromRawState(rawGameState) {
    const playersByName = buildUserLists(rawGameState);

    let board = convertBoard(undefined, rawGameState.$BOARD.unit_board, (newBoard, rawEntity, position) => {
        newBoard.setEntity(entityFromBoard(rawEntity, position, playersByName));
    });

    board = convertBoard(board, rawGameState.$BOARD.floor_board, (newBoard, space, position) => {
        newBoard.setFloorTile(entityFromBoard(space, position));
    });

    let gameState = new GameState(
        Object.values(playersByName),
        board,
        {
            council: convertCouncil(rawGameState.$COUNCIL, playersByName),
        },
    );

    let victoryInfo;

    if(rawGameState.$WINNER?.length > 1) {
        let winners = [rawGameState.$WINNER];
        let victoryType = "last_team_standing";

        if(rawGameState.$WINNER == "Council") {
            victoryType = "armistice_vote";
            winners = gameState.metaEntities.council.getPlayerRefs()
                .map(ref => ref.getPlayer(gameState).attributes.name);
        }
        else if(gameState.players.getPlayerByName(rawGameState.$WINNER) !== undefined) {
            victoryType = "last_tank_standing";
        }

        victoryInfo = {
            type: victoryType,
            winners,
        };
    }

    return {
        gameState,
        victoryInfo,
    };
}

function getAttributeName(name, type, rawAttributes) {
    name = name.toLowerCase();

    if(name.startsWith("$")) {
        name = name.slice(1);
    }

    if(type == "tank" && !rawAttributes.$DEAD && name == "durability") {
        return "health";
    }

    return name;
}

function shouldKeepAttribute(attributeName, rawAttributes) {
    if(!attributeName.startsWith("$") || attributeName.startsWith("$MAX_")) return false;

    if(["$DEAD", "$POSITION", "$PLAYER_REF"].includes(attributeName)) {
        return false;
    }

    if(rawAttributes.$DEAD) {
        return !deadTankAttributesToRemove.includes(attributeName);
    }

    return true;
}

function decodeAttributes(type, rawAttributes) {
    let attributes = {};

    for(const attributeName of Object.keys(rawAttributes)) {
        if(!shouldKeepAttribute(attributeName, rawAttributes)) continue;

        const actualName = getAttributeName(attributeName, type, rawAttributes);
        attributes[actualName] = rawAttributes[attributeName];

        if(actualName == "only_lootable_by") {
            attributes[actualName] = attributes[actualName].name;
        }

        const maxAttributeName = "$MAX_" + attributeName.replace("$", "");
        if(rawAttributes[maxAttributeName] !== undefined) {
            attributes[actualName] = {
                value: attributes[actualName],
                max: rawAttributes[maxAttributeName],
            };
        }
    }

    return attributes;
}

function convertPlayer(rawPlayer) {
    if(rawPlayer.class != "Player") throw new Error(`Expected player but got ${rawPlayer.class}`);

    return new Player(decodeAttributes(undefined, rawPlayer));
}

function getCouncilPlayers(rawCouncil, playersByName) {
    let councilPlayers = [];

    const councilGroups = [
        [rawCouncil.$COUNCILLORS.elements, "councilor"],
        [rawCouncil.$SENATORS.elements, "senator"]
    ];

    for(const [users, userType] of councilGroups) {
        for(const playerRef of users) {
            const {name} = playerRef;
            if(playersByName[name]) {
                // Being a councelor overrides the user's previous state
                playersByName[name].attributes.type = userType;
            }

            councilPlayers.push(playersByName[name]);
        }
    }

    return councilPlayers;
}

function convertCouncil(rawCouncil, playersByName) {
    let attributes = {
        coffer: rawCouncil.$COFFER,
    };

    if(rawCouncil.$ARMISTICE_MAX !== undefined) {
        attributes.armistice = {
            value: rawCouncil.$ARMISTICE_COUNT,
            max: rawCouncil.$ARMISTICE_MAX,
        };
    }

    const players = getCouncilPlayers(rawCouncil, playersByName);
    return new Entity({ type: "council", attributes, players });
}

function entityFromBoard(rawEntity, position, playersByName) {
    const type = mapClassToType(rawEntity.class);
    let attributes = decodeAttributes(type, rawEntity);

    let entity = new Entity({
        type,
        position,
        attributes,
    });

    const {$PLAYER_REF} = rawEntity;
    if($PLAYER_REF && playersByName) {
        const player = playersByName[$PLAYER_REF.name];
        entity.addPlayer(player);
    }

    return entity;
}

function convertBoard(newBoard, board, boardSpaceFactory) {
    if(!newBoard) {
        if(board.length === 0) throw new Error("Zero length boards are not allowed");

        newBoard = new Board(board[0].length, board.length);
    }

    if(newBoard.height != board.length) {
        throw new Error(`Board has a length of ${board.length} but previous boards had a length of ${newBoard.height}`);
    }

    for(let y = 0; y < board.length; ++y) {
        const row = board[y];

        if(newBoard.width != row.length) {
            throw new Error(`Row at index ${y} has a length of ${row.length} but previous rows had a length of ${newBoard.width}`);
        }

        for(let x = 0; x < row.length; ++x) {
            const position = new Position(x, y);
            boardSpaceFactory(newBoard, board[y][x], position);
        }
    }

    return newBoard;
}

function buildUserLists(rawGameState) {
    let playersByName = {};

    for(const rawPlayer of rawGameState.$PLAYERS.elements) {
        playersByName[rawPlayer.$NAME] = convertPlayer(rawPlayer);
    }

    return playersByName;
}

////////////////////////////////////////////////////////////////////////////////

export function buildPosition(position) {
    return {
        class: "Position",
        x: position.x,
        y: position.y,
    };
}

function buildBoard(board, entityFn) {
    let rawBoard = [];

    for(let y = 0; y < board.height; ++y) {
        let row = [];
        rawBoard.push(row);

        for(let x = 0; x < board.width; ++x) {
            row.push(entityFn(new Position(x, y), board));
        }
    }

    return rawBoard;
}

function buildPlayerRef(player) {
    return {
        class: "PlayerRef",
        name: player.name,
    };
}

function buildPlayer(player) {
    let attributes = {};

    for(const attributeName of Object.keys(player.attributes)) {
        attributes["$" + attributeName.toUpperCase()] = player.attributes[attributeName];
    }

    return {
        class: "Player",
        ...attributes,
    };
}

function buildUnit(position, board, boardType, gameVersion, gameState) {
    const entity = board[boardType == "entity" ? "getEntityAt" : "getFloorTileAt"](position);

    let attributes = {};
    for(const attributeName of Object.keys(entity.attributes)) {
        let value = entity.attributes[attributeName];
        if(value.max !== undefined) {
            attributes["$MAX_" + attributeName.toUpperCase()] = value.max;
            value = value.value;
        }

        attributes["$" + attributeName.toUpperCase()] = value;
    }

    if(entity.type == "tank") {
        attributes.$DEAD = entity.attributes.durability !== undefined;

        for(const removedAttibute of deadTankAttributesToRemove) {
            if(attributes[removedAttibute] === undefined) {
                attributes[removedAttibute] = 0;
            }
        }

        if(attributes.$DURABILITY === undefined) {
            attributes.$MAX_DURABILITY = attributes.$MAX_HEALTH;
            attributes.$DURABILITY = attributes.$HEALTH;
            delete attributes.$HEALTH;
        }
    }

    attributes.$POSITION = buildPosition(entity.position);

    if(entity.getPlayerRefs().length > 0) {
        attributes.$PLAYER_REF = buildPlayerRef(entity.getPlayerRefs()[0].getPlayer(gameState));
    }

    return {
        class: mapTypeToClass(entity.type, boardType, gameVersion),
        ...attributes,
    };
}

function makeCouncilList(council, playerType, gameState) {
    const players = council.getPlayerRefs()
        .map(playerRef => playerRef.getPlayer(gameState))
        .filter(player => player.type == playerType)
        .map(player => buildPlayerRef(player));

    return {
        "class": "AttributeList",
        elements: players,
    }
}

function makeCouncil(councilEntity, gameState) {
    let additionalAttributes = {};

    if(councilEntity.attributes.armistice !== undefined) {
        additionalAttributes = {
            ...additionalAttributes,
            $ARMISTICE_COUNT: councilEntity.attributes.armistice.value,
            $ARMISTICE_MAX: councilEntity.attributes.armistice.max,
        };
    }

    return {
        class: "Council",
        $COFFER: councilEntity.attributes.coffer,
        ...additionalAttributes,
        $COUNCILLORS: makeCouncilList(councilEntity, "councilor", gameState),
        $SENATORS: makeCouncilList(councilEntity, "senator", gameState),
    };
}

export function gameStateToRawState(gameState, gameVersion) {
    return {
        class: "State",
        // It's assumed that we only interact with the engine when the game is active
        $RUNNING: true,
        $TICK: 0,
        $BOARD: {
            class: "Board",
            unit_board: buildBoard(gameState.board, (position, board) => buildUnit(position, board, "entity", gameVersion, gameState)),
            floor_board: buildBoard(gameState.board, (position, board) => buildUnit(position, board, "floorTile", gameVersion, gameState)),
        },
        $COUNCIL: makeCouncil(gameState.metaEntities.council, gameState),
        $PLAYERS: {
            class: "AttributeList",
            elements: gameState.players.getAllPlayers().map(player => buildPlayer(player)),
        },
    };
}
